# Despensa: una lista de la compra familiar activada por NFC
### Documentación completa del proyecto — qué se construyó, cómo y por qué

---

## 1. Resumen ejecutivo (para cualquier audiencia)

**Despensa** es una aplicación web privada, pensada para un solo hogar, que resuelve un problema muy concreto: cuando alguien de la familia se da cuenta de que falta algo en la nevera o la despensa, apuntarlo debería costar dos segundos, no abrir una app, buscarla, iniciar sesión y navegar hasta la lista correcta.

La solución fue eliminar por completo esa fricción: se colocan **pegatinas NFC** (un chip minúsculo y pasivo, sin batería) en la puerta de la nevera o en la despensa. Cualquier persona de la casa simplemente **acerca el móvil** a la pegatina y, al instante, se abre la lista de la compra compartida de la familia, lista para añadir lo que falta — con foto, con el nivel de urgencia, y visible en tiempo real para todos los demás.

Todo el sistema corre en un ordenador del tamaño de una tarjeta de crédito (una Raspberry Pi) en casa del propio usuario, sin depender de ningún servicio de pago ni de que una empresa externa guarde los datos de la familia.

Este proyecto se usó también como un **ejercicio deliberado de aprendizaje profesional**: cada decisión técnica se tomó de forma consciente, comparando alternativas, y siguiendo una metodología de desarrollo de software estructurada (especificación → planificación → implementación incremental → verificación), en vez de simplemente "ir programando".

---

## 2. El problema y la motivación

Las listas de la compra en papel se pierden, se olvidan en casa, y solo las puede editar quien esté físicamente delante de ellas. Las apps de listas de la compra genéricas del móvil resuelven parte del problema, pero introducen otro: hay que abrir la app correcta, a veces iniciar sesión, y el "momento en que te acuerdas de que falta algo" (delante de la nevera) rara vez coincide con el "momento en que tienes el móvil desbloqueado en esa app".

La pregunta de diseño de partida fue: **¿cómo reducimos ese gesto a "acercar el móvil y ya está", para cualquier miembro de la casa, sin fricción ninguna?**

De ahí surgieron los cuatro requisitos que gobernaron todo el proyecto:

1. Acceso instantáneo vía NFC, sin login.
2. Añadir productos con foto (para especificar marca, tipo, etc.) y un nivel de importancia.
3. Acceso también desde fuera de casa (para comprar sobre la marcha).
4. Cero coste recurrente y control total de los datos — autoalojado, no en la nube de un tercero.

---

## 3. Qué hace la aplicación (recorrido funcional)

- **Abrir la lista**: se acerca el móvil a la pegatina → se abre el navegador directamente en la lista de la casa. No hace falta instalar nada la primera vez (aunque se puede "instalar" después como un icono más, ver sección 8).
- **Añadir un producto**: nombre, cantidad/unidad opcional (ej. "2L"), nivel de importancia (Normal / Importante / Si acaso), y opcionalmente una foto tomada con la cámara del propio móvil.
- **Tiempo real**: si dos personas tienen la lista abierta a la vez, los cambios de una aparecen en la otra al instante, sin recargar la página.
- **Clasificación visual**: los productos importantes se destacan con color, icono (❗) y aparecen arriba de la lista; los "si acaso" aparecen atenuados.
- **Comentarios**: se puede añadir una nota a cualquier producto (p. ej. "no había en la tienda, mirar mañana").
- **Marcar como comprado**: un simple check tacha el producto y lo manda al final de la lista.
- **Deshacer al eliminar**: al borrar un producto por error, aparece un aviso de 5 segundos con la opción de deshacerlo, antes de que se borre de verdad — evita el clásico "diálogo de confirmación" molesto sin perder la posibilidad de arrepentirse.
- **Vibración**: si llega un producto marcado como "importante" mientras tienes el móvil en la mano, vibra brevemente (en Android).
- **Vaciar la lista**: un botón "Compra terminada" borra todo (incluidas las fotos) para empezar de cero tras cada compra.
- **Acceso remoto**: la misma URL funciona exactamente igual desde datos móviles, fuera de casa.
- **App instalable**: se puede "Añadir a pantalla de inicio" y queda como un icono más del móvil, a pantalla completa, sin la barra del navegador.

---

## 4. Arquitectura: cómo encajan las piezas

### 4.1 En una frase

Un **móvil** lee una **pegatina NFC** que contiene una **URL secreta**; esa URL apunta a una **Raspberry Pi** en casa, que sirve una **página web** (el frontend) y guarda los datos en una **base de datos** (el backend) — todo expuesto a internet de forma seguraa través de un **proxy con HTTPS** y un **servicio de nombres de dominio gratuito**.

### 4.2 El recorrido de una petición, paso a paso

```
Móvil (NFC) → URL con código secreto
    → Internet
    → Router de casa (puerto 443 reenviado)
    → Raspberry Pi
        → Caddy (proxy inverso, certificado HTTPS automático)
            → PocketBase (aplicación + base de datos + fotos)
```

### 4.3 Las piezas y su papel

| Pieza | Qué es | Por qué está ahí |
|---|---|---|
| **Pegatina NFC** | Chip pasivo que guarda una URL | Es lo que permite "tocar y listo", sin apps nativas |
| **Frontend (HTML/CSS/JS)** | La interfaz que ve el usuario | Ligera, sin instalación, funciona en cualquier móvil |
| **PocketBase** | Backend todo-en-uno: base de datos, API, tiempo real, almacenamiento de fotos, panel de administración | Evita programar un servidor a medida; un solo programa hace todo el trabajo pesado |
| **Caddy** | Servidor "proxy inverso" | Traduce el tráfico de internet hacia PocketBase, y gestiona el certificado HTTPS automáticamente |
| **DuckDNS** | Servicio de "DNS dinámico" gratuito | Traduce un nombre fácil de recordar (`despensa4b.duckdns.org`) a la IP de casa, que puede cambiar con el tiempo |
| **Docker** | Sistema de "contenedores" | Empaqueta cada pieza (PocketBase, Caddy, DuckDNS) de forma aislada y reproducible |
| **Raspberry Pi** | El ordenador que lo aloja todo | Bajo consumo, siempre encendido, propiedad del usuario |

---

## 5. Decisiones técnicas: qué se eligió, con qué se comparó, y por qué

Cada decisión de este proyecto se tomó sopesando alternativas reales. Esta sección documenta ese razonamiento — es la parte más relevante para una audiencia técnica.

### 5.1 Backend: PocketBase — frente a Firebase / Supabase / un servidor a medida

**Qué se eligió:** PocketBase, un backend de código abierto que es un único archivo ejecutable, con base de datos SQLite integrada, API REST, sincronización en tiempo real, almacenamiento de ficheros y un panel de administración web, todo incluido.

**Alternativas consideradas:**
- *Firebase / Supabase* (servicios en la nube): habrían resuelto lo mismo con menos configuración inicial, pero implican que los datos (incluidas fotos familiares) viven en servidores de un tercero, y a partir de cierto uso dejan de ser gratuitos.
- *Servidor propio (Node.js + base de datos + WebSockets escritos a mano)*: máximo control, pero muchísimo más tiempo de desarrollo para reconstruir funcionalidad que ya viene resuelta en herramientas existentes.

**Ventajas de PocketBase:** arranque casi instantáneo, huella de recursos mínima (ideal para una Raspberry Pi), el esquema de datos se define como código versionado (migraciones), no depende de ningún servicio externo.

**Desventajas/riesgos aceptados:** proyecto más joven y con una comunidad más pequeña que Firebase; menos integraciones "listas para usar"; en un contexto empresarial de gran escala, probablemente no sería la primera opción — pero para esta escala (un hogar) es objetivamente la herramienta correcta.

### 5.2 Frontend: HTML/CSS/JavaScript sin framework — frente a React/Svelte/Vue

**Qué se eligió:** JavaScript "vanilla" (sin ninguna librería de interfaz), sin paso de compilación (`build step`).

**Por qué:** la aplicación es una sola pantalla con un puñado de interacciones. Un framework moderno habría añadido una cadena de herramientas de compilación, dependencias que mantener actualizadas, y una complejidad de despliegue completamente injustificada para este alcance.

**Ventaja concreta y medible:** desplegar un cambio de interfaz es copiar un archivo — no hay "build", no hay `npm install`, no hay versiones de Node que mantener sincronizadas entre el PC de desarrollo y la Raspberry Pi.

**Desventaja aceptada:** este enfoque no escalaría bien si la aplicación creciera mucho en complejidad (más pantallas, estado compartido complejo); en ese caso, un framework dejaría de ser una sobre-ingeniería y pasaría a ser la opción correcta. Es una decisión deliberadamente ligada al tamaño *actual* del proyecto, no un dogma.

### 5.3 Infraestructura: Raspberry Pi autoalojada — frente a un hosting en la nube

**Qué se eligió:** alojar todo en una Raspberry Pi física, en casa del usuario.

**Ventajas:** coste recurrente cero, propiedad total de los datos (las fotos de la nevera de una familia no salen de casa), y — no menos importante — un ejercicio práctico real de Linux, redes, Docker y DNS que no se consigue delegando todo a un proveedor.

**Desventajas y riesgos que se aceptaron conscientemente:**
- **Punto único de fallo**: si la Raspberry Pi o el internet de casa se caen, la aplicación deja de estar disponible. No hay infraestructura redundante como en un proveedor cloud profesional.
- **La seguridad depende del propio usuario**: no hay un equipo de operaciones detrás; las actualizaciones, copias de seguridad y monitorización son responsabilidad de quien lo mantiene.
- **Más pasos de configuración inicial** que contratar un servicio gestionado.

### 5.4 Nombre de dominio y acceso remoto: DuckDNS + puerto abierto — frente a Cloudflare Tunnel o un dominio propio

**Qué se eligió (para empezar):** un subdominio gratuito de DuckDNS (`despensa4b.duckdns.org`) junto con un único puerto (443, HTTPS) reenviado desde el router de casa hacia la Raspberry Pi.

**Alternativa evaluada:** *Cloudflare Tunnel*, que evitaría abrir cualquier puerto del router (la Raspberry Pi inicia la conexión hacia fuera, no al revés) — pero exige tener un dominio propio gestionado por Cloudflare, es decir, un coste y un paso de compra que no encajaba con la fase "quiero probar esto antes de comprometerme" del proyecto.

**Un reto real que surgió aquí:** la casa tiene una topología de red en dos niveles (un router general y un segundo router/repetidor en una habitación). El primer intento de abrir el puerto se hizo en el dispositivo equivocado (el de la habitación) y no funcionó — porque el reenvío de puertos solo puede configurarse en el dispositivo que recibe la IP pública real de la vivienda. Este fue un buen ejemplo práctico de un concepto de redes (NAT) que a menudo solo se entiende bien al tropezar con él.

**Trade-off aceptado:** exponer un puerto a internet, aunque sea solo uno y esté bien defendido, es una superficie de ataque que no existiría con Cloudflare Tunnel. Se documentó explícitamente como una mejora futura si el proyecto "se pone serio" (comprar un dominio propio).

### 5.5 Modelo de seguridad: URL secreta como "contraseña" — frente a un sistema de usuarios tradicional

**Qué se eligió:** no hay ningún inicio de sesión. El acceso se controla mediante un identificador de lista (`list_id`) largo y aleatorio (20 caracteres, más de 100 bits de entropía — prácticamente imposible de adivinar) incrustado en la URL de la pegatina NFC. El propio backend (PocketBase) se configuró para exigir ese identificador correcto en cada operación de lectura o escritura.

**Por qué:** el requisito número uno del proyecto era "cero fricción" — cualquiera de la familia debía poder usarlo sin crear una cuenta. Es el mismo modelo de seguridad que usa, por ejemplo, un enlace para compartir un documento de Google Docs.

**Ventajas:** fricción cero, coincide exactamente con el objetivo del proyecto.

**Desventajas y límites reconocidos:** si esa URL se filtra (una captura de pantalla compartida sin querer, un reenvío), cualquiera con ella tiene acceso completo. No hay control de acceso por usuario ni un registro de auditoría fiable de quién hizo qué (existe un campo de "nombre libre", pero no está verificado). Es un modelo de seguridad válido y proporcional para una lista de la compra doméstica — sería completamente inadecuado para datos sensibles.

### 5.6 Orquestación: Docker Compose

**Qué se eligió:** los tres servicios (PocketBase, Caddy, DuckDNS) corren como contenedores Docker orquestados con un único archivo `docker-compose.yml`.

**Por qué:** aislamiento entre servicios, reproducibilidad (el mismo entorno en el PC de desarrollo y en la Raspberry Pi), y una forma limpia de reiniciar o actualizar una pieza sin tocar las demás. Además, es una habilidad de infraestructura ampliamente transferible a entornos profesionales.

**Coste aceptado:** una capa extra de abstracción y algo de tiempo de compilación inicial (especialmente compilar Caddy con un módulo adicional), para una aplicación que, en el fondo, es un único binario que podría haberse ejecutado directamente sobre el sistema operativo.

### 5.7 Panel de administración: protegido con una capa extra

Una vez la aplicación quedó expuesta a internet de verdad, se identificó que el panel de administración de PocketBase (desde donde se pueden ver y borrar todos los datos) quedaba en la misma dirección pública que el resto de la app. Se añadió una capa de autenticación adicional (usuario y contraseña, gestionada por Caddy, independiente del propio login de PocketBase) delante de esa ruta concreta — un ejemplo de "defensa en profundidad": varias capas de protección independientes, en vez de confiar en una sola.

---

## 6. Metodología de desarrollo empleada

Este proyecto no se construyó "programando sobre la marcha". Se siguió un proceso estructurado, apoyado por un asistente de IA (Claude), con roles y fases bien definidos:

1. **Especificación antes que código**: se redactó un documento (`SPEC.md`) con el objetivo, la pila tecnológica, la estructura del proyecto, las convenciones de estilo, la estrategia de pruebas y unos límites explícitos de qué se podía hacer libremente, qué requería confirmación, y qué estaba prohibido — antes de escribir ni una línea de código.
2. **Planificación en fases con puntos de control**: el trabajo se dividió en 4 fases (base de datos y app local → funcionalidad completa → infraestructura en la Raspberry Pi → NFC y seguridad final) y 16 tareas concretas, cada una con criterios de aceptación explícitos y un paso de verificación definido de antemano.
3. **Implementación incremental**: cada tarea se implementó, se probó de inmediato (en muchos casos con datos reales generados a propósito, inspeccionando la base de datos directamente, o verificando desde fuera de la red doméstica con `curl`) y solo se marcó como terminada cuando su criterio de aceptación quedaba demostrado — no asumido.
4. **Control de versiones desde el primer commit**: el código se versionó con Git desde el principio, en un repositorio propio en GitHub, con mensajes de commit descriptivos.
5. **División deliberada de responsabilidades**: el usuario decidió ejecutar personalmente todos los comandos de Git y todos los comandos en la Raspberry Pi (por SSH), mientras que la IA se encargó de escribir el código, diagnosticar problemas y preparar cada comando exacto a ejecutar. Esto mantuvo al usuario en control total de cualquier sistema real (su repositorio, su servidor doméstico) y, a la vez, sirvió como aprendizaje activo.

---

## 7. Retos técnicos reales y cómo se resolvieron

Un proyecto de este tipo no sale perfecto a la primera. Estos son los problemas reales que surgieron — y son, en muchos sentidos, la parte más formativa del proceso:

| Problema | Causa | Solución |
|---|---|---|
| La lista se desincronizaba tras marcar un producto | El propio motor de PocketBase cancelaba peticiones "duplicadas" en tiempo real | Se desactivó esa cancelación automática para las recargas de la lista |
| La miniatura de la foto aparecía en el lado equivocado | Un error en el orden en que el código insertaba los elementos en la pantalla | Se corrigió el orden de inserción |
| Al arrancar por primera vez, los datos no aparecían donde se esperaba | PocketBase guarda sus archivos junto al programa, no en la carpeta desde la que se ejecuta | Se indicaron explícitamente las carpetas correctas al arrancarlo |
| No se podía crear la cuenta de administrador en la Raspberry Pi | Se olvidó "publicar" ese puerto en la configuración de Docker | Se añadió el puerto que faltaba |
| La aplicación se quedaba bloqueada nada más entrar | Una regla de estilo (CSS) tenía más prioridad de la esperada y mostraba una ventana vacía a pantalla completa | Se corrigió la prioridad de esa regla |
| No se podía acceder desde fuera de casa | El puerto se había abierto en el router equivocado (doble red doméstica) | Se abrió en el router principal, el único con la IP pública real |
| El icono de la app aparecía con un hueco extraño alrededor | El sistema operativo del móvil añadía relleno de seguridad por su cuenta | Se marcó el icono como apto para recorte automático ("maskable") |

Ninguno de estos problemas fue "adivinado" — todos se diagnosticaron con evidencia real: registros del servidor, consultas directas a la base de datos, inspección del tráfico de red, y pruebas en dispositivos físicos reales.

---

## 8. Seguridad: qué se hizo y qué límites existen

**Medidas aplicadas:**
- Todo el tráfico va cifrado por HTTPS (certificado real, renovado automáticamente).
- Solo un puerto (443) está expuesto a internet; ningún otro servicio de la red doméstica es alcanzable desde fuera.
- El acceso por SSH a la Raspberry Pi permanece únicamente dentro de la red local, nunca expuesto a internet.
- El panel de administración tiene una capa de autenticación independiente y adicional.
- El identificador de la lista es largo y aleatorio, no adivinable por fuerza bruta en un tiempo razonable.

**Límites reconocidos (y por qué son aceptables aquí):**
- No hay autenticación de usuarios individuales — es un modelo "quien tiene el enlace, entra", proporcional a una lista de la compra doméstica.
- No hay copias de seguridad automatizadas todavía (mejora pendiente, de bajo esfuerzo).
- La disponibilidad depende de la conexión a internet y el hardware de una sola casa — sin redundancia.

---

## 9. Estado actual y trabajo pendiente

- ✅ Todas las fases del plan completadas y verificadas en Android.
- ⏳ Verificación pendiente en iPhone (funcionalmente no debería haber diferencias, ya que todo se basa en estándares web abiertos, pero no se ha confirmado físicamente).
- Ideas de mejora futura ya identificadas pero no implementadas: mostrar quién añadió cada producto, contador de pendientes visible en el icono, copias de seguridad automáticas periódicas, y una eventual migración a un dominio propio con Cloudflare Tunnel si el proyecto crece.

---

## 10. Glosario (para quien no venga de un perfil técnico)

- **NFC**: tecnología de comunicación de muy corto alcance (unos centímetros) que permite que un móvil "lea" un chip pasivo sin batería con solo acercarlo.
- **PWA (Progressive Web App)**: una página web que se puede "instalar" en el móvil como si fuera una app, sin pasar por una tienda de aplicaciones.
- **API**: la "puerta" por la que la aplicación del móvil pide o envía datos al servidor.
- **Backend / Frontend**: el backend es la parte que corre en el servidor (datos, lógica); el frontend es lo que ve y toca el usuario en la pantalla.
- **Contenedor (Docker)**: una forma de empaquetar un programa junto con todo lo que necesita para funcionar, de manera aislada y reproducible en cualquier ordenador.
- **DNS**: el "listín telefónico" de internet, que traduce nombres (`despensa4b.duckdns.org`) en direcciones numéricas reales.
- **HTTPS / TLS**: la capa de cifrado que impide que alguien intercepte los datos mientras viajan por internet.
- **Proxy inverso**: un programa que recibe el tráfico de internet en nombre de otro servicio y se lo reenvía, gestionando por el camino cosas como el cifrado.
- **NAT / reenvío de puertos**: el mecanismo por el que un router doméstico decide a qué dispositivo interno de la casa enviar el tráfico que llega de internet.
- **Base de datos**: el lugar donde se guardan de forma organizada los datos de la aplicación (los productos de la lista, en este caso).
