import { crearSincronizador, igualJson } from './sincronizacion';

describe('utils/sincronizacion', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('igualJson compara por contenido', () => {
    expect(igualJson([{ id: 1 }], [{ id: 1 }])).toBe(true);
    expect(igualJson([{ id: 1 }], [{ id: 2 }])).toBe(false);
  });

  it('agrupa llamadas simultáneas en una sola ejecución', () => {
    let ejecuciones = 0;
    const sync = crearSincronizador((fin) => {
      ejecuciones++;
      fin();
    }, 100);
    sync();
    sync();
    sync();
    vi.advanceTimersByTime(150);
    expect(ejecuciones).toBe(1);
  });

  it('si se pide durante una ejecución en curso, corre una sola vez más al terminar', () => {
    let ejecuciones = 0;
    let terminar: () => void = () => {};
    const sync = crearSincronizador((fin) => {
      ejecuciones++;
      terminar = fin;
    }, 10);
    sync();
    vi.advanceTimersByTime(20);
    sync();
    sync();
    vi.advanceTimersByTime(20);
    expect(ejecuciones).toBe(1); // no se solapan
    terminar();
    vi.advanceTimersByTime(20);
    expect(ejecuciones).toBe(2);
    terminar();
    vi.advanceTimersByTime(20);
    expect(ejecuciones).toBe(2);
  });
});
