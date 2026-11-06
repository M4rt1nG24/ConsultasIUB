import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Auth, RolUsuario } from '../../../core/services/auth';
import { Data } from '../../../core/services/data';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private router = inject(Router);
  private authService = inject(Auth);
  private dataService = inject(Data);

  rolSeleccionado: RolUsuario = 'ADMIN';
  correo: string = 'coordinacion.sistemas@unibarranquilla.edu.co';
  password: string = '12345678';
  errorMensaje = signal<string>('');

  modalRecuperarAbierto = signal<boolean>(false);
  correoRecuperacion = signal<string>('');
  recuperacionEnviada = signal<boolean>(false);

  private readonly correosPredeterminados: Record<RolUsuario, string> = {
    ADMIN: 'coordinacion.sistemas@unibarranquilla.edu.co',
    DOCENTE: 'rpineda@unibarranquilla.edu.co',
    ESTUDIANTE: 'meclavijo@unibarranquilla.edu.co'
  };

  actualizarCorreoDemo(): void {
    const usuariosRol = this.dataService
      .usuarios()
      .filter(u => u.rol === this.rolSeleccionado && u.estado === 'Activo');

    this.correo =
      usuariosRol[0]?.email || this.correosPredeterminados[this.rolSeleccionado];
    this.password = '12345678';
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
    // 1. Intentar validación inmediata si está en catálogo local
    const resultadoLocal = this.authService.autenticar(
      this.correo,
      this.password,
      this.rolSeleccionado
    );

    if (resultadoLocal.exito) {
      this.errorMensaje.set('');
      // Sincronizar también contra la API Principal en Render en segundo plano
      this.authService
        .autenticarConApi(this.correo, this.password, this.rolSeleccionado)
        .subscribe();
      this.router.navigateByUrl(resultadoLocal.rutaRedireccion || '/login');
      return;
    }

    // 2. Si el usuario solo existe en la base de datos de Render, autenticar contra POST /auth/login
    this.authService
      .autenticarConApi(this.correo, this.password, this.rolSeleccionado)
      .subscribe((resultadoApi) => {
        if (!resultadoApi.exito) {
          this.errorMensaje.set(resultadoApi.mensaje);
          alert(resultadoApi.mensaje);
          return;
        }
        this.errorMensaje.set('');
        this.router.navigateByUrl(resultadoApi.rutaRedireccion || '/login');
      });
  }
}
