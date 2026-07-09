// src/pages/rifa/[id].jsx
//
// Página de una rifa específica. Usa SSR (getServerSideProps) en lugar de
// ISR a propósito: a diferencia de la landing, aquí el estado de los
// boletos cambia constantemente (reservas en vivo), así que necesitamos
// el dato más fresco posible en cada visita. La actualización *después*
// de la carga inicial la maneja Cuadricula.jsx vía Supabase Realtime, sin
// volver a golpear esta ruta.[span_40](start_span)[span_40](end_span)

import Head from 'next/head';[span_41](start_span)[span_41](end_span)
import { supabase } from '../../config/supabase';[span_42](start_span)[span_42](end_span)
// CORRECCIÓN: Forzamos la importación en minúsculas para asegurar compatibilidad con Git y Linux
import Cuadricula from '../../components/cuadricula'; 

export async function getServerSideProps({ params }) {[span_43](start_span)[span_43](end_span)
  const { id } = params;[span_44](start_span)[span_44](end_span)

  // 1) Datos de la rifa: una sola fila, consulta muy liviana.[span_45](start_span)[span_45](end_span)
  const { data: rifa, error: errorRifa } = await supabase[span_46](start_span)[span_46](end_span)
    .from('rifas')[span_47](start_span)[span_47](end_span)
    .select('id, titulo, descripcion, precio_numero, imagen_url, fecha_sorteo, total_numeros, estado')[span_48](start_span)[span_48](end_span)
    .eq('id', id)[span_49](start_span)[span_49](end_span)
    .single();[span_50](start_span)[span_50](end_span)

  if (errorRifa || !rifa) {[span_51](start_span)[span_51](end_span)
    return { notFound: true };[span_52](start_span)[span_52](end_span)
  }

  // 2) Boletos: pedimos ÚNICAMENTE `numero` y `estado` (2 columnas), nunca[span_53](start_span)[span_53](end_span)
  // datos del comprador — eso reduce drásticamente el peso de traer hasta[span_54](start_span)[span_54](end_span)
  // 10,000 filas en cada carga de página.[span_55](start_span)[span_55](end_span)
  const { data: boletos, error: errorBoletos } = await supabase[span_56](start_span)[span_56](end_span)
    .from('boletos')[span_57](start_span)[span_57](end_span)
    .select('numero, estado')[span_58](start_span)[span_58](end_span)
    .eq('rifa_id', id);[span_59](start_span)[span_59](end_span)

  if (errorBoletos) {[span_60](start_span)[span_60](end_span)
    console.error('[rifa/[id]] Error cargando boletos:', errorBoletos.message);[span_61](start_span)[span_61](end_span)
  }[span_62](start_span)[span_62](end_span)

  // Convertimos la lista a un array plano indexado 0..N-1. Así el cliente[span_63](start_span)[span_63](end_span)
  // hace lecturas O(1) por índice en vez de buscar en un array de objetos.[span_64](start_span)[span_64](end_span)
  const estadoInicial = new Array(rifa.total_numeros).fill('disponible');[span_65](start_span)[span_65](end_span)
  (boletos ?? []).forEach((b) => {[span_66](start_span)[span_66](end_span)
    const idx = parseInt(b.numero, 10);[span_67](start_span)[span_67](end_span)
    if (idx >= 0 && idx < estadoInicial.length) estadoInicial[idx] = b.estado;[span_68](start_span)[span_68](end_span)
  });[span_69](start_span)[span_69](end_span)

  return {
    props: { rifa, estadoInicial },[span_70](start_span)[span_70](end_span)
  };[span_71](start_span)[span_71](end_span)
}[span_72](start_span)[span_72](end_span)

export default function PaginaRifa({ rifa, estadoInicial }) {[span_73](start_span)[span_73](end_span)
  return (
    <>
      <Head>[span_74](start_span)[span_74](end_span)
        <title>{rifa.titulo} | Rifas</title>[span_75](start_span)[span_75](end_span)
        <meta name="description" content={rifa.descripcion || rifa.titulo} />[span_76](start_span)[span_76](end_span)
      </Head>[span_77](start_span)[span_77](end_span)

      <main className="pagina">[span_78](start_span)[span_78](end_span)
        <h1>{rifa.titulo}</h1>[span_79](start_span)[span_79](end_span)
        {rifa.descripcion && <p className="pagina__desc">{rifa.descripcion}</p>}[span_80](start_span)[span_80](end_span)
        <p className="pagina__precio">Precio por número: ${rifa.precio_numero}</p>[span_81](start_span)[span_81](end_span)

        {rifa.estado !== 'activa' ? ([span_82](start_span)[span_82](end_span)
          <p className="pagina__cerrada">Esta rifa ya no está activa.</p>[span_83](start_span)[span_83](end_span)
        ) : ([span_84](start_span)[span_84](end_span)
          <Cuadricula[span_85](start_span)[span_85](end_span)
            rifaId={rifa.id}[span_86](start_span)[span_86](end_span)
            estadoInicial={estadoInicial}[span_87](start_span)[span_87](end_span)
            totalNumeros={rifa.total_numeros}[span_88](start_span)[span_88](end_span)
            precioNumero={rifa.precio_numero}[span_89](start_span)[span_89](end_span)
          />[span_90](start_span)[span_90](end_span)
        )}
      </main>[span_91](start_span)[span_91](end_span)

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
      `}</style>[span_92](start_span)[span_92](end_span)
      <style jsx global>{`
        body { background: #f5f3ee; margin: 0; }
      `}</style>[span_93](start_span)[span_93](end_span)
    </>
  );[span_94](start_span)[span_94](end_span)
}[span_95](start_span)[span_95](end_span)
