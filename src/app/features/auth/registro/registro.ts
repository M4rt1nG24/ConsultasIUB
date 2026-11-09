import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiPrincipal } from '../../../core/services/api-principal';
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
  private apiPrincipal = inject(ApiPrincipal, { optional: true });

  nombre = '';
  apellido = '';
  documento = '';
  programa = 'Ingeniería de Sistemas';
  rol = 'Estudiante';
  correo = '';
  password = '';
  confirmPassword = '';

  modalRegistroAbierto = signal<boolean>(false);
  errorMensaje = signal<string>('');

  private validarPoliticaPassword(
    pwd: string,
    nombre: string,
    apellido: string,
    correo: string,
    identificacion: string
  ): string | null {
    if (pwd.length < 10) {
      return 'La contraseña debe tener al menos 10 caracteres.';
    }
    if (/\s/.test(pwd)) {
      return 'La contraseña no puede contener espacios.';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'La contraseña debe incluir al menos una letra mayúscula.';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'La contraseña debe incluir al menos una letra minúscula.';
    }
    if (!/\d/.test(pwd)) {
      return 'La contraseña debe incluir al menos un número.';
    }
    if (!/[^A-Za-z0-9\s]/.test(pwd)) {
      return 'La contraseña debe incluir al menos un símbolo (ej. #, !, @, $, *).';
    }
    const lower = pwd.toLowerCase();
    const usuarioCorreo = (correo.split('@')[0] || '').trim().toLowerCase();
    const candidatos = [
      usuarioCorreo,
      nombre.trim().toLowerCase(),
      apellido.trim().toLowerCase(),
      identificacion.trim().toLowerCase()
    ];
    for (const frag of candidatos) {
      for (const token of frag.split(/[\s._-]+/)) {
        if (token.length >= 4 && lower.includes(token)) {
          return 'Por seguridad, la contraseña no puede contener tu nombre, apellido, correo ni número de identificación.';
        }
      }
    }
    return null;
  }

  registrar(): void {
    this.errorMensaje.set('');

    const nombreTrim = this.nombre.trim();
    let primerNombre = nombreTrim;
    let apellidoFinal = this.apellido.trim();

    if (!apellidoFinal && nombreTrim.includes(' ')) {
      const partes = nombreTrim.split(/\s+/);
      primerNombre = partes[0];
      apellidoFinal = partes.slice(1).join(' ');
    }

    if (!primerNombre || !apellidoFinal || !this.documento.trim() || !this.correo.trim() || !this.password.trim()) {
      this.errorMensaje.set('Por favor completa todos los campos requeridos (*): Nombres, Apellidos, Identificación, Correo y Contraseña.');
      return;
    }

    if (!this.correo.includes('@')) {
      this.errorMensaje.set('Debes ingresar un correo institucional válido.');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMensaje.set('Las contraseñas no coinciden. Por favor verifica.');
      return;
    }

    const errorPwd = this.validarPoliticaPassword(
      this.password,
      primerNombre,
      apellidoFinal,
      this.correo,
      this.documento
    );
    if (errorPwd) {
      this.errorMensaje.set(errorPwd);
      return;
    }

    const rolElegido = this.rol.toUpperCase() === 'DOCENTE' ? 'DOCENTE' : 'ESTUDIANTE';

    if (this.apiPrincipal && this.apiPrincipal.baseUrl) {
      this.apiPrincipal
        .registrarUsuarioPublico({
          identificacion: this.documento.trim(),
          nombre: primerNombre,
          apellido: apellidoFinal,
          correo: this.correo.trim().toLowerCase(),
          password: this.password,
          rol: rolElegido
        })
        .subscribe({
          next: () => {
            if (rolElegido === 'DOCENTE') {
              // Sembrar automáticamente la disponibilidad horaria del nuevo docente
              this.apiPrincipal!
                .login({
                  correo: this.correo.trim().toLowerCase(),
                  password: this.password
                })
                .subscribe({
                  next: (loginRes) => {
                    if (typeof localStorage !== 'undefined' && loginRes?.token) {
                      const prevToken = localStorage.getItem('iub_jwt_token');
                      localStorage.setItem('iub_jwt_token', loginRes.token);
                      this.dataService.asegurarDisponibilidadDocente(loginRes.id_usuario);
                      setTimeout(() => {
                        if (prevToken) {
                          localStorage.setItem('iub_jwt_token', prevToken);
                        } else {
                          localStorage.removeItem('iub_jwt_token');
                        }
                      }, 2500);
                    }
                  },
                  error: () => {}
                });
            }
            this.modalRegistroAbierto.set(true);
          },
          error: (err) => {
            this.errorMensaje.set(
              this.apiPrincipal!.extraerMensajeError(
                err,
                'No se pudo registrar el usuario en la API.'
              )
            );
          }
        });
      return;
    }

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
