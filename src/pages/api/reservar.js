// src/pages/api/reservar.js
//
// Endpoint que procesa la reserva de un número. TODA la lógica sensible
// vive aquí — el cliente nunca escribe directamente en la tabla `boletos`
// (las políticas RLS se lo impiden), así que este es el único camino
// posible para reservar un número.
//
// CONCURRENCIA: el corazón de este archivo es el UPDATE con condición
// `estado = 'disponible'`. Si 500 personas presionan "reservar" sobre el
// mismo número al mismo milisegundo, Postgres serializa esas escrituras a
// nivel de fila: solo UNA transacción encontrará la fila todavía en estado
// 'disponible' en el instante exacto de su UPDATE; para todas las demás,
// la condición ya no se cumple (la fila cambió) y el UPDATE afecta 0 filas.
// Eso nos basta para detectar, sin locks manuales ni tablas auxiliares,
// quién "ganó la carrera" por ese número.

import { supabaseAdmin } from '../../config/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { rifaId, numero, nombre, telefono } = req.body || {};

  // --- Validación estricta de entrada ---
  if (!rifaId || !numero || !nombre || !telefono) {
    return res.status(400).json({
      error: 'Faltan datos obligatorios: rifaId, numero, nombre y telefono',
    });
  }
  if (typeof numero !== 'string' || !/^\d{4}$/.test(numero)) {
    return res.status(400).json({ error: 'El número debe tener exactamente 4 dígitos (0000-9999)' });
  }
  if (typeof nombre !== 'string' || nombre.trim().length < 2) {
    return res.status(400).json({ error: 'Nombre inválido' });
  }
  if (typeof telefono !== 'string' || telefono.trim().length < 6) {
    return res.status(400).json({ error: 'Teléfono inválido' });
  }

  try {
    // --- Reserva atómica ---
    // .eq('estado', 'disponible') es la condición que resuelve la carrera:
    // si otra transacción ya cambió el estado, esta consulta no encuentra
    // ninguna fila que actualizar y .single() lanza un error controlado.
    const { data, error } = await supabaseAdmin
      .from('boletos')
      .update({
        estado: 'reservado',
        comprador_nombre: nombre.trim(),
        comprador_telefono: telefono.trim(),
        reservado_en: new Date().toISOString(),
      })
      .eq('rifa_id', rifaId)
      .eq('numero', numero)
      .eq('estado', 'disponible')
      .select()
      .single();

    if (error) {
      // PGRST116: PostgREST no encontró ninguna fila que cumpliera el WHERE
      // (numero ya reservado/pagado, o rifaId/numero inexistentes).
      if (error.code === 'PGRST116') {
        return res.status(409).json({ error: 'Ese número ya no está disponible, elige otro.' });
      }
      throw error;
    }

    return res.status(200).json({ ok: true, boleto: data });
  } catch (err) {
    console.error('[api/reservar] Error inesperado:', err);
    return res.status(500).json({ error: 'Error interno al procesar la reserva' });
  }
}
