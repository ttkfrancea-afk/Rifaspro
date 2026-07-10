// src/pages/api/admin/generar-numeros.js
//
// Endpoint administrativo: genera los boletos '0000'..'9999' (o la
// cantidad que se indique) para una rifa.
//
// OPTIMIZACIÓN CLAVE: en vez de insertar 10,000 filas una por una (o en
// lotes) desde Node hacia Supabase —lo que implicaría serializar 10,000
// objetos, enviarlos por la red y que PostgREST los procese en un
// INSERT gigante—, delegamos todo el trabajo a una función de Postgres
// (`generar_boletos_masivo`, ver /supabase/sql/schema.sql) que usa
// generate_series para construir e insertar las 10,000 filas en UNA sola
// sentencia SQL, ejecutada enteramente dentro de la base de datos.
// Resultado: una sola llamada de red (el RPC) y una operación casi
// instantánea del lado de Postgres.

import { supabaseAdmin } from '../../../config/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // --- Protección del endpoint ---
  // Este endpoint es destructivo/masivo y NUNCA debe quedar abierto al
  // público. Aquí se usa un secreto compartido simple vía header; en
  // producción reemplázalo por una verificación real de sesión de
  // Supabase Auth + rol de administrador (ej. revisando un JWT y un claim
  // `role = 'admin'` en la tabla de perfiles).
  const secretoRecibido = req.headers['x-admin-secret'];
  if (!process.env.ADMIN_SECRET_KEY || secretoRecibido !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { rifaId, cantidad = 10000 } = req.body || {};

  if (!rifaId) {
    return res.status(400).json({ error: 'rifaId es obligatorio' });
  }
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 10000) {
    return res.status(400).json({ error: 'cantidad debe ser un entero entre 1 y 10000' });
  }

  try {
    const { error } = await supabaseAdmin.rpc('generar_boletos_masivo', {
      p_rifa_id: rifaId,
      p_cantidad: cantidad,
    });

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      mensaje: `${cantidad} boletos generados correctamente para la rifa ${rifaId}`,
    });
  } catch (err) {
    console.error('[api/admin/generar-numeros] Error inesperado:', err);
    return res.status(500).json({ error: 'Error interno al generar los boletos' });
  }
}
