import { leerStorage } from './comun';

/** Claves de localStorage relacionadas con la sesión JWT. */
export const STORAGE_KEY_TOKEN = 'iub_jwt_token';
/** Momento (reloj local, ms) en que el navegador recibió el token en el login. */
export const STORAGE_KEY_TOKEN_RECIBIDO = 'iub_jwt_recibido';

/** Margen de seguridad: el token se da por vencido unos segundos antes de su `exp`. */
const MARGEN_EXPIRACION_SEG = 30;
/**
 * Tolerancia para sesiones antiguas sin marca de recepción: se compara `exp` contra el
 * reloj local admitiendo hasta 5 minutos de diferencia con el reloj del servidor.
 */
const TOLERANCIA_RELOJ_SEG = 5 * 60;

/** Claims que emite el backend FastAPI (app/core/security.py → create_access_token). */
export interface JwtPayload {
  sub?: string;
  uid?: number;
  rol?: string;
  modulos?: string[];
  iat?: number;
  exp?: number;
}

/**
 * Decodifica el payload de un JWT (base64url) SIN verificar la firma.
 * La firma solo la puede validar el backend (que conoce el secreto); aquí se usa
 * para leer `exp` y `rol` y evitar navegar con un token vencido o manipulado a mano.
 */
export function decodificarJwt(token: string | null | undefined): JwtPayload | null {
  if (!token) return null;
  const partes = token.split('.');
  if (partes.length !== 3 || !partes[1]) return null;
  try {
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const relleno = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = decodeURIComponent(
      Array.from(atob(relleno), (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    );
    const payload = JSON.parse(json);
    return payload && typeof payload === 'object' ? (payload as JwtPayload) : null;
  } catch {
    return null;
  }
}

/**
 * Indica si el token sigue vigente.
 *
 * Para no depender de que el reloj del equipo coincida con el del servidor, se usa la
 * duración del token (`exp - iat`) contada desde el momento local en que se recibió.
 * Si no hay marca de recepción (sesión iniciada con una versión anterior) se compara
 * `exp` directamente con una tolerancia de 5 minutos.
 */
export function jwtVigente(token: string | null | undefined, recibidoEnMs = 0): boolean {
  const payload = decodificarJwt(token);
  if (!payload || typeof payload.exp !== 'number') return false;

  const ahoraMs = Date.now();
  if (recibidoEnMs > 0 && typeof payload.iat === 'number' && payload.exp > payload.iat) {
    const venceLocalMs = recibidoEnMs + (payload.exp - payload.iat) * 1000;
    return ahoraMs < venceLocalMs - MARGEN_EXPIRACION_SEG * 1000;
  }
  return ahoraMs / 1000 < payload.exp + TOLERANCIA_RELOJ_SEG;
}

/** Token guardado en sesión y su vigencia. */
export function tokenSesionVigente(): boolean {
  return jwtVigente(leerStorage(STORAGE_KEY_TOKEN), Number(leerStorage(STORAGE_KEY_TOKEN_RECIBIDO)) || 0);
}
