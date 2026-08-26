# Escuela Órale

Herramienta de formación para empleados de restaurante. Módulos por categoría (recetas, pedidos, atención al cliente, limpieza, etc.) con test de preguntas, seguimiento de resultados por empleado y panel de dirección para publicar módulos, lanzar quincenas de formación y registrar reseñas/mejoras.

## Stack

Un único archivo `index.html`. HTML/CSS/JS puro, sin build, sin npm, sin framework. La persistencia va contra [Supabase](https://supabase.com) (Postgres + API REST), cargado por CDN (`@supabase/supabase-js@2`).

Tablas usadas:
- `escuela_empleados` — empleados activos (id, nombre, rol, pin, local)
- `escuela_resultados` — cada intento de módulo (empleado, módulo, % acertado, fallos)
- `escuela_config` — estado editable por dirección (quincena activa, módulos publicados, marcados, reseñas, mejoras, recomendaciones)

## Desarrollo local

No hace falta build. Basta con servir el archivo:

```bash
python3 -m http.server 8000
```

Y abrir `http://localhost:8000/index.html`. Abrir el archivo directamente con `file://` no funciona: el navegador bloquea las llamadas a Supabase por CORS/origen.

## Despliegue

Proyecto estático de un solo archivo — cualquier host de estáticos vale (Vercel, Netlify, GitHub Pages). No requiere variables de entorno: la URL y la clave pública de Supabase están en el propio `index.html` (es la clave "publishable", pensada para ir en el cliente).
