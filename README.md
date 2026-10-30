# Patiñ Os v0.8 Alpha — circuito lógico y simulador eléctrico Android

## Qué está implementado
- Interfaz negra/blanca y cableado táctil. Componentes lógicos y catálogo analógico.
- NPN/PNP (B,C,E), NMOS/PMOS (G,D,S) y amplificador operacional (+, −, OUT) con **tres terminales independientes**. Las conexiones analógicas admiten derivaciones a un mismo terminal.
- **SPICE-lite**: cálculo de punto de operación DC mediante análisis nodal modificado y linealización iterativa de modelos educativos de BJT, MOSFET y operacional. Los circuitos analógicos sin dispositivos de varios terminales siguen usando el motor RC/RL de v0.7.
- Botón **SPICE**: exporta un netlist `.cir` básico compatible con ngspice; avisa de elementos no soportados. En Android usa el selector nativo para guardar.
- Conexiones antiguas compatibles (`fromPin=1` y `toPin=0` si no están declarados).
- Optimización de ejecución: caché para circuitos DC sin cambios, render SVG sin reconstruir cables idénticos. Optimización del APK: R8 y reducción de recursos de compilación debug; no se agregan binarios nativos.

## Límites explícitos
**No es ngspice embebido y no es simulación SPICE completa.** Los modelos BJT/MOSFET son aproximaciones DC sin física térmica detallada, modelos BSIM ni capacitancias internas. El operacional usa un riel virtual de saturación, no terminales de alimentación reales. En redes con transistores, los capacitores y bobinas se representan por sus límites DC: no se modelan transitorios acoplados en esta versión. Transformadores, relés mecánicos e integrados complejos no están simulados. El archivo `.cir` se puede validar con una instalación externa de ngspice, pero sus modelos no garantizan la misma solución numérica que el simulador interno.

## Cómo usar
1. Añade fuente DC, tierra, resistencias y un NPN/NMOS desde la categoría semiconductores.
2. Toca/arrastra terminales coloreados (B/C/E o G/D/S). Los mismos terminales aceptan varias conexiones.
3. Mantén pulsado cada componente para modificar propiedades. Usa `SPICE` para guardar un `.cir`.
4. Para una prueba reproducible, abre `ejemplo_NMOS_DC.patinos.json` desde el menú Abrir.

## Pruebas
`node tests/engine.test.cjs` y `node tests/spice.test.cjs`. Prueba visual/táctil de navegador: `python tests/v08_browser.py` (requiere Playwright + Chromium).

GPL-3.0. Aplicación experimental no oficial; **no sirve para certificar hardware ni seguridad eléctrica**.
