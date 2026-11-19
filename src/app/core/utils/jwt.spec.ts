import { decodificarJwt, jwtVigente } from './jwt';

/** Crea un JWT sin firma real (el frontend no verifica firmas, solo lee claims). */
function crearToken(payload: object): string {
  const b64 = (o: object) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.firma`;
}

describe('utils/jwt', () => {
  const ahora = Math.floor(Date.now() / 1000);

  it('decodifica los claims del payload', () => {
    const tk = crearToken({ sub: 'a@iub.edu.co', rol: 'ADMINISTRADOR', exp: ahora + 60, iat: ahora });
    expect(decodificarJwt(tk)?.rol).toBe('ADMINISTRADOR');
  });

  it('rechaza tokens malformados o sin exp', () => {
    expect(decodificarJwt('a.b.c')).toBeNull();
    expect(jwtVigente('a.b.c')).toBe(false);
    expect(jwtVigente(crearToken({ sub: 'x' }))).toBe(false);
    expect(jwtVigente(null)).toBe(false);
  });

  it('usa la duración del token desde su recepción (independiente del reloj del servidor)', () => {
    // Token emitido con el reloj del servidor 2 horas adelantado, duración 30 min.
    const iat = ahora + 7200;
    const tk = crearToken({ iat, exp: iat + 1800 });
    expect(jwtVigente(tk, Date.now())).toBe(true);
    // Recibido hace 31 minutos → vencido.
    expect(jwtVigente(tk, Date.now() - 31 * 60 * 1000)).toBe(false);
  });

  it('sin marca de recepción compara exp con tolerancia', () => {
    expect(jwtVigente(crearToken({ exp: ahora + 60 }))).toBe(true);
    expect(jwtVigente(crearToken({ exp: ahora - 3600 }))).toBe(false);
  });
});
