/**
 * Comparación estructural para signals con arreglos/objetos que llegan del backend.
 * Si la respuesta nueva es idéntica a la actual, el signal no notifica cambios:
 * las tablas no se vuelven a renderizar (ni DataTables se reinicia) y no hay parpadeo.
 */
export function igualJson<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/**
 * Agrupa llamadas repetidas a una sincronización con el backend.
 *
 * - Las llamadas hechas casi al mismo tiempo (layout + página + servicio al arrancar)
 *   se combinan en una sola ejecución.
 * - Si llega una llamada mientras otra sincronización está en curso, se ejecuta UNA
 *   vez más al terminar (así los cambios recién guardados siempre se reflejan), pero
 *   nunca hay dos sincronizaciones solapadas cuyas respuestas lleguen en desorden.
 *
 * `ejecutar` recibe una función `fin` que debe llamar cuando termine.
 */
export function crearSincronizador(
  ejecutar: (fin: () => void) => void,
  esperaMs = 120,
  tiempoMaximoMs = 90_000
): () => void {
  let enCurso = false;
  let pendiente = false;
  let temporizador: ReturnType<typeof setTimeout> | null = null;

  const lanzar = () => {
    temporizador = null;
    if (enCurso) {
      pendiente = true;
      return;
    }
    enCurso = true;
    let terminado = false;
    // Respaldo por si alguna respuesta nunca llega (p. ej. arranque en frío del servidor).
    const respaldo = setTimeout(() => fin(), tiempoMaximoMs);
    const fin = () => {
      if (terminado) return;
      terminado = true;
      clearTimeout(respaldo);
      enCurso = false;
      if (pendiente) {
        pendiente = false;
        programar();
      }
    };
    try {
      ejecutar(fin);
    } catch {
      fin();
    }
  };

  const programar = () => {
    if (enCurso) {
      pendiente = true;
      return;
    }
    if (temporizador) return;
    temporizador = setTimeout(lanzar, esperaMs);
  };

  return programar;
}
