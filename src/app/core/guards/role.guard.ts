import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, RolUsuario } from '../services/auth';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(Auth);
  const router = inject(Router);

  const rolEsperado = route.data?.['role'] as RolUsuario | undefined;
  const rolGuardado =
    typeof localStorage !== 'undefined'
      ? (localStorage.getItem('rolActivo') as RolUsuario | null)
      : null;

  // Si hay un rol guardado en sesión, validamos que coincida con el módulo solicitado
  if (rolGuardado && rolEsperado && rolGuardado !== rolEsperado) {
    const rutaPermitida = authService.obtenerRutaInicialPorRol(rolGuardado);
    return router.createUrlTree([rutaPermitida]);
  }

  if (rolEsperado) {
    authService.rolActivo.set(rolGuardado || rolEsperado);
  }

  return true;
};

