# Patiñ Os v0.9.5 Alpha — Simulación de sonido

Ahora con **audio local activable** para BUZZER, SPEAKER y PIEZO. No requiere internet, permisos de micrófono, ni archivos de audio externos.

- Botón 🔊 / 🔇 en la barra superior: activa el audio tras un toque real. El volumen predeterminado es 25% y es ajustable.
- Buzzer: genera tono al superar su umbral de tensión/corriente; cambia tono (Hz) en sus propiedades. Con DC sí se escucha como buzzer activo.
- Altavoz y piezo pasivos: emiten la forma de onda de una fuente AC/pulsada/triangular/diente de sierra conectada, entre 20 Hz y 16 kHz. Con DC estable **no** generan un tono continuo.
- El micrófono es una **entrada eléctrica simulada**; no se accede al micrófono físico.
- Voces limitadas a 12 por rendimiento; volumen protegido, se silencian al pausar, al cerrar la pantalla, al desactivar el audio y al cambiar de laboratorio.
- Se conservan los componentes y proyectos anteriores.

⚠ Audio sintético educativo: no incluye modelado de respuesta en frecuencia del altavoz, impedancia dinámica, distorsión acústica ni seguridad de exposición. No reproduce música protegida.

## Ejemplos
- `ejemplo_Buzzer_5V.patinos.json`: fuente DC y buzzer activo.
- `ejemplo_Altavoz_AC.patinos.json`: fuente AC 440 Hz con altavoz pasivo.

## Pruebas
`node tests/v095.test.cjs`, `node tests/engine.test.cjs`, `node tests/spice.test.cjs` y demás pruebas anteriores. Compilación automática desde `.github/workflows/android-apk.yml`.

Proyecto experimental GPL-3.0.
