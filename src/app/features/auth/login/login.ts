import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Auth, RolUsuario } from '../../../core/services/auth';
import { ApiPrincipal } from '../../../core/services/api-principal';

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
  private apiPrincipal = inject(ApiPrincipal, { optional: true });

  rolSeleccionado: RolUsuario = 'ADMIN';
  correo: string = '';
  password: string = '';
  errorMensaje = signal<string>('');

  modalRecuperarAbierto = signal<boolean>(false);
  correoRecuperacion = signal<string>('');
  recuperacionEnviada = signal<boolean>(false);

  actualizarCorreoDemo(): void {
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
    const email = this.correoRecuperacion().trim();
    if (!email) {
      alert('Por favor ingresa tu correo institucional.');
      return;
    }

    if (this.apiPrincipal && this.apiPrincipal.baseUrl) {
      this.apiPrincipal.forgotPassword({ correo: email }).subscribe({
        next: () => this.recuperacionEnviada.set(true),
        error: () => this.recuperacionEnviada.set(true)
      });
    } else {
      this.recuperacionEnviada.set(true);
    }
  }

  ingresar(): void {
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
