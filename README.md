# Patiñ Os v0.9.6 — candidata estable (RC1)

Simulador didáctico de lógica digital y circuitos electrónicos para Android. Funciona sin internet; el proyecto conserva los archivos `.patinos.json` anteriores.

## Cambios
- Simulación con un solo motor activo por laboratorio: ahorro de CPU/batería.
- Osciloscopio y panel de estado actualizados a menor frecuencia sin ralentizar las señales.
- Pausa real del cálculo en segundo plano y silenciamiento de audio fuera de la aplicación.
- Soporte de rotación, pantalla dividida y dimensiones reducidas.
- Respeto de la preferencia del sistema de reducir movimiento y animaciones.
- Límites de tamaño y cancelación segura al exportar proyectos desde Android.
- R8 y reducción de recursos conservados. Verificaciones del código y del paquete en CI.

## Estado de distribución
La v0.9.6 RC1 se publica como **prerelease, APK debug**. No equivale a una versión definitiva para Play Store: aún hay que configurar firma de producción persistente, comprobar actualizaciones y restauración de proyectos, validar Android en dispositivos reales y completar la información de publicación.

El build release acepta PATINOS_KEYSTORE_PATH, PATINOS_STORE_PASSWORD, PATINOS_KEY_ALIAS y PATINOS_KEY_PASSWORD como variables inyectadas por CI de forma segura; nunca incluyas la clave en el repositorio.

## Pruebas
Ejecutar `node tests/*.test.cjs` individualmente o revisar GitHub Actions. Los modelos físicos son educativos y algunos componentes siguen aproximados; no usar para certificar equipos ni seguridad eléctrica.

Licencia: GPL-3.0, consultar LICENSE.
