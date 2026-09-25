# Implementation Plan: Lista de la Compra NFC

## Overview

Construimos primero la app en local (PocketBase + frontend estático) para iterar rápido sin depender de la Raspberry Pi, y una vez el flujo completo funciona en local, la desplegamos en la Pi con Docker Compose (PocketBase + Caddy + DuckDNS) para tener acceso remoto real por HTTPS. Las pegatinas NFC se graban al final, cuando la URL definitiva ya es estable.

## Architecture Decisions

- **Desarrollo local primero, Pi después**: usamos el binario de PocketBase para Windows en el PC de desarrollo durante las Fases 1-2, para no depender de tener Docker/la Pi lista desde el día 1. El esquema se exporta (PocketBase permite exportar/importar colecciones como JSON) e importa en la instancia de la Pi en la Fase 3.
- **Subida de fotos sin HTTPS en local**: `<input type="file" capture>` abre la cámara vía selector de archivos del SO, no requiere `getUserMedia` ni HTTPS — se puede probar por LAN sin certificado durante el desarrollo.
- **El `list_id` es la única barrera de acceso**: no hay login. Esto se refuerza con una regla de API en PocketBase que exige que las consultas incluyan el `list_id` correcto como parámetro (ver Task 2) — sin URL secreta, no se puede ni listar ni escribir.
- **El panel admin de PocketBase debe protegerse aparte** (Task 15) — por defecto quedaría expuesto en la misma URL pública que la app.

## Task List

### Phase 1: Fundamentos (backend + esqueleto frontend)

- [x] Task 1: Definir el esquema de datos en PocketBase (colección `items`)
- [x] Task 2: Reglas de acceso de la colección `items` basadas en `list_id`
- [x] Task 3: Esqueleto de la PWA (HTML/CSS/JS conectado a PocketBase local)

### Checkpoint: Fundamentos
- [x] Se puede crear un item de prueba desde el navegador y verlo en el Admin UI de PocketBase
- [x] Revisión con el usuario antes de continuar

### Phase 2: Funcionalidad completa (local)

- [x] Task 4: Añadir producto (nombre + importancia) con actualización en tiempo real
- [x] Task 5: Marcar producto como comprado / eliminarlo
- [x] Task 6: Adjuntar foto con compresión en el cliente antes de subir
- [x] Task 7: Clasificación visual por nivel de importancia
- [x] Task 8: Botón "Compra terminada" (vacía lista + fotos, con confirmación)

### Checkpoint: App funcional en local
- [x] Flujo completo probado en el navegador (añadir, foto, importancia, marcar comprado, vaciar) — verificado paso a paso con el navegador integrado
- [ ] Probado en un Android y un iPhone reales por LAN — **pendiente, hace falta un dispositivo físico**
- [ ] Revisión con el usuario antes de continuar

### Phase 3: Infraestructura y despliegue remoto (Raspberry Pi)

- [ ] Task 9: Instalar Docker Engine + Compose plugin en la Raspberry Pi
- [ ] Task 10: `docker-compose.yml` con PocketBase + Caddy + actualizador DuckDNS
- [ ] Task 11: `Caddyfile` con DNS-01 (`caddy-dns/duckdns`) para `despensa4b.duckdns.org`
- [ ] Task 12: Configurar token DuckDNS + abrir puerto 443 en el router hacia la Pi
- [ ] Task 13: Migrar esquema y probar la app desplegada en la Pi

### Checkpoint: Acceso remoto funcionando
- [ ] La app carga por HTTPS en `https://despensa4b.duckdns.org/...` desde datos móviles (fuera de la wifi de casa)
- [ ] Los contenedores se reinician solos tras un reinicio de la Pi
- [ ] Revisión con el usuario antes de continuar

### Phase 4: NFC y cierre de seguridad

- [ ] Task 14: Generar `list_id` secreto definitivo y grabar las pegatinas NFC (NFC Tools)
- [ ] Task 15: Proteger el panel admin de PocketBase (Caddy basic auth o similar)
- [ ] Task 16: PWA instalable (iconos del manifest + service worker de cache básico)

### Checkpoint: Completo
- [ ] Todos los criterios de éxito del SPEC.md cumplidos
- [ ] Probado end-to-end con pegatina real en Android e iPhone

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| La API REST de PocketBase queda accesible aunque no se conozca la ruta "secreta" del frontend | Alto | Regla de API que exige `list_id` correcto como parámetro (Task 2); sin él, la consulta no devuelve nada |
| Panel admin de PocketBase expuesto públicamente | Alto | Task 15: protegerlo con basic auth en Caddy, en ruta separada |
| IP doméstica cambia y DuckDNS tarda en propagar (hasta ~5 min) | Bajo | Aceptable para uso doméstico; documentarlo en el README |
| Fotos acumuladas ocupan espacio en la SD/SSD de la Pi con el tiempo | Medio | Se borran al marcar comprado / vaciar lista (ya en el diseño); comprimidas en el móvil antes de subir |
| Single point of failure: si la Pi se cae, no hay lista disponible | Medio | Fuera de alcance por ahora (proyecto doméstico); posible backup periódico de `pb_data` como mejora futura |

## Open Questions

_Ninguna — se resuelven caso por caso al llegar a cada fase._
