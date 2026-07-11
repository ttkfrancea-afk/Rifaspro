// src/config/supabaseAdmin.js
//
// Cliente de Supabase con la SERVICE ROLE KEY.
//
// ⚠️ REGLA DE ORO: este archivo SOLO debe importarse desde
// /src/pages/api/**.js. Nunca lo importes desde un componente, página,
// o cualquier código que se ejecute en el navegador.
//
// La Service Role Key IGNORA Row Level Security por completo. Es lo que
// permite que el backend reserve números y genere boletos aunque el rol
// público (anon) no tenga permiso de escritura — pero si esta clave llega
// al bundle del cliente, cualquiera podría escribir libremente en la base.
//
// Next.js nunca envía al navegador el código que solo vive en /pages/api
// (esas rutas corren exclusivamente en el servidor), así que mantener este
// archivo separado de config/supabase.js es la barrera de seguridad clave.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL; // la URL del proyecto no es secreta
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // ¡SECRETA! sin prefijo NEXT_PUBLIC_

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    '[supabaseAdmin] Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en tu .env.local'
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    // Un cliente de backend no necesita mantener ni refrescar sesión de usuario.
    persistSession: false,
    autoRefreshToken: false,
  },
});
