import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface SolicitudReasignar {
  ticket: string;
  estudiante: string;
  asignatura: string;
  docenteActual: string;
  docenteSeleccionado: string;
  reasignado: boolean;
}

@Component({
  selector: 'app-reasignacion-consultas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: './reasignacion-consultas.css',
  templateUrl: './reasignacion-consultas.html',
})
export class ReasignacionConsultas {
  solicitudes = signal<SolicitudReasignar[]>([
    {
      ticket: '#TUT-104',
      estudiante: 'Andrés Mendoza',
      asignatura: 'Bases de Datos (Normalización)',
      docenteActual: 'Ing. Laura Gómez',
      docenteSeleccionado: '',
      reasignado: false
    },
    {
      ticket: '#TUT-109',
      estudiante: 'Camila Torres',
      asignatura: 'Programación Web (Rutas Angular)',
      docenteActual: 'Ing. Roberto Pineda',
      docenteSeleccionado: '',
      reasignado: false
    },
    {
      ticket: '#TUT-115',
      estudiante: 'Sebastián Varela',
      asignatura: 'Estructura de Datos (Grafos)',
      docenteActual: 'Ing. Carlos Ruiz',
      docenteSeleccionado: '',
      reasignado: false
    }
  ]);

  docentesDisponibles = [
    'Ing. Roberto Pineda',
    'Ing. Laura Gómez',
    'Ing. Carlos Ruiz',
    'Ing. Carlos Mendoza',
    'Ing. Diana Rodríguez'
  ];

  mensajeToast = signal<string | null>(null);

  confirmar(item: SolicitudReasignar) {
    if (!item.docenteSeleccionado) {
      alert('Por favor selecciona un docente para reasignar la consulta.');
      return;
    }

    const anterior = item.docenteActual;
    item.docenteActual = item.docenteSeleccionado;
    item.reasignado = true;

    this.solicitudes.update(list => [...list]);
    this.mostrarToast(`¡Consulta ${item.ticket} reasignada de ${anterior} a ${item.docenteSeleccionado}!`);
  }

  mostrarToast(msg: string) {
    this.mensajeToast.set(msg);
    setTimeout(() => {
      this.mensajeToast.set(null);
    }, 4500);
  }
}
