// src/pages/rifa/[id].jsx
//
// Página de una rifa específica. Usa SSR (getServerSideProps) en lugar de
// ISR a propósito: a diferencia de la landing, aquí el estado de los
// boletos cambia constantemente (reservas en vivo), así que necesitamos
// el dato más fresco posible en cada visita. La actualización *después*
// de la carga inicial la maneja Cuadricula.jsx vía Supabase Realtime, sin
// volver a golpear esta ruta.

import Head from 'next/head';
import { supabase } from '../../config/supabase';
import Cuadricula from '../../components/Cuadricula';

export async function getServerSideProps({ params }) {
  const { id } = params;

  // 1) Datos de la rifa: una sola fila, consulta muy liviana.
  const { data: rifa, error: errorRifa } = await supabase
    .from('rifas')
    .select('id, titulo, descripcion, precio_numero, imagen_url, fecha_sorteo, total_numeros, estado')
    .eq('id', id)
    .single();

  if (errorRifa || !rifa) {
    return { notFound: true };
  }

  // 2) Boletos: pedimos ÚNICAMENTE `numero` y `estado` (2 columnas), nunca
  // datos del comprador — eso reduce drásticamente el peso de traer hasta
  // 10,000 filas en cada carga de página.
  const { data: boletos, error: errorBoletos } = await supabase
    .from('boletos')
    .select('numero, estado')
    .eq('rifa_id', id);

  if (errorBoletos) {
    console.error('[rifa/[id]] Error cargando boletos:', errorBoletos.message);
  }

  // Convertimos la lista a un array plano indexado 0..N-1. Así el cliente
  // hace lecturas O(1) por índice en vez de buscar en un array de objetos.
  const estadoInicial = new Array(rifa.total_numeros).fill('disponible');
  (boletos ?? []).forEach((b) => {
    const idx = parseInt(b.numero, 10);
    if (idx >= 0 && idx < estadoInicial.length) estadoInicial[idx] = b.estado;
  });

  return {
    props: { rifa, estadoInicial },
  };
}

export default function PaginaRifa({ rifa, estadoInicial }) {
  return (
    <>
      <Head>
        <title>{rifa.titulo} | Rifas</title>
        <meta name="description" content={rifa.descripcion || rifa.titulo} />
      </Head>

      <main className="pagina">
        <h1>{rifa.titulo}</h1>
        {rifa.descripcion && <p className="pagina__desc">{rifa.descripcion}</p>}
        <p className="pagina__precio">Precio por número: ${rifa.precio_numero}</p>

        {rifa.estado !== 'activa' ? (
          <p className="pagina__cerrada">Esta rifa ya no está activa.</p>
        ) : (
          <Cuadricula
            rifaId={rifa.id}
            estadoInicial={estadoInicial}
            totalNumeros={rifa.total_numeros}
            precioNumero={rifa.precio_numero}
          />
        )}
      </main>

      <style jsx>{`
        .pagina {
          max-width: 1100px;
          margin: 0 auto;
          padding: 40px 20px 64px;
          font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
          color: #1b2340;
        }
        .pagina h1 { font-family: ui-serif, Georgia, 'Iowan Old Style', serif; margin-bottom: 6px; }
        .pagina__desc { color: #5b5748; margin: 0 0 6px; }
        .pagina__precio { margin: 0 0 20px; font-weight: 600; }
        .pagina__cerrada { color: #9b3a2c; }
      `}</style>
      <style jsx global>{`
        body { background: #f5f3ee; margin: 0; }
      `}</style>
    </>
  );
}
