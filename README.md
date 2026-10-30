# Patiñ Os v0.4 Alpha

Simulador táctil de circuitos digitales para Android (WebView sin internet).

## Cambios de v0.4

- Botones **Nuevo**, **Guardar** (exporta JSON) y **Abrir** (JSON / `.dig` compatible).
- Cableado táctil: arrastrar **salida → entrada** o tocar primero una salida y luego una entrada; también entrada → salida en dos toques. Puertos con área táctil de 40 unidades SVG y detección por cercanía en pantalla.
- No elimina cables al intentar conectar a una entrada ocupada; avisa y permite deshacer cambios.
- 34 tipos de componentes, incluyendo puertas de 3 y 4 entradas, MUX 2:1, majority, sumador SUM y CARRY, igualdad, implicación y sonda.
- Paleta de búsqueda y categorías para móvil.
- Mini efecto de partículas cuando hay conexiones incorrectas o no se estabiliza el circuito. **Es un efecto visual, no física ni una explosión real.**
- Tema negro/blanco y flujo lógico verde animado conservados.

Motor digital de un bit. No modela voltaje, corriente, temperatura, transistores físicos ni daños. Compatibilidad `.dig` limitada a elementos admitidos por el importador.

## Compilar
El workflow `Build Android APK` de GitHub Actions ejecuta pruebas y `gradle :app:assembleDebug`. Requiere JDK 17/Android SDK 35. En local: `node tests/engine.test.cjs` y `python tests/browser_test.py` (Chromium + Playwright).

Proyecto GPL-3.0, independiente de Digital de Helmut Neemann.