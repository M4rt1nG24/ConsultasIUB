import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

export interface SolicitudDocente {
  codigo: string;
  estudiante: string;
  asignatura: string;
  tema: string;
  fecha: string;
  estado: string;
}

@Component({
  selector: 'app-bandeja-asignadas',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './bandeja-asignadas.css',
  templateUrl: './bandeja-asignadas.html',
})
export class BandejaAsignadas {
  private router = inject(Router);

  solicitudes = signal<SolicitudDocente[]>([
    {
      codigo: '1045892110',
      estudiante: 'Carlos Mario Pérez',
      asignatura: 'Estructura de Datos',
      tema: 'Árboles binarios y balanceo AVL',
      fecha: '14/10/2026',
      estado: 'Pendiente'
    },
    {
      codigo: '1042301994',
      estudiante: 'María José Herrera',
      asignatura: 'Bases de Datos Relacionales',
      tema: 'Normalización de 3ra Forma',
      fecha: '14/10/2026',
      estado: 'Pendiente'
    },
    {
      codigo: '1043912003',
      estudiante: 'Juan Camilo Sarmiento',
      asignatura: 'Programación Web',
      tema: 'Arquitectura de Componentes Angular',
      fecha: '15/10/2026',
      estado: 'Pendiente'
    }
  ]);

  atender(solicitud: SolicitudDocente) {
    // Redirige al formulario de atención académica
    this.router.navigate(['/docente/atencion']);
  }
}
