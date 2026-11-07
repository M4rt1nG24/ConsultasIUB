import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import {
  ApiPrincipal,
  ModuloAsignacionResponseApi,
  ModuloSistemaResponseApi,
  RolResponseApi
} from '../../../core/services/api-principal';
import { Auth } from '../../../core/services/auth';
import { Data, CursoSistema } from '../../../core/services/data';
import { DataTableDirective } from '../../../shared/directives/datatable.directive';
import { FilterBar } from '../../../shared/components/filter-bar/filter-bar';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

export interface PermisoRolModuloVista {
  rolId: number;
  rolNombre: string;
  moduloId: number;
  moduloNombre: string;
  descripcion: string;
  ruta: string;
  icono: string;
  asignado: boolean;
  estadoTexto: 'Activo' | 'Inactivo';
}

@Component({
  selector: 'app-gestion-cursos-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTableDirective, FilterBar, PageHeader, StatusBadge],
  styleUrl: './gestion-cursos-roles.css',
  templateUrl: './gestion-cursos-roles.html',
})
export class GestionCursosRoles implements OnInit {
  private dataService = inject(Data);
  private auth = inject(Auth);
  private api = inject(ApiPrincipal, { optional: true });

  busqueda = signal<string>('');
  cursos = this.dataService.cursos;
  programas = this.dataService.programas;
  docentesDisponibles = this.dataService.docentesDisponibles;

  // Gestión de Roles y Módulos (tabla modulo_x_rol / rolxmodulo)
  rolesSistema = signal<RolResponseApi[]>([]);
  modulosSistema = signal<ModuloSistemaResponseApi[]>([]);
  rolSeleccionadoNombre = signal<string>('ESTUDIANTE');
  modulosAsignadosPorRol = signal<Record<number, number[]>>({});
  cargandoPermisos = signal<boolean>(false);

  cursosFiltrados = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    if (!q) return this.cursos();
    return this.cursos().filter(c =>
      c.codigo.toLowerCase().includes(q) ||
      c.asignatura.toLowerCase().includes(q) ||
      c.docente.toLowerCase().includes(q)
    );
  });

  permisosRolSeleccionado = computed<PermisoRolModuloVista[]>(() => {
    const nombreRol = this.rolSeleccionadoNombre();
    const rolObj = this.rolesSistema().find(
      (r) => r.nombre.toUpperCase() === nombreRol.toUpperCase()
    );
    if (!rolObj) return [];
    const asignadosSet = new Set(this.modulosAsignadosPorRol()[rolObj.id] || []);
    return this.modulosSistema()
      .filter((m) => m.estado)
      .map((m) => {
        const asignado = asignadosSet.has(m.id);
        return {
          rolId: rolObj.id,
          rolNombre: rolObj.nombre,
          moduloId: m.id,
          moduloNombre: m.nombre,
          descripcion: m.descripcion || 'Módulo del sistema',
          ruta: m.ruta || '/',
          icono: m.icono || '📌',
          asignado,
          estadoTexto: asignado ? 'Activo' : 'Inactivo'
        };
      });
  });

  // Formulario rápido de Curso / Módulo
  nuevoCodigo = '';
  nuevaAsignatura = '';
  nuevoDocente = '';

  // Formulario rápido de Programa Académico (/programas)
  nuevoProgramaCodigo = '';
  nuevoProgramaNombre = '';
  nuevoProgramaDescripcion = '';

  // Modal para cambiar docente
  modalCambioAbierto = signal<boolean>(false);
  cursoSeleccionado = signal<CursoSistema | null>(null);
  docenteReemplazo = '';

  mensajeToast = signal<string | null>(null);

  ngOnInit(): void {
    this.cargarPermisosRolXModulo();
  }

  cargarPermisosRolXModulo(): void {
    if (!this.api || !this.api.baseUrl) return;
    this.cargandoPermisos.set(true);

    forkJoin({
      roles: this.api.listarRoles(false).pipe(catchError(() => of([] as RolResponseApi[]))),
      modulos: this.api.listarModulosSistema(false).pipe(catchError(() => of([] as ModuloSistemaResponseApi[])))
    }).subscribe({
      next: ({ roles, modulos }) => {
        this.rolesSistema.set(roles || []);
        this.modulosSistema.set(modulos || []);

        if (roles.length > 0 && !roles.some(r => r.nombre.toUpperCase() === this.rolSeleccionadoNombre().toUpperCase())) {
          this.rolSeleccionadoNombre.set(roles[0].nombre);
        }

        if (roles.length === 0) {
          this.cargandoPermisos.set(false);
          return;
        }

        const peticiones = roles.map((r) =>
          this.api!.obtenerModulosDeRol(r.id).pipe(
            catchError(() => of([] as ModuloAsignacionResponseApi[]))
          )
        );

        forkJoin(peticiones).subscribe({
          next: (resultadosPorRol) => {
            const mapa: Record<number, number[]> = {};
            roles.forEach((r, idx) => {
              mapa[r.id] = (resultadosPorRol[idx] || []).map((m) => m.id);
            });
            this.modulosAsignadosPorRol.set(mapa);
            this.cargandoPermisos.set(false);
          },
          error: () => this.cargandoPermisos.set(false)
        });
      },
      error: () => this.cargandoPermisos.set(false)
    });
  }

  alternarPermisoModulo(item: PermisoRolModuloVista): void {
    if (!this.api || !this.api.baseUrl) return;
    const actuales = new Set(this.modulosAsignadosPorRol()[item.rolId] || []);
    if (actuales.has(item.moduloId)) {
      actuales.delete(item.moduloId);
    } else {
      actuales.add(item.moduloId);
    }
    const nuevosIds = Array.from(actuales);

    this.api.reemplazarModulosDeRol(item.rolId, nuevosIds).subscribe({
      next: (modulosActualizados) => {
        const mapa = { ...this.modulosAsignadosPorRol() };
        mapa[item.rolId] = (modulosActualizados || []).map((m) => m.id);
        this.modulosAsignadosPorRol.set(mapa);
        this.auth.sincronizarPerfilActual();
        const accion = nuevosIds.includes(item.moduloId) ? 'habilitado' : 'deshabilitado';
        this.mostrarToast(`Módulo ${item.moduloNombre} ${accion} para el rol ${item.rolNombre} en la base de datos.`);
      },
      error: (err) => {
        alert(this.api!.extraerMensajeError(err, 'No se pudo actualizar el permiso en la tabla rolxmodulo.'));
      }
    });
  }

  guardarAsignacion(): void {
    const codigoLimpio = this.nuevoCodigo.trim().toUpperCase();
    const asignaturaLimpia = this.nuevaAsignatura.trim();

    if (!codigoLimpio || asignaturaLimpia.length < 3) {
      alert('Por favor ingresa un código y un nombre de asignatura de al menos 3 caracteres.');
      return;
    }

    const nombreDocenteElegido = this.nuevoDocente || this.docentesDisponibles()[0] || '';
    const docenteObj = this.dataService
      .usuarios()
      .find(
        (u) =>
          u.rol === 'DOCENTE' &&
          u.nombre.toLowerCase().trim() === nombreDocenteElegido.toLowerCase().trim()
      );

    // El backend FastAPI exige que descripcion tenga entre 10 y 500 caracteres.
    // Guardamos el código y el docente titular dentro de descripcion para que persistan en PostgreSQL.
    const descripcionValida =
      `[Codigo:${codigoLimpio} | Docente:${nombreDocenteElegido || 'Por asignar'}] Asignatura institucional ${asignaturaLimpia}`.substring(
        0,
        500
      );

    if (this.api && this.api.baseUrl) {
      this.api
        .crearModuloAsignatura({
          nombre: asignaturaLimpia,
          descripcion: descripcionValida
        })
        .pipe(
          switchMap((moduloCreado) => {
            if (docenteObj && moduloCreado?.id) {
              this.dataService.asegurarDisponibilidadDocente(docenteObj.id);
              return this.api!
                .asignarDocenteModulo({
                  docenteId: docenteObj.id,
                  moduloId: moduloCreado.id
                })
                .pipe(catchError(() => of(null)));
            }
            return of(null);
          })
        )
        .subscribe({
          next: () => {
            this.nuevoCodigo = '';
            this.nuevaAsignatura = '';
            this.dataService.sincronizarDesdeBackend();
            this.mostrarToast('¡Asignatura registrada y docente tutor vinculado en la base de datos!');
          },
          error: (err) => {
            alert(this.api!.extraerMensajeError(err, 'No se pudo registrar la asignatura en la base de datos.'));
          }
        });
    } else {
      this.cursos.update(lista => [
        ...lista,
        {
          id: Date.now(),
          codigo: codigoLimpio,
          asignatura: asignaturaLimpia,
          docente: nombreDocenteElegido,
          estado: 'Activo'
        }
      ]);
      this.nuevoCodigo = '';
      this.nuevaAsignatura = '';
      this.mostrarToast('¡Curso y docente tutor vinculados con éxito!');
    }
  }

  guardarProgramaAcademico(): void {
    const nombre = this.nuevoProgramaNombre.trim();

    if (nombre.length < 3) {
      alert('Ingresa el nombre del Programa Académico (mín. 3 caracteres).');
      return;
    }

    if (this.api && this.api.baseUrl) {
      this.api
        .crearPrograma(nombre)
        .subscribe({
          next: () => {
            this.nuevoProgramaCodigo = '';
            this.nuevoProgramaNombre = '';
            this.nuevoProgramaDescripcion = '';
            this.dataService.sincronizarDesdeBackend();
            this.mostrarToast(`¡Programa académico "${nombre}" registrado en la base de datos!`);
          },
          error: (err) => {
            alert(this.api!.extraerMensajeError(err, 'No se pudo registrar el programa académico.'));
          }
        });
    }
  }

  abrirCambiarDocente(curso: CursoSistema): void {
    this.cursoSeleccionado.set(curso);
    this.docenteReemplazo =
      curso.docente && curso.docente !== 'Sin docente asignado'
        ? curso.docente
        : this.docentesDisponibles()[0] || '';
    this.modalCambioAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalCambioAbierto.set(false);
    this.cursoSeleccionado.set(null);
  }

  confirmarCambioDocente(): void {
    const curso = this.cursoSeleccionado();
    if (!curso) return;

    if (this.api && this.api.baseUrl) {
      const docenteObj = this.dataService
        .usuarios()
        .find(
          (u) =>
            u.rol === 'DOCENTE' &&
            u.nombre.toLowerCase().trim() === this.docenteReemplazo.toLowerCase().trim()
        );
      if (!docenteObj) {
        alert('Selecciona un docente válido registrado en el sistema.');
        return;
      }

      this.dataService.asegurarDisponibilidadDocente(docenteObj.id);
      const descripcionActualizada =
        `[Codigo:${curso.codigo} | Docente:${this.docenteReemplazo}] Asignatura institucional ${curso.asignatura}`.substring(
          0,
          500
        );

      this.api
        .actualizarModuloAsignatura(curso.id, {
          nombre: curso.asignatura,
          descripcion: descripcionActualizada
        })
        .pipe(
          catchError(() => of(null)),
          switchMap(() =>
            this.api!.asignarDocenteModulo({
              docenteId: docenteObj.id,
              moduloId: curso.id
            })
          ),
          catchError(() => of(null))
        )
        .subscribe({
          next: () => {
            this.dataService.sincronizarDesdeBackend();
            this.cerrarModal();
            this.mostrarToast(`¡Tutor del curso ${curso.codigo} asignado a ${this.docenteReemplazo}!`);
          },
          error: (err) => {
            alert(this.api!.extraerMensajeError(err, 'No se pudo vincular el docente al curso.'));
          }
        });
      return;
    }

    this.cursos.update(lista =>
      lista.map(c => (c.codigo === curso.codigo ? { ...c, docente: this.docenteReemplazo } : c))
    );
    this.cerrarModal();
    this.mostrarToast(`¡Tutor del curso ${curso.codigo} actualizado a ${this.docenteReemplazo}!`);
  }

  cambiarEstadoCurso(curso: CursoSistema): void {
    const nuevoEstado = curso.estado === 'Activo' ? 'Inactivo' : 'Activo';
    this.cursos.update(lista =>
      lista.map(c => (c.codigo === curso.codigo ? { ...c, estado: nuevoEstado } : c))
    );

    if (this.api && this.api.baseUrl && nuevoEstado === 'Inactivo') {
      this.api.desactivarModuloAsignatura(curso.id).subscribe({
        next: () => this.dataService.sincronizarDesdeBackend(),
        error: () => {}
      });
    }

    this.mostrarToast(`¡Estado del curso ${curso.codigo} cambiado a ${nuevoEstado}!`);
  }

  mostrarToast(msg: string): void {
    this.mensajeToast.set(msg);
    setTimeout(() => {
      this.mensajeToast.set(null);
    }, 4000);
  }
}
