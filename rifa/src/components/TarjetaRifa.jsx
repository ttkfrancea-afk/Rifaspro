// src/components/TarjetaRifa.jsx
//
// Tarjeta visual de una rifa para la landing page. Es intencionalmente
// "tonta": no consulta Supabase ni maneja estado, solo pinta los datos
// que ya vinieron resueltos por getServerSideProps en index.jsx. Esto la
// hace trivial de cachear/reutilizar y no genera llamadas extra a la base.

import Link from 'next/link';

export default function TarjetaRifa({ rifa }) {
  const vendidos = rifa.numeros_vendidos ?? 0;
  const total = rifa.total_numeros ?? 10000;
  const disponibles = Math.max(total - vendidos, 0);
  const porcentaje = total > 0 ? Math.min(100, Math.round((vendidos / total) * 100)) : 0;

  return (
    <Link href={`/rifa/${rifa.id}`} className="tarjeta">
      {rifa.imagen_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={rifa.imagen_url} alt={rifa.titulo} loading="lazy" className="tarjeta__img" />
      )}

      {/* Línea "perforada" — el detalle de sello del proyecto: separa la
          imagen del cuerpo como el talón de un boleto real. */}
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
          background: #fffdf9;
          border: 1px solid #e4e1d8;
          border-radius: 14px;
          overflow: hidden;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .tarjeta:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 28px rgba(27, 35, 64, 0.12);
        }
        .tarjeta__img {
          width: 100%;
          height: 160px;
          object-fit: cover;
          display: block;
        }
        .tarjeta__perforacion {
          position: relative;
          height: 1px;
          border-top: 2px dashed #d8d4c8;
          margin: 0 14px;
        }
        .tarjeta__notch {
          position: absolute;
          top: -7px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #f5f3ee; /* debe igualar el fondo de la página */
          border: 1px solid #e4e1d8;
        }
        .tarjeta__notch--izq { left: -21px; }
        .tarjeta__notch--der { right: -21px; }

        .tarjeta__cuerpo { padding: 18px; }
        .tarjeta__titulo {
          margin: 0 0 6px;
          font-family: ui-serif, Georgia, 'Iowan Old Style', serif;
          font-size: 19px;
          color: #1b2340;
        }
        .tarjeta__desc {
          margin: 0 0 10px;
          color: #5b5748;
          font-size: 13.5px;
          min-height: 34px;
          line-height: 1.4;
        }
        .tarjeta__precio { margin: 0 0 10px; font-size: 14px; color: #1b2340; }
        .tarjeta__precio-num { font-weight: 700; color: #a8841d; }

        .tarjeta__barra {
          background: #ece8dd;
          border-radius: 999px;
          height: 7px;
          overflow: hidden;
        }
        .tarjeta__barra-rellena {
          background: linear-gradient(90deg, #c9a227, #a8841d);
          height: 100%;
        }
        .tarjeta__meta {
          display: block;
          margin-top: 6px;
          color: #7a7666;
          font-size: 12px;
        }
      `}</style>
    </Link>
  );
}
