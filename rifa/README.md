# rifa

Sistema de rifas de alto rendimiento (hasta 10,000 números por sorteo) con
Next.js (Pages Router) + Supabase.

## Arquitectura en una mirada

| Requisito | Solución implementada |
|---|---|
| **Rendimiento** | `index.jsx` con SSR (candidato a ISR); `[id].jsx` con SSR; `Cuadricula.jsx` virtualizada con `react-window` (nunca más de ~200 nodos en el DOM); contador `numeros_vendidos` cacheado por trigger para no contar 10,000 filas en cada carga. |
| **Seguridad** | Escrituras solo desde `/src/pages/api/**` usando `supabaseAdmin.js` (Service Role Key). RLS habilitado en todas las tablas; solo hay políticas de `SELECT` público — sin política de escritura para `anon`/`authenticated`, el acceso queda denegado por defecto. |
| **Concurrencia** | `reservar.js` hace un `UPDATE ... WHERE estado = 'disponible'` condicional: Postgres serializa la escritura a nivel de fila, así que si dos personas reservan el mismo número al mismo tiempo, solo una tendrá éxito. Constraint `UNIQUE (rifa_id, numero)` como segunda barrera. |

## 1. Instalar dependencias

```bash
npm install
```

## 2. Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Completa `.env.local` con los valores de tu proyecto Supabase (Project
Settings > API) y define un `ADMIN_SECRET_KEY` propio.

## 3. Crear el esquema en Supabase

Copia y ejecuta el contenido de `supabase/sql/schema.sql` en el **SQL
Editor** de tu proyecto Supabase. Esto crea las tablas `rifas` y `boletos`,
los índices, la función `generar_boletos_masivo`, el trigger del contador,
las políticas RLS y activa Realtime sobre `boletos`.

## 4. Crear una rifa y generar sus números

Inserta una fila en `rifas` (puedes hacerlo desde el Table Editor de
Supabase), y luego genera sus 10,000 boletos con el endpoint admin:

```bash
curl -X POST http://localhost:3000/api/admin/generar-numeros \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: TU_ADMIN_SECRET_KEY" \
  -d '{"rifaId": "uuid-de-tu-rifa", "cantidad": 10000}'
```

## 5. Levantar el proyecto

```bash
npm run dev
```

Abre `http://localhost:3000`.

## Notas para producción

- Reemplaza la protección por header de `x-admin-secret` en
  `generar-numeros.js` por una verificación real de sesión (Supabase Auth +
  rol de administrador) antes de desplegar.
- Considera agregar un paso de "aprobar pago" (otro endpoint en
  `/api/admin/`) que mueva boletos de `reservado` a `pagado`, reutilizando
  el mismo patrón de `supabaseAdmin` + validación server-side.
- Si migras `index.jsx` a ISR (`getStaticProps` + `revalidate`), recuerda
  que los cambios de `rifas.estado`/`numeros_vendidos` tardarán hasta el
  tiempo de `revalidate` en reflejarse ahí (la página de detalle sigue
  siendo SSR + Realtime, así que la reserva en vivo no se ve afectada).
