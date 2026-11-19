import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { Auth } from '../services/auth';
import { leerStorage } from '../utils/comun';
import { STORAGE_KEY_TOKEN } from '../utils/jwt';

/** Prefijos que identifican peticiones hacia la API propia (proxy o URL directa en Render). */
const PREFIJOS_API = ['/api-proxy', 'https://sistemaconsultas-api.onrender.com'];

/** Endpoints públicos: no llevan token y un 401 en ellos no significa "sesión vencida". */
const RUTAS_SIN_SESION = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];

/** Evita cerrar sesión varias veces cuando fallan muchas peticiones simultáneas. */
let cerrandoSesion = false;

/**
 * Interceptor de autenticación:
 * 1. Adjunta `Authorization: Bearer <token>` a las peticiones de la API que aún no lo traen.
 *    El token NUNCA se envía a dominios externos.
 * 2. Ante un 401 (token vencido, manipulado o revocado) cierra la sesión y redirige al login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const esApi = PREFIJOS_API.some((p) => req.url.startsWith(p));
  if (!esApi) return next(req);

  const sinSesion = RUTAS_SIN_SESION.some((r) => req.url.includes(r));
  const injector = inject(Injector);

  let peticion = req;
  if (!sinSesion && !req.headers.has('Authorization')) {
    const token = leerStorage(STORAGE_KEY_TOKEN);
    if (token) {
      peticion = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }
  }

  return next(peticion).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && !sinSesion && !cerrandoSesion) {
        cerrandoSesion = true;
        injector.get(Auth).cerrarSesion();
        injector
          .get(Router)
          .navigate(['/login'], { queryParams: { sesion: 'expirada' } })
          .finally(() => (cerrandoSesion = false));
      }
      return throwError(() => err);
    })
  );
};
