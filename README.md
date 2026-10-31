# Patiñ Os v0.9.1 Alpha — corrección del simulador eléctrico

Esta actualización corrige el problema de los LED y de los cables que no mostraban flujo:

- **Cableado físico por pines:** el motor MNA respeta `fromPin` y `toPin`, incluso cuando la conexión fue dibujada en sentido inverso o entre pines 0→0 o 1→1.
- **Modelo educativo de diodo/LED:** corriente exponencial en baja conducción y resistencia diferencial finita por encima de Vf, evitando cifras matemáticamente descomunales.
- **Polaridad:** los terminales se marcan A (ánodo) y K (cátodo). Si todos los diodos están bloqueados, el simulador muestra un aviso para comprobar la orientación y el circuito.
- **Sobrecorriente:** advierte si un LED supera 30 mA y recomienda resistencia limitadora.
- **Animación:** corriente convencional verde animada según el signo de la corriente calculada. Sin corriente, circuito abierto o sin solución = sin animación.
- **Interfaz:** corriente en mA y leyenda eléctrica en Circuitos electrónicos, HIGH/LOW en Lógica digital.
- **Ejemplo:** `ejemplo_LED_5V_220ohm.patinos.json` con 5 V, 220 Ω y LED verde (~12.6 mA con el modelo actual).

Pruebas: `node tests/engine.test.cjs`, `node tests/spice.test.cjs`, `node tests/v09.test.cjs`, `node tests/v091.test.cjs`.

**Aviso:** sigue siendo una simulación educativa tipo SPICE-lite, no ngspice completo. No predice daños reales, calentamiento ni condiciones seguras de operación. No conectes un LED físico directamente a una fuente sin limitación de corriente.

Proyecto GPL-3.0.
