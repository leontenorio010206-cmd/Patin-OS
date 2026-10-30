# Patiñ Os · v0.5.0-alpha

Simulador de circuitos digitales y laboratorio eléctrico experimental para Android. Proyecto GPLv3 independiente de Digital de Helmut Neemann.

## Novedades
- **99 componentes** con buscador y filtros (compuertas lógicas, resistencias, potenciómetros, diodos Si/Ge/Schottky, LED eléctricos, fuentes DC/AC, baterías, pila, capacitor, inductor, buzzer, altavoz, lámpara, motor, relevadores, medidores, transistores, amplificadores y circuitos integrados, entre otros).
- **Mantén presionado 0.55 segundos** sobre un componente: aparecerá un diálogo para editar el nombre y los valores que soporta. En ordenador también sirve seleccionar y pulsar ⚙ Editar.
- Propiedades guardadas en proyectos JSON, localStorage y deshacer. Los antiguos proyectos y la importación `.dig` sencilla siguen disponibles.
- Dibujo SVG de símbolos y valores; interfaz monocromática con indicadores verdes. El cableado por arrastre de v0.4 sigue funcionando.
- Modelo eléctrico **DC/instantáneo AC aproximado**: fuentes de voltaje/corriente ideales, resistores, potenciómetros simplificados, sensores resistivos a valor fijado, interruptor, medidores simplificados, lámpara, motor/buzzer como cargas resistivas y diodos con caída de tensión constante (incluido germanio).
- Avisos visibles para piezas sin modelo eléctrico todavía, como capacitores, bobinas, BJTs, MOSFETs, transformadores, reguladores, 555, etc. **No se les atribuyen resultados inventados.** No es SPICE ni una herramienta de seguridad eléctrica.

## Prueba rápida de circuito analógico
Abre `ejemplo_analogico_9V_ge_led.patinos.json`, conecta fuente→470 Ω→diodo Ge→LED→fuente, y mantén presionada la resistencia para cambiar 470 Ω por 1 kΩ. Observa el cambio aproximado de corriente. El circuito tiene un **retorno eléctrico cerrado**, no sólo una línea de señales digitales.

Los componentes digitales y analógicos tienen conectores distintos; la versión alpha impide mezclarlos directamente. La señal visual animada es un indicador didáctico de actividad, **no una representación del movimiento de cargas o de la dirección real de corriente**.

## Compilar Android
GitHub Actions: `Build Android APK` → `Patinos-Android-debug-APK`. El workflow publica un APK en GitHub Releases al completar correctamente la compilación.

Pruebas locales: `node tests/engine.test.cjs`; opcional `python tests/v05_browser.py` (requiere Playwright/Chromium; su ruta de navegador es local).

## Limitaciones conocidas
- Los dispositivos en «Sólo esquema» se dibujan y permiten edición de parámetros, pero no intervienen en la simulación.
- El modelo eléctrico no calcula transitorios RC/RL, curvas reales de semiconductores, potencia acústica ni temperatura.
- Hay conexiones dirigidas en la interfaz para facilitar arrastre, aunque en el modelo eléctrico básico los cables se tratan como uniones ideales sin dirección. No conectar directamente una fuente real al teléfono: esta app no controla hardware.
- Los APK debug pueden tener firmas diferentes; exportar proyectos antes de desinstalar versiones anteriores.
