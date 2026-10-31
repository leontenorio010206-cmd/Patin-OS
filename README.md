# Patiñ Os v0.9.6.1 RC2 — adaptación de pantalla

Revisión de interfaz sobre la v0.9.6 RC1. No cambia las ecuaciones ni componentes de simulación.

- En teléfonos verticales el encabezado dispone acciones en fila propia. El editor se desplaza independientemente y el catálogo queda debajo sin superponer el osciloscopio.
- En horizontal el catálogo pasa a la izquierda y el editor mantiene desplazamiento independiente.
- En tablets se conserva el panel lateral. Tamaños adaptativos, áreas táctiles y compatibilidad con reducción de movimiento.
- ResizeObserver recalcula la vista SVG al cambiar el tamaño del lienzo, conservando el zoom y centro.
- Se conserva el guardado de los proyectos existentes. Pruebas: `python tests/responsive.test.py` (requiere Chromium y Playwright).

**Es una candidata de prueba**, no un APK de producción firmado permanentemente. Los modelos eléctricos siguen siendo educativos.

# Patiñ Os v0.9.6 — candidata a versión estable (RC1)

Patiñ Os es un simulador educativo de electrónica y lógica para Android, que funciona sin conexión. Conserva las funcionalidades y archivos de proyecto de v0.9.5.

## Mejoras comprobables en v0.9.6
- Se ejecuta **un solo motor por laboratorio**: lógica digital o electrónica, no ambos a la vez. Se reduce el uso de CPU y batería.
- Muestreo del osciloscopio desacoplado del pintado; simulación base cada 90 ms y refresco gráfico más lento. Las animaciones SVG siguen siendo independientes.
- Se evita procesar simulación cuando la app no está visible; el audio se apaga al salir.
- Reencuadre de pantalla sin perder zoom al rotar o usar pantalla dividida, y CSS para pantallas pequeñas.
- Respeta la preferencia de Android de reducir movimientos y animaciones.
- Guardas de tamaño en el puente JavaScript para exportaciones y manejo de cancelación del selector.
- R8 y minificación conservados; verificaciones de integridad de recursos web y pruebas automáticas.

## Estado de distribución
- GitHub Actions genera **APK de depuración RC1** para pruebas públicas.
- **No etiquetar como estable ni distribuir en Google Play todavía:** falta configurar clave de firma de producción persistente, probar actualizaciones y exportar/respaldar proyectos, realizar pruebas en varios teléfonos, completar ficha de privacidad y validación de requisitos de publicación.
- El build `release` puede firmarse con variables `PATINOS_KEYSTORE_PATH`, `PATINOS_STORE_PASSWORD`, `PATINOS_KEY_ALIAS`, `PATINOS_KEY_PASSWORD` en un runner seguro, usando secretos de GitHub.

## Pruebas locales
`node tests/engine.test.cjs`, `node tests/spice.test.cjs`, `node tests/v09.test.cjs` ... `node tests/v096.test.cjs`.

## Limitaciones
No es ngspice completo ni sustituye cálculos y mediciones de seguridad eléctrica; ciertos componentes tienen modelos simplificados. GPL-3.0: fuente y atribuciones en LICENSE.
