import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

export type RolUsuario = 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE';

interface CredencialDemo {
  correo: string;
  password: string;
  rol: RolUsuario;
  ruta: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private router = inject(Router);

  rolSeleccionado: RolUsuario = 'ADMIN';
  correo: string = 'coordinacion.sistemas@unibarranquilla.edu.co';
  password: string = '12345678';
  errorMensaje = signal<string>('');

  modalRecuperarAbierto = signal<boolean>(false);
  correoRecuperacion = signal<string>('');
  recuperacionEnviada = signal<boolean>(false);

  // Credenciales válidas por rol (puedes cambiar la contraseña de cada uno si son distintas)
  private readonly usuariosValidos: Record<RolUsuario, CredencialDemo> = {
    ADMIN: {
      correo: 'coordinacion.sistemas@unibarranquilla.edu.co',
      password: '12345678',
      rol: 'ADMIN',
      ruta: '/admin/reportes'
    },
    DOCENTE: {
      correo: 'rpineda@unibarranquilla.edu.co',
      password: '12345678',
      rol: 'DOCENTE',
      ruta: '/docente/asignadas'
    },
    ESTUDIANTE: {
      correo: 'meclavijo@unibarranquilla.edu.co',
      password: '12345678',
      rol: 'ESTUDIANTE',
      ruta: '/estudiante/mis-solicitudes'
    }
  };

  actualizarCorreoDemo(): void {
    const credencial = this.usuariosValidos[this.rolSeleccionado];
    this.correo = credencial.correo;
    this.password = credencial.password;
    this.errorMensaje.set('');
  }

  abrirModalRecuperar(): void {
    this.correoRecuperacion.set(this.correo);
    this.recuperacionEnviada.set(false);
    this.modalRecuperarAbierto.set(true);
  }

  cerrarModalRecuperar(): void {
    this.modalRecuperarAbierto.set(false);
  }

  enviarRecuperacion(): void {
    if (!this.correoRecuperacion().trim()) {
      alert('Por favor ingresa tu correo institucional.');
      return;
    }
    this.recuperacionEnviada.set(true);
  }

  ingresar(): void {
    const correoLimpio = this.correo.trim().toLowerCase();
    const passwordIngresada = this.password;

    if (!correoLimpio || !passwordIngresada) {
      this.errorMensaje.set('Por favor ingresa tu correo y contraseña.');
      alert('Por favor ingresa tu correo y contraseña.');
      return;
    }

    // Buscamos el usuario por correo
    const usuarioEncontrado = Object.values(this.usuariosValidos).find(
      u => u.correo.toLowerCase() === correoLimpio
    );

    if (!usuarioEncontrado) {
      this.errorMensaje.set('El correo ingresado no está registrado.');
      alert('El correo ingresado no está registrado.');
      return;
    }

    // Validamos que el correo corresponda al rol seleccionado
    if (usuarioEncontrado.rol !== this.rolSeleccionado) {
      this.errorMensaje.set(`Este correo no pertenece al rol ${this.rolSeleccionado}.`);
      alert(`Este correo pertenece al rol ${usuarioEncontrado.rol}, no a ${this.rolSeleccionado}.`);
      return;
    }

    // Validamos la contraseña
    if (usuarioEncontrado.password !== passwordIngresada) {
      this.errorMensaje.set('Contraseña incorrecta. Verifica e intenta nuevamente.');
      alert('Contraseña incorrecta. Verifica e intenta nuevamente.');
      return;

    }

    // Credenciales válidas: guardamos sesión y redirigimos según su rol
    this.errorMensaje.set('');
    localStorage.setItem('rolActivo', usuarioEncontrado.rol);
    localStorage.setItem('correoActivo', usuarioEncontrado.correo);

    this.router.navigateByUrl(usuarioEncontrado.ruta);
  }
}