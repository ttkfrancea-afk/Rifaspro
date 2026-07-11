// src/pages/_document.jsx
//
// Documento HTML raiz. Aqui van la fuente de display, el favicon y el
// color de la barra del navegador movil.
//
// Respuesta directa a "donde pego el favicon":
//   /public/favicon.ico       -> favicon clasico
//   /public/icon.png          -> icono PNG moderno (cualquier tamano)
//   /public/apple-touch-icon.png -> icono para "Agregar al inicio" en iOS (180x180)
// Basta con pegar los archivos ahi con esos nombres exactos, sin tocar codigo.
//
// Llamar una imagen WebP en el codigo:
//   <img src="/images/foto.webp" alt="..." loading="lazy" />
// La ruta nunca lleva el prefijo "public/" - Next.js ya sabe que es la raiz.

import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="es">
      <Head>
        {/* Fuente de display: Playfair Display para todos los titulos */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&display=swap"
          rel="stylesheet"
        />
        {/* Favicon e iconos */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#5b2333" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
