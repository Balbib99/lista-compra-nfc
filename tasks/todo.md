# Tasks: Lista de la Compra NFC

See `tasks/plan.md` for phases, checkpoints, and risks.

---

## Task 1: Esquema de datos en PocketBase ✅

**Description:** Instalar PocketBase (binario Windows) localmente y crear la colección `items` con sus campos.

**Acceptance criteria:**
- [x] Colección `items` creada con campos: `name` (text), `importance` (select: normal/importante/opcional), `photo` (file, opcional), `purchased` (bool), `added_by` (text), `list_id` (text)
- [x] Se puede crear/editar/borrar un registro desde el Admin UI de PocketBase

**Verification:**
- [x] Manual: crear un item de prueba desde `http://127.0.0.1:8090/_/`
- [ ] Manual: `curl http://127.0.0.1:8090/api/collections/items/records` devuelve el item (pendiente hasta Task 2: hoy la API pública no devuelve nada porque las reglas están bloqueadas por defecto — es lo correcto)

**Nota técnica:** PocketBase guarda `pb_data`/`pb_public` junto al ejecutable por defecto, no en el cwd. A partir de ahora se arranca siempre así desde la raíz del proyecto:
```
./pocketbase/pocketbase.exe serve --dir="./pb_data" --publicDir="./pb_public" --migrationsDir="./pb_migrations"
```

**Dependencies:** None

**Files likely touched:**
- `pb_data/` (generado por PocketBase, no versionado)

**Estimated scope:** XS

---

## Task 2: Reglas de acceso de `items` basadas en `list_id` ✅

**Description:** Configurar las reglas de List/View/Create/Update/Delete de la colección para que solo devuelvan/acepten registros cuyo `list_id` coincida con el parámetro de consulta enviado por el cliente. Sin `list_id` correcto, la API no debe devolver nada.

**Acceptance criteria:**
- [x] Regla de List/Search: `list_id != "" && list_id = @request.query.list_id`
- [x] Regla de Create: el `list_id` y `name` del body deben ser no vacíos
- [x] Consultar la API sin `list_id` o con uno incorrecto devuelve lista vacía

**Verification:**
- [x] Manual: `curl` con y sin el parámetro `list_id` correcto — confirmado: vacío sin él / con uno incorrecto, y devuelve el item con el correcto.

**Dependencies:** Task 1

**Files likely touched:**
- `pb_data/` (configuración de la colección)

**Estimated scope:** XS

---

## Task 3: Esqueleto de la PWA ✅

**Description:** Crear `pb_public/index.html`, `app.js`, `style.css` y `manifest.json` mínimos. La página lee el `list_id` de la URL, se conecta a PocketBase (SDK JS) y muestra la lista (vacía al principio) más un formulario básico para añadir un producto (solo nombre, de momento).

**Acceptance criteria:**
- [x] Al abrir `http://127.0.0.1:8090/?list=casa-x7k9p2` se ve un formulario y una lista vacía
- [x] Añadir un producto desde el formulario lo guarda en PocketBase y aparece en la lista sin recargar

**Verification:**
- [x] Manual: probado en el navegador — se añadió "Leche" y apareció en la lista al instante.

**Nota:** ya incluye también el selector de importancia en el formulario (parte de la Task 4), pero aún sin sincronización en tiempo real entre pestañas/dispositivos.

**Dependencies:** Task 1, Task 2

**Files likely touched:**
- `pb_public/index.html`
- `pb_public/app.js`
- `pb_public/style.css`
- `pb_public/manifest.json`

**Estimated scope:** S

---

## Task 4: Añadir producto con importancia + tiempo real ✅

**Description:** Ampliar el formulario con el selector de importancia (normal/importante/opcional) y suscribirse a los cambios de la colección vía PocketBase realtime para que la lista se actualice sola en todas las pestañas/dispositivos abiertos.

**Acceptance criteria:**
- [x] El formulario permite elegir importancia
- [x] Un cambio hecho en una pestaña se refleja en otra pestaña abierta en <2s sin recargar

**Verification:**
- [x] Manual: dos pestañas abiertas a la vez — al añadir "Huevos" en una, apareció en la otra en <2s sin recargar.

**Dependencies:** Task 3

**Files likely touched:**
- `pb_public/app.js`

**Estimated scope:** S

---

## Task 5: Marcar comprado / eliminar producto ✅

**Description:** Cada item de la lista tiene un botón para marcarlo como comprado (y otro para eliminarlo si se añadió por error).

**Acceptance criteria:**
- [x] Marcar como comprado actualiza el registro (`purchased = true`) y se refleja visualmente (tachado, y se ordena al final)
- [x] Eliminar borra el registro y desaparece de todas las pantallas conectadas (con confirmación previa para evitar borrados accidentales)

**Verification:**
- [x] Manual: probado en navegador — marcar tachó y reordenó al instante; eliminar (con `confirm()`) borró el registro y desapareció sin recargar.

**Nota técnica:** se añadió `requestKey: null` a la recarga de la lista — sin eso, varias recargas seguidas disparadas por eventos realtime se cancelaban entre sí (auto-cancelación de peticiones duplicadas del SDK) y la UI se quedaba desincronizada.

**Dependencies:** Task 4

**Files likely touched:**
- `pb_public/app.js`
- `pb_public/style.css`

**Estimated scope:** S

---

## Task 6: Foto con compresión en el cliente ✅

**Description:** Añadir `<input type="file" capture>` al formulario. Antes de subir, comprimir la imagen en el navegador (canvas o librería ligera) para reducir tamaño, y mostrar la miniatura junto al producto en la lista.

**Acceptance criteria:**
- [x] Se puede adjuntar una foto desde la cámara o galería del móvil (`<input type="file" accept="image/*" capture="environment">`)
- [x] La foto se comprime en el cliente antes de subir — probado con una imagen de 15.7 MB (2000×2000) que se subió como JPEG de 604 KB (máx. 1280px, calidad 0.7)
- [x] La miniatura se muestra junto al producto en la lista (thumbnail 100×100 generado por PocketBase)

**Verification:**
- [x] Manual (navegador, imagen sintética): confirmado el tamaño comprimido en disco y la miniatura cargando correctamente con `list_id` en la URL.
- [ ] Pendiente: repetir la prueba con la cámara de un móvil real (Android e iPhone) cuando probemos por LAN — se hará en el checkpoint de la Fase 2.

**Sin dependencias externas:** la compresión usa solo `canvas`/`createImageBitmap` nativos del navegador, sin librerías de terceros.

**Dependencies:** Task 4

**Files likely touched:**
- `pb_public/app.js`
- `pb_public/style.css`

**Estimated scope:** M

---

## Task 7: Clasificación visual por importancia ✅

**Description:** Ordenar y/o agrupar visualmente la lista por nivel de importancia (color o icono distinto por nivel).

**Acceptance criteria:**
- [x] Los productos "importantes" destacan visualmente sobre los "normales" y "opcionales" (borde de color + negrita + icono ❗, y "·" + gris para "opcional")
- [x] El orden o agrupación es consistente y fácil de entender de un vistazo (importante → normal → opcional; comprados siempre al final)

**Verification:**
- [x] Manual: 4 productos de distinta importancia — el orden y estilo salieron correctos en pantalla (ver captura).

**Dependencies:** Task 4

**Files likely touched:**
- `pb_public/app.js`
- `pb_public/style.css`

**Estimated scope:** S

---

## Task 8: Botón "Compra terminada" ✅

**Description:** Botón que, tras confirmación, borra todos los productos de la lista (`list_id` actual) y sus fotos asociadas, dejándola vacía para empezar de cero.

**Acceptance criteria:**
- [x] El botón pide confirmación antes de borrar
- [x] Tras confirmar, la lista queda vacía en todos los dispositivos conectados (vía realtime, igual que el resto de acciones)
- [x] Las fotos asociadas se eliminan de `pb_data` (no quedan huérfanas)

**Verification:**
- [x] Manual: con 2 productos (uno con foto) en la lista, vaciar la dejó en 0 registros y `pb_data/storage` quedó sin ningún archivo. El botón también se oculta solo cuando la lista está vacía.

**Dependencies:** Task 5, Task 6

**Files likely touched:**
- `pb_public/app.js`

**Estimated scope:** S

---

## Task 8b: Orden de la miniatura + foto ampliable + comentarios ✅

**Description:** Mejoras pedidas tras probar en el móvil real: (1) arreglar el orden checkbox→miniatura (había un bug, la miniatura se insertaba antes del checkbox), (2) poder tocar la miniatura para verla en grande y volver a la lista, (3) poder añadir un comentario de texto libre a cada producto.

**Acceptance criteria:**
- [x] La miniatura aparece siempre a la derecha del checkbox, en la misma posición en todos los productos
- [x] Tocar la miniatura abre la foto a tamaño completo; tocar en cualquier parte la cierra y vuelve a la lista
- [x] Se puede añadir/editar un comentario por producto (botón 💬), visible bajo el nombre
- [x] Nuevo campo `comment` (text, opcional) en la colección `items`, vía migración

**Verification:**
- [x] Manual (navegador): orden de elementos verificado por DOM, modal abre con la imagen a tamaño completo y se cierra al tocar, comentario se guarda y se muestra.
- [x] Confirmado en móvil real (Android) tras corregir un bug de CSS (`#photo-modal` bloqueaba toda la pantalla al cargar por una colisión de especificidad con `[hidden]`).

**Files:** `pb_public/index.html`, `pb_public/app.js`, `pb_public/style.css`, `pb_migrations/1758700200_items_add_comment.js`

---

## Task 8c: Cantidad, deshacer al eliminar y vibración en "importante" ✅

**Description:** Tres mejoras pedidas por el usuario: (1) campo de cantidad/unidad junto al nombre, (2) sustituir el `confirm()` al eliminar un producto por un borrado con "Deshacer" de 5s (patrón más amigable en móvil), (3) vibración cuando llega en tiempo real un producto nuevo marcado como "importante".

**Acceptance criteria:**
- [x] Nuevo campo `quantity` (text, opcional) en la colección, vía migración; se muestra junto al nombre entre paréntesis
- [x] Al eliminar, el producto desaparece al instante y aparece un aviso "eliminado — Deshacer" durante 5s; si se pulsa Deshacer, se recupera sin llamar a la API; si no, se borra de verdad al pasar el tiempo
- [x] Al llegar (vía realtime) un producto nuevo con `importance = "importante"`, se llama a `navigator.vibrate(200)` — no ocurre con otras importancias, y no rompe nada en navegadores sin soporte (iOS Safari)

**Verification:**
- [x] Manual (navegador): cantidad mostrada correctamente; deshacer restaura el item sin llamar al servidor; sin deshacer, se confirma el borrado real a los 5s (verificado en la base de datos); vibración interceptada y confirmada solo para "importante".

**Files:** `pb_public/index.html`, `pb_public/app.js`, `pb_public/style.css`, `pb_migrations/1758700300_items_add_quantity.js`

---

## Task 9: Docker en la Raspberry Pi

**Description:** Instalar Docker Engine y el plugin de Compose en la Raspberry Pi (Raspberry Pi OS 64-bit).

**Acceptance criteria:**
- [ ] `docker --version` y `docker compose version` funcionan en la Pi
- [ ] El usuario de la Pi puede ejecutar `docker` sin `sudo` (grupo `docker`)

**Verification:**
- [ ] Manual: `docker run hello-world` en la Pi

**Dependencies:** None (puede hacerse en paralelo a las Fases 1-2)

**Files likely touched:** Ninguno (infraestructura del sistema operativo)

**Estimated scope:** XS

---

## Task 10: `docker-compose.yml`

**Description:** Definir los 3 servicios (pocketbase, caddy, duckdns-updater) con volúmenes persistentes y `restart: unless-stopped`.

**Acceptance criteria:**
- [ ] `docker compose config` valida sin errores
- [ ] `docker compose up -d` levanta los 3 servicios en la Pi

**Verification:**
- [ ] Manual: `docker compose ps` muestra los 3 contenedores "healthy"/"running"

**Dependencies:** Task 9

**Files likely touched:**
- `docker-compose.yml`
- `.env.example`

**Estimated scope:** S

---

## Task 11: `Caddyfile` con DNS-01

**Description:** Configurar Caddy para servir `despensa4b.duckdns.org` con certificado automático vía DNS-01 (plugin `caddy-dns/duckdns`), proxy-pasando a PocketBase.

**Acceptance criteria:**
- [ ] Caddy obtiene certificado válido sin necesidad de abrir el puerto 80
- [ ] `https://despensa4b.duckdns.org` sirve la PWA correctamente

**Verification:**
- [ ] Manual: acceder desde el navegador y comprobar el candado HTTPS válido

**Dependencies:** Task 10

**Files likely touched:**
- `caddy/Caddyfile`

**Estimated scope:** S

---

## Task 12: Token DuckDNS + puerto 443

**Description:** Configurar el contenedor actualizador de DuckDNS con el token de la cuenta, y abrir (solo) el puerto 443 en el router hacia la IP local de la Pi.

**Acceptance criteria:**
- [ ] El registro DNS de `despensa4b.duckdns.org` se actualiza automáticamente si cambia la IP pública
- [ ] La app es accesible desde fuera de la red doméstica (datos móviles)

**Verification:**
- [ ] Manual: acceder a la URL con el wifi de casa desconectado (datos móviles)

**Dependencies:** Task 11

**Files likely touched:**
- `.env` (no versionado)

**Estimated scope:** XS

---

## Task 13: Migrar esquema y datos a la Pi

**Description:** Exportar la colección `items` (esquema y reglas) de la instancia local y aplicarla a la instancia de la Pi.

**Acceptance criteria:**
- [ ] La colección `items` en la Pi tiene el mismo esquema y las mismas reglas que en local
- [ ] Flujo completo probado contra la instancia de la Pi

**Verification:**
- [ ] Manual: repetir el checklist de la Fase 2 pero contra `https://despensa4b.duckdns.org`

**Dependencies:** Task 8, Task 12

**Files likely touched:** Ninguno (operación sobre datos, vía Admin UI)

**Estimated scope:** XS

---

## Task 14: `list_id` definitivo + pegatinas NFC

**Description:** Generar el/los `list_id` secreto(s) definitivos y grabarlos en las pegatinas NFC con NFC Tools, apuntando a `https://despensa4b.duckdns.org/?list=<id-secreto>`.

**Acceptance criteria:**
- [ ] Pasar el móvil (Android e iPhone) por la pegatina abre la lista correcta
- [ ] El `list_id` no es fácil de adivinar (aleatorio, suficientemente largo)

**Verification:**
- [ ] Manual: prueba física con pegatina y móvil real, ambos sistemas operativos

**Dependencies:** Task 13

**Files likely touched:** Ninguno

**Estimated scope:** XS

---

## Task 15: Proteger el panel admin de PocketBase

**Description:** Restringir el acceso a `/_/` (Admin UI de PocketBase) en Caddy, por ejemplo con basic auth, para que no quede expuesto públicamente junto al resto de la app.

**Acceptance criteria:**
- [ ] Acceder a `https://despensa4b.duckdns.org/_/` pide autenticación adicional
- [ ] El resto de la app (`/api/...`, frontend) sigue siendo accesible sin esa autenticación

**Verification:**
- [ ] Manual: comprobar ambos casos desde el navegador

**Dependencies:** Task 11

**Files likely touched:**
- `caddy/Caddyfile`

**Estimated scope:** XS

---

## Task 16: PWA instalable

**Description:** Completar `manifest.json` con iconos y colores, y añadir un service worker mínimo que cachee los estáticos (HTML/CSS/JS) para carga instantánea.

**Acceptance criteria:**
- [ ] "Añadir a pantalla de inicio" funciona en Android e iPhone y usa un icono propio
- [ ] La app carga instantáneamente en visitas repetidas (estáticos cacheados)

**Verification:**
- [ ] Manual: instalar en un móvil real y comprobar

**Dependencies:** Task 14

**Files likely touched:**
- `pb_public/manifest.json`
- `pb_public/sw.js`
- `pb_public/icons/`

**Estimated scope:** S
