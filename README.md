# Patiñ Os v0.9.3 Alpha — 18 dispositivos multipin y medición

Patiñ Os es un simulador educativo experimental, no un sustituto de ngspice ni un instrumento calibrado. Mantiene separados los laboratorios de lógica digital y electrónica, guarda proyectos JSON, exporta `.cir` y funciona sin conexión.

## Componentes que ahora tienen un modelo didáctico

- **Puente rectificador**: cuatro diodos con cuatro terminales AC1, AC2, + y −, corriente de carga según fuente y polaridad.
- **Relé**: bobina de resistencia editable, umbral de activación y contactos COM/NO/NC. Sin tiempos mecánicos ni rebote.
- **Conmutador SPDT**: COM/A/B, posición editable.
- **Óhmetro**: aplica corriente de prueba a una red pasiva y estima R=|V/I|. **Se niega a medir si hay fuentes alimentadas.**
- **Osciloscopio**: entrada de alta impedancia y voltaje de canal 1 en el panel de mediciones. No modela ancho de banda de una sonda real.
- **Sensor Hall**: salida digital aproximada según campo magnético y umbral configurables; alimentación de tres pines.
- **Micrófono**: fuente senoidal idealizada dependiente de amplitud y frecuencia; no convierte audio del dispositivo.
- **SCR y TRIAC**: conmutación por tensión de puerta y enclavamiento aproximado; sin pérdidas ni disparo en cuatro cuadrantes.
- **7805**: regulador de salida con caída mínima y resistencia de salida; sin protección térmica ni límite de corriente calibrado.
- **Temporizador 555**: salida astable simplificada con frecuencia y ciclo activo configurables; no reemplaza el circuito analógico interno de comparadores, condensador y descarga.
- **7400 (cuatro NAND) y 7404 (seis NOT)**: pines DIP, VCC y GND, niveles lógicos dependientes de alimentación y salidas con resistencia aproximada. Sin retardos reales TTL.
- **4017**: contador de década Q0–Q9, reloj, inhibición, reset y alimentación. Cuenta flancos durante los pasos de simulación; los pulsos más rápidos que el refresco pueden perderse.
- **Display 7 segmentos**: diez pines, ánodo/cátodo común configurable, siete LED y punto decimal con brillo independiente por corriente.
- **Cristal**: rama RLC serie pasiva motional configurable. Un cristal **no oscila por sí solo**; requiere oscilador externo y capacitancias de carga apropiadas.
- **Antena**: carga RC didáctica con resistencia de radiación aproximada. **No resuelve propagación RF, ondas electromagnéticas, ganancia ni impedancia versus frecuencia de una antena real**.
- **Driver push-pull**: salida con estado HIGH/LOW según VIN, VDD, GND y resistencia de salida parametrizada; sin tiempos muertos, shoot-through ni pérdidas dinámicas.

Los modelos anteriores (RGB, transformador, RC, RL, BJT y MOSFET) se mantienen. Los subsistemas avanzados no siempre se pueden combinar en una sola red: cuando ocurre, el simulador rechaza la combinación en vez de inventar mediciones. Si necesitas respuesta de precisión industrial, exporta una netlist donde haya equivalente y simúlala en ngspice usando modelos fiables.

## Interfaz

En **Circuitos electrónicos**, el catálogo incluye los 18 nombres anteriores. Mantén pulsado un componente para abrir sus propiedades. Las piezas con 5–16 pines tienen cuerpo alargado, pines visibles y etiquetas independientes; el display colorea sus segmentos según la corriente calculada. En el modo Lógica digital se mantienen las compuertas y biestables existentes.

## Verificación

`node tests/engine.test.cjs && node tests/spice.test.cjs && node tests/v09.test.cjs && node tests/v091.test.cjs && node tests/v092.test.cjs && node tests/v093.test.cjs`

Prueba de interfaz con Chromium/Playwright: `python tests/v093_browser.py`.

APK vía GitHub Actions en el workflow `Build Android APK`. Min SDK 26, R8 y reducción de recursos para debug. No se integró un ejecutable pesado de ngspice porque estos modelos son JS autocontenidos.

**Advertencia:** no usar Patiñ Os para validar límites de seguridad eléctrica, diseño de potencia, aislamiento, salud ni cumplimiento normativo.

Licencia GPL-3.0. Proyecto independiente, no oficial de Digital.
