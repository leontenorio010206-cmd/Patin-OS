# Patiñ Os · v0.6.0-alpha — simulación eléctrica

Proyecto Android GPLv3, independiente del simulador Digital. **99 componentes disponibles en el editor**, de los cuales **35 tienen un modelo eléctrico calculable** de distinto nivel de aproximación. El resto está marcado como "sin modelo físico". Conserva su simulador lógico de tres estados, el editor táctil, el guardado JSON y la importación parcial de `.dig`.

## Qué resuelve realmente la v0.6

- **DC y redes resistivas**: análisis nodal modificado (MNA); fuentes de voltaje/corriente, baterías, resistencias y potenciómetros (simplificados a dos terminales).
- **Transitorios RC y RL**: integración temporal por Euler implícito para capacitores (µF) y bobinas (mH), conservando su estado durante la simulación. El estado se reinicia si modificas valores, conexiones o abres otro proyecto.
- **AC**: fuentes sinusoidales con voltaje pico, frecuencia en Hz y fase. Evaluación temporal por pasos adaptados y límites de cómputo. No es un solucionador fasorial/RMS.
- **Diodos**: curva Shockley simplificada y calibrada a la caída configurada cerca de 1 mA; Si, Ge, Schottky, LED y Zener con modelo de ruptura aproximado; invierte la polaridad desde Propiedades. Se considera temperatura fija, sin calentamiento ni capacidad parásita.
- **Instrumentos**: voltímetro como resistencia de entrada de 1 GΩ, amperímetro como 1 mΩ. Visualización de voltaje, corriente (con signo), potencia y forma de onda analógica al elegir un componente en el monitor.
- **Alarmas**: sobrecorriente/sobrepotencia, fusible fuera de rango (sin apertura automática), polaridad inversa de capacitor polarizado y convergencia numérica. La mini explosión es **solamente un efecto visual**.

Varios dispositivos con modelo "resistivo equivalente" NO tienen un modelo físico completo: motores (sin fuerza contraelectromotriz/torque), buzzers/altavoces (sin acústica), lámparas (sin temperatura), termistores (resistencia fijada manualmente), interruptores y fusibles. **No sirve para comprobar seguridad eléctrica ni sustituye LTspice/ngspice o instrumentos reales.**

## Cómo usar

1. Abre Patiñ Os. Pulsa **Nuevo** o importa un circuito `.patinos.json`.
2. Añade componentes desde **Pasivos**, **Fuentes AC/DC**, **Diodos y LEDs** o el buscador.
3. Arrastra entre los conectores extremos; recuerda **cerrar el circuito hasta el negativo de la fuente**.
4. Mantén presionada la pieza durante 0.55 segundos o selecciona y toca ⚙ para editar voltaje, resistencia, frecuencia, capacidad, inductancia, polaridad, etc.
5. Selecciona una pieza en el menú **Monitorear** del osciloscopio; para modelos compatibles verás voltios; toca la pieza para mostrar mA, V y mW en el panel.
6. El botón ❚❚ pausa/reanuda la simulación. Guarda el proyecto JSON antes de desinstalar versiones previas.

Ejemplos que vienen en el repo: `ejemplo_RC_carga.patinos.json`, `ejemplo_RL_transitorio.patinos.json` y `ejemplo_Ge_LED.patinos.json`.

## Verificaciones

- `node tests/engine.test.cjs`: 16 grupos de pruebas, incluyendo ley de Ohm/Kirchhoff, circuito RC, circuito RL, fuente AC, polaridad de diodo, componentes sin modelo y alertas.
- `python tests/v06_browser.py`: interfaz móvil Chromium + circuito RC + osciloscopio analógico + pulsación larga + edición.
- GitHub Actions `Build Android APK` compila `app-debug.apk` y publica el archivo en GitHub Releases `v0.6-alpha` tras la ejecución correcta.

## Limitaciones y objetivos futuros

**No implementado aún**: modelos completos de BJTs/MOSFETs/opamps, transformadores acoplados, 555, termodinámica, dependencias de temperatura, realimentación electromecánica, integración numérica adaptativa rigurosa y análisis SPICE completo. Los transitorios con mucha frecuencia pueden perder precisión por límites de CPU. Los cruces visuales de cables no se unen automáticamente; solamente las uniones explícitas cuentan como nodos eléctricos. Los terminales del editor siguen organizados izquierda/derecha; las conexiones analógicas se resuelven sin dirección, excepto la polaridad y signo de los componentes.

El flujo verde para circuitos analógicos corresponde a **corriente convencional calculada**, no movimiento real de electrones. No conectes fuentes eléctricas reales al teléfono.
