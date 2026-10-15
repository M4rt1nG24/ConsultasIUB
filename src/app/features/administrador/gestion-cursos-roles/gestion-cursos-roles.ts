import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface CursoItem {
  codigo: string;
  asignatura: string;
  docente: string;
}

@Component({
  selector: 'app-gestion-cursos-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: './gestion-cursos-roles.css',
  templateUrl: './gestion-cursos-roles.html',
})
export class GestionCursosRoles {
  cursos = signal<CursoItem[]>([
    { codigo: 'SIS-402', asignatura: 'Programación Web', docente: 'Ing. Roberto Pineda' },
    { codigo: 'SIS-501', asignatura: 'Bases de Datos II', docente: 'Ing. Laura Gómez' },
    { codigo: 'SIS-603', asignatura: 'Estructura de Datos', docente: 'Ing. Carlos Ruiz' },
  ]);

  // Formulario rápido
  nuevoCodigo = '';
  nuevaAsignatura = '';
  nuevoDocente = 'Ing. Roberto Pineda';

  // Modal para cambiar docente
  modalCambioAbierto = signal<boolean>(false);
  cursoSeleccionado = signal<CursoItem | null>(null);
  docenteReemplazo = '';

  mensajeToast = signal<string | null>(null);

  guardarAsignacion() {
    if (!this.nuevoCodigo.trim() || !this.nuevaAsignatura.trim()) {
      alert('Por favor complete el código y nombre de la asignatura.');
      return;
    }

    this.cursos.update(lista => [
      ...lista,
      {
        codigo: this.nuevoCodigo.trim().toUpperCase(),
        asignatura: this.nuevaAsignatura.trim(),
        docente: this.nuevoDocente
      }
    ]);

    this.nuevoCodigo = '';
    this.nuevaAsignatura = '';
    this.mostrarToast('¡Curso y docente tutor vinculados con éxito!');
  }

  abrirCambiarDocente(curso: CursoItem) {
    this.cursoSeleccionado.set(curso);
    this.docenteReemplazo = curso.docente;
    this.modalCambioAbierto.set(true);
  }

  cerrarModal() {
    this.modalCambioAbierto.set(false);
    this.cursoSeleccionado.set(null);
  }

  confirmarCambioDocente() {
    const curso = this.cursoSeleccionado();
    if (!curso) return;

    this.cursos.update(lista =>
      lista.map(c => c.codigo === curso.codigo ? { ...c, docente: this.docenteReemplazo } : c)
    );

    this.cerrarModal();
    this.mostrarToast(`¡Tutor del curso ${curso.codigo} actualizado a ${this.docenteReemplazo}!`);
  }

  mostrarToast(msg: string) {
    this.mensajeToast.set(msg);
    setTimeout(() => {
      this.mensajeToast.set(null);
    }, 4000);
  }
}
