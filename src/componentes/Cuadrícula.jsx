// src/components/Cuadricula.jsx
//
// Módulo de alto rendimiento para mostrar y reservar hasta 10,000 números
// de una rifa sin trabar el navegador ni golpear repetidamente a Supabase.
//
// Claves de rendimiento (léelas antes de tocar este archivo):
//
// 1. VIRTUALIZACIÓN (react-window): en vez de montar 10,000 <button> en el
//    DOM, solo se montan los ~150-250 que realmente están visibles en
//    pantalla en un momento dado. El resto ni existe hasta que se hace scroll.
//
// 2. MEMOIZACIÓN FINA POR CELDA: cada botón usa un comparador propio
//    (celdasIguales) que solo mira SU índice, no el objeto `data` completo.
//    Así, cuando llega una actualización en tiempo real de un solo número,
//    React re-renderiza esa única celda y no las otras 9,999.
//
// 3. TIEMPO REAL VÍA WEBSOCKET: en lugar de hacer polling (repreguntar a
//    Supabase cada N segundos), nos suscribimos una sola vez a los cambios
//    puntuales de la tabla `boletos` filtrados por esta rifa.
//
// Requiere: npm install react-window

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { supabase } from '../config/supabase';

const COLUMNAS = 100; // 100 x 100 = 10,000 celdas máximo
const TAMANO_CELDA = 48; // px (alto y ancho de cada botón)

// Paleta de estados, coherente con la identidad "boleto de rifa":
//   disponible -> papel claro (aún libre)
//   reservado  -> dorado (apartado, a la espera de pago — como un talón retenido)
//   pagado     -> tinta oscura (sellado / confirmado)
const ESTILOS_ESTADO = {
  disponible: { fondo: '#faf9f6', texto: '#1b2340', borde: '#d8d4c8' },
  reservado: { fondo: '#c9a227', texto: '#1b2340', borde: '#a8841d' },
  pagado: { fondo: '#1b2340', texto: '#faf9f6', borde: '#1b2340' },
};

function indiceDeCelda(rowIndex, columnIndex) {
  return rowIndex * COLUMNAS + columnIndex;
}

// Comparador personalizado para React.memo: por defecto, memo compararía
// el prop `data` por referencia y como cambia en cada actualización de
// estado del padre, TODAS las celdas se re-renderizarían igual. Aquí
// comparamos únicamente el valor que le importa a ESTA celda puntual.
function celdasIguales(prev, next) {
  const idxPrev = indiceDeCelda(prev.rowIndex, prev.columnIndex);
  const idxNext = indiceDeCelda(next.rowIndex, next.columnIndex);
  if (idxPrev !== idxNext) return false;

  return (
    prev.data.estados[idxPrev] === next.data.estados[idxNext] &&
    (prev.data.resaltado === idxPrev) === (next.data.resaltado === idxNext) &&
    (prev.data.seleccion === idxPrev) === (next.data.seleccion === idxNext)
  );
}

const Celda = React.memo(function Celda({ columnIndex, rowIndex, style, data }) {
  const idx = indiceDeCelda(rowIndex, columnIndex);
  if (idx >= data.total) return <div style={style} />;

  const numero = String(idx).padStart(4, '0');
  const estado = data.estados[idx] || 'disponible';
  const colores = ESTILOS_ESTADO[estado];
  const esResaltada = data.resaltado === idx;
  const esSeleccionada = data.seleccion === idx;

  return (
    <div style={style}>
      <button
        type="button"
        disabled={estado !== 'disponible'}
        onClick={() => data.onSeleccionar(idx)}
        title={`Número ${numero} — ${estado}`}
        className="celda-numero"
        style={{
          background: colores.fondo,
          color: colores.texto,
          borderColor: esSeleccionada ? '#2563eb' : esResaltada ? '#ea580c' : colores.borde,
          borderWidth: esSeleccionada || esResaltada ? 2 : 1,
          cursor: estado === 'disponible' ? 'pointer' : 'not-allowed',
        }}
      >
        {numero}
      </button>
    </div>
  );
}, celdasIguales);

function FormularioReserva({ numero, precio, enviando, onConfirmar, onCancelar }) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');

  return (
    <div className="formulario">
      <h4>Reservar número {numero}</h4>
      {precio != null && <p className="formulario__precio">Precio: ${precio}</p>}

      <label>
        Nombre completo
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. María Pérez" />
      </label>
      <label>
        Teléfono / WhatsApp
        <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej. 5512345678" />
      </label>

      <div className="formulario__acciones">
        <button type="button" className="btn btn--fantasma" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn--principal"
          onClick={() => onConfirmar(nombre, telefono)}
          disabled={enviando || nombre.trim().length < 2 || telefono.trim().length < 6}
        >
          {enviando ? 'Reservando…' : 'Confirmar reserva'}
        </button>
      </div>

      <style jsx>{`
        .formulario {
          margin-top: 16px;
          padding: 16px 18px;
          border: 1px solid #d8d4c8;
          border-radius: 12px;
          background: #fffdf9;
          max-width: 360px;
        }
        .formulario h4 { margin: 0 0 4px; color: #1b2340; }
        .formulario__precio { margin: 0 0 12px; color: #5b5748; font-size: 13px; }
        .formulario label {
          display: block;
          font-size: 12px;
          color: #5b5748;
          margin-bottom: 10px;
        }
        .formulario input {
          display: block;
          width: 100%;
          box-sizing: border-box;
          margin-top: 4px;
          padding: 9px 10px;
          border: 1px solid #d8d4c8;
          border-radius: 8px;
          font-size: 14px;
        }
        .formulario__acciones { display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px; }
        .btn {
          border: none;
          border-radius: 8px;
          padding: 9px 16px;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn--principal { background: #1b2340; color: #faf9f6; }
        .btn--principal:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn--fantasma { background: transparent; color: #1b2340; border: 1px solid #d8d4c8; }
      `}</style>
    </div>
  );
}

/**
 * @param {string} rifaId - id de la rifa (uuid)
 * @param {string[]} estadoInicial - array de longitud totalNumeros con el
 *   estado ('disponible' | 'reservado' | 'pagado') de cada número, calculado
 *   en el servidor (getServerSideProps) para que la primera carga no
 *   dependa de 10,000 peticiones individuales.
 * @param {number} totalNumeros - normalmente 10000
 * @param {number} precioNumero - para mostrarlo en el formulario de reserva
 */
export default function Cuadricula({ rifaId, estadoInicial, totalNumeros = 10000, precioNumero }) {
  const [estados, setEstados] = useState(estadoInicial);
  const [busqueda, setBusqueda] = useState('');
  const [resaltado, setResaltado] = useState(null);
  const [seleccion, setSeleccion] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const gridRef = useRef(null);
  const contenedorRef = useRef(null);
  const [anchoDisponible, setAnchoDisponible] = useState(COLUMNAS * TAMANO_CELDA);

  const filas = Math.ceil(totalNumeros / COLUMNAS);

  // Ajusta el ancho del grid al contenedor real (solo en el cliente: en
  // el servidor no existe `window`, por eso vive dentro de useEffect).
  useEffect(() => {
    function medir() {
      if (contenedorRef.current) {
        setAnchoDisponible(contenedorRef.current.clientWidth);
      }
    }
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  // --- Suscripción en tiempo real ---
  // Escuchamos solo los UPDATE de esta rifa. Esto es lo que mantiene el
  // consumo de Supabase bajo incluso con cientos de personas viendo la
  // misma cuadrícula a la vez: una única conexión WebSocket compartida,
  // cero polling, cero SELECTs repetidos de las 10,000 filas.
  useEffect(() => {
    const canal = supabase
      .channel(`boletos-rifa-${rifaId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'boletos', filter: `rifa_id=eq.${rifaId}` },
        (payload) => {
          const idx = parseInt(payload.new.numero, 10);
          setEstados((prev) => {
            const copia = prev.slice();
            copia[idx] = payload.new.estado;
            return copia;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [rifaId]);

  // itemData compartido por todas las celdas. Se recalcula solo cuando
  // algo relevante cambia; el comparador de Celda hace el resto del trabajo.
  const datosCompartidos = useMemo(
    () => ({
      estados,
      total: totalNumeros,
      resaltado,
      seleccion,
      onSeleccionar: (idx) => {
        setMensaje(null);
        setSeleccion((actual) => (actual === idx ? null : idx));
      },
    }),
    [estados, totalNumeros, resaltado, seleccion]
  );

  // --- Buscador interno de números ---
  const buscarNumero = useCallback(
    (valor) => {
      setBusqueda(valor);
      const limpio = valor.replace(/\D/g, '').slice(0, 4);
      if (limpio.length === 0) {
        setResaltado(null);
        return;
      }
      const idx = parseInt(limpio, 10);
      if (idx >= 0 && idx < totalNumeros) {
        setResaltado(idx);
        gridRef.current?.scrollToItem({
          rowIndex: Math.floor(idx / COLUMNAS),
          columnIndex: idx % COLUMNAS,
          align: 'smart',
        });
      } else {
        setResaltado(null);
      }
    },
    [totalNumeros]
  );

  // --- Confirmar reserva contra el endpoint seguro del backend ---
  const confirmarReserva = async (nombre, telefono) => {
    if (seleccion === null) return;
    setEnviando(true);
    setMensaje(null);
    const numero = String(seleccion).padStart(4, '0');
    const idxReservado = seleccion;

    try {
      const respuesta = await fetch('/api/reservar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rifaId, numero, nombre, telefono }),
      });
      const data = await respuesta.json();

      if (!respuesta.ok) {
        // Alguien más ganó la carrera por este número: reflejamos el
        // estado real de inmediato (el canal realtime también lo confirmará).
        setEstados((prev) => {
          const copia = prev.slice();
          copia[idxReservado] = 'reservado';
          return copia;
        });
        setMensaje({ tipo: 'error', texto: data.error || 'Ese número ya no está disponible.' });
        setSeleccion(null);
        return;
      }

      setEstados((prev) => {
        const copia = prev.slice();
        copia[idxReservado] = 'reservado';
        return copia;
      });
      setMensaje({
        tipo: 'ok',
        texto: `¡Número ${numero} reservado! Te contactaremos para confirmar el pago.`,
      });
      setSeleccion(null);
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error de conexión, inténtalo de nuevo.' });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div ref={contenedorRef} className="cuadricula">
      <div className="cuadricula__barra">
        <input
          type="text"
          inputMode="numeric"
          placeholder="Buscar número (ej. 0452)"
          value={busqueda}
          onChange={(e) => buscarNumero(e.target.value)}
          className="cuadricula__buscador"
        />
        <div className="cuadricula__leyenda">
          <span><i style={{ background: ESTILOS_ESTADO.disponible.fondo, borderColor: ESTILOS_ESTADO.disponible.borde }} /> Disponible</span>
          <span><i style={{ background: ESTILOS_ESTADO.reservado.fondo }} /> Reservado</span>
          <span><i style={{ background: ESTILOS_ESTADO.pagado.fondo }} /> Pagado</span>
        </div>
      </div>

      {mensaje && <p className={`cuadricula__mensaje cuadricula__mensaje--${mensaje.tipo}`}>{mensaje.texto}</p>}

      <Grid
        ref={gridRef}
        columnCount={COLUMNAS}
        columnWidth={TAMANO_CELDA}
        rowCount={filas}
        rowHeight={TAMANO_CELDA}
        width={Math.min(anchoDisponible, COLUMNAS * TAMANO_CELDA)}
        height={520}
        itemData={datosCompartidos}
      >
        {Celda}
      </Grid>

      {seleccion !== null && (
        <FormularioReserva
          numero={String(seleccion).padStart(4, '0')}
          precio={precioNumero}
          enviando={enviando}
          onConfirmar={confirmarReserva}
          onCancelar={() => setSeleccion(null)}
        />
      )}

      <style jsx>{`
        .cuadricula__barra {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .cuadricula__buscador {
          padding: 9px 12px;
          border: 1px solid #d8d4c8;
          border-radius: 8px;
          font-size: 14px;
          min-width: 220px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        }
        .cuadricula__leyenda {
          display: flex;
          gap: 14px;
          font-size: 12px;
          color: #5b5748;
        }
        .cuadricula__leyenda span { display: inline-flex; align-items: center; gap: 5px; }
        .cuadricula__leyenda i {
          width: 11px;
          height: 11px;
          border-radius: 3px;
          border: 1px solid transparent;
          display: inline-block;
        }
        .cuadricula__mensaje {
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 13.5px;
          margin-bottom: 12px;
        }
        .cuadricula__mensaje--ok { background: #e4f2e8; color: #1f6b3f; }
        .cuadricula__mensaje--error { background: #f9e4e0; color: #9b3a2c; }
      `}</style>
      <style jsx global>{`
        .celda-numero {
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          border-style: solid;
          border-radius: 6px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 12.5px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </div>
  );
}
