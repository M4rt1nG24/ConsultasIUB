import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface UsuarioItem {
  id: number;
  nombre: string;
  email: string;
  rol: 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE';
  estado: 'Activo' | 'Inactivo';
  programa: string;
}

@Component({
  selector: 'app-gestion-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: './gestion-usuarios.css',
  templateUrl: './gestion-usuarios.html',
})
export class GestionUsuarios {
  // Lista reactiva de usuarios
  usuarios = signal<UsuarioItem[]>([
    {
      id: 1,
      nombre: 'Coordinación Sistemas',
      email: 'coordinacion.sistemas@unibarranquilla.edu.co',
      rol: 'ADMIN',
      estado: 'Activo',
      programa: 'Ingeniería de Sistemas'
    },
    {
      id: 2,
      nombre: 'Ing. Roberto Pineda',
      email: 'rpineda@unibarranquilla.edu.co',
      rol: 'DOCENTE',
      estado: 'Activo',
      programa: 'Ingeniería de Sistemas'
    },
    {
      id: 3,
      nombre: 'Ing. Laura Gómez',
      email: 'lgomez@unibarranquilla.edu.co',
      rol: 'DOCENTE',
      estado: 'Activo',
      programa: 'Ciencias Básicas'
    },
    {
      id: 4,
      nombre: 'Carlos Mario Pérez',
      email: 'estudiante@unibarranquilla.edu.co',
      rol: 'ESTUDIANTE',
      estado: 'Activo',
      programa: 'Ingeniería de Software'
    }
  ]);

  // Filtros reactivos
  filtroTexto = signal<string>('');
  filtroRol = signal<string>('');

  usuariosFiltrados = computed(() => {
    const texto = this.filtroTexto().toLowerCase().trim();
    const rol = this.filtroRol();

    return this.usuarios().filter(u => {
      const coincideTexto = !texto ||
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
  formData: UsuarioItem = {
    id: 0,
    nombre: '',
    email: '',
    rol: 'ESTUDIANTE',
    estado: 'Activo',
    programa: 'Ingeniería de Sistemas'
  };

  abrirModalCrear() {
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

  abrirModalEditar(usuario: UsuarioItem) {
    this.modoModal.set('editar');
    this.formData = { ...usuario };
    this.modalAbierto.set(true);
  }

  cerrarModal() {
    this.modalAbierto.set(false);
  }

  guardarUsuario() {
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
        lista.map(u => u.id === this.formData.id ? { ...this.formData } : u)
      );
      this.mostrarNotificacion('¡Información del usuario actualizada correctamente!');
    }

    this.cerrarModal();
  }

  mostrarNotificacion(msg: string) {
    this.mensajeFeedback.set(msg);
    setTimeout(() => {
      this.mensajeFeedback.set(null);
    }, 4000);
  }
}
