import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiPrincipal } from '../../../core/services/api-principal';
import { Data, CursoSistema } from '../../../core/services/data';
import { DataTableDirective } from '../../../shared/directives/datatable.directive';
import { FilterBar } from '../../../shared/components/filter-bar/filter-bar';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-gestion-cursos-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTableDirective, FilterBar, PageHeader, StatusBadge],
  styleUrl: './gestion-cursos-roles.css',
  templateUrl: './gestion-cursos-roles.html',
})
export class GestionCursosRoles {
  private dataService = inject(Data);
  private apiPrincipal = inject(ApiPrincipal, { optional: true });

  busqueda = signal<string>('');
  cursos = this.dataService.cursos;
  docentesDisponibles = this.dataService.docentesDisponibles;

  cursosFiltrados = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    if (!q) return this.cursos();
    return this.cursos().filter(c =>
      c.codigo.toLowerCase().includes(q) ||
      c.asignatura.toLowerCase().includes(q) ||
      c.docente.toLowerCase().includes(q)
    );
  });

  // Formulario rápido
  nuevoCodigo = '';
  nuevaAsignatura = '';
  nuevoDocente = 'Ing. Roberto Pineda';

  // Modal para cambiar docente
  modalCambioAbierto = signal<boolean>(false);
  cursoSeleccionado = signal<CursoSistema | null>(null);
  docenteReemplazo = '';

  mensajeToast = signal<string | null>(null);

  guardarAsignacion(): void {
    if (!this.nuevoCodigo.trim() || !this.nuevaAsignatura.trim()) {
      alert('Por favor complete el código y nombre de la asignatura.');
      return;
    }

    const idTemp = Date.now();
    const codigoUpper = this.nuevoCodigo.trim().toUpperCase();
    const asignaturaTrim = this.nuevaAsignatura.trim();
    const tutorDocente = this.nuevoDocente;

    this.cursos.update(lista => [
      ...lista,
      {
        id: idTemp,
        codigo: codigoUpper,
        asignatura: asignaturaTrim,
        docente: tutorDocente,
        estado: 'Activo'
      }
    ]);

    if (this.apiPrincipal && typeof localStorage !== 'undefined' && localStorage.getItem('iub_jwt_token')) {
      this.apiPrincipal
        .crearModuloAsignatura({
          nombre: asignaturaTrim,
          descripcion: `Código de asignatura: ${codigoUpper}`
        })
        .subscribe({
          next: (modRemoto) => {
            this.cursos.update(lista =>
              lista.map(c => (c.id === idTemp ? { ...c, id: modRemoto.id } : c))
            );

            // Vincular docente asignado si existe en el sistema
            const docenteObj = this.dataService
              .usuarios()
              .find(u => u.rol === 'DOCENTE' && u.nombre === tutorDocente);

            if (docenteObj) {
              this.apiPrincipal
                ?.asignarDocenteModulo({
                  docenteId: docenteObj.id,
                  moduloId: modRemoto.id
                })
                .subscribe({ error: () => {} });
            }
          },
          error: () => {}
        });
    }

    this.nuevoCodigo = '';
    this.nuevaAsignatura = '';
    this.mostrarToast('¡Curso y docente tutor vinculados con éxito!');
  }

  abrirCambiarDocente(curso: CursoSistema): void {
    this.cursoSeleccionado.set(curso);
    this.docenteReemplazo = curso.docente;
    this.modalCambioAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalCambioAbierto.set(false);
    this.cursoSeleccionado.set(null);
  }

  confirmarCambioDocente(): void {
    const curso = this.cursoSeleccionado();
    if (!curso) return;

    this.cursos.update(lista =>
      lista.map(c => (c.codigo === curso.codigo ? { ...c, docente: this.docenteReemplazo } : c))
    );

    if (this.apiPrincipal && typeof localStorage !== 'undefined' && localStorage.getItem('iub_jwt_token')) {
      const docenteObj = this.dataService
        .usuarios()
        .find(u => u.rol === 'DOCENTE' && u.nombre === this.docenteReemplazo);

      if (docenteObj) {
        this.apiPrincipal
          .asignarDocenteModulo({
            docenteId: docenteObj.id,
            moduloId: curso.id
          })
          .subscribe({ error: () => {} });
      }
    }

    this.cerrarModal();
    this.mostrarToast(`¡Tutor del curso ${curso.codigo} actualizado a ${this.docenteReemplazo}!`);
  }

  cambiarEstadoCurso(curso: CursoSistema): void {
    const nuevoEstado = curso.estado === 'Activo' ? 'Inactivo' : 'Activo';
    this.cursos.update(lista =>
      lista.map(c => (c.codigo === curso.codigo ? { ...c, estado: nuevoEstado } : c))
    );
    this.mostrarToast(`¡Estado del curso ${curso.codigo} cambiado a ${nuevoEstado}!`);

    if (this.apiPrincipal && typeof localStorage !== 'undefined' && localStorage.getItem('iub_jwt_token')) {
      if (nuevoEstado === 'Inactivo') {
        this.apiPrincipal.desactivarModuloAsignatura(curso.id).subscribe({ error: () => {} });
      }
    }
  }

  mostrarToast(msg: string): void {
    this.mensajeToast.set(msg);
    setTimeout(() => {
      this.mensajeToast.set(null);
    }, 4000);
  }
}
