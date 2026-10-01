import { Injectable, signal } from "@angular/core";

// Interfaz: define la forma de un objeto Usuario
export interface Usuario {
  id: number;
  nombre: string;
  email: string;
}

@Injectable({
  providedIn: "root"  // Disponible en toda la app (singleton)
})
export class UsuariosService {

  // Signal con la lista de usuarios (datos de prueba)
  private _usuarios = signal<Usuario[]>([
    { id: 1, nombre: "Ana García",    email: "ana@email.com" },
    { id: 2, nombre: "Carlos López",  email: "carlos@email.com" },
    { id: 3, nombre: "María Pérez",   email: "maria@email.com" },
  ]);

  // Propiedad pública de solo lectura (no se puede modificar desde afuera)
  readonly usuarios = this._usuarios.asReadonly();

  // Método para agregar un usuario
  agregarUsuario(usuario: Usuario): void {
    this._usuarios.update(lista => [...lista, usuario]);
  }
}
