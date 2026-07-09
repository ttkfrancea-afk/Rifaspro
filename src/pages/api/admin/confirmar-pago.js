// src/pages/api/admin/confirmar-pago.js
//
// Endpoint administrativo que aprueba un pago o libera un boleto reservado.
// Solo accesible mediante el secreto compartido para garantizar que nadie
// altere el estado de los boletos sin autorización.

import { supabaseAdmin } from '../../../config/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // --- Protección del endpoint ---
  const secretoRecibido = req.headers['x-admin-secret'];
  if (!process.env.ADMIN_SECRET_KEY || secretoRecibido !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { boletoId, accion } = req.body || {};

  // --- Validación estricta de entrada ---
  if (!boletoId) {
    return res.status(400).json({ error: 'boletoId es obligatorio' });
  }
  if (!accion || !['aprobar', 'liberar'].includes(accion)) {
    return res.status(400).json({ error: "La acción debe ser 'aprobar' o 'liberar'" });
  }

  try {
    let camposActualizados = {};

    if (accion === 'aprobar') {
      camposActualizados = {
        estado: 'pagado',
        pagado_en: new Date().toISOString(),
      };
    } else if (accion === 'liberar') {
      // Reseteamos el boleto por completo devolviéndolo a 'disponible'
      camposActualizados = {
        estado: 'disponible',
        comprador_nombre: null,
        comprador_telefono: null,
        reservado_en: null,
        pagado_en: null,
      };
    }

    const { data, error } = await supabaseAdmin
      .from('boletos')
      .update(camposActualizados)
      .eq('id', boletoId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.status(200).json({
      ok: true,
      mensaje: `Boleto modificado correctamente con la acción: ${accion}`,
      boleto: data,
    });
  } catch (err) {
    console.error('[api/admin/confirmar-pago] Error inesperado:', err);
    return res.status(500).json({ error: 'Error interno al procesar el cambio de estado del boleto' });
  }
    }
  
