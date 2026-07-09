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
