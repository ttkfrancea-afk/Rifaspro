// src/pages/admin/index.jsx
//
// Panel de administración. Trae con getServerSideProps TODOS los boletos
// (de cualquier rifa) que estén 'reservado' o 'pagado', junto con el
// título de su rifa para poder distinguirlos cuando hay varios sorteos
// activos a la vez.
//
// Nota de seguridad: esta página usa supabaseAdmin (Service Role) para
// leer, en vez del cliente público, porque muestra datos personales del
// comprador (nombre, teléfono) — no queremos depender de que las
// políticas RLS de lectura pública sigan siendo permisivas para siempre.
// El Token de Administrador solo protege las ACCIONES (aprobar/liberar),
// tal como se pidió, para no montar un sistema de Auth completo en esta
// fase; ten en cuenta que la sola carga de esta página no requiere el
// token, así que en producción conviene ponerla detrás de autenticación
// o de una protección a nivel de despliegue.

import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabaseAdmin } from '../../config/supabaseAdmin';

export async function getServerSideProps() {
  const { data: boletos, error } = await supabaseAdmin
    .from('boletos')
    .select(
      'id, numero, estado, comprador_nombre, comprador_telefono, reservado_en, pagado_en, rifas(titulo)'
    )
    .in('estado', ['reservado', 'pagado'])
    .order('reservado_en', { ascending: false });

  if (error) {
    console.error('[admin/index] Error cargando boletos:', error.message);
  }

  return {
    props: { boletosIniciales: boletos ?? [] },
  };
}

function formatoFecha(valor) {
  if (!valor) return '—';
  return new Date(valor).toLocaleString('es', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PanelAdmin({ boletosIniciales }) {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [procesando, setProcesando] = useState(null); // id del boleto en curso
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
        setMensaje({ tipo: 'error', texto: data.error || 'No se pudo completar la acción.' });
        setProcesando(null);
        return;
      }

      // Volvemos a pedir los props al servidor: la forma más simple y
      // segura de reflejar el estado real de la base de datos tras la
      // acción, sin mantener lógica de sincronización duplicada en el cliente.
      router.replace(router.asPath);
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error de conexión, inténtalo de nuevo.' });
      setProcesando(null);
    }
  };

  return (
    <main className="panel">
      <header className="panel__cabecera">
        <h1>Panel de administración</h1>
        <p>Boletos reservados o pagados en todas las rifas activas.</p>
      </header>

      <div className="panel__token">
        <label htmlFor="token-admin">Token de administrador</label>
        <input
          id="token-admin"
          type="password"
          autoComplete="off"
          placeholder="Pega aquí tu ADMIN_SECRET_KEY"
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
                <th>Número</th>
                <th>Comprador</th>
                <th>Teléfono</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {boletosIniciales.map((boleto) => (
                <tr key={boleto.id}>
                  <td>{boleto.rifas?.titulo || '—'}</td>
                  <td className="panel__numero">{boleto.numero}</td>
                  <td>{boleto.comprador_nombre || '—'}</td>
                  <td>{boleto.comprador_telefono || '—'}</td>
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
                        className="btn btn--aprobar"
                        disabled={procesando === boleto.id || boleto.estado === 'pagado'}
                        onClick={() => ejecutarAccion(boleto.id, 'aprobar')}
                      >
                        {procesando === boleto.id ? 'Procesando…' : 'Aprobar pago'}
                      </button>
                      <button
                        type="button"
                        className="btn btn--liberar"
                        disabled={procesando === boleto.id}
                        onClick={() => ejecutarAccion(boleto.id, 'liberar')}
                      >
                        {procesando === boleto.id ? 'Procesando…' : 'Liberar número'}
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
          padding: 40px 20px 64px;
          font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
          color: #1b2340;
        }
        .panel__cabecera { margin-bottom: 24px; }
        .panel__cabecera h1 {
          font-family: ui-serif, Georgia, 'Iowan Old Style', serif;
          font-size: 30px;
          margin: 0 0 6px;
        }
        .panel__cabecera p { color: #5b5748; margin: 0; }

        .panel__token {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-width: 360px;
          margin-bottom: 20px;
          padding: 14px 16px;
          border: 1px solid #d8d4c8;
          border-radius: 12px;
          background: #fffdf9;
        }
        .panel__token label {
          font-size: 12px;
          font-weight: 600;
          color: #5b5748;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .panel__token input {
          padding: 9px 10px;
          border: 1px solid #d8d4c8;
          border-radius: 8px;
          font-size: 14px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        }
        .panel__token input:focus {
          outline: none;
          border-color: #c9a227;
          box-shadow: 0 0 0 3px rgba(201, 162, 39, 0.18);
        }

        .panel__mensaje {
          padding: 9px 14px;
          border-radius: 8px;
          font-size: 13.5px;
          margin-bottom: 18px;
          max-width: 560px;
        }
        .panel__mensaje--ok { background: #e4f2e8; color: #1f6b3f; }
        .panel__mensaje--error { background: #f9e4e0; color: #9b3a2c; }

        .panel__vacio { color: #5b5748; }

        .panel__tabla-contenedor {
          overflow-x: auto;
          border: 1px solid #d8d4c8;
          border-radius: 14px;
          background: #fffdf9;
        }
        .panel__tabla {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
          min-width: 760px;
        }
        .panel__tabla thead th {
          text-align: left;
          padding: 12px 16px;
          background: #1b2340;
          color: #f5f3ee;
          font-size: 11.5px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
          white-space: nowrap;
        }
        .panel__tabla tbody td {
          padding: 12px 16px;
          border-top: 1px solid #ece8dd;
          vertical-align: middle;
          white-space: nowrap;
        }
        .panel__tabla tbody tr:hover { background: #faf7f0; }

        .panel__numero {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
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
        .panel__pill--reservado { background: #c9a227; color: #1b2340; }
        .panel__pill--pagado { background: #1b2340; color: #f5f3ee; }

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
        .btn--aprobar { background: #1b2340; color: #f5f3ee; }
        .btn--aprobar:not(:disabled):hover { background: #10162b; }
        .btn--liberar {
          background: transparent;
          color: #1b2340;
          border: 1.5px solid #c9a227;
        }
        .btn--liberar:not(:disabled):hover { background: #c9a227; }
      `}</style>
      <style jsx global>{`
        body { background: #f5f3ee; margin: 0; }
      `}</style>
    </main>
  );
}
