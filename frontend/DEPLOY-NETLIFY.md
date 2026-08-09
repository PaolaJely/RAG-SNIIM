# Deploy del frontend con Netlify

Este frontend es una SPA Vite. Netlify compila desde `frontend` y publica `dist`.
El fallback de rutas está definido en `netlify.toml`.

## Configuración

Al conectar el repo en Netlify, usa la configuración versionada en `netlify.toml`.
Si Netlify pide los valores manualmente:

```txt
Base directory: frontend
Build command: pnpm run build
Publish directory: dist
```

## Variables de entorno

Configura esta variable en Netlify para producción y previews:

```txt
VITE_API_URL=https://rag-sniim-api-deepseek.onrender.com
```

`VITE_API_URL` se inyecta al momento de compilar. Si cambia la URL de la API,
hay que ejecutar un nuevo deploy para generar un nuevo bundle.

## Deploy manual

Desde `frontend`:

```bash
VITE_API_URL=https://tu-api-en-render.onrender.com pnpm run deploy:netlify
```

Para un deploy de preview:

```bash
VITE_API_URL=https://tu-api-en-render.onrender.com pnpm run deploy:netlify:preview
```
