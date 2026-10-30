# Patiñ Os — simulador lógico para Android · v0.2.1-alpha

**Patiñ Os** es un proyecto experimental independiente para editar y simular circuitos lógicos en Android y navegador, con **señales HIGH animadas** sobre las conexiones. Incorpora una primera importación segura de un subconjunto de archivos **`.dig`** de [Digital, de Helmut Neemann](https://github.com/hneemann/Digital).

**Este no es un port completo de Digital ni una versión oficial.** No contiene el motor Java de Digital; conserva su propia simulación binaria de tres estados (`1`, `0`, desconocido). No debe usarse para comprobar sistemas críticos ni entregar prácticas sin verificar el resultado en Digital original.

## Nuevo en 0.2

- Nombre **Patiñ Os**, icono de marca en la interfaz y de lanzamiento Android, versión Android `0.2.0-alpha`, `applicationId=com.patinos.simulator`.
- **Abrir `.dig`**: XML de Digital con elementos `In`, `Out`, `And`, `Or`, `XOr`, `NAnd`, `NOr`, `NXOr`, `Not` de forma ancha, sin rotación ni atributos avanzados; entradas binarias simples.
- Traducción de cables Digital por geometría: segmentos horizontales/verticales, diagonales (conexión por extremos), ramas en T y cruces no conectados. Se reconstituye el *grafo lógico*, no la geometría exacta del trazado original.
- Bloqueo de importaciones que contengan componentes/atributos aún no compatibles, entradas multibit, salidas en conflicto o XML inseguro, con error explícito. El circuito abierto previamente permanece intacto si falla una importación.
- Reencuadre automático de circuitos importados y mensaje de compatibilidad.
- Importación de `.json` de Patiñ Os v0.1 / v0.2 y persistencia local. **Exportación solamente JSON**; no guardamos `.dig` ni modificamos los archivos originales.
- El APK de depuración ya se compiló correctamente en GitHub Actions, con el flujo `android-apk.yml` (ejecución #41108954420).

## Funciones heredadas de 0.1

- Editor táctil SVG: añadir componentes, desplazarlos y mover el lienzo, zoom, deshacer y eliminar.
- Interruptores, reloj digital, constantes HIGH/LOW, AND, OR, XOR, NOT, NAND, NOR, XNOR, buffer, LED, salida.
- Cableado táctil salida verde → entrada azul; un origen por entrada.
- Simulación local y offline de tres valores, pausa/reanudación y gráfica temporal de la señal seleccionada.
- Los cables HIGH (`1`) muestran una animación verde; LOW (`0`) gris; sin señal ámbar.

**Importante:** la animación ilustra **estados y propagación de señales lógicas**, no corriente eléctrica física, electromagnetismo, intensidad, voltaje ni energía real.

## Requisitos y compilación

- Android Studio actualizado con JDK 17, Android SDK Platform 35 y Android Gradle Plugin 8.7.3 (la configuración solicita Gradle 8.9).
- Abrir la carpeta `Patinos_Android` en Android Studio; instalar los componentes del SDK que solicite; **Build → Build APK(s)**.
- APK esperado: `app/build/outputs/apk/debug/app-debug.apk`.
- Android 8.0+ (`minSdk=26`); sin permiso de acceso a internet.
- También existe `.github/workflows/android-apk.yml` para compilar y generar un *artifact* de APK desde GitHub Actions cuando estos archivos estén en la raíz de un repositorio. La compilación se verificó en GitHub Actions el 30 de octubre de 2026.
- **APK debug generado:** descarga el artefacto `Patinos-Android-debug-APK` desde [la ejecución exitosa de GitHub Actions](https://github.com/leontenorio010206-cmd/Patin-OS/actions/runs/41108954420). Es una compilación de prueba; todavía no se ha verificado ejecutándose en un celular físico.

## Demo en navegador

Abre `web/index.html` desde Chrome o Edge. La versión `Patiñ Os_v0.2_Preview.html` entregada aparte contiene los mismos archivos incrustados en una sola página y funciona offline.

En la barra de acciones, **Abrir** acepta `.dig` y `.json`. Ejemplo incluido en `tests/fixtures/Xor1-from-Digital.dig`, transcrito del circuito público [Xor1.dig](https://github.com/hneemann/Digital/blob/master/src/main/dig/combinatorial/Xor1.dig) para verificar conectividad y tabla XOR.

Si aparece *Elementos no compatibles*, mantén tu original en Digital: el archivo no se altera. Las conexiones de los elementos soportados se recalculan; su ubicación se aproxima en un nuevo lienzo.

## Pruebas realizadas

- `node tests/engine.test.cjs`: lógica y validación de JSON (5 grupos).
- `python tests/browser_test.py`: navegador Chromium/Playwright; lee el `.dig` XOR de Digital y comprueba las cuatro filas de la tabla de verdad, siete conexiones, rechazo de componentes desconocidos y bloqueo de XML DTD.
- Las pruebas de lógica y navegador se ejecutaron localmente y la compilación del APK se verificó en GitHub Actions; **aún no equivalen a probar el APK en Android físico**.

## Limitaciones pendientes

- Jerarquías/instancias de circuitos `.dig`, memoria, flip-flops, registros, buses/multibit, rotación de compuertas, puertas con número variable de entradas, atributos de configuración complejos, componentes 74xx, analógicos y co-simulación.
- Edición del trazado original por segmentos y guardado `.dig` de ida y vuelta.
- Retardos reales, análisis eléctrico físico, soporte hardware Arduino/FPGA, persistencia multiplataforma.
- Gestos multitáctiles avanzados y pruebas en móviles físicos.

## Licencias

Código propio de Patiñ Os publicado bajo GPL-3.0 (`LICENSE`). Digital, por Helmut Neemann, se distribuye también bajo GPL-3.0: https://github.com/hneemann/Digital. La muestra `Xor1-from-Digital.dig` está basada en el archivo público del repositorio de Digital. Conserva la atribución y las condiciones de la licencia en redistribuciones. Patiñ Os es independiente y no está avalado por el autor de Digital.
