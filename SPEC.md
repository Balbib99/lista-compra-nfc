# Spec: Lista de la Compra NFC

## Objective

Aplicación web para gestionar la lista de la compra de un hogar, accesible pasando el móvil por una pegatina NFC colocada en un lugar fijo de la casa. Cualquier miembro del hogar puede:
- Abrir la lista sin instalar nada, simplemente acercando el móvil a la pegatina.
- Añadir un producto con nombre, nivel de importancia y (opcionalmente) una foto.
- Ver los cambios de los demás en tiempo real.
- Marcar productos como comprados.
- Vaciar la lista entera cuando se termina la compra, para empezar de cero.

Accesible tanto desde dentro de casa (wifi) como desde fuera (datos móviles), autoalojada en una Raspberry Pi 5 propia, sin depender de servicios de pago.

**Usuario objetivo:** los miembros de un mismo hogar (Android e iPhone mezclados). Sin público externo.

**Éxito** = cualquiera en casa puede, en menos de 15 segundos y sin fricción, dejar constancia de "necesitamos X" desde el móvil, y que se refleje al instante en los móviles del resto.

## Tech Stack

- **Backend + BD + tiempo real + almacenamiento de fotos:** [PocketBase](https://pocketbase.io/) (binario único en Go, SQLite embebido, API REST + realtime vía SSE, incluye almacenamiento de ficheros y panel admin).
- **Frontend:** HTML + CSS + JavaScript vanilla (ES modules, sin build step), usando el SDK JS de PocketBase. PocketBase sirve estos archivos estáticos directamente (carpeta `pb_public`).
- **PWA:** `manifest.json` + service worker mínimo (cache de estáticos, instalable en el móvil).
- **Proxy inverso / HTTPS:** [Caddy](https://caddyserver.com/) — certificado Let's Encrypt automático para el subdominio DuckDNS.
- **DNS dinámico:** DuckDNS (contenedor actualizador tipo `linuxserver/duckdns`, hace ping cada 5 min con la IP pública actual).
- **Orquestación:** Docker Compose, corriendo en Raspberry Pi 5 (Raspberry Pi OS 64-bit).
- **Grabación de pegatinas:** app **NFC Tools** (Android/iPhone) — proceso manual, fuera del código.

## Commands

Al no haber build step de frontend, los comandos operan a nivel de infraestructura:

```
Levantar todo:        docker compose up -d
Ver logs PocketBase:  docker compose logs -f pocketbase
Ver logs Caddy:       docker compose logs -f caddy
Parar todo:           docker compose down
Comprobación de salud: ./scripts/healthcheck.sh
```

No hay `npm install` / `build` / `lint` de framework — el frontend son archivos estáticos servidos tal cual.

## Project Structure

```
lista-compra-nfc/
├── docker-compose.yml       → Orquesta pocketbase + caddy + duckdns-updater
├── .env.example              → Plantilla de variables (dominio, token DuckDNS) — el .env real NUNCA se commitea
├── caddy/
│   └── Caddyfile             → Config del proxy inverso + HTTPS
├── pb_public/                 → Frontend estático (servido por PocketBase)
│   ├── index.html
│   ├── app.js
│   ├── style.css
│   └── manifest.json
├── pb_data/                   → Datos de PocketBase (SQLite + fotos) — VOLUMEN, en .gitignore
├── scripts/
│   └── healthcheck.sh
├── SPEC.md                    → Este documento
└── README.md                  → Instrucciones de despliegue en la Pi
```

## Code Style

JavaScript vanilla, ES2022+, sin frameworks ni transpilación. Identificadores de código en inglés (convención estándar), textos visibles en la interfaz en español (para la familia). Funciones pequeñas y explícitas, sin clases salvo que aporten claridad real.

```js
// app.js — ejemplo de estilo
import PocketBase from './pocketbase.es.mjs';

const pb = new PocketBase('/');
const listId = getListIdFromUrl(); // "casa-x7k9p2"

async function addItem({ name, importance, photo, addedBy }) {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('importance', importance); // 'normal' | 'importante' | 'opcional'
  formData.append('added_by', addedBy);
  formData.append('list_id', listId);
  if (photo) formData.append('photo', photo);

  return pb.collection('items').create(formData);
}
```

## Testing Strategy

Proyecto personal de un solo hogar: **verificación manual dirigida por checklist**, sin suite automatizada de tests unitarios (no hay lógica de negocio compleja que lo justifique).

- `scripts/healthcheck.sh`: script simple que hace `curl` al endpoint de salud de PocketBase y a la URL pública HTTPS, para confirmar tras cada despliegue que todo responde.
- Checklist manual por funcionalidad (se ejecuta en el móvil real, Android e iPhone) antes de dar cada fase por cerrada — ver Success Criteria.
- Si en el futuro se añade lógica no trivial (p. ej. reglas de negocio complejas), se evaluará introducir tests con `test-driven-development`.

## Boundaries

- **Always:**
  - No subir `pb_data/` (datos reales, fotos) ni `.env` (token DuckDNS, credenciales admin) al repositorio.
  - Usar `docker compose config` para validar el compose antes de aplicar cambios.
  - Confirmar en el móvil real (Android e iPhone) que un cambio funciona antes de darlo por cerrado.
- **Ask first:**
  - Abrir puertos adicionales en el router.
  - Cambiar de DuckDNS a Cloudflare Tunnel o dominio propio.
  - Añadir autenticación por login/contraseña (cambiaría el modelo de "URL secreta").
  - Cambiar el esquema de datos en producción (podría requerir migración de lo ya guardado).
- **Never:**
  - Commitear el token de DuckDNS o las credenciales de admin de PocketBase.
  - Dejar el panel admin de PocketBase (`/_/`) accesible públicamente sin protección adicional.
  - Borrar `pb_data/` sin backup previo.

## Success Criteria

- [ ] Al pasar el móvil (Android o iPhone) por la pegatina, se abre la PWA vía HTTPS en menos de ~3s.
- [ ] Cualquier miembro puede añadir un producto (nombre + importancia + foto opcional) en menos de 15s.
- [ ] Los cambios (añadir, marcar comprado) se reflejan en tiempo real (<2s) en los demás móviles, sin recargar la página.
- [ ] La lista es accesible desde fuera de la red doméstica usando la URL `https://<subdominio>.duckdns.org/casa-<código-secreto>`.
- [ ] Un botón "Compra terminada" vacía la lista (y borra las fotos asociadas) tras una confirmación.
- [ ] Los productos se pueden clasificar y visualizar por 3 niveles de importancia (normal / importante / opcional).
- [ ] El panel admin de PocketBase no es accesible sin autenticación adicional (protegido aparte).
- [ ] Tras reiniciar la Raspberry Pi, los servicios arrancan solos (`restart: unless-stopped`) sin intervención manual.

## Decisions (resolved)

1. **Certificado HTTPS en Caddy:** DNS-01 con token de API de DuckDNS (plugin `caddy-dns/duckdns`), sin abrir el puerto 80.
2. **Estado de la Raspberry Pi:** Sin Docker instalado todavía — el plan de infraestructura debe partir de cero (instalar Docker Engine + Compose plugin).
3. **Compresión de fotos:** se comprimen en el propio móvil (JS, `canvas` o librería ligera tipo `browser-image-compression`) antes de subir, sin dependencias de servidor.
4. **Subdominio DuckDNS:** `despensa4b.duckdns.org`.

## Open Questions

_Ninguna pendiente — spec cerrado._
