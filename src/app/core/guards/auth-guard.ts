import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

/**
 * Exige una sesión con JWT vigente para entrar al layout privado.
 * Protege cualquier ruta hija aunque alguien olvide ponerle `roleGuard`.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(Auth);
  const router = inject(Router);

  if (authService.esTokenValido() && authService.rolDesdeToken()) {
    return true;
  }
  const habiaSesion = !!authService.tokenJWT();
  authService.cerrarSesion();
  return router.createUrlTree(['/login'], habiaSesion ? { queryParams: { sesion: 'expirada' } } : undefined);
};
