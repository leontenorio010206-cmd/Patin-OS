# Patiñ Os — v0.9.0 Alpha

Patiñ Os es un simulador didáctico Android/WebView para **lógica digital y electrónica**. Proyecto libre (GPL-3.0); no es un port oficial de Digital ni una implementación completa de SPICE.

## Dos laboratorios independientes

**Lógica digital:** compuertas AND, OR, XOR, NAND, NOR, XNOR de 2 a 6 entradas, NOT, BUF, fuentes lógicas, reloj, indicadores, sumadores, mux, demux, codificador de prioridad y decodificador 2→4 (cada salida como componente independiente). También: DFF, TFF, JKFF y latch SR con salida Q y memoria por proyecto.

**Electrónica:** catálogo de fuentes DC/AC, pasivos, semiconductores, instrumentos y actuadores; mantiene el motor educativo MNA/SPICE-lite de v0.8. Los componentes sin modelo físico siguen marcados **Esquema**, nunca se simulan como si estuvieran validados.

Se cambia de laboratorio desde las pestañas superiores sin mezclar cableados. Cada uno conserva por separado su proyecto, historial de deshacer, vista y autoguardado en el almacenamiento local. Los archivos `.patinos.json` antiguos siguen abriendo; si traen ambos tipos, se reparten entre pestañas. El proyecto antiguo se migra al primer arranque sin eliminar su copia previa de almacenamiento.

## Correcciones reales

- XNOR de 3/4 entradas antes devolvía sin señal incorrectamente; corregido para 3, 4, 5 y 6 entradas.
- Las propiedades **SOLAR** y **VARISTOR** ya no son sobrescritas accidentalmente por declaraciones duplicadas.
- Biestables activados en flanco de subida; el estado lógico se mantiene entre ciclos, no entre proyectos distintos. En el SR con S=R=1 se marca estado inválido.
- La pestaña de circuitos es la única que ofrece exportar `.cir`. Los archivos JSON se exportan por laboratorio.

## Límites

Los decodificadores y codificadores tienen una salida por pieza porque el editor lógico actual tiene **una salida por componente**. El encoder utiliza prioridad D3 > D2 > D1 > D0, sin salida de validez. Los flip-flops incluyen Q pero no Q negada, reset asíncrono ni retardos físicos. No se modelan metastabilidad, retardo de propagación ni voltajes de compuertas.

SPICE-lite sigue utilizando modelos aproximados DC/transitorios de v0.8, no ngspice nativo ni modelos de fabricante; algunas piezas electrónicas son sólo de esquema.

## Pruebas

```sh
node tests/engine.test.cjs
node tests/spice.test.cjs
node tests/v09.test.cjs
python tests/v09_browser.py
```

La prueba móvil usa Playwright/Chromium con contenido local inyectado, porque no siempre se permite navegar en los entornos de prueba.

Android: compilación automática de `:app:assembleDebug` con GitHub Actions; APK publicado como prerelease `v0.9-alpha`.

**Uso educativo:** no utilizar resultados de simulación para certificar seguridad eléctrica.