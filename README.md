# Patiñ Os v1.0.0 — edición privada

Simulador educativo local de electrónica y lógica para Android. La versión 1.0.0 consolida la interfaz adaptable, editor de conexiones, instrumentos, componentes electrónicos y experimentos de audio.

## Estado de publicación
- Código en `main`: versión **1.0.0** preparada y sometida a CI.
- La versión descargable de **producción** exige firma persistente y un repositorio **privado**. El workflow `release-signed.yml` se ejecuta manualmente; **se niega a publicar si el repositorio es público**, si falta un secreto o si no pasan las pruebas.
- Los APK generados por `android-apk.yml` son **debug**, únicamente para validar; este workflow ya no crea una Release pública automáticamente.
- La etiqueta **v1.0.0** y la GitHub Release solo aparecen después de que el workflow firmado complete exitosamente.
- Para distribuir la app al público manteniendo el código privado se necesita un canal de descarga distinto de GitHub Releases privadas: las Releases de un repositorio privado no son accesibles a personas sin permisos.

## Preparar la publicación cerrada
1. Ve a **Settings → General → Danger Zone → Change repository visibility → Make private**.
2. Configura en **Settings → Secrets and variables → Actions** cuatro secretos: `PATINOS_KEYSTORE_BASE64`, `PATINOS_STORE_PASSWORD`, `PATINOS_KEY_ALIAS` y `PATINOS_KEY_PASSWORD`. Crea una clave de firma de producción nueva en una computadora de confianza y conserva una copia segura fuera del repositorio. Nunca la subas al código.
3. Ve a **Actions → Publicar APK firmado de Patiñ Os → Run workflow** en `main`. El workflow prueba, compila, verifica la firma, genera SHA-256 y publica la GitHub Release privada `v1.0.0`.

**Importante sobre la licencia:** el proyecto tiene licencia GPL-3.0. Hacer privado el repositorio no sustituye las obligaciones de ofrecer el código fuente correspondiente a quienes reciban binarios que contengan código GPL; tampoco revoca copias públicas anteriores.

## Alcance y seguridad
Simulación local digital, fuentes, redes RC/RL, modelos educativos SPICE-lite, LEDs, transformadores aproximados, audio sintético. No sustituye SPICE de precisión industrial, ensayo físico ni certificaciones de seguridad eléctrica.

## Pruebas
`node tests/engine.test.cjs`, `node tests/spice.test.cjs` y `for f in tests/*.test.cjs; do node "$f"; done`.
Prueba visual responsiva: `python tests/responsive.test.py` con Playwright/Chromium.

© colaboradores de Patiñ Os. Consulte `LICENSE` para los términos GPL-3.0.
