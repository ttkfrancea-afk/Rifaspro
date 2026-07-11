// src/components/TarjetaRifa.jsx
//
// Tarjeta visual de una rifa para la landing page. Sigue siendo "tonta":
// no consulta Supabase ni maneja estado, solo pinta los datos que ya
// vinieron resueltos por getServerSideProps en index.jsx.
//
// Usa las variables de src/styles/globals.css (paleta --rosa-*), así que
// cambiar el tono de marca en un solo lugar cambia esta tarjeta también.

import Link from 'next/link';

export default function TarjetaRifa({ rifa }) {
  const vendidos = rifa.numeros_vendidos ?? 0;
  const total = rifa.total_numeros ?? 10000;
  const disponibles = Math.max(total - vendidos, 0);
  const porcentaje = total > 0 ? Math.min(100, Math.round((vendidos / total) * 100)) : 0;

  return (
    <Link href={`/rifa/${rifa.id}`} className="tarjeta u-entrada u-elevar">
      {rifa.imagen_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={rifa.imagen_url} alt={rifa.titulo} loading="lazy" className="tarjeta__img" />
      )}

      {/* Perforación: el detalle de sello del proyecto, como el talón de
          un boleto real separando la foto del cuerpo de la tarjeta. */}
      <div className="tarjeta__perforacion" aria-hidden="true">
        <span className="tarjeta__notch tarjeta__notch--izq" />
        <span className="tarjeta__notch tarjeta__notch--der" />
      </div>

      <div className="tarjeta__cuerpo">
        <h3 className="tarjeta__titulo">{rifa.titulo}</h3>
        {rifa.descripcion && <p className="tarjeta__desc">{rifa.descripcion}</p>}

        <p className="tarjeta__precio">
          <span className="tarjeta__precio-num">${rifa.precio_numero}</span> por número
        </p>

        <div className="tarjeta__barra">
          <div className="tarjeta__barra-rellena" style={{ width: `${porcentaje}%` }} />
        </div>
        <small className="tarjeta__meta">
          {porcentaje}% vendido · {disponibles.toLocaleString('es')} disponibles
        </small>
      </div>

      <style jsx>{`
        .tarjeta {
          display: block;
          position: relative;
          text-decoration: none;
          color: inherit;
          background: var(--rosa-tarjeta);
          border: 1px solid var(--rosa-borde);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: var(--sombra-suave);
        }
        .tarjeta:active {
          transform: scale(0.985);
        }
        .tarjeta__img {
          width: 100%;
          height: 160px;
          object-fit: cover;
        }
        .tarjeta__perforacion {
          position: relative;
          height: 1px;
          border-top: 2px dashed var(--rosa-borde);
          margin: 0 14px;
        }
        .tarjeta__notch {
          position: absolute;
          top: -7px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--rosa-fondo);
          border: 1px solid var(--rosa-borde);
        }
        .tarjeta__notch--izq { left: -21px; }
        .tarjeta__notch--der { right: -21px; }

        .tarjeta__cuerpo { padding: 18px; }
        .tarjeta__titulo {
          margin: 0 0 6px;
          font-family: var(--fuente-display);
          font-weight: 700;
          font-size: 20px;
          color: var(--vino);
        }
        .tarjeta__desc {
          margin: 0 0 10px;
          color: var(--vino-suave);
          font-size: 13.5px;
          min-height: 34px;
          line-height: 1.4;
        }
        .tarjeta__precio { margin: 0 0 10px; font-size: 14px; color: var(--vino); }
        .tarjeta__precio-num { font-weight: 700; color: var(--dorado-rosa-oscuro); }

        .tarjeta__barra {
          background: var(--rosa-suave);
          border-radius: 999px;
          height: 7px;
          overflow: hidden;
        }
        .tarjeta__barra-rellena {
          background: linear-gradient(90deg, var(--rosa-principal), var(--dorado-rosa));
          height: 100%;
          transition: width 0.4s var(--suave);
        }
        .tarjeta__meta {
          display: block;
          margin-top: 6px;
          color: var(--vino-suave);
          font-size: 12px;
        }
      `}</style>
    </Link>
  );
}
