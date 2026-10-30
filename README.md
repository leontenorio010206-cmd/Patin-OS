# Patiñ Os v0.7 Alpha — simulación eléctrica educativa

Android (WebView local sin internet), GPL-3.0. Proyecto independiente de Digital.

## Novedades de v0.7

**108 piezas en el catálogo**, con insignias **Física**, **Lógica** o **Esquema**: estas últimas se pueden dibujar, pero **no intervienen en el solucionador**. De las 108 piezas, 49 cuentan con alguna aproximación de modelo eléctrico. Los modelos son **didácticos, no calibrados**.

**Nueve piezas nuevas** con representación y simulación aproximada:
- Fuente de pulsos de tensión `VPULSE` (niveles alto/bajo, frecuencia, ciclo útil y fase).
- Fuente triangular `VTRI` y diente de sierra `VSAW` (amplitud, offset, frecuencia, fase).
- Fuente pulsada de corriente `IPULSE`.
- Diodos rápido `DIODE_FAST` y rectificador `DIODE_POWER` (modelo DC Shockley; **sin tiempo de recuperación inversa**, capacitancia ni límites térmicos).
- LEDs ámbar `LED_AMBER` y blanco `LED_WHITE` (modelo diodo; **sin espectro ni temperatura**).
- Supresor transitorio bidireccional `TVS_BIDIR` (curva I-V estática suavizada).

**Modelos añadidos a piezas ya existentes:**
- `LDR`: resistencia depende de iluminación (lux) y gamma ajustable.
- `NTC`: ley beta y temperatura (°C).
- `PTC`: ley lineal de coeficiente térmico y temperatura (°C).
- `PHOTODIODE`: corriente fotoinducida aproximada; no tiempos de respuesta ni espectro.
- `SOLAR`: celda fotovoltaica simplificada (fotocorriente, diodo y resistencia de fuga), sin temperatura ni calibración de fabricante.
- `VARISTOR`: limitación bidireccional I-V suavizada, **sin capacidad de absorción térmica**.
- `DIODE_TVS`: avalancha inversa estática aproximada.
- `VCC`: fuente de voltaje configurable de dos terminales (sin especificación de fuente física).

Se mantienen componentes v0.6: red de resistores, fuentes DC/AC, transitorios RC/RL con Backward Euler, diodos Shockley, mediciones de tensión/corriente/potencia, alarmas y osciloscopio. Se conservan edición de propiedades por pulsación larga, cables por arrastre, guardado JSON y apertura parcial de `.dig`.

## Casos reproducibles
Abre desde Patiñ Os cualquiera de estos proyectos JSON de la raíz:
- `ejemplo_Fuente_Pulsada_RC.patinos.json` — fuente cuadrada, RC 100 µF y 1 kΩ.
- `ejemplo_Fotocelda_LDR.patinos.json` — iluminación y resistencia.
- `ejemplo_Panel_Solar.patinos.json` — irradiancia y potencia del resistor de carga.
- `ejemplo_Varistor_TVS.patinos.json` — fuente de 18 V, resistencia serie de 1 kΩ y TVS bilateral.

## Verificación
- `node tests/engine.test.cjs` — 26 grupos (lógica, nodal DC, RC/RL, diodos, fuentes temporales, luz, temperatura, PV, sobretensiones y compatibilidad de archivos).
- `python tests/v07_browser.py` — UI móvil en Playwright/Chromium: circuito RC, editor por pulsación prolongada, osciloscopio.
- GitHub Actions → `Build Android APK` compila `app:assembleDebug` y publica prerelease `v0.7-alpha` cuando las pruebas pasan.

## Límite de seguridad y precisión
No es SPICE, no es un medidor eléctrico real y **no sirve para validar diseños de alto voltaje**. Muchos actuadores (buzzer, motor, altavoz, lámpara) usan **sólo carga resistiva equivalente**. Se advierte que no predicen sonido, velocidad, temperatura ni mecánica. Faltan modelos para BJTs, MOSFETs, puentes rectificadores, 555, amplificadores operacionales y transformadores porque necesitan terminales adicionales, subcircuitos, estado y modelos especializados. Las señales animadas no son una reproducción del movimiento real de electrones.

**Nota:** los modelos y curvas no se deben interpretar como propiedades garantizadas de componentes físicos específicos. Compilación debug de prueba: la firma puede variar; exporta los proyectos antes de desinstalar versiones anteriores.