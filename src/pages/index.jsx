// src/pages/index.jsx
//
// Landing page. Carga las rifas activas con getServerSideProps: el HTML
// llega ya listo desde el servidor (mejor SEO y "first paint" instantáneo,
// sin spinners de carga en el cliente).[span_0](start_span)[span_0](end_span)
//
// Nota de arquitectura (rendimiento): esta lista cambia con poca frecuencia
// (solo cuando el admin crea o cierra una rifa). Si en el futuro el
// tráfico crece mucho, esta misma página es una candidata perfecta para
// migrar a getStaticProps + { revalidate: 30 } (ISR): serviría desde caché
// y se regeneraría en segundo plano cada 30s, quitando por completo esta
// consulta del camino crítico de cada visita. Se deja con SSR tal como se
// pidió, para garantizar siempre el dato más fresco.[span_1](start_span)[span_1](end_span)

import Head from 'next/head';[span_2](start_span)[span_2](end_span)
import { supabase } from '../config/supabase';[span_3](start_span)[span_3](end_span)
// CORRECCIÓN: Forzamos la importación en minúsculas para evitar el bloqueo del build de Vercel
import TarjetaRifa from '../components/tarjetarifa'; 

export async function getServerSideProps() {[span_4](start_span)[span_4](end_span)
  // Seleccionamos SOLO las columnas que la tarjeta necesita — nunca
  // "select *" — para minimizar el tamaño de la respuesta y el trabajo
  // que hace Postgres por cada request.[span_5](start_span)[span_5](end_span)
  const { data: rifas, error } = await supabase[span_6](start_span)[span_6](end_span)
    .from('rifas')[span_7](start_span)[span_7](end_span)
    .select('id, titulo, descripcion, precio_numero, imagen_url, fecha_sorteo, total_numeros, numeros_vendidos')[span_8](start_span)[span_8](end_span)
    .eq('estado', 'activa')[span_9](start_span)[span_9](end_span)
    .order('created_at', { ascending: false });[span_10](start_span)[span_10](end_span)

  if (error) {[span_11](start_span)[span_11](end_span)
    console.error('[index] Error cargando rifas:', error.message);[span_12](start_span)[span_12](end_span)
  }[span_13](start_span)[span_13](end_span)

  return {
    props: { rifas: rifas ?? [] },[span_14](start_span)[span_14](end_span)
  };[span_15](start_span)[span_15](end_span)
}[span_16](start_span)[span_16](end_span)

export default function Home({ rifas }) {[span_17](start_span)[span_17](end_span)
  return (
    <>
      <Head>[span_18](start_span)[span_18](end_span)
        <title>Rifas activas</title>[span_19](start_span)[span_19](end_span)
        <meta name="description" content="Participa en nuestras rifas activas y elige tu número de la suerte." />[span_20](start_span)[span_20](end_span)
      </Head>[span_21](start_span)[span_21](end_span)

      <main className="pagina">[span_22](start_span)[span_22](end_span)
        <header className="pagina__cabecera">[span_23](start_span)[span_23](end_span)
          <h1>Rifas activas</h1>[span_24](start_span)[span_24](end_span)
          <p>Elige tu rifa, busca tu número favorito y resérvalo al instante.</p>[span_25](start_span)[span_25](end_span)
        </header>[span_26](start_span)[span_26](end_span)

        {rifas.length === 0 ? ([span_27](start_span)[span_27](end_span)
          <p className="pagina__vacio">No hay rifas activas en este momento. Vuelve pronto.</p>[span_28](start_span)[span_28](end_span)
        ) : ([span_29](start_span)[span_29](end_span)
          <div className="pagina__grid">[span_30](start_span)[span_30](end_span)
            {rifas.map((rifa) => ([span_31](start_span)[span_31](end_span)
              <TarjetaRifa key={rifa.id} rifa={rifa} />[span_32](start_span)[span_32](end_span)
            ))}[span_33](start_span)[span_33](end_span)
          </div>[span_34](start_span)[span_34](end_span)
        )}
      </main>[span_35](start_span)[span_35](end_span)

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
      `}</style>[span_36](start_span)[span_36](end_span)
      <style jsx global>{`
        body { background: #f5f3ee; margin: 0; }
      `}</style>[span_37](start_span)[span_37](end_span)
    </>
  );[span_38](start_span)[span_38](end_span)
}[span_39](start_span)[span_39](end_span)
}[span_16](start_span)[span_16](end_span)

export default function Home({ rifas }) {[span_17](start_span)[span_17](end_span)
  return (
    <>
      <Head>[span_18](start_span)[span_18](end_span)
        <title>Rifas activas</title>[span_19](start_span)[span_19](end_span)
        <meta name="description" content="Participa en nuestras rifas activas y elige tu número de la suerte." />[span_20](start_span)[span_20](end_span)
      </Head>[span_21](start_span)[span_21](end_span)

      <main className="pagina">[span_22](start_span)[span_22](end_span)
        <header className="pagina__cabecera">[span_23](start_span)[span_23](end_span)
          <h1>Rifas activas</h1>[span_24](start_span)[span_24](end_span)
          <p>Elige tu rifa, busca tu número favorito y resérvalo al instante.</p>[span_25](start_span)[span_25](end_span)
        </header>[span_26](start_span)[span_26](end_span)

        {rifas.length === 0 ? ([span_27](start_span)[span_27](end_span)
          <p className="pagina__vacio">No hay rifas activas en este momento. Vuelve pronto.</p>[span_28](start_span)[span_28](end_span)
        ) : ([span_29](start_span)[span_29](end_span)
          <div className="pagina__grid">[span_30](start_span)[span_30](end_span)
            {rifas.map((rifa) => ([span_31](start_span)[span_31](end_span)
              <TarjetaRifa key={rifa.id} rifa={rifa} />[span_32](start_span)[span_32](end_span)
            ))}[span_33](start_span)[span_33](end_span)
          </div>[span_34](start_span)[span_34](end_span)
        )}
      </main>[span_35](start_span)[span_35](end_span)

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
      `}</style>[span_36](start_span)[span_36](end_span)
      <style jsx global>{`
        body { background: #f5f3ee; margin: 0; }
      `}</style>[span_37](start_span)[span_37](end_span)
    </>
  );[span_38](start_span)[span_38](end_span)
}[span_39](start_span)[span_39](end_span)
