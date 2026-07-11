// src/pages/admin/index.jsx
//
// Panel de administracion. Trae con getServerSideProps TODOS los boletos
// (de cualquier rifa) que esten 'reservado' o 'pagado', junto con el
// titulo Y ESTADO de su rifa (para el badge verde/gris de "activa/finalizada").
//
// Paleta separada del sitio publico a proposito (--admin-* en vez de
// --rosa-*): un dashboard de operacion se lee mejor neutro y denso: la
// idea "SaaS dashboard" no es solo estetica, es una eleccion de que tan
// silencioso debe ser el fondo para que los datos destaquen.
//
// Nota de seguridad: usa supabaseAdmin (Service Role) para leer, porque
// muestra datos personales del comprador. El Token de Administrador solo
// protege las ACCIONES (aprobar/liberar); la carga de la pagina en si no
// requiere token, asi que en produccion conviene ponerla detras de
// autenticacion o de una proteccion a nivel de despliegue.

import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabaseAdmin } from '../../config/supabaseAdmin';

export async function getServerSideProps() {
  const { data: boletos, error } = await supabaseAdmin
    .from('boletos')
    .select(
      'id, numero, estado, comprador_nombre, comprador_telefono, reservado_en, pagado_en, rifas(titulo, estado)'
    )
    .in('estado', ['reservado', 'pagado'])
    .order('reservado_en', { ascending: false });

  if (error) {
    console.error('[admin/index] Error cargando boletos:', error.message);
  }

  const lista = boletos ?? [];
  const stats = {
    reservados: lista.filter((b) => b.estado === 'reservado').length,
    pagados: lista.filter((b) => b.estado === 'pagado').length,
  };

  return {
    props: { boletosIniciales: lista, stats },
  };
}

function formatoFecha(valor) {
  if (!valor) return '-';
  return new Date(valor).toLocaleString('es', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PanelAdmin({ boletosIniciales, stats }) {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [procesando, setProcesando] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const ejecutarAccion = async (boletoId, accion) => {
    if (!token.trim()) {
      setMensaje({ tipo: 'error', texto: 'Ingresa el Token de Administrador antes de continuar.' });
      return;
    }

    setProcesando(boletoId);
    setMensaje(null);

    try {
      const respuesta = await fetch('/api/admin/confirmar-pago', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': token,
        },
        body: JSON.stringify({ boletoId, accion }),
      });
      const data = await respuesta.json();

      if (!respuesta.ok) {
        setMensaje({ tipo: 'error', texto: data.error || 'No se pudo completar la accion.' });
        setProcesando(null);
        return;
      }

      router.replace(router.asPath);
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error de conexion, intentalo de nuevo.' });
      setProcesando(null);
    }
  };

  return (
    <main className="panel">
      <header className="panel__cabecera u-entrada">
        <h1>Panel de administracion</h1>
        <p>Boletos reservados o pagados en todas las rifas activas.</p>
      </header>

      <div className="panel__resumen u-entrada">
        <div className="stat">
          <span className="stat__num stat__num--dorado">{stats.reservados}</span>
          <span className="stat__label">Reservados</span>
        </div>
        <div className="stat">
          <span className="stat__num stat__num--verde">{stats.pagados}</span>
          <span className="stat__label">Pagados</span>
        </div>
      </div>

      <div className="panel__token">
        <label htmlFor="token-admin">Token de administrador</label>
        <input
          id="token-admin"
          type="password"
          autoComplete="off"
          placeholder="Pega aqui tu ADMIN_SECRET_KEY"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
      </div>

      {mensaje && (
        <p className={`panel__mensaje panel__mensaje--${mensaje.tipo}`}>{mensaje.texto}</p>
      )}

      {boletosIniciales.length === 0 ? (
        <p className="panel__vacio">No hay boletos reservados o pagados por el momento.</p>
      ) : (
        <div className="panel__tabla-contenedor">
          <table className="panel__tabla">
            <thead>
              <tr>
                <th>Rifa</th>
                <th>Numero</th>
                <th>Comprador</th>
                <th>Telefono</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {boletosIniciales.map((boleto) => (
                <tr key={boleto.id}>
                  <td>
                    <div className="panel__rifa">
                      <span>{boleto.rifas?.titulo || '-'}</span>
                      {boleto.rifas?.estado && (
                        <span className={`panel__pill-mini panel__pill-mini--${boleto.rifas.estado}`}>
                          {boleto.rifas.estado === 'activa' ? 'Activa' : 'Finalizada'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="panel__numero">{boleto.numero}</td>
                  <td>{boleto.comprador_nombre || '-'}</td>
                  <td>{boleto.comprador_telefono || '-'}</td>
                  <td>
                    <span className={`panel__pill panel__pill--${boleto.estado}`}>
                      {boleto.estado}
                    </span>
                  </td>
                  <td>{formatoFecha(boleto.reservado_en)}</td>
                  <td>
                    <div className="panel__acciones">
                      <button
                        type="button"
                        className="btn btn--aprobar u-presion"
                        disabled={procesando === boleto.id || boleto.estado === 'pagado'}
                        onClick={() => ejecutarAccion(boleto.id, 'aprobar')}
                      >
                        {procesando === boleto.id ? 'Procesando...' : 'Aprobar pago'}
                      </button>
                      <button
                        type="button"
                        className="btn btn--liberar u-presion"
                        disabled={procesando === boleto.id}
                        onClick={() => ejecutarAccion(boleto.id, 'liberar')}
                      >
                        {procesando === boleto.id ? 'Procesando...' : 'Liberar numero'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .panel {
          max-width: 1100px;
          margin: 0 auto;
          padding: 32px 20px 64px;
          color: var(--admin-tinta);
        }
        .panel__cabecera { margin-bottom: 20px; }
        .panel__cabecera h1 {
          font-family: var(--fuente-display);
          font-weight: 700;
          font-size: 28px;
          margin: 0 0 6px;
        }
        .panel__cabecera p { color: var(--admin-tinta-suave); margin: 0; }

        .panel__resumen { display: flex; gap: 12px; margin-bottom: 20px; }
        .stat {
          flex: 1;
          max-width: 160px;
          padding: 14px 18px;
          border-radius: 12px;
          background: var(--admin-superficie);
          border: 1px solid var(--admin-borde);
          box-shadow: var(--sombra-admin);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .stat__num { font-size: 26px; font-weight: 700; line-height: 1; }
        .stat__num--dorado { color: var(--admin-dorado); }
        .stat__num--verde { color: var(--admin-verde); }
        .stat__label { font-size: 12px; color: var(--admin-tinta-suave); }

        .panel__token {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-width: 360px;
          margin-bottom: 20px;
          padding: 14px 16px;
          border: 1px solid var(--admin-borde);
          border-radius: 12px;
          background: var(--admin-superficie);
        }
        .panel__token label {
          font-size: 12px;
          font-weight: 600;
          color: var(--admin-tinta-suave);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .panel__token input {
          padding: 9px 10px;
          border: 1px solid var(--admin-borde);
          border-radius: 8px;
          font-size: 14px;
          font-family: var(--fuente-mono);
        }
        .panel__token input:focus {
          outline: none;
          border-color: var(--admin-dorado);
          box-shadow: 0 0 0 3px rgba(201, 162, 39, 0.18);
        }

        .panel__mensaje {
          padding: 9px 14px;
          border-radius: 8px;
          font-size: 13.5px;
          margin-bottom: 18px;
          max-width: 560px;
        }
        .panel__mensaje--ok { background: var(--admin-verde-bg); color: var(--admin-verde); }
        .panel__mensaje--error { background: var(--admin-rojo-bg); color: var(--admin-rojo); }

        .panel__vacio { color: var(--admin-tinta-suave); }

        .panel__tabla-contenedor {
          overflow-x: auto;
          border: 1px solid var(--admin-borde);
          border-radius: 14px;
          background: var(--admin-superficie);
          box-shadow: var(--sombra-admin);
        }
        .panel__tabla {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
          min-width: 780px;
        }
        .panel__tabla thead th {
          text-align: left;
          padding: 12px 16px;
          background: var(--admin-tinta);
          color: #f4f3f1;
          font-size: 11.5px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
          white-space: nowrap;
        }
        .panel__tabla tbody td {
          padding: 12px 16px;
          border-top: 1px solid var(--admin-borde);
          vertical-align: middle;
          white-space: nowrap;
        }
        .panel__tabla tbody tr {
          transition: background 0.15s ease;
        }
        .panel__tabla tbody tr:hover { background: #faf9f7; }

        .panel__rifa { display: flex; align-items: center; gap: 8px; }
        .panel__pill-mini {
          font-size: 10.5px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .panel__pill-mini--activa { background: var(--admin-verde-bg); color: var(--admin-verde); }
        .panel__pill-mini--finalizada { background: var(--admin-gris-bg); color: var(--admin-gris); }

        .panel__numero {
          font-family: var(--fuente-mono);
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }

        .panel__pill {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
        }
        .panel__pill--reservado { background: var(--admin-dorado-bg); color: var(--admin-dorado); }
        .panel__pill--pagado { background: var(--admin-verde-bg); color: var(--admin-verde); }

        .panel__acciones { display: flex; gap: 8px; }
        .btn {
          border: none;
          border-radius: 8px;
          padding: 8px 14px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }
        .btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .btn--aprobar { background: var(--admin-verde); color: #ffffff; }
        .btn--aprobar:not(:disabled):hover { background: #17703f; }
        .btn--liberar {
          background: transparent;
          color: var(--admin-rojo);
          border: 1.5px solid var(--admin-rojo);
        }
        .btn--liberar:not(:disabled):hover { background: var(--admin-rojo); color: #ffffff; }

        @media (min-width: 640px) {
          .panel { padding: 48px 32px 80px; }
        }
      `}</style>
      <style jsx global>{`
        body { background: var(--admin-fondo); margin: 0; }
      `}</style>
    </main>
  );
}
