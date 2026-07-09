// src/pages/admin/index.jsx
//
// Panel de administración de la rifa. Permite visualizar todos los boletos
// reservados o pagados y gestionar sus estados (aprobar pagos o liberarlos).
// Utiliza un campo de texto para el token de administrador que se envía
// en las peticiones HTTP para proteger las acciones.

import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../config/supabase';

export async function getServerSideProps() {
  // Obtenemos todos los boletos reservados o pagados para gestionarlos.
  // Se ordenan por fecha de reserva para atender en orden de llegada.
  const { data: boletos, error } = await supabase
    .from('boletos')
    .select('id, numero, estado, comprador_nombre, comprador_telefono, reservado_en, pagado_en, rifa_id')
    .in('estado', ['reservado', 'pagado'])
    .order('reservado_en', { ascending: true });

  if (error) {
    console.error('[admin/index] Error cargando boletos:', error.message);
  }

  return {
    props: { boletosIniciales: boletos ?? [] },
  };
}

export default function AdminPanel({ boletosIniciales }) {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [boletos, setBoletos] = useState(boletosIniciales);
  const [procesandoId, setProcesandoId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const manejarAccion = async (boletoId, accion) => {
    if (!token.trim()) {
      setFeedback({ tipo: 'error', texto: 'Por favor, ingresa el Token de Administrador primero.' });
      return;
    }

    setProcesandoId(boletoId);
    setFeedback(null);

    try {
      const respuesta = await fetch('/api/admin/confirmar-pago', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': token.trim(),
        },
        body: JSON.stringify({ boletoId, accion }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(resultado.error || 'Error al procesar la acción');
      }

      setFeedback({ tipo: 'ok', texto: `Operación realizada con éxito: ${resultado.mensaje}` });
      
      // Refrescamos los datos de la página de forma limpia usando Next.js Router
      router.replace(router.asPath);
    } catch (err) {
      setFeedback({ tipo: 'error', texto: err.message || 'Error de conexión.' });
    } finally {
      setProcesandoId(null);
    }
  };

  // Sincronizar el estado local si cambian los props desde el servidor
  useState(() => {
    setBoletos(boletosIniciales);
  }, [boletosIniciales]);

  return (
    <>
      <Head>
        <title>Panel de Administración | Rifa</title>
      </Head>

      <main className="admin-container">
        <header className="admin-header">
          <h1>Panel de Control de la Rifa</h1>
          <p>Administración y validación de boletos para Ana Quintero.</p>
        </header>

        {/* Sección de autenticación por Token */}
        <section className="auth-section">
          <label htmlFor="admin-token">Token de Seguridad (ADMIN_SECRET_KEY)</label>
          <input
            id="admin-token"
            type="password"
            placeholder="Introduce tu clave secreta de administrador"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="token-input"
          />
        </section>

        {feedback && (
          <div className={`alert alert--${feedback.tipo}`}>
            {feedback.texto}
          </div>
        )}

        {/* Tabla de Control de Boletos */}
        <section className="table-section">
          <h2>Boletos Apartados y Confirmados</h2>
          
          {boletos.length === 0 ? (
            <p className="no-data">No hay boletos reservados ni pagados en este momento.</p>
          ) : (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Comprador</th>
                    <th>Teléfono</th>
                    <th>Estado</th>
                    <th>Reservado el</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {boletos.map((b) => (
                    <tr key={b.id} className={`row-estado-${b.estado}`}>
                      <td className="num-boleto">{b.numero}</td>
                      <td>{b.comprador_nombre}</td>
                      <td>
                        <a 
                          href={`https://wa.me/${b.comprador_telefono.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="whatsapp-link"
                        >
                          {b.comprador_telefono} ↗
                        </a>
                      </td>
                      <td>
                        <span className={`badge badge--${b.estado}`}>
                          {b.estado === 'reservado' ? 'Reservado' : 'Pagado'}
                        </span>
                      </td>
                      <td className="fecha-td">
                        {b.reservado_en ? new Date(b.reservado_en).toLocaleString('es-ES') : '-'}
                      </td>
                      <td>
                        <div className="action-buttons">
                          {b.estado === 'reservado' && (
                            <button
                              type="button"
                              className="btn-action btn-action--approve"
                              onClick={() => manejarAccion(b.id, 'aprobar')}
                              disabled={procesandoId !== null}
                            >
                              {procesandoId === b.id ? '...' : 'Aprobar'}
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-action btn-action--release"
                            onClick={() => manejarAccion(b.id, 'liberar')}
                            disabled={procesandoId !== null}
                          >
                            {procesandoId === b.id ? '...' : 'Liberar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <style jsx>{`
        .admin-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px 64px;
          font-family: system-ui, -apple-system, sans-serif;
          color: #1b2340;
        }
        .admin-header {
          margin-bottom: 32px;
        }
        .admin-header h1 {
          font-family: ui-serif, Georgia, serif;
          font-size: 32px;
          margin: 0 0 8px;
        }
        .admin-header p {
          color: #5b5748;
          margin: 0;
        }
        .auth-section {
          background: #fffdf9;
          border: 1px solid #d8d4c8;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 24px;
          max-width: 500px;
        }
        .auth-section label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
          color: #5b5748;
        }
        .token-input {
          width: 100%;
          box-sizing: border-box;
          padding: 10px 12px;
          border: 1px solid #d8d4c8;
          border-radius: 8px;
          font-size: 15px;
        }
        .alert {
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
          margin-bottom: 24px;
          font-weight: 500;
        }
        .alert--ok {
          background: #e4f2e8;
          color: #1f6b3f;
          border: 1px solid #cce5d5;
        }
        .alert--error {
          background: #f9e4e0;
          color: #9b3a2c;
          border: 1px solid #f3cfc7;
        }
        .table-section {
          background: #fffdf9;
          border: 1px solid #d8d4c8;
          border-radius: 12px;
          padding: 24px;
          overflow: hidden;
        }
        .table-section h2 {
          font-family: ui-serif, Georgia, serif;
          font-size: 22px;
          margin: 0 0 20px;
        }
        .no-data {
          color: #7a7666;
          text-align: center;
          padding: 32px 0;
          margin: 0;
        }
        .table-wrapper {
          overflow-x: auto;
        }
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 14px;
        }
        .admin-table th {
          background: #ece8dd;
          color: #1b2340;
          padding: 12px;
          font-weight: 600;
          border-bottom: 2px solid #d8d4c8;
        }
        .admin-table td {
          padding: 12px;
          border-bottom: 1px solid #ece8dd;
          vertical-align: middle;
        }
        .num-boleto {
          font-family: ui-monospace, monospace;
          font-weight: 700;
          color: #1b2340;
          font-size: 15px;
        }
        .whatsapp-link {
          color: #2563eb;
          text-decoration: none;
          font-weight: 500;
        }
        .whatsapp-link:hover {
          text-decoration: underline;
        }
        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }
        .badge--reservado {
          background: #c9a227;
          color: #1b2340;
        }
        .badge--pagado {
          background: #1b2340;
          color: #faf9f6;
        }
        .fecha-td {
          font-size: 12px;
          color: #5b5748;
        }
        .action-buttons {
          display: flex;
          gap: 6px;
        }
        .btn-action {
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.1s ease;
        }
        .btn-action--approve {
          background: #1f6b3f;
          color: white;
        }
        .btn-action--approve:hover {
          background: #175230;
        }
        .btn-action--release {
          background: #9b3a2c;
          color: white;
        }
        .btn-action--release:hover {
          background: #7a2d22;
        }
        .btn-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
      <style jsx global>{`
        body {
          background: #f5f3ee;
          margin: 0;
        }
      `}</style>
    </>
  );
}
