# Vital Foods Control

Aplicación móvil-first para simplificar el trabajo diario de Vital Foods: inventario, pedido semanal de proteínas, pedido de mercado, mermas e historial.

## Lo que ya incluye

- Interfaz rápida para celular y tablet.
- Inventario diario por botones, teclado o voz.
- Pedido semanal de proteínas con catálogo precargado.
- Pedido de mercado por categorías, con columnas Stock y Pedido.
- Registro de mermas con motivo, acción y responsable.
- Historial local de movimientos.
- Reportes rápidos.
- Modo offline básico y respaldo local.
- PWA instalable.
- Preparado para APK con Capacitor.
- Esquema SQL listo para Supabase y sincronización online.
- Diccionario de alias para frases como `S pollo`, `R pollo`, `P chaufa`, `H quinua 100`, etc.

## Ejecutar en PC

```bash
npm install
npm run dev
```

Abrir `http://localhost:5173`.

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

## Sincronización online

El proyecto está preparado para Supabase. El esquema inicial está en:

`supabase/schema.sql`

Crear `.env` desde `.env.example` y completar:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

La siguiente etapa conecta autenticación, sincronización en tiempo real y almacenamiento de evidencias/fotos.

## Catálogo

Los productos base están en `src/data/catalog.js`. Las categorías actuales son:

- Frutas
- Verduras
- Hierbas
- Abarrotes y frutos secos
- Lechugas
- Proteínas

El diseño está pensado para evolucionar a un catálogo editable desde la propia aplicación, sin tocar código.

## Próximas mejoras previstas

- Sincronización Supabase en tiempo real entre celular, tablet y PC.
- Login sencillo por PIN/usuario.
- Catálogo editable y alias personalizados desde la app.
- Reposición sugerida según consumo histórico.
- Exportación Excel/PDF con formato Vital Foods.
- Compartir pedido directamente por WhatsApp.
- Fotos de merma.
- Firma/verificación del jefe.
- Panel administrativo web.
- Instalador APK firmado.

---

Hecho para reducir pasos: menos escritura, menos papeles y más control diario.
