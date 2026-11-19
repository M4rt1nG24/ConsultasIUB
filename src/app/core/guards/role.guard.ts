import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, RolUsuario } from '../services/auth';
import { escribirStorage, leerStorage } from '../utils/comun';

/**
 * Valida que el JWT esté vigente y que el rol del módulo solicitado coincida con el
 * rol que viene DENTRO del token (no con el valor editable de localStorage).
 * La autorización definitiva la hace el backend en cada endpoint; esto evita que la
 * interfaz de otro rol se muestre a quien no corresponde.
 */
export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(Auth);
  const router = inject(Router);

  // Token ausente, malformado o vencido → cerrar sesión y volver al login.
  const rolToken = authService.esTokenValido() ? authService.rolDesdeToken() : null;
  if (!rolToken) {
    const habiaSesion = !!authService.tokenJWT();
    authService.cerrarSesion();
    return router.createUrlTree(['/login'], habiaSesion ? { queryParams: { sesion: 'expirada' } } : undefined);
  }

  // Mantener sincronizado el rol de la interfaz con el del token.
  if (leerStorage('rolActivo') !== rolToken) {
    escribirStorage('rolActivo', rolToken);
  }
  authService.rolActivo.set(rolToken);

  const rolEsperado = route.data?.['role'] as RolUsuario | undefined;
  if (rolEsperado && rolToken !== rolEsperado) {
    return router.createUrlTree([authService.obtenerRutaInicialPorRol(rolToken)]);
  }

  return true;
};
