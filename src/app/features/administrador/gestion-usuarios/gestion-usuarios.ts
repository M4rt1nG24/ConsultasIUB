import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Data, UsuarioSistema } from '../../../core/services/data';
import { DataTableDirective } from '../../../shared/directives/datatable.directive';

@Component({
  selector: 'app-gestion-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTableDirective],
  styleUrl: './gestion-usuarios.css',
  templateUrl: './gestion-usuarios.html',
})
export class GestionUsuarios {
  private dataService = inject(Data);

  // Lista reactiva de usuarios compartida con todo el sistema
  usuarios = this.dataService.usuarios;

  // Filtros reactivos
  filtroTexto = signal<string>('');
  filtroRol = signal<string>('');

  usuariosFiltrados = computed(() => {
    const texto = this.filtroTexto().toLowerCase().trim();
    const rol = this.filtroRol();

    return this.usuarios().filter(u => {
      const coincideTexto =
        !texto ||
        u.nombre.toLowerCase().includes(texto) ||
        u.email.toLowerCase().includes(texto) ||
        u.programa.toLowerCase().includes(texto);

      const coincideRol = !rol || u.rol === rol;

      return coincideTexto && coincideRol;
    });
  });

  // Estado del Modal
  modalAbierto = signal<boolean>(false);
  modoModal = signal<'crear' | 'editar'>('crear');
  mensajeFeedback = signal<string | null>(null);

  // Modelo de formulario temporal
  formData: UsuarioSistema = {
    id: 0,
    nombre: '',
    email: '',
    rol: 'ESTUDIANTE',
    estado: 'Activo',
    programa: 'Ingeniería de Sistemas'
  };

  abrirModalCrear(): void {
    this.modoModal.set('crear');
    this.formData = {
      id: Date.now(),
      nombre: '',
      email: '',
      rol: 'ESTUDIANTE',
      estado: 'Activo',
      programa: 'Ingeniería de Sistemas'
    };
    this.modalAbierto.set(true);
  }

  abrirModalEditar(usuario: UsuarioSistema): void {
    this.modoModal.set('editar');
    this.formData = { ...usuario };
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  guardarUsuario(): void {
    if (!this.formData.nombre.trim() || !this.formData.email.trim()) {
      alert('Por favor complete los campos obligatorios (Nombre y Correo).');
      return;
    }

    if (this.modoModal() === 'crear') {
      this.usuarios.update(lista => [
        ...lista,
        { ...this.formData, id: Date.now() }
      ]);
      this.mostrarNotificacion('¡Usuario registrado exitosamente en el sistema!');
    } else {
      this.usuarios.update(lista =>
        lista.map(u => (u.id === this.formData.id ? { ...this.formData } : u))
      );
      this.mostrarNotificacion('¡Información del usuario actualizada correctamente!');
    }

    this.cerrarModal();
  }

  cambiarEstadoUsuario(usuario: UsuarioSistema): void {
    const nuevoEstado = usuario.estado === 'Activo' ? 'Inactivo' : 'Activo';
    this.usuarios.update(lista =>
      lista.map(u => (u.id === usuario.id ? { ...u, estado: nuevoEstado } : u))
    );
    this.mostrarNotificacion(
      `¡Estado del usuario ${usuario.nombre} cambiado a ${nuevoEstado}!`
    );
  }

  mostrarNotificacion(msg: string): void {
    this.mensajeFeedback.set(msg);
    setTimeout(() => {
      this.mensajeFeedback.set(null);
    }, 4000);
  }
}
