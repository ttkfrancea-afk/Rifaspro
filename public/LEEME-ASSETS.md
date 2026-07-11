# /public

Esta carpeta vive en la RAÍZ del proyecto (al mismo nivel que `package.json`
y `src/`), no dentro de `src/`. Next.js sirve todo lo que pongas aquí
directamente desde la raíz del dominio.

## Dónde pegar cada archivo

| Archivo | Ruta en el proyecto | URL resultante |
|---|---|---|
| Favicon (.ico, 32x32/48x48) | `public/favicon.ico` | `https://tu-dominio.com/favicon.ico` |
| Ícono PNG moderno (opcional) | `public/icon.png` | `/icon.png` |
| Ícono para iOS "agregar a inicio" | `public/apple-touch-icon.png` (180x180) | `/apple-touch-icon.png` |
| Fotos de la rifa (.webp) | `public/images/nombre-de-archivo.webp` | `/images/nombre-de-archivo.webp` |

Los 3 primeros ya están referenciados en `src/pages/_document.jsx` — solo
tienes que pegar los archivos con esos nombres exactos y funcionan sin
tocar código.

## Cómo llamar una imagen .webp en el código

Con `next/image` (recomendado — optimiza tamaños automáticamente y evita
que la página "salte" mientras carga):

```jsx
import Image from 'next/image';

<Image
  src="/images/flores-ana-quintero.webp"
  alt="Arreglo floral de la rifa de Ana Quintero"
  width={800}
  height={600}
/>
```

Nota: la ruta NUNCA lleva el prefijo `public/` — Next.js ya sabe que esa
carpeta es la raíz. `public/images/foto.webp` se llama así: `/images/foto.webp`.

Si prefieres una etiqueta `<img>` normal (por ejemplo, para el `imagen_url`
que ya viene de Supabase como URL completa, como en `TarjetaRifa.jsx`), la
sintaxis es igual de simple:

```jsx
<img src="/images/flores-ana-quintero.webp" alt="..." loading="lazy" />
```
