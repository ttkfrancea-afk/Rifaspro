// src/pages/rifa/[id].jsx
//
// Pagina de una rifa especifica. Usa SSR (getServerSideProps) porque el
// estado de los boletos cambia constantemente; Cuadricula.jsx toma el
// relevo despues de la carga inicial via Supabase Realtime.

import Head from 'next/head';
import { supabase } from '../../config/supabase';
import Cuadricula from '../../components/Cuadricula';

export async function getServerSideProps({ params }) {
  const { id } = params;

  const { data: rifa, error: errorRifa } = await supabase
    .from('rifas')
    .select('id, titulo, descripcion, precio_numero, imagen_url, fecha_sorteo, total_numeros, estado')
    .eq('id', id)
    .single();

  if (errorRifa || !rifa) {
    return { notFound: true };
  }

  const { data: boletos, error: errorBoletos } = await supabase
    .from('boletos')
    .select('numero, estado')
    .eq('rifa_id', id);

  if (errorBoletos) {
    console.error('[rifa/[id]] Error cargando boletos:', errorBoletos.message);
  }

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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="pagina">
        <div className="pagina__intro u-entrada">
          <h1>{rifa.titulo}</h1>
          {rifa.descripcion && <p className="pagina__desc">{rifa.descripcion}</p>}
          <p className="pagina__precio">Precio por numero: ${rifa.precio_numero}</p>
        </div>

        {rifa.estado !== 'activa' ? (
          <p className="pagina__cerrada">Esta rifa ya no esta activa.</p>
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
          padding: 32px 20px 64px;
          color: var(--vino);
        }
        .pagina__intro { margin-bottom: 20px; }
        .pagina h1 {
          font-family: var(--fuente-display);
          font-weight: 700;
          font-size: 28px;
          margin: 0 0 6px;
        }
        .pagina__desc { color: var(--vino-suave); margin: 0 0 6px; }
        .pagina__precio { margin: 0; font-weight: 600; }
        .pagina__cerrada { color: var(--rojo-suave); }

        @media (min-width: 640px) {
          .pagina { padding: 48px 32px 80px; }
          .pagina h1 { font-size: 34px; }
        }
      `}</style>
      <style jsx global>{`
        body { background: var(--rosa-fondo); margin: 0; }
      `}</style>
    </>
  );
}
