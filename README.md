# Patiñ Os v0.9.4 Alpha

LED rojo, verde, azul, ámbar y blanco con iluminación y halo del color indicado.

- Brillo animado visual estimado por corriente simulada: cero cuando no conduce y creciente hasta 20 mA.
- LED RGB: intensidad individual para cada canal.
- Colores correctos también en la biblioteca de componentes.
- Se conservan los 18 componentes multipin de v0.9.3.

Pruebas: `node tests/v094.test.cjs` además de todas las regresiones previas.

No se simulan temperatura, eficiencia fotométrica ni vida útil del LED.
