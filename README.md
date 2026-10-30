# Patiñ Os — v0.3 Alpha

Simulador lógico táctil para Android, en español.

## Novedades
- Tema monocromático negro/gris/blanco con verde para señales HIGH.
- Símbolos SVG escalables para compuertas lógicas, entradas, reloj y LED.
- Flujo animado que recorre los cables desde la fuente a la salida.
- LED iluminado según el resultado lógico; osciloscopio en tiempo real.
- Reencuadre automático de circuitos, pausa de animación y barras de sistema Android 15+.
- Importación experimental de .dig, proyectos JSON y edición táctil conservados.

El flujo representa estados lógicos, **no corriente física real**.

## Compilación
GitHub Actions: workflow **Build Android APK**. Descargar el artefacto debug generado.
Pruebas: `node tests/engine.test.cjs` y `python tests/browser_test.py` (requiere Chromium y Playwright).

GPL-3.0. Proyecto independiente; no es una aplicación oficial de Digital.
