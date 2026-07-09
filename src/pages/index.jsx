import Head from 'next/head';
import { supabase } from '../config/supabase';
import TarjetaRifa from '../components/TarjetaRifa'; 

export async function getServerSideProps() {
  const { data: rifas, error } = await supabase
    .from('rifas')
    .select('id, titulo, descripcion, precio_numero, imagen_url, fecha_sorteo, total_numeros, numeros_vendidos')
    .eq('estado', 'activa')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[index] Error cargando rifas:', error.message);
  }

  return {
    props: { rifas: rifas ?? [] },
  };
}

export default function Home({ rifas }) {
  return (
    <>
      <Head>
        <title>Rifas activas</title>
        <meta name="description" content="Participa en nuestras rifas activas y elige tu número de la suerte." />
      </Head>

      <main className="pagina">
        <header className="pagina__cabecera">
          <h1>Rifas activas</h1>
          <p>Elige tu rifa, busca tu número favorito y resérvalo al instante.</p>
        </header>

        {rifas.length === 0 ? (
          <p className="pagina__vacio">No hay rifas activas en este momento. Vuelve pronto.</p>
        ) : (
          <div className="pagina__grid">
            {rifas.map((rifa) => (
              <TarjetaRifa key={rifa.id} rifa={rifa} />
            ))}
          </div>
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
        .pagina__cabecera { margin-bottom: 28px; }
        .pagina__cabecera h1 {
          font-family: ui-serif, Georgia, 'Iowan Old Style', serif;
          font-size: 32px;
          margin: 0 0 6px;
        }
        .pagina__cabecera p { color: #5b5748; margin: 0; }
        .pagina__vacio { color: #5b5748; }
        .pagina__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
        }
      `}</style>
      <style jsx global>{`
        body { background: #f5f3ee; margin: 0; }
      `}</style>
    </>
  );
}
