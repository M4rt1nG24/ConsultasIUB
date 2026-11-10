import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import {
  ApiPrincipal,
  CalificacionResponseApi,
  CalificacionResumenSolicitudApi,
  ComentarioResponseApi,
  DisponibilidadResponseApi,
  DocenteModuloResponseApi,
  DocenteResumenApi,
  EstadoSolicitudApi,
  ModuloResponseApi,
  NotificacionResponseApi,
  PeriodoResponseApi,
  PrioridadSolicitudApi,
  ProgAcademicoResponseApi,
  SolicitudConsultaResponseApi,
  TipoDocumentoResponseApi,
  UsuarioResponseApi
} from './api-principal';
export * from '../models/consulta.models';
import {
  MensajeInteraccion,
  EstadoConsultaFront,
  ConsultaUnificada,
  CursoSistema,
  UsuarioSistema
} from '../models/consulta.models';
import {
  extraerMetadatosActaComentario,
  extraerMetadatosDescripcion,
  formatearFechaHora,
  obtenerFranjaDesdeHora,
  obtenerHoraPorFranja,
  obtenerFechaFuturaIso,
  construirEtiquetaMetaConsulta,
  encontrarSlotBackendParaDocente,
  mapearUsuarioApiAFront,
  mapearDocenteApiAFront,
  mapearModuloApiAFront,
  mapearSolicitudApiAFront,
  encontrarDocenteParaConsulta,
  verificarDisponibilidadEspacioHelper,
  registrarSolicitudConFallback,
  asegurarDisponibilidadDocenteHelper
} from './data-helpers';
import {
  guardarUbicacionLocal as storageGuardarUbicacion,
  obtenerUbicacionLocal as storageObtenerUbicacion,
  guardarAtencionDocenteLocal as storageGuardarAtencion,
  obtenerAtencionesDocenteLocales as storageObtenerAtenciones,
  encolarSolicitudPendienteBD as storageEncolarSolicitud,
  obtenerSolicitudesPendientesBD as storageObtenerSolicitudes,
  guardarSolicitudesPendientesBD as storageGuardarSolicitudes,
  cargarCacheDeStorage,
  guardarCacheEnStorage,
  SolicitudPendienteBd,
  STORAGE_KEY_CONSULTAS,
  STORAGE_KEY_CURSOS,
  STORAGE_KEY_USUARIOS,
  STORAGE_KEY_CONSULTA_ACTIVA,
  TIPOS_DOC_FALLBACK
} from './data-storage';

@Injectable({
  providedIn: 'root'
})
export class Data {
  private readonly api = inject(ApiPrincipal, { optional: true });

  consultas = signal<ConsultaUnificada[]>(cargarCacheDeStorage(STORAGE_KEY_CONSULTAS, []));
  cursos = signal<CursoSistema[]>(cargarCacheDeStorage(STORAGE_KEY_CURSOS, []));
  usuarios = signal<UsuarioSistema[]>(cargarCacheDeStorage(STORAGE_KEY_USUARIOS, []));
  programas = signal<ProgAcademicoResponseApi[]>([]);
  tiposDocumento = signal<TipoDocumentoResponseApi[]>(TIPOS_DOC_FALLBACK);
  periodosAcademicos = signal<PeriodoResponseApi[]>([]);
  disponibilidadesDocentes = signal<DisponibilidadResponseApi[]>([]);
  notificaciones = signal<NotificacionResponseApi[]>([]);

  constructor() {
    effect(() => guardarCacheEnStorage(STORAGE_KEY_CONSULTAS, this.consultas()));
    effect(() => guardarCacheEnStorage(STORAGE_KEY_CURSOS, this.cursos()));
    effect(() => guardarCacheEnStorage(STORAGE_KEY_USUARIOS, this.usuarios()));
  }

  /**
   * Garantiza que un docente tenga disponibilidad horaria amplia registrada (Lunes a Domingo 06:00 a 23:00)
   * en /disponibilidad-docente y esté vinculado a los módulos activos para que las solicitudes
   * de los estudiantes nunca sean rechazadas por falta de horario o asignación.
   */
  asegurarDisponibilidadDocente(docenteId: number): void {
    if (!this.api || !this.api.baseUrl || !docenteId) return;
    const rolActual =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('rolActivo') || 'ESTUDIANTE'
        : 'ESTUDIANTE';
    asegurarDisponibilidadDocenteHelper(this.api, docenteId, this.cursos(), rolActual);
  }

  // Consulta activa seleccionada para ver detalle o atender entre vistas
  consultaActivaId = signal<number>(
    typeof localStorage !== 'undefined'
      ? Number(localStorage.getItem(STORAGE_KEY_CONSULTA_ACTIVA) || 0)
      : 0
  );

  consultaActiva = computed(() => {
    const id = this.consultaActivaId();
    const lista = this.consultas();
    return lista.find(c => c.id === id) || lista[0] || null;
  });

  docentesDisponibles = computed(() =>
    this.usuarios()
      .filter(u => u.rol === 'DOCENTE' && u.estado === 'Activo')
      .map(u => u.nombre)
  );

  seleccionarConsulta(id: number): void {
    this.consultaActivaId.set(id);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_CONSULTA_ACTIVA, String(id));
    }
    this.cargarComentariosDeConsulta(id);
  }

  cargarComentariosDeConsulta(idSolicitud: number): void {
    if (!this.api || !this.api.baseUrl || !idSolicitud) return;

    // Verificar si el usuario actual es participante de esta consulta
    const consulta = this.consultas().find(c => c.id === idSolicitud);
    const idUsuarioActivo =
      typeof localStorage !== 'undefined'
        ? Number(localStorage.getItem('idUsuarioActivo')) || 0
        : 0;

    if (consulta && idUsuarioActivo) {
      const esParticipante =
        consulta.estudianteId === idUsuarioActivo ||
        consulta.docenteId === idUsuarioActivo;
      // En el backend FastAPI, /comentarios/solicitud/{id} rechaza con 400 si el usuario no es participante
      if (!esParticipante) return;
    }

    this.api.listarComentariosPorSolicitud(idSolicitud).subscribe({
      next: (comentarios: ComentarioResponseApi[]) => {
        const lista = comentarios || [];
        this.consultas.update(actuales =>
          actuales.map(c => {
            if (c.id !== idSolicitud) return c;

            const mensajeInicial: MensajeInteraccion = {
              autor: c.estudiante,
              rol: 'ESTUDIANTE',
              fechaHora: c.fecha,
              mensaje: c.descripcion
            };

            let tipoAtencionDetectado = c.tipoAtencion;
            let temaDetectado = c.tema;
            let asistenciaDetectada = c.asistencia;

            const mensajesComentarios: MensajeInteraccion[] = lista.map(com => {
              const esDocente =
                (c.docenteId && com.autorId === c.docenteId) ||
                com.nombreAutor.toLowerCase() === c.tutor.toLowerCase();
              const esEstudiante =
                (c.estudianteId && com.autorId === c.estudianteId) ||
                com.nombreAutor.toLowerCase() === c.estudiante.toLowerCase();

              const metaActa = extraerMetadatosActaComentario(com.contenido);
              if (metaActa.esActa) {
                if (metaActa.tipoAtencion) tipoAtencionDetectado = metaActa.tipoAtencion;
                if (metaActa.tema) temaDetectado = metaActa.tema;
                if (metaActa.asistencia !== undefined) asistenciaDetectada = metaActa.asistencia;
              }

              return {
                id: com.id,
                autor: com.nombreAutor,
                rol: esDocente ? 'DOCENTE' : esEstudiante ? 'ESTUDIANTE' : 'ADMIN',
                fechaHora: formatearFechaHora(com.fechaCreacion),
                mensaje: metaActa.textoLimpio
              };
            });

            const ultimoComentarioDocente = [...mensajesComentarios]
              .reverse()
              .find(m => m.rol === 'DOCENTE');

            return {
              ...c,
              tipoAtencion: tipoAtencionDetectado,
              tema: temaDetectado,
              asistencia: asistenciaDetectada,
              observaciones: ultimoComentarioDocente
                ? ultimoComentarioDocente.mensaje
                : c.observaciones,
              mensajes: [mensajeInicial, ...mensajesComentarios]
            };
          })
        );
      },
      error: () => {}
    });
  }

  private guardarUbicacionLocal(
    clave: string,
    info: { ubicacion: string; recursoFisicoId?: number | null; modalidad: string }
  ): void {
    storageGuardarUbicacion(clave, info);
  }

  private obtenerUbicacionLocal(
    id: number,
    fechaConsulta: string,
    horaConsulta: string
  ): { ubicacion: string; recursoFisicoId?: number | null; modalidad: string } | null {
    return storageObtenerUbicacion(id, fechaConsulta, horaConsulta);
  }

  /**
   * Verifica si un espacio físico (salón, sala o laboratorio) de una sede
   * está disponible en la fecha (YYYY-MM-DD) y hora (HH:mm) seleccionadas.
   */
  verificarDisponibilidadEspacio(
    sedeNombre: string,
    salonNombre: string,
    fechaConsulta: string,
    horaOFranja: string,
    recursoFisicoId?: number,
    excluirConsultaId?: number
  ): { disponible: boolean; mensaje: string; conflicto?: ConsultaUnificada } {
    return verificarDisponibilidadEspacioHelper(
      this.consultas(),
      sedeNombre,
      salonNombre,
      fechaConsulta,
      horaOFranja,
      recursoFisicoId,
      excluirConsultaId
    );
  }

  crearConsulta(datos: {
    estudiante?: string;
    documento?: string;
    correoEstudiante?: string;
    estudianteId?: number;
    asignatura: string;
    tema: string;
    descripcion?: string;
    tutor?: string;
    docenteId?: number;
    moduloId?: number;
    modalidad: string;
    franja: string;
    fecha?: string;
    hora?: string;
    ubicacion?: string;
    recursoFisicoId?: number | null;
    prioridad?: 'Alta' | 'Media' | 'Baja';
  }): ConsultaUnificada {
    const num = Math.floor(1000 + Math.random() * 9000);
    const radicado = `TUT-${new Date().getFullYear()}-${num}`;
    const fechaIso = obtenerFechaFuturaIso(datos.fecha);
    const horaIso = obtenerHoraPorFranja(datos.franja, datos.hora);
    const fechaFormateada = `${fechaIso} • ${horaIso.substring(0, 5)}`;

    const { docenteObj, cursoMatch, tutorAsignado } = encontrarDocenteParaConsulta(
      datos,
      this.cursos(),
      this.usuarios()
    );

    const rolActual =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('rolActivo') || 'ESTUDIANTE'
        : 'ESTUDIANTE';
    const nombreUsuarioSesion =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('nombreUsuarioActivo') || ''
        : '';
    const correoUsuarioSesion =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('correoActivo') || ''
        : '';
    const docUsuarioSesion =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('identificacionUsuarioActivo') || ''
        : '';
    const idUsuarioSesion =
      typeof localStorage !== 'undefined'
        ? Number(localStorage.getItem('idUsuarioActivo')) || undefined
        : undefined;

    const modalidadFinal = datos.modalidad.includes('Virtual') ? 'Virtual' : 'Presencial';
    const ubicacionFinal =
      datos.ubicacion ||
      (modalidadFinal === 'Virtual' ? 'Sala Virtual Institucional' : 'Por asignar');

    const estudianteIdFinal =
      datos.estudianteId || (rolActual === 'ESTUDIANTE' ? idUsuarioSesion : undefined);
    const docenteIdFinal =
      datos.docenteId || (rolActual === 'DOCENTE' ? idUsuarioSesion : docenteObj?.id || cursoMatch?.docenteId);
    const tutorFinal =
      (rolActual === 'DOCENTE' && nombreUsuarioSesion ? nombreUsuarioSesion : docenteObj?.nombre) ||
      tutorAsignado ||
      'Docente Asignado';

    const nueva: ConsultaUnificada = {
      id: Date.now(),
      radicado,
      estudianteId: estudianteIdFinal,
      estudiante: datos.estudiante || (rolActual === 'ESTUDIANTE' ? nombreUsuarioSesion : 'Estudiante'),
      documento: datos.documento || (rolActual === 'ESTUDIANTE' ? docUsuarioSesion : ''),
      correoEstudiante: datos.correoEstudiante || (rolActual === 'ESTUDIANTE' ? correoUsuarioSesion : ''),
      moduloId: datos.moduloId || cursoMatch?.id,
      asignatura: datos.asignatura || cursoMatch?.asignatura || 'Asignatura General',
      tema: datos.tema,
      descripcion: datos.descripcion || datos.tema,
      docenteId: docenteIdFinal,
      tutor: tutorFinal,
      fechaConsulta: fechaIso,
      horaConsulta: horaIso,
      fecha: fechaFormateada,
      franja: datos.franja || obtenerFranjaDesdeHora(horaIso),
      modalidad: modalidadFinal,
      ubicacion: ubicacionFinal,
      recursoFisicoId: datos.recursoFisicoId || null,
      prioridad: datos.prioridad || 'Media',
      estado: 'Pendiente',
      observaciones: 'Pendiente de revisión y respuesta del docente.',
      asistencia: 0,
      docenteSeleccionado: tutorFinal,
      mensajes: [
        {
          autor: datos.estudiante || (rolActual === 'ESTUDIANTE' ? nombreUsuarioSesion : 'Estudiante'),
          rol: 'ESTUDIANTE',
          fechaHora: fechaFormateada,
          mensaje: datos.descripcion || datos.tema
        }
      ]
    };

    this.guardarUbicacionLocal(`FH_${fechaIso}_${horaIso.substring(0, 5)}`, {
      ubicacion: ubicacionFinal,
      recursoFisicoId: datos.recursoFisicoId || null,
      modalidad: modalidadFinal
    });

    this.consultas.update(lista => [nueva, ...lista]);
    this.consultaActivaId.set(nueva.id);

    if (this.api && this.api.baseUrl) {
      const prioridadApi: PrioridadSolicitudApi =
        nueva.prioridad === 'Alta' ? 'ALTA' : nueva.prioridad === 'Baja' ? 'BAJA' : 'MEDIA';

      const moduloIdPreferido = datos.moduloId || cursoMatch?.id || 1;
      const docenteId = docenteIdFinal || 1;

      const asuntoSeguro =
        nueva.tema.trim().length >= 5
          ? nueva.tema.trim().substring(0, 100)
          : `Tema: ${nueva.tema.trim()}`.substring(0, 100);

      const etiquetaMeta = construirEtiquetaMetaConsulta({
        ubicacion: ubicacionFinal,
        modalidad: modalidadFinal,
        recursoFisicoId: datos.recursoFisicoId || null,
        asignatura: nueva.asignatura,
        fechaAgenda: fechaIso,
        horaAgenda: horaIso,
        estudianteDoc: datos.documento,
        estudianteNombre: datos.estudiante
      });
      const descripcionParaApi = `${etiquetaMeta}${nueva.descripcion}`.trim();

      const vincularEspacioYRefrescar = (creadaRemota?: SolicitudConsultaResponseApi) => {
        if (creadaRemota?.id) {
          this.consultas.update(lista =>
            lista.map(c =>
              c.id === nueva.id
                ? {
                    ...c,
                    id: creadaRemota.id,
                    radicado: creadaRemota.numeroConsulta || c.radicado,
                    estudianteId: creadaRemota.estudianteId || c.estudianteId,
                    docenteId: creadaRemota.docenteId || c.docenteId,
                    estudiante: creadaRemota.nombreCompletoEstudiante || c.estudiante,
                    tutor: creadaRemota.nombreCompletoDocente || c.tutor
                  }
                : c
            )
          );
          this.consultaActivaId.set(creadaRemota.id);
          this.guardarUbicacionLocal(`ID_${creadaRemota.id}`, {
            ubicacion: ubicacionFinal,
            recursoFisicoId: datos.recursoFisicoId || null,
            modalidad: modalidadFinal
          });
          if (datos.recursoFisicoId && (rolActual === 'DOCENTE' || rolActual === 'ADMIN')) {
            this.api
              ?.asignarRecursoFisicoSolicitud(creadaRemota.id, datos.recursoFisicoId)
              .subscribe({
                next: () => this.sincronizarDesdeBackend(),
                error: () => this.sincronizarDesdeBackend()
              });
            return;
          }
        }
        this.sincronizarDesdeBackend();
      };

      // Asegurar que el docente tenga disponibilidad horaria activa y esté vinculado al módulo en la BD
      this.asegurarDisponibilidadDocente(docenteId);
      const cursoDocenteAsignado = this.cursos().find(c => c.id === moduloIdPreferido);
      const estaAsignado = cursoDocenteAsignado?.docentesAsignados?.some(d => d.id === docenteId);
      if (!estaAsignado && (rolActual === 'ADMIN' || rolActual === 'DOCENTE')) {
        this.api.asignarDocenteModulo({ docenteId, moduloId: moduloIdPreferido }).pipe(catchError(() => of(null))).subscribe();
      }

      registrarSolicitudConFallback(
        this.api,
        {
          prioridad: prioridadApi,
          asunto: asuntoSeguro,
          descripcion: descripcionParaApi,
          fechaConsulta: fechaIso,
          horaConsulta: horaIso,
          docenteId,
          moduloId: moduloIdPreferido,
          estudianteId: estudianteIdFinal || null
        },
        this.consultas(),
        this.cursos(),
        {
          onSuccess: (creadaRemota) => vincularEspacioYRefrescar(creadaRemota),
          onErrorFinal: (fallbackInfo) => {
            this.encolarSolicitudPendienteBD({
              localId: nueva.id,
              prioridad: prioridadApi,
              asunto: asuntoSeguro,
              descripcion: descripcionParaApi,
              fechaConsulta: fallbackInfo.slot?.fecha || fechaIso,
              horaConsulta: fallbackInfo.slot?.hora || horaIso,
              docenteId: fallbackInfo.docenteId,
              moduloId: fallbackInfo.moduloId
            });
          }
        }
      );
    }

    return nueva;
  }

  atenderConsultaDocente(
    id: number,
    datos: {
      tipoAtencion: string;
      temaTratado: string;
      observaciones: string;
      asistenciaConfirmada: boolean;
    }
  ): void {
    const ahora = new Date();
    const marcaTiempo = `${String(ahora.getDate()).padStart(2, '0')}/${String(ahora.getMonth() + 1).padStart(2, '0')}/${ahora.getFullYear()} - ${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
    const consultaPrevia = this.consultas().find(c => c.id === id);
    const estabaPendiente = !consultaPrevia || consultaPrevia.estado === 'Pendiente';

    // Persistir de inmediato en la caché de atenciones docentes para asegurar presencia en Historial
    this.guardarAtencionDocenteLocal(id, {
      tipoAtencion: datos.tipoAtencion,
      tema: datos.temaTratado,
      observaciones: datos.observaciones.trim(),
      asistencia: datos.asistenciaConfirmada ? 1 : 0
    });
    if (consultaPrevia?.radicado) {
      this.guardarAtencionDocenteLocal(consultaPrevia.radicado, {
        tipoAtencion: datos.tipoAtencion,
        tema: datos.temaTratado,
        observaciones: datos.observaciones.trim(),
        asistencia: datos.asistenciaConfirmada ? 1 : 0
      });
    }

    this.consultas.update(lista =>
      lista.map(c => {
        if (c.id !== id) return c;
        const nuevoMensaje: MensajeInteraccion = {
          autor: c.tutor,
          rol: 'DOCENTE',
          fechaHora: marcaTiempo,
          mensaje: datos.observaciones.trim()
        };
        return {
          ...c,
          tipoAtencion: datos.tipoAtencion,
          tema: datos.temaTratado,
          observaciones: datos.observaciones.trim(),
          retroalimentacionDocente: datos.observaciones.trim(),
          asistencia: datos.asistenciaConfirmada ? 1 : 0,
          estado: 'Completada',
          mensajes: [...c.mensajes, nuevoMensaje]
        };
      })
    );

    if (this.api && this.api.baseUrl) {
      const obsLimpia = datos.observaciones.trim() || 'Consulta atendida satisfactoriamente por el docente.';
      const contenidoActa = `[ActaDocente | Tipo:${datos.tipoAtencion} | Tema:${datos.temaTratado} | Asistencia:${datos.asistenciaConfirmada ? 1 : 0}] ${obsLimpia}`;

      // El backend exige transición PENDIENTE -> EN_PROCESO antes de comentar y antes de pasar a RESUELTA
      const pasoEnProceso$: Observable<any> = estabaPendiente
        ? this.api
            .cambiarEstadoSolicitud(id, {
              estado: 'EN_PROCESO',
              motivo: 'Inicio de atención docente'
            })
            .pipe(catchError(() => of(null)))
        : of(null);

      pasoEnProceso$
        .pipe(
          switchMap(() =>
            this.api!
              .registrarComentario({
                solicitudConsultaId: id,
                contenido: contenidoActa
              })
              .pipe(catchError(() => of(null)))
          ),
          switchMap(() =>
            this.api!.cambiarEstadoSolicitud(id, {
              estado: 'RESUELTA',
              motivo: obsLimpia
            })
          )
        )
        .subscribe({
          next: () => this.sincronizarDesdeBackend(),
          error: () => this.sincronizarDesdeBackend()
        });
    }
  }

  guardarAtencionDocenteLocal(
    id: number | string,
    datos: {
      tipoAtencion: string;
      tema: string;
      observaciones: string;
      asistencia: number;
    }
  ): void {
    storageGuardarAtencion(id, datos);
  }

  obtenerAtencionesDocenteLocales(): Record<string, any> {
    return storageObtenerAtenciones();
  }

  encolarSolicitudPendienteBD(solicitud: SolicitudPendienteBd): void {
    storageEncolarSolicitud(solicitud);
  }

  reintentarSolicitudesPendientesBD(): void {
    if (
      !this.api ||
      !this.api.baseUrl ||
      !this.api.tieneTokenActivo() ||
      typeof localStorage === 'undefined'
    ) {
      return;
    }
    const cola = storageObtenerSolicitudes();
    if (!cola || cola.length === 0) return;

    const pendientesRestantes: SolicitudPendienteBd[] = [];
    for (const req of cola) {
      this.api
        .registrarSolicitudConsulta({
          prioridad: req.prioridad,
          asunto: req.asunto,
          descripcion: req.descripcion,
          fechaConsulta: req.fechaConsulta,
          horaConsulta: req.horaConsulta,
          docenteId: req.docenteId,
          moduloId: req.moduloId
        })
        .subscribe({
          next: (creadaRemota) => {
            if (creadaRemota?.id) {
              this.consultas.update((lista) =>
                lista.map((c) =>
                  c.id === req.localId
                    ? {
                        ...c,
                        id: creadaRemota.id,
                        radicado: creadaRemota.numeroConsulta || c.radicado
                      }
                    : c
                )
              );
            }
          },
          error: () => {
            pendientesRestantes.push(req);
            storageGuardarSolicitudes(pendientesRestantes);
          }
        });
    }
    storageGuardarSolicitudes(pendientesRestantes);
  }

  reasignarTutor(id: number, nuevoDocente: string): void {
    this.consultas.update(lista =>
      lista.map(c => {
        if (c.id !== id) return c;
        return {
          ...c,
          tutor: nuevoDocente,
          reasignado: true,
          docenteSeleccionado: nuevoDocente,
          estado: c.estado === 'Pendiente' ? 'En proceso' : c.estado
        };
      })
    );

    if (this.api && this.api.baseUrl) {
      const docenteObj = this.usuarios().find(
        u => u.rol === 'DOCENTE' && u.nombre.toLowerCase() === nuevoDocente.toLowerCase()
      );
      if (docenteObj) {
        this.api.reasignarDocenteSolicitud(id, docenteObj.id).subscribe({
          next: () => this.sincronizarDesdeBackend(),
          error: (err) => {
            alert(this.api!.extraerMensajeError(err, 'No se pudo reasignar el docente en el servidor.'));
          }
        });
      }
    }
  }

  actualizarConsulta(id: number, cambios: Partial<ConsultaUnificada>): void {
    const actual = this.consultas().find(c => c.id === id);
    this.consultas.update(lista =>
      lista.map(c => (c.id === id ? { ...c, ...cambios } : c))
    );

    if (this.api && this.api.baseUrl && actual) {
      const asignaturaFinal = cambios.asignatura || actual.asignatura;
      const cursoMatch = this.cursos().find(
        c => c.asignatura.toLowerCase() === asignaturaFinal.toLowerCase()
      );
      const moduloId = cursoMatch?.id || actual.moduloId || 1;
      const prioridadApi: PrioridadSolicitudApi =
        (cambios.prioridad || actual.prioridad) === 'Alta'
          ? 'ALTA'
          : (cambios.prioridad || actual.prioridad) === 'Baja'
            ? 'BAJA'
            : 'MEDIA';

      const fechaConsulta = cambios.fechaConsulta || actual.fechaConsulta || obtenerFechaFuturaIso();
      const horaConsulta = cambios.horaConsulta
        ? obtenerHoraPorFranja('', cambios.horaConsulta)
        : cambios.franja
          ? obtenerHoraPorFranja(cambios.franja)
          : actual.horaConsulta || '09:00:00';

      const ubicacionFinal = cambios.ubicacion || actual.ubicacion;
      const modalidadFinal = cambios.modalidad || actual.modalidad;
      const recursoIdFinal =
        cambios.recursoFisicoId !== undefined ? cambios.recursoFisicoId : actual.recursoFisicoId;
      const etiquetaMeta = construirEtiquetaMetaConsulta({
        ubicacion: ubicacionFinal,
        modalidad: modalidadFinal,
        recursoFisicoId: recursoIdFinal,
        asignatura: asignaturaFinal,
        fechaAgenda: fechaConsulta,
        horaAgenda: horaConsulta
      });
      const parsedPrev = extraerMetadatosDescripcion(cambios.descripcion || actual.descripcion || '');
      const descBase = parsedPrev.descripcionLimpia;

      const temaTexto = (cambios.tema || actual.tema || '').trim();
      const asuntoSeguro =
        temaTexto.length >= 5 ? temaTexto.substring(0, 100) : `Tema: ${temaTexto}`.substring(0, 100);

      this.api
        .actualizarSolicitudConsulta(id, {
          prioridad: prioridadApi,
          asunto: asuntoSeguro,
          descripcion: `${etiquetaMeta}${descBase}`.trim(),
          fechaConsulta,
          horaConsulta,
          moduloId,
          motivo: 'Actualización de solicitud'
        })
        .subscribe({
          next: () => this.sincronizarDesdeBackend(),
          error: (err) => {
            alert(this.api!.extraerMensajeError(err, 'No se pudo actualizar la solicitud en la base de datos.'));
          }
        });
    }
  }

  cambiarEstadoConsulta(
    id: number,
    nuevoEstado: ConsultaUnificada['estado'],
    motivo?: string
  ): void {
    const consultaPrevia = this.consultas().find(c => c.id === id);
    const estabaPendiente = !consultaPrevia || consultaPrevia.estado === 'Pendiente';

    this.consultas.update(lista =>
      lista.map(c => {
        if (c.id !== id) return c;
        return {
          ...c,
          estado: nuevoEstado,
          observaciones: motivo ? motivo : c.observaciones
        };
      })
    );

    if (this.api && this.api.baseUrl) {
      let estadoApi: EstadoSolicitudApi = 'PENDIENTE';
      if (nuevoEstado === 'En proceso' || nuevoEstado === 'Programada') estadoApi = 'EN_PROCESO';
      else if (nuevoEstado === 'Completada' || nuevoEstado === 'Resuelta') estadoApi = 'RESUELTA';
      else if (nuevoEstado === 'Cancelada' || nuevoEstado === 'Inactiva') estadoApi = 'CANCELADA';

      const motivoSeguro =
        motivo && motivo.trim()
          ? motivo.trim()
          : estadoApi === 'CANCELADA'
            ? 'Solicitud cancelada por el usuario.'
            : 'Actualización de estado de la consulta.';

      if (estadoApi === 'RESUELTA' && estabaPendiente) {
        this.api
          .cambiarEstadoSolicitud(id, { estado: 'EN_PROCESO', motivo: 'En proceso de atención' })
          .pipe(
            catchError(() => of(null)),
            switchMap(() =>
              this.api!.cambiarEstadoSolicitud(id, { estado: 'RESUELTA', motivo: motivoSeguro })
            )
          )
          .subscribe({
            next: () => this.sincronizarDesdeBackend(),
            error: () => this.sincronizarDesdeBackend()
          });
        return;
      }

      this.api
        .cambiarEstadoSolicitud(id, { estado: estadoApi, motivo: motivoSeguro })
        .subscribe({
          next: () => this.sincronizarDesdeBackend(),
          error: () => this.sincronizarDesdeBackend()
        });
    }
  }

  agregarComentario(id: number, autor: string, rol: 'ESTUDIANTE' | 'DOCENTE' | 'ADMIN', texto: string): void {
    if (!texto.trim()) return;
    const ahora = new Date();
    const fechaHora = `${String(ahora.getDate()).padStart(2, '0')}/${String(ahora.getMonth() + 1).padStart(2, '0')}/${ahora.getFullYear()} - ${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
    const consultaPrevia = this.consultas().find(c => c.id === id);
    const estabaPendiente = consultaPrevia?.estado === 'Pendiente';

    this.consultas.update(lista =>
      lista.map(c => {
        if (c.id !== id) return c;
        return {
          ...c,
          estado: estabaPendiente && (rol === 'DOCENTE' || rol === 'ADMIN') ? 'En proceso' : c.estado,
          observaciones: rol === 'DOCENTE' ? texto.trim() : c.observaciones,
          mensajes: [
            ...c.mensajes,
            {
              autor,
              rol,
              fechaHora,
              mensaje: texto.trim()
            }
          ]
        };
      })
    );

    if (this.api && this.api.baseUrl) {
      // El backend solo permite comentar cuando la solicitud está EN_PROCESO
      const prePaso$: Observable<any> =
        estabaPendiente && (rol === 'DOCENTE' || rol === 'ADMIN')
          ? this.api
              .cambiarEstadoSolicitud(id, {
                estado: 'EN_PROCESO',
                motivo: 'En proceso de atención'
              })
              .pipe(catchError(() => of(null)))
          : of(null);

      prePaso$
        .pipe(
          switchMap(() =>
            this.api!.registrarComentario({
              solicitudConsultaId: id,
              contenido: texto.trim()
            })
          )
        )
        .subscribe({
          next: () => this.cargarComentariosDeConsulta(id),
          error: (err) => {
            alert(this.api!.extraerMensajeError(err, 'No se pudo registrar el comentario (la consulta debe estar En Proceso).'));
          }
        });
    }
  }

  calificarConsulta(idSolicitud: number, puntaje: number, comentario?: string): void {
    const fechaIso = new Date().toISOString();
    const resumenCalif: CalificacionResumenSolicitudApi = {
      puntaje,
      comentario: comentario?.trim() || null,
      fecha: fechaIso
    };

    this.consultas.update((lista) =>
      lista.map((c) => (c.id === idSolicitud ? { ...c, calificacion: resumenCalif } : c))
    );

    if (this.api && this.api.baseUrl) {
      this.api
        .calificarSolicitud(idSolicitud, {
          puntaje,
          comentario: comentario?.trim() || null
        })
        .subscribe({
          next: () => this.sincronizarDesdeBackend(),
          error: (err) => {
            alert(
              this.api!.extraerMensajeError(
                err,
                'No se pudo registrar la calificación de la consulta.'
              )
            );
          }
        });
    }
  }

  /**
   * Sincroniza usuarios, programas, tipos de documento, periodos académicos,
   * módulos (asignaturas), docentes por módulo, disponibilidad docente
   * y solicitudes de consulta desde la API respetando los permisos del rol activo.
   */
  sincronizarDesdeBackend(): void {
    if (!this.api || !this.api.baseUrl || !this.api.tieneTokenActivo()) return;

    const rolActual =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('rolActivo') || 'ESTUDIANTE'
        : 'ESTUDIANTE';
    const idUsuarioActivo =
      typeof localStorage !== 'undefined'
        ? Number(localStorage.getItem('idUsuarioActivo') || 0)
        : 0;

    // Cargar catálogos transversales (/programas, /tipos-documento, /periodos-academicos, /notificaciones)
    this.api.listarProgramas().subscribe({
      next: (progs) => this.programas.set(progs || []),
      error: () => {}
    });

    this.api.listarTiposDocumento(rolActual === 'ADMIN').subscribe({
      next: (tipos) => {
        if (tipos && tipos.length > 0) {
          this.tiposDocumento.set(tipos);
        }
      },
      error: () => {}
    });

    this.api.listarPeriodosAcademicos(rolActual === 'ADMIN').subscribe({
      next: (periodos) => {
        const listaPeriodos = periodos || [];
        this.periodosAcademicos.set(listaPeriodos);
        if (rolActual === 'ADMIN') {
          const anioActual = new Date().getFullYear();
          const hoyIso = new Date().toISOString().substring(0, 10);
          const tieneVigente = listaPeriodos.some(
            (p) => p.estado && p.fechaInicio <= hoyIso && p.fechaFin >= hoyIso
          );
          if (!tieneVigente) {
            this.api!
              .crearPeriodoAcademico({
                nombre: `Periodo ${anioActual}`,
                fechaInicio: `${anioActual}-01-01`,
                fechaFin: `${anioActual}-12-31`
              })
              .pipe(catchError(() => of(null)))
              .subscribe();
          }
        }
      },
      error: () => {}
    });

    this.api.listarNotificaciones().subscribe({
      next: (notifs) => this.notificaciones.set(notifs || []),
      error: () => {}
    });

    this.api.listarDisponibilidadDocente(undefined, false).subscribe({
      next: (slots) => this.disponibilidadesDocentes.set(slots || []),
      error: () => {}
    });

    if (rolActual === 'DOCENTE' && idUsuarioActivo > 0) {
      this.asegurarDisponibilidadDocente(idUsuarioActivo);
    }

    this.reintentarSolicitudesPendientesBD();

    // 1. Obtener Usuarios (si es ADMIN) o Docentes públicos (si es ESTUDIANTE/DOCENTE)
    const usuariosObs =
      rolActual === 'ADMIN'
        ? this.api.listarUsuarios(true).pipe(
            map((usuariosRemotos: UsuarioResponseApi[]) =>
              (usuariosRemotos || []).map(mapearUsuarioApiAFront)
            ),
            catchError(() =>
              this.api!.listarDocentes().pipe(
                map((docentes: DocenteResumenApi[]) =>
                  (docentes || []).map(mapearDocenteApiAFront)
                ),
                catchError(() => of([] as UsuarioSistema[]))
              )
            )
          )
        : this.api.listarDocentes().pipe(
            map((docentes: DocenteResumenApi[]) =>
              (docentes || []).map(mapearDocenteApiAFront)
            ),
            catchError(() => of([] as UsuarioSistema[]))
          );

    const modulosObs = this.api
      .listarModulosAsignaturas()
      .pipe(catchError(() => of([] as ModuloResponseApi[])));

    const docentesModulosObs =
      rolActual === 'ADMIN'
        ? this.api
            .listarDocentesModulos(true)
            .pipe(catchError(() => of([] as DocenteModuloResponseApi[])))
        : of([] as DocenteModuloResponseApi[]);

    forkJoin({
      usuariosMapeados: usuariosObs,
      modulosRemotos: modulosObs,
      asignacionesAdmin: docentesModulosObs
    }).subscribe(({ usuariosMapeados, modulosRemotos, asignacionesAdmin }) => {
      this.usuarios.set(usuariosMapeados);

      const docentesActivos = usuariosMapeados.filter(
        (u) => u.rol === 'DOCENTE' && u.estado === 'Activo'
      );

      if (rolActual === 'ADMIN') {
        for (const doc of docentesActivos) {
          this.asegurarDisponibilidadDocente(doc.id);
        }
      }

      if (modulosRemotos.length === 0) {
        this.cursos.set([]);
      } else {
        const peticionesPorModulo = modulosRemotos.map((m) =>
          this.api!.listarDocentesPorModulo(m.id).pipe(
            catchError(() => of([] as DocenteResumenApi[])),
            map((docentesModulo) => ({ modulo: m, docentes: docentesModulo || [] }))
          )
        );

        forkJoin(peticionesPorModulo).subscribe((resultados) => {
          const docentesGenerales = usuariosMapeados.filter((u) => u.rol === 'DOCENTE');
          const cursosMapeados: CursoSistema[] = resultados.map(({ modulo, docentes }, idx) => {
            if (rolActual === 'ADMIN' && modulo.estado) {
              for (const doc of docentesActivos) {
                const yaVinculado = docentes.some((d) => d.id === doc.id);
                if (!yaVinculado) {
                  this.api!
                    .asignarDocenteModulo({ docenteId: doc.id, moduloId: modulo.id })
                    .pipe(catchError(() => of(null)))
                    .subscribe();
                }
              }
            }
            return mapearModuloApiAFront(modulo, docentes, asignacionesAdmin, docentesGenerales, idx);
          });
          this.cursos.set(cursosMapeados);
        });
      }

      // 3. Sincronizar Solicitudes de Consulta (/solicitudes-consultas)
      this.api!.listarSolicitudesConsulta().subscribe({
        next: (solicitudesRemotas: SolicitudConsultaResponseApi[]) => {
          const lista = solicitudesRemotas || [];
          const atencionesDocente = this.obtenerAtencionesDocenteLocales();
          const mapeadas: ConsultaUnificada[] = lista.map((s) => {
            const metaDesc = extraerMetadatosDescripcion(s.descripcion || '');
            const fechaReal = metaDesc.fechaAgenda || s.fechaConsulta;
            const horaReal = metaDesc.horaAgenda || s.horaConsulta;
            const ubicGuardada = this.obtenerUbicacionLocal(s.id, fechaReal, horaReal);

            if (
              !s.recursoFisicoId &&
              (metaDesc.recursoId || ubicGuardada?.recursoFisicoId) &&
              (s.estado === 'PENDIENTE' || s.estado === 'EN_PROCESO') &&
              (rolActual === 'ADMIN' || (rolActual === 'DOCENTE' && s.docenteId === idUsuarioActivo))
            ) {
              const recId = metaDesc.recursoId || ubicGuardada?.recursoFisicoId;
              if (recId) {
                this.api!.asignarRecursoFisicoSolicitud(s.id, recId).pipe(catchError(() => of(null))).subscribe();
              }
            }

            const c = mapearSolicitudApiAFront(s, usuariosMapeados, ubicGuardada);
            const atencionGuardada =
              atencionesDocente[String(c.id)] ||
              (c.radicado ? atencionesDocente[c.radicado] : undefined);
            if (atencionGuardada) {
              return {
                ...c,
                estado: 'Completada',
                tipoAtencion: atencionGuardada.tipoAtencion || c.tipoAtencion,
                tema: atencionGuardada.tema || c.tema,
                observaciones: atencionGuardada.observaciones || c.observaciones,
                retroalimentacionDocente:
                  atencionGuardada.observaciones || c.retroalimentacionDocente,
                asistencia:
                  atencionGuardada.asistencia !== undefined ? atencionGuardada.asistencia : 1
              };
            }
            return c;
          });

          // Preservar consultas locales no sincronizadas (por ejemplo ante fallo 503 del microservicio)
          const localesNoRemotas = this.consultas().filter(
            (c) => !mapeadas.some((m) => m.id === c.id || m.radicado === c.radicado)
          );

          const finalConsultas = [...mapeadas, ...localesNoRemotas];
          this.consultas.set(finalConsultas);

          const activaId = this.consultaActivaId() || mapeadas[0]?.id;
          if (activaId) {
            this.consultaActivaId.set(activaId);
            this.cargarComentariosDeConsulta(activaId);
          }
        },
        error: () => {}
      });
    });
  }
}
