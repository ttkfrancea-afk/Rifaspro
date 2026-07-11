// src/pages/index.jsx
//
// Landing page. Carga las rifas activas con getServerSideProps: el HTML
// llega ya listo desde el servidor (mejor SEO y "first paint" instantaneo).
//
// Nota de arquitectura (rendimiento): esta lista cambia con poca frecuencia
// (solo cuando el admin crea o cierra una rifa). Si el trafico crece mucho,
// esta pagina es candidata perfecta para getStaticProps + revalidate (ISR).
// Se deja con SSR tal como se definio originalmente, para garantizar
// siempre el dato mas fresco.

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

// Pequeno motivo floral de linea: la "firma" visual de la pagina. Un solo
// acento, no un patron repetido — eso es lo que lo hace lucir premium en
// vez de recargado.
function FlorFirma() {
  return (
    <svg viewBox="0 0 120 24" width="120" height="24" aria-hidden="true" className="flor-firma">
      <line x1="0" y1="12" x2="46" y2="12" stroke="#e9cdd2" strokeWidth="1.5" />
      <line x1="74" y1="12" x2="120" y2="12" stroke="#e9cdd2" strokeWidth="1.5" />
      <g transform="translate(60 12)">
        <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#c97b8c" opacity="0.85" />
        <ellipse cx="5.5" cy="-2" rx="4" ry="6" fill="#c97b8c" opacity="0.7" transform="rotate(72 5.5 -2)" />
        <ellipse cx="3.5" cy="5" rx="4" ry="6" fill="#c97b8c" opacity="0.7" transform="rotate(144 3.5 5)" />
        <ellipse cx="-3.5" cy="5" rx="4" ry="6" fill="#c97b8c" opacity="0.7" transform="rotate(216 -3.5 5)" />
        <ellipse cx="-5.5" cy="-2" rx="4" ry="6" fill="#c97b8c" opacity="0.7" transform="rotate(288 -5.5 -2)" />
        <circle cx="0" cy="0" r="3" fill="#c9a876" />
      </g>
    </svg>
  );
}

export default function Home({ rifas }) {
  return (
    <>
      <Head>
        <title>Rifas activas</title>
        <meta name="description" content="Participa en nuestras rifas activas y elige tu numero de la suerte." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="pagina">
        <header className="pagina__cabecera u-entrada">
          <h1>Rifas activas</h1>
          <FlorFirma />
          <p>Elige tu rifa, busca tu numero favorito y reservalo al instante.</p>
        </header>

        {rifas.length === 0 ? (
          <div className="pagina__vacio u-entrada">
            <p className="pagina__vacio-titulo">Por ahora no hay rifas activas.</p>
            <p className="pagina__vacio-sub">La proxima estara aqui muy pronto — vuelve a pasar.</p>
          </div>
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
          padding: 32px 20px 64px;
          color: var(--vino);
        }
        .pagina__cabecera {
          margin-bottom: 28px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
        }
        .pagina__cabecera h1 {
          font-family: var(--fuente-display);
          font-weight: 700;
          font-size: 34px;
          margin: 0;
        }
        .pagina__cabecera p { color: var(--vino-suave); margin: 4px 0 0; }
        .pagina__vacio {
          padding: 40px 24px;
          border: 1px dashed var(--rosa-borde);
          border-radius: 16px;
          background: var(--rosa-tarjeta);
        }
        .pagina__vacio-titulo { margin: 0 0 4px; font-weight: 600; color: var(--vino); }
        .pagina__vacio-sub { margin: 0; color: var(--vino-suave); font-size: 14px; }
        .pagina__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
        }

        @media (min-width: 640px) {
          .pagina { padding: 48px 32px 80px; }
          .pagina__cabecera h1 { font-size: 40px; }
        }
      `}</style>
      <style jsx global>{`
        body { background: var(--rosa-fondo); margin: 0; }
      `}</style>
    </>
  );
}
