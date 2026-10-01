import { Routes } from '@angular/router';

export const routes: Routes = [

  // Ruta raíz: redirige a /principal
  {
    path: "",
    redirectTo: "principal",
    pathMatch: "full"  // Solo redirige si la URL es exactamente ""
  },

  // Ruta /principal → carga PrincipalPageComponent
  {
    path: "principal",
    loadComponent: () =>
      import("./features/principal/page/principal-page/principal-page")
        .then(m => m.PrincipalPage)
  },

  // Ruta /usuarios → carga UsuariosPageComponent
  {
    path: "usuarios",
    loadComponent: () =>
      import("./features/usuarios/page/usuarios-page/usuarios-page")
        .then(m => m.UsuariosPage)
  },

  // Ruta /contacto → carga ContactoPageComponent
  {
    path: "contacto",
    loadComponent: () =>
      import("./features/contacto/page/contacto-page/contacto-page")
        .then(m => m.ContactoPage)
  },

  // Ruta comodín: cualquier URL no reconocida redirige a /principal
  {
    path: "**",
    redirectTo: "principal"
  }

];
