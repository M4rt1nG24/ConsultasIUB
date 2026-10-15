import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

export type RolUsuario = 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE';

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

  // Diccionario de correos demo según el rol
  private readonly correosDemo: Record<RolUsuario, string> = {
    ADMIN: 'coordinacion.sistemas@unibarranquilla.edu.co',
    DOCENTE: 'rpineda@unibarranquilla.edu.co',
    ESTUDIANTE: 'meclavijo@unibarranquilla.edu.co'
  };

  // Diccionario de rutas iniciales según tu app.routes.ts
  private readonly rutasIniciales: Record<RolUsuario, string> = {
    ADMIN: '/admin/reportes',
    DOCENTE: '/docente/asignadas',
    ESTUDIANTE: '/estudiante/mis-solicitudes'
  };

  actualizarCorreoDemo(): void {
    this.correo = this.correosDemo[this.rolSeleccionado];
  }

  ingresar(): void {
    // 1. Guardamos la sesión en localStorage
    localStorage.setItem('rolActivo', this.rolSeleccionado);
    localStorage.setItem('correoActivo', this.correo);

    // 2. Redirigimos exactamente a la ruta que corresponde al rol
    const rutaDestino = this.rutasIniciales[this.rolSeleccionado];
    this.router.navigateByUrl(rutaDestino);
  }
}