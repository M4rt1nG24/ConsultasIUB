import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Data } from '../../../core/services/data';

@Component({
  imports: [CommonModule, FormsModule, RouterLink],
  selector: 'app-registro',
  styleUrl: './registro.css',
  templateUrl: './registro.html',
})
export class Registro {
  private router = inject(Router);
  private dataService = inject(Data);

  nombre = '';
  documento = '';
  programa = 'Ingeniería de Sistemas';
  rol = 'Estudiante';
  correo = '';
  password = '';
  confirmPassword = '';

  modalRegistroAbierto = signal<boolean>(false);
  errorMensaje = signal<string>('');

  registrar(): void {
    this.errorMensaje.set('');

    if (!this.nombre.trim() || !this.correo.trim() || !this.password.trim()) {
      this.errorMensaje.set('Por favor completa todos los campos requeridos (*).');
      return;
    }

    if (!this.correo.includes('@') || !this.correo.toLowerCase().includes('unibarranquilla.edu.co')) {
      this.errorMensaje.set('Debes ingresar un correo institucional válido (@unibarranquilla.edu.co).');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMensaje.set('Las contraseñas no coinciden. Por favor verifica.');
      return;
    }

    // Registrar en el estado compartido de usuarios si no existe aún
    const correoLimpio = this.correo.trim().toLowerCase();
    const existe = this.dataService
      .usuarios()
      .some(u => u.email.toLowerCase() === correoLimpio);

    if (!existe) {
      this.dataService.usuarios.update(lista => [
        ...lista,
        {
          id: Date.now(),
          nombre: this.nombre.trim(),
          email: correoLimpio,
          rol: 'ESTUDIANTE',
          estado: 'Activo',
          programa: this.programa
        }
      ]);
    }

    // Abre el modal de confirmación con las opciones
    this.modalRegistroAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalRegistroAbierto.set(false);
  }

  irALogin(): void {
    this.modalRegistroAbierto.set(false);
    this.router.navigate(['/login']);
  }
}

