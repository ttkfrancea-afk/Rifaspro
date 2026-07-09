-- supabase/sql/schema.sql
--
-- Ejecutar en el SQL Editor de Supabase (Project > SQL Editor) o vía
-- `supabase db push` / migraciones del CLI.
--
-- Este archivo no fue pedido explícitamente en el listado de archivos,
-- pero es la pieza que hace posible cumplir los 3 requisitos del sistema:
--   - Seguridad (RLS: nadie puede escribir sin pasar por las API routes)
--   - Concurrencia (constraint UNIQUE + UPDATE condicional en reservar.js)
--   - Rendimiento (generación masiva en una sola sentencia + contador cacheado)

create extension if not exists "pgcrypto"; -- para gen_random_uuid()

-- ============================================================
-- Tabla: rifas
-- ============================================================
create table if not exists rifas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  precio_numero numeric(10, 2) not null default 0,
  imagen_url text,
  fecha_sorteo timestamptz,
  estado text not null default 'activa' check (estado in ('activa', 'finalizada')),
  total_numeros int not null default 10000,
  -- Contador cacheado: evita hacer COUNT(*) sobre hasta 10,000 filas de
  -- `boletos` cada vez que se pinta la landing page (ver trigger abajo).
  numeros_vendidos int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Tabla: boletos
-- ============================================================
create table if not exists boletos (
  id bigint generated always as identity primary key,
  rifa_id uuid not null references rifas (id) on delete cascade,
  numero char(4) not null,
  estado text not null default 'disponible' check (estado in ('disponible', 'reservado', 'pagado')),
  comprador_nombre text,
  comprador_telefono text,
  reservado_en timestamptz,
  pagado_en timestamptz,
  -- Esta restricción UNIQUE es una segunda barrera de concurrencia: aunque
  -- el UPDATE condicional de /api/reservar.js ya resuelve la carrera,
  -- este constraint garantiza a nivel de base de datos que jamás pueda
  -- existir el mismo número dos veces para la misma rifa.
  unique (rifa_id, numero)
);

-- Índices para las consultas más frecuentes.
create index if not exists idx_boletos_rifa_estado on boletos (rifa_id, estado);
create index if not exists idx_boletos_rifa_numero on boletos (rifa_id, numero);

-- ============================================================
-- Función: generar_boletos_masivo
-- Genera N boletos ('0000'..'N-1') para una rifa en UNA sola sentencia
-- INSERT, usando generate_series dentro de Postgres. Esto es lo que llama
-- /src/pages/api/admin/generar-numeros.js.
-- ============================================================
create or replace function generar_boletos_masivo(p_rifa_id uuid, p_cantidad int default 10000)
returns void
language plpgsql
security definer
as $$
begin
  insert into boletos (rifa_id, numero, estado)
  select p_rifa_id, lpad(n::text, 4, '0'), 'disponible'
  from generate_series(0, p_cantidad - 1) as n
  on conflict (rifa_id, numero) do nothing;
end;
$$;

-- ============================================================
-- Trigger: mantiene rifas.numeros_vendidos sincronizado automáticamente,
-- para no tener que contar filas de `boletos` en cada carga de la landing.
-- ============================================================
create or replace function actualizar_contador_vendidos()
returns trigger
language plpgsql
as $$
begin
  if (TG_OP = 'UPDATE' and old.estado is distinct from new.estado) then
    if new.estado in ('reservado', 'pagado') and old.estado = 'disponible' then
      update rifas set numeros_vendidos = numeros_vendidos + 1 where id = new.rifa_id;
    elsif new.estado = 'disponible' and old.estado in ('reservado', 'pagado') then
      update rifas set numeros_vendidos = numeros_vendidos - 1 where id = new.rifa_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_actualizar_contador on boletos;
create trigger trg_actualizar_contador
  after update on boletos
  for each row
  execute function actualizar_contador_vendidos();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table rifas enable row level security;
alter table boletos enable row level security;

-- Lectura pública: cualquiera (rol anon) puede ver rifas y el estado de
-- los boletos — es lo que necesita la Cuadricula para pintarse.
create policy "rifas: lectura publica" on rifas for select using (true);
create policy "boletos: lectura publica" on boletos for select using (true);

-- IMPORTANTE: no se crea NINGUNA política de INSERT/UPDATE/DELETE para
-- los roles anon/authenticated. En Postgres/RLS, "sin política" equivale
-- a "acceso denegado". Todas las escrituras pasan exclusivamente por las
-- API routes de Next.js, que usan supabaseAdmin (Service Role), la cual
-- ignora RLS por diseño.

-- ============================================================
-- Realtime
-- Habilita que Supabase transmita los cambios de `boletos` por WebSocket,
-- que es lo que consume Cuadricula.jsx para actualizarse sin polling.
-- (También puedes activarlo desde Database > Replication en el dashboard.)
-- ============================================================
alter publication supabase_realtime add table boletos;
