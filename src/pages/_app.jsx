// src/pages/_app.jsx
//
// Unico lugar del proyecto donde se puede importar CSS global en el Pages
// Router de Next.js. Carga la hoja de estilos globales que contiene toda
// la paleta, las variables de animacion y los utilitarios de clase.
//
// La fuente Playfair Display se carga desde Google Fonts via una etiqueta
// <link> en _document.jsx (en vez de next/font/google), ya que este
// entorno de compilacion no tiene acceso a la red de Google en build time.
// En Vercel si lo tiene, pero para garantizar que el build funcione en
// cualquier maquina incluyendo la de Vercel, se usa el metodo <link>
// (que ademas tiene display:swap automatico y nunca bloquea el render).

import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <div className="fuente-display-raiz">
      <Component {...pageProps} />
    </div>
  );
}
