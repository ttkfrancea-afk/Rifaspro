// src/config/supabase.js
//
// Cliente de Supabase para uso en el NAVEGADOR (componentes, páginas,
// getServerSideProps que solo leen datos públicos).
//
// Usa la ANON KEY. Es segura de exponer en el frontend porque:
//   - Todas las tablas tienen Row Level Security (RLS) habilitado.
//   - Las únicas políticas activas son de LECTURA pública (ver
//     supabase/sql/schema.sql). No existen políticas de INSERT/UPDATE/DELETE
//     para el rol anon, así que esta clave NUNCA puede escribir en la base.
//
// Las escrituras reales (reservar números, generar boletos, aprobar pagos)
// viven exclusivamente en /src/pages/api/**, usando supabaseAdmin.js.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[supabase] Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en tu .env.local'
  );
}

// Instancia única (singleton). Reutilizarla evita abrir múltiples
// conexiones/WebSockets de Realtime innecesarias cuando varios
// componentes importan este módulo.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      // Limita cuántos eventos por segundo procesamos del canal realtime;
      // suficiente para reflejar cambios de estado de boletos sin saturar
      // al cliente cuando hay mucha actividad simultánea.
      eventsPerSecond: 5,
    },
  },
});
