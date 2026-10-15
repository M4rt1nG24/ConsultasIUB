import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface RegistroHistorial {
  id: number;
  folio: string;
  fechaHora: string;
  estudiante: string;
  documento: string;
  asignatura: string;
  tipo: string;
  tema: string;
  observaciones: string;
  asistencia: number;
}

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-historial-tutorias',
  styleUrl: './historial-tutorias.css',
  templateUrl: './historial-tutorias.html',
})
export class HistorialTutorias {
  busqueda = signal<string>('');
  filtroAsignatura = signal<string>('Todas las asignaturas');

  historial = signal<RegistroHistorial[]>([
    {
      id: 1,
      folio: 'AUD-2026-1045892110',
      fechaHora: '10/10/2026 - 14:30',
      estudiante: 'Andrés Felipe Castro',
      documento: '1045892110',
      asignatura: 'Programación Web',
      tipo: 'Individual',
      tema: 'Componentes Standalone y Signals en Angular',
      observaciones: 'El estudiante asimiló los conceptos de reactividad con Signals y resolvió dudas prácticas.',
      asistencia: 1
    },
    {
      id: 2,
      folio: 'AUD-2026-1042789301',
      fechaHora: '08/10/2026 - 10:15',
      estudiante: 'Valeria Morales Díaz',
      documento: '1042789301',
      asignatura: 'Estructura de Datos',
      tipo: 'Grupal',
      tema: 'Complejidad algorítmica Big-O y balanceo AVL',
      observaciones: 'Participación activa. Se pactó entrega de ejercicios complementarios para la próxima semana.',
      asistencia: 1
    },
    {
      id: 3,
      folio: 'AUD-2026-1049918233',
      fechaHora: '05/10/2026 - 16:00',
      estudiante: 'Mateo Rincón Silva',
      documento: '1049918233',
      asignatura: 'Bases de Datos',
      tipo: 'Individual',
      tema: 'Modelado relacional y tercera forma normal (3FN)',
      observaciones: 'Sesión completada satisfactoriamente con diseño de diagrama entidad-relación.',
      asistencia: 1
    }
  ]);

  historialFiltrado = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    const asig = this.filtroAsignatura();

    return this.historial().filter(item => {
      const coincideTexto = !q ||
        item.estudiante.toLowerCase().includes(q) ||
        item.documento.includes(q) ||
        item.tema.toLowerCase().includes(q);

      const coincideAsignatura = asig === 'Todas las asignaturas' || item.asignatura === asig;

      return coincideTexto && coincideAsignatura;
    });
  });

  // Modal para ver formato oficial
  modalFormatoAbierto = signal<boolean>(false);
  registroSeleccionado = signal<RegistroHistorial | null>(null);

  abrirFormato(item: RegistroHistorial): void {
    this.registroSeleccionado.set(item);
    this.modalFormatoAbierto.set(true);
  }

  cerrarFormato(): void {
    this.modalFormatoAbierto.set(false);
    this.registroSeleccionado.set(null);
  }
}

