# Deploy del frontend con Wrangler

Este frontend es una SPA Vite. Cloudflare Pages sirve el build desde `dist` y
`public/_redirects` mantiene las rutas de React apuntando a `index.html`.

## Requisitos

- Tener sesión iniciada en Cloudflare:

```bash
pnpm dlx wrangler login
```

- Tener la API publicada y accesible por HTTPS.

## Deploy

Desde esta carpeta:

```bash
cd frontend
VITE_API_URL=https://tu-api-en-render.onrender.com pnpm run deploy:cf
```

Wrangler crea o actualiza el proyecto `rag-sniim-frontend` en Cloudflare Pages.

Para un deploy de preview:

```bash
VITE_API_URL=https://tu-api-en-render.onrender.com pnpm run deploy:cf:preview
```

## Nota sobre `VITE_API_URL`

`VITE_API_URL` se inyecta al momento de compilar. Si cambia la URL de la API, hay
que volver a ejecutar el deploy para generar un nuevo bundle.
