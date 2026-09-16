# Vital Foods Control

Aplicación móvil-first para simplificar el trabajo diario de Vital Foods: inventario, pedido semanal de proteínas, pedido de mercado, mermas, voz, historial y sincronización entre celular, tablet y PC.

## Arquitectura actual

La V1.1 ya no depende de Supabase.

- **Frontend:** React + Vite
- **PWA:** instalable desde navegador
- **APK Android:** Capacitor
- **Backend:** Cloudflare Pages Functions
- **Base online:** Cloudflare D1
- **Trabajo sin internet:** almacenamiento local en el equipo
- **Sincronización:** automática al recuperar conexión y cada 30 segundos
- **Conflictos:** revisión por versión + fusión de historial y mermas

La idea principal es que la operación nunca se detenga porque no haya internet. El celular guarda localmente y sincroniza después.

## Lo que ya incluye

- Interfaz rápida para celular y tablet.
- Inventario diario por botones, teclado o voz.
- Pedido semanal de proteínas con catálogo precargado.
- Pedido de mercado por categorías, con columnas Stock y Pedido.
- Registro de mermas con motivo, acción y responsable.
- Historial de movimientos.
- Reportes rápidos.
- Modo offline-first.
- Sincronización online Cloudflare D1.
- PWA instalable.
- Preparado para APK con Capacitor.
- Diccionario de alias para frases como `S pollo`, `R pollo`, `P chaufa`, `H quinua 100`, etc.

## Ejecutar en PC

```bash
npm install
npm run dev
```

Abrir `http://localhost:5173`.

> Con `npm run dev` funciona la interfaz y el almacenamiento local. Para probar también Pages Functions + D1 local usa `npm run cf:dev` después de crear la base.

## Crear versión de producción

```bash
npm run build
```

La salida queda en `dist/`.

## Crear APK Android

Primera vez:

```bash
npm install
npm run build
npm run android:add
npm run android:sync
npm run android:open
```

Android Studio abrirá el proyecto. Desde allí se puede generar APK o AAB.

## Voz

El reconocimiento usa la API de voz disponible en Chrome/Android. Ejemplo:

> Super pollo 69, regular pollo 65, chaufa 19, hamburguesa quinua 100 cinco.

Antes de aplicar, la app muestra lo que entendió para que la operadora confirme.

---

# Cloudflare D1: configuración una sola vez

## 1. Crear la base D1

Desde Cloudflare Dashboard:

`Storage & Databases -> D1 SQL Database -> Create database`

Nombre recomendado:

```text
vital-foods-db
```

También puede hacerse con Wrangler:

```bash
npx wrangler login
npx wrangler d1 create vital-foods-db
```

## 2. Crear las tablas

El esquema está en:

```text
migrations/0001_init.sql
```

Con Wrangler:

```bash
npm install
npm run cf:migrate:remote
```

Si Wrangler pide seleccionar/configurar la base, usar `vital-foods-db`.

También se puede copiar el contenido de `migrations/0001_init.sql` y ejecutarlo desde la consola SQL de D1.

## 3. Conectar D1 a Cloudflare Pages

En el proyecto Pages que publique este repositorio:

`Settings -> Bindings -> D1 database bindings`

Agregar:

```text
Variable name: DB
D1 database: vital-foods-db
```

El nombre **DB** es importante porque las funciones `/api/state` y `/api/health` lo usan directamente.

## 4. Configuración de build en Pages

```text
Framework preset: Vite
Build command: npm run build
Build output directory: dist
```

Cloudflare detectará automáticamente la carpeta `functions/` y publicará las APIs junto con la web.

## 5. Verificar que quedó online

Después del deploy abrir:

```text
https://TU-DOMINIO.pages.dev/api/health
```

Debe responder algo similar a:

```json
{
  "ok": true,
  "service": "vital-foods-cloudflare",
  "database": "ok"
}
```

## Sincronización entre equipos

Por defecto todos los dispositivos usan:

```text
VITE_WORKSPACE_ID=vital-foods-main
```

Mientras celular, tablet y PC usen la misma aplicación publicada, compartirán el mismo espacio de trabajo.

El comportamiento es:

1. Cada cambio se guarda primero en el dispositivo.
2. Aproximadamente 850 ms después intenta enviarse a D1.
3. Si no hay internet, queda pendiente localmente.
4. Al recuperar conexión se sincroniza automáticamente.
5. Cada 30 segundos se consulta si existe una versión más nueva creada desde otro equipo.
6. Si llega una versión remota, la interfaz se actualiza automáticamente.

## API disponible

```text
GET /api/health
GET /api/state?workspace=vital-foods-main
PUT /api/state
```

El endpoint de estado usa control de revisiones para evitar sobrescrituras silenciosas entre dos equipos.

## Variables opcionales

Crear `.env` desde `.env.example` solo si se necesita cambiar el comportamiento por defecto:

```env
VITE_API_BASE=
VITE_WORKSPACE_ID=vital-foods-main
```

Si frontend y API están en el mismo Pages, `VITE_API_BASE` debe quedarse vacío.

## Catálogo

Los productos base están en `src/data/catalog.js`. Las categorías actuales son:

- Frutas
- Verduras
- Hierbas
- Abarrotes y frutos secos
- Lechugas
- Proteínas

## Siguiente evolución

- CRUD visual de productos y alias desde la propia app.
- Usuarios/PIN por operador.
- Pedido sugerido según consumo histórico y stock.
- Exportación Excel/PDF con formato Vital Foods.
- Compartir pedido por WhatsApp.
- Fotos de merma usando Cloudflare R2.
- Firma/verificación del jefe.
- Panel administrativo y métricas mensuales.
- APK firmada para instalación directa.

---

Hecho para reducir pasos: menos escritura, menos papeles y más control diario.
