# Cómo añadir una casa nueva a esta Raspberry Pi

Esta instancia de PocketBase puede servir la lista de la compra de varias casas a la vez, cada una totalmente aislada de las demás (ninguna ve los datos de otra). Pasos para dar de alta una casa nueva:

## 1. Generar un `list_id` secreto para la nueva casa

```bash
python3 -c "
import secrets, string
alphabet = string.ascii_lowercase + string.digits
print(''.join(secrets.choice(alphabet) for _ in range(20)))
"
```

Guarda el resultado — es la única "contraseña" de esa casa.

## 2. Crear su propio `manifest-<nombre>.json`

Copia `pb_public/manifest.json` a `pb_public/manifest-<nombre-de-la-casa>.json` (por ejemplo `manifest-casa2.json`) y cambia únicamente la línea `start_url` para que apunte al `list_id` nuevo:

```json
"start_url": "/?list=<el-list_id-nuevo>",
```

Todo lo demás (icono, colores, nombre) puede quedarse igual — es la misma app, solo cambia qué lista abre.

## 3. Registrar la casa en `pb_public/app.js`

Añade una línea al objeto `HOUSEHOLD_MANIFESTS`, cerca del principio del archivo:

```js
const HOUSEHOLD_MANIFESTS = {
  ai4bl3842mawmvlml48s: 'manifest.json',
  g6ldpf12bla9drw55ax9: 'manifest-casa2.json',
  '<el-list_id-nuevo>': 'manifest-<nombre-de-la-casa>.json', // <- nueva línea
};
```

Esto es lo que hace que, al instalar la PWA desde esa casa, el icono abra su lista y no otra.

## 4. Subir los cambios y grabar sus pegatinas NFC

```bash
git add pb_public/manifest-<nombre>.json pb_public/app.js
git commit -m "Add household: <nombre>"
git push
```

Y en la Pi: `git pull` (no hace falta reiniciar ningún contenedor, son archivos estáticos).

Graba sus pegatinas NFC (con NFC Tools) apuntando a:
```
https://despensa4b.duckdns.org/?list=<el-list_id-nuevo>
```

## Notas

- No hace falta tocar PocketBase, Docker, Caddy ni las reglas de seguridad — el aislamiento entre casas ya está garantizado por el propio `list_id` desde el diseño original (ver `SPEC.md`).
- Los datos de todas las casas viven en el mismo `pb_data` de esta Raspberry Pi: mismo propietario/administrador, misma disponibilidad. Si una casa necesitara independencia total (su propio servidor), lo correcto es que despliegue su propia instancia siguiendo el mismo repositorio (ver `SPEC.md` y `tasks/plan.md`).
