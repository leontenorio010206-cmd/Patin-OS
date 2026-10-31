# Patiñ Os v0.9.2 Alpha

Ahora con **LED RGB de cuatro pines** (R,G,B y común) y **transformador acoplado de cuatro pines** (P+, P−, S+, S−). El RGB muestra brillo por canal a partir de la corriente simulada; el transformador calcula corrientes primaria/secundaria y voltaje inducido a partir de inductancias acopladas, resistencias de bobina y k ajustable.

Mantén pulsado para cambiar valores. Los proyectos de las versiones anteriores siguen compatibles. El botón SPICE exporta las tres uniones LED y el par de bobinas acopladas `K` y usa `.tran` con transformador.

**Limitaciones:** Modelo educativo MNA por Euler implícito; no incluye saturación/histéresis de núcleo, pérdidas térmicas, óptica RGB ni modelos de fabricantes. Componentes complejos sin modelo mixto se señalan sin inventar resultados. No usar para seguridad eléctrica.

Pruebas: `node tests/engine.test.cjs`, `node tests/spice.test.cjs`, `node tests/v09.test.cjs`, `node tests/v091.test.cjs`, `node tests/v092.test.cjs`.

GPL-3.0 · Proyecto experimental no oficial.