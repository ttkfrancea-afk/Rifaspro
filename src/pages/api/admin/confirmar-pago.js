// src/pages/api/admin/confirmar-pago.js
//
// Endpoint administrativo que resuelve el ciclo de vida de un boleto ya
// reservado: 'aprobar' lo marca como pagado, 'liberar' lo devuelve a
// disponible y borra los datos del comprador. Igual que reservar.js, toda
// la escritura ocurre aquí — nunca desde el navegador — usando
// supabaseAdmin (Service Role Key) para pasar por encima de RLS.

import { supabaseAdmin } from '../../../config/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // --- Protección del endpoint ---
  // Misma verificación que en generar-numeros.js: un secreto compartido
  // simple vía header. En producción, reemplázalo por una verificación
  // real de sesión de Supabase Auth + rol de administrador.
  const secretoRecibido = req.headers['x-admin-secret'];
  if (!process.env.ADMIN_SECRET_KEY || secretoRecibido !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { boletoId, accion } = req.body || {};

  // --- Validación estricta de entrada ---
  if (!boletoId) {
    return res.status(400).json({ error: 'boletoId es obligatorio' });
  }
  if (accion !== 'aprobar' && accion !== 'liberar') {
    return res.status(400).json({ error: "accion debe ser 'aprobar' o 'liberar'" });
  }

  try {
    if (accion === 'aprobar') {
      // Solo se puede aprobar un boleto que esté actualmente 'reservado'.
      // Esta condición en el .eq() evita marcar como pagado un número que
      // nunca fue apartado o que ya estaba pagado, sin necesidad de una
      // consulta previa de lectura.
      const { data, error } = await supabaseAdmin
        .from('boletos')
        .update({
          estado: 'pagado',
          pagado_en: new Date().toISOString(),
        })
        .eq('id', boletoId)
        .eq('estado', 'reservado')
        .select()
        .single();

      if (error) {
        // PGRST116: PostgREST no encontró ninguna fila que cumpliera el WHERE
        // (el boleto no existe o ya no está en estado 'reservado').
        if (error.code === 'PGRST116') {
          return res.status(409).json({
            error: 'El boleto no existe o ya no está en estado "reservado".',
          });
        }
        throw error;
      }

      return res.status(200).json({ ok: true, boleto: data });
    }

    // accion === 'liberar'
    // Regresa el boleto a 'disponible' y limpia todos los datos del
    // comprador. Se permite liberar tanto boletos 'reservado' como
    // 'pagado' (ej. cancelar una venta ya confirmada).
    const { data, error } = await supabaseAdmin
      .from('boletos')
      .update({
        estado: 'disponible',
        comprador_nombre: null,
        comprador_telefono: null,
        reservado_en: null,
        pagado_en: null,
      })
      .eq('id', boletoId)
      .in('estado', ['reservado', 'pagado'])
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(409).json({
          error: 'El boleto ya está disponible o no existe.',
        });
      }
      throw error;
    }

    return res.status(200).json({ ok: true, boleto: data });
  } catch (err) {
    console.error('[api/admin/confirmar-pago] Error inesperado:', err);
    return res.status(500).json({ error: 'Error interno al procesar la acción' });
  }
}
