import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import {
  ApiPrincipal,
  CalificacionResumenSolicitudApi,
  ComentarioResponseApi,
  DisponibilidadResponseApi,
  DocenteModuloResponseApi,
  DocenteResumenApi,
  EstadoSolicitudApi,
  ModuloResponseApi,
  NotificacionResponseApi,
  PeriodoResponseApi,
  ProgAcademicoResponseApi,
  SolicitudConsultaResponseApi,
  TipoDocumentoResponseApi,
  UsuarioResponseApi
} from './api-principal';
export * from '../models/consulta.models';
import {
  MensajeInteraccion,
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
  limpiarNombreAsignatura,
  normalizarCapitalizacionAsignatura,
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
import {
  aPrioridadApi,
  asuntoSeguro,
  escribirStorage,
  fechaIsoLocal,
  leerStorage,
  marcaTiempo,
  sesion
} from '../utils/comun';

@Injectable({
  providedIn: 'root'
})
export class Data {
  private readonly api = inject(ApiPrincipal, { optional: true });

  /** Observer que vuelve a sincronizar con el backend tanto si la petición termina bien como si falla. */
  private readonly resincronizar = {
    next: () => this.sincronizarDesdeBackend(),
    error: () => this.sincronizarDesdeBackend()
  };

  /** true si hay API configurada para persistir en el backend. */
  private get apiDisponible(): boolean {
    return !!this.api?.baseUrl;
  }

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
    if (!this.apiDisponible || !docenteId) return;
    asegurarDisponibilidadDocenteHelper(this.api!, docenteId, this.cursos(), sesion.rol());
  }

  // Consulta activa seleccionada para ver detalle o atender entre vistas
  consultaActivaId = signal<number>(Number(leerStorage(STORAGE_KEY_CONSULTA_ACTIVA)) || 0);

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
    escribirStorage(STORAGE_KEY_CONSULTA_ACTIVA, String(id));
    this.cargarComentariosDeConsulta(id);
  }

  cargarComentariosDeConsulta(idSolicitud: number): void {
    if (!this.apiDisponible || !idSolicitud) return;

    // Verificar si el usuario actual es participante de esta consulta
    const consulta = this.consultas().find(c => c.id === idSolicitud);
    const idUsuarioActivo = sesion.idUsuario();

    if (consulta && idUsuarioActivo) {
      const esParticipante =
        consulta.estudianteId === idUsuarioActivo ||
        consulta.docenteId === idUsuarioActivo;
      // En el backend FastAPI, /comentarios/solicitud/{id} rechaza con 400 si el usuario no es participante
      if (!esParticipante) return;
    }

    this.api!.listarComentariosPorSolicitud(idSolicitud).subscribe({
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

    const rolActual = sesion.rol();
    const esEstudiante = rolActual === 'ESTUDIANTE';
    const nombreUsuarioSesion = sesion.nombre();
    const idUsuarioSesion = sesion.idUsuario() || undefined;
    const nombreEstudiante = datos.estudiante || (esEstudiante ? nombreUsuarioSesion : 'Estudiante');
    const recursoFisicoId = datos.recursoFisicoId || null;

    const modalidadFinal = datos.modalidad.includes('Virtual') ? 'Virtual' : 'Presencial';
    const ubicacionFinal =
      datos.ubicacion ||
      (modalidadFinal === 'Virtual' ? 'Sala Virtual Institucional' : 'Por asignar');

    const estudianteIdFinal = datos.estudianteId || (esEstudiante ? idUsuarioSesion : undefined);
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
      estudiante: nombreEstudiante,
      documento: datos.documento || (esEstudiante ? sesion.identificacion() : ''),
      correoEstudiante: datos.correoEstudiante || (esEstudiante ? sesion.correo() : ''),
      moduloId: datos.moduloId || cursoMatch?.id,
      asignatura: limpiarNombreAsignatura(datos.asignatura || cursoMatch?.asignatura || 'Constitución Política'),
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
      recursoFisicoId,
      prioridad: datos.prioridad || 'Media',
      estado: 'Pendiente',
      observaciones: 'Pendiente de revisión y respuesta del docente.',
      asistencia: 0,
      docenteSeleccionado: tutorFinal,
      mensajes: [
        {
          autor: nombreEstudiante,
          rol: 'ESTUDIANTE',
          fechaHora: fechaFormateada,
          mensaje: datos.descripcion || datos.tema
        }
      ]
    };

    const infoUbicacion = { ubicacion: ubicacionFinal, recursoFisicoId, modalidad: modalidadFinal };
    storageGuardarUbicacion(`FH_${fechaIso}_${horaIso.substring(0, 5)}`, infoUbicacion);

    this.consultas.update(lista => [nueva, ...lista]);
    this.consultaActivaId.set(nueva.id);

    if (this.api && this.api.baseUrl) {
      const prioridadApi = aPrioridadApi(nueva.prioridad);
      const moduloIdPreferido = datos.moduloId || cursoMatch?.id || 1;
      const docenteId = docenteIdFinal || 1;
      const asunto = asuntoSeguro(nueva.tema);

      const etiquetaMeta = construirEtiquetaMetaConsulta({
        ubicacion: ubicacionFinal,
        modalidad: modalidadFinal,
        recursoFisicoId,
        asignatura: nueva.asignatura,
        fechaAgenda: fechaIso,
        horaAgenda: horaIso,
        estudianteDoc: nueva.documento,
        estudianteNombre: nueva.estudiante
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
                    documento: c.documento || creadaRemota.identificacionEstudiante || '',
                    tutor: creadaRemota.nombreCompletoDocente || c.tutor
                  }
                : c
            )
          );
          this.consultaActivaId.set(creadaRemota.id);
          storageGuardarUbicacion(`ID_${creadaRemota.id}`, infoUbicacion);
          if (recursoFisicoId && (rolActual === 'DOCENTE' || rolActual === 'ADMIN')) {
            this.api
              ?.asignarRecursoFisicoSolicitud(creadaRemota.id, recursoFisicoId)
              .subscribe(this.resincronizar);
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
          asunto,
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
            storageEncolarSolicitud({
              localId: nueva.id,
              prioridad: prioridadApi,
              asunto,
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
    const fechaHora = marcaTiempo();
    const consultaPrevia = this.consultas().find(c => c.id === id);
    const estabaPendiente = !consultaPrevia || consultaPrevia.estado === 'Pendiente';
    const observaciones = datos.observaciones.trim();
    const asistencia = datos.asistenciaConfirmada ? 1 : 0;

    // Persistir de inmediato en la caché de atenciones docentes para asegurar presencia en Historial
    const atencion = { tipoAtencion: datos.tipoAtencion, tema: datos.temaTratado, observaciones, asistencia };
    storageGuardarAtencion(id, atencion);
    if (consultaPrevia?.radicado) {
      storageGuardarAtencion(consultaPrevia.radicado, atencion);
    }

    this.consultas.update(lista =>
      lista.map(c => {
        if (c.id !== id) return c;
        const nuevoMensaje: MensajeInteraccion = {
          autor: c.tutor,
          rol: 'DOCENTE',
          fechaHora,
          mensaje: observaciones
        };
        return {
          ...c,
          tipoAtencion: datos.tipoAtencion,
          tema: datos.temaTratado,
          observaciones,
          retroalimentacionDocente: observaciones,
          asistencia,
          estado: 'Completada',
          mensajes: [...c.mensajes, nuevoMensaje]
        };
      })
    );

    if (this.api && this.api.baseUrl) {
      const obsLimpia = observaciones || 'Consulta atendida satisfactoriamente por el docente.';
      const contenidoActa = `[ActaDocente | Tipo:${datos.tipoAtencion} | Tema:${datos.temaTratado} | Asistencia:${asistencia}] ${obsLimpia}`;

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
        .subscribe(this.resincronizar);
    }
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
      const asignaturaFinal = limpiarNombreAsignatura(cambios.asignatura || actual.asignatura);
      const cursoMatch = this.cursos().find(
        c => c.asignatura.toLowerCase() === asignaturaFinal.toLowerCase()
      );
      const moduloId = cursoMatch?.id || actual.moduloId || 1;

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
      const descBase = extraerMetadatosDescripcion(cambios.descripcion || actual.descripcion || '').descripcionLimpia;

      this.api
        .actualizarSolicitudConsulta(id, {
          prioridad: aPrioridadApi(cambios.prioridad || actual.prioridad),
          asunto: asuntoSeguro(cambios.tema || actual.tema || ''),
          descripcion: `${etiquetaMeta}${descBase}`.trim(),
          fechaConsulta,
          horaConsulta,
          moduloId,
          motivo: 'Actualización de solicitud',
          recursoFisicoId: recursoIdFinal,
          recurso_fisico_id: recursoIdFinal
        })
        .subscribe({
          next: () => this.sincronizarDesdeBackend(),
          error: (err) => {
            alert(this.api!.extraerMensajeError(err, 'No se pudo actualizar la solicitud en la base de datos.'));
          }
        });
    }
  }

  asignarEspacioConsulta(id: number, recursoFisicoId: number, ubicacion: string): void {
    const actual = this.consultas().find(c => c.id === id);
    if (!actual) return;

    this.consultas.update(lista =>
      lista.map(c => (c.id === id ? { ...c, recursoFisicoId, ubicacion } : c))
    );

    const infoUbicacion = {
      ubicacion,
      recursoFisicoId,
      modalidad: actual.modalidad || 'Presencial'
    };
    storageGuardarUbicacion(`ID_${id}`, infoUbicacion);
    if (actual.radicado) {
      storageGuardarUbicacion(actual.radicado, infoUbicacion);
    }
    const fecha = actual.fechaConsulta || actual.fecha?.split(' ')[0] || '';
    const hora = actual.horaConsulta?.substring(0, 5) || '09:00';
    if (fecha && hora) {
      storageGuardarUbicacion(`FH_${fecha}_${hora}`, infoUbicacion);
    }

    // Persistir en la base de datos vía PUT (actualiza descripcion con etiqueta meta y recursoFisicoId)
    this.actualizarConsulta(id, {
      ubicacion,
      recursoFisicoId
    });

    // Persistir clave foránea en la base de datos vía PATCH /recurso-fisico
    if (this.api && this.api.baseUrl) {
      this.api.asignarRecursoFisicoSolicitud(id, recursoFisicoId).subscribe({
        next: () => this.sincronizarDesdeBackend(),
        error: (err) => {
          console.warn('Nota en PATCH recurso-fisico (actualizado vía PUT):', err);
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
      lista.map(c => (c.id === id ? { ...c, estado: nuevoEstado, observaciones: motivo || c.observaciones } : c))
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
          .subscribe(this.resincronizar);
        return;
      }

      this.api
        .cambiarEstadoSolicitud(id, { estado: estadoApi, motivo: motivoSeguro })
        .subscribe(this.resincronizar);
    }
  }

  agregarComentario(id: number, autor: string, rol: 'ESTUDIANTE' | 'DOCENTE' | 'ADMIN', texto: string): void {
    const mensaje = texto.trim();
    if (!mensaje) return;
    const fechaHora = marcaTiempo();
    // El backend solo permite comentar cuando la solicitud está EN_PROCESO
    const pasarAEnProceso =
      this.consultas().find(c => c.id === id)?.estado === 'Pendiente' && (rol === 'DOCENTE' || rol === 'ADMIN');

    this.consultas.update(lista =>
      lista.map(c =>
        c.id !== id
          ? c
          : {
              ...c,
              estado: pasarAEnProceso ? 'En proceso' : c.estado,
              observaciones: rol === 'DOCENTE' ? mensaje : c.observaciones,
              mensajes: [...c.mensajes, { autor, rol, fechaHora, mensaje }]
            }
      )
    );

    if (this.api && this.api.baseUrl) {
      const prePaso$: Observable<any> =
        pasarAEnProceso
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
            this.api!.registrarComentario({ solicitudConsultaId: id, contenido: mensaje })
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
    const comentarioLimpio = comentario?.trim() || null;
    const resumenCalif: CalificacionResumenSolicitudApi = {
      puntaje,
      comentario: comentarioLimpio,
      fecha: new Date().toISOString()
    };

    this.consultas.update((lista) =>
      lista.map((c) => (c.id === idSolicitud ? { ...c, calificacion: resumenCalif } : c))
    );

    if (this.api && this.api.baseUrl) {
      this.api
        .calificarSolicitud(idSolicitud, { puntaje, comentario: comentarioLimpio })
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

    const rolActual = sesion.rol();
    const idUsuarioActivo = sesion.idUsuario();

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

    // 1. Obtener Usuarios (catálogo completo de estudiantes y docentes de la BD)
    const docentesObs = this.api.listarDocentes().pipe(
      map((docentes: DocenteResumenApi[]) => (docentes || []).map(mapearDocenteApiAFront)),
      catchError(() => of([] as UsuarioSistema[]))
    );
    const usuariosObs = this.api.listarUsuarios(true).pipe(
      map((usuariosRemotos: UsuarioResponseApi[]) =>
        (usuariosRemotos || []).map(mapearUsuarioApiAFront)
      ),
      catchError(() => docentesObs)
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
          const atencionesDocente = storageObtenerAtenciones();
          const mapeadas: ConsultaUnificada[] = lista.map((s) => {
            const metaDesc = extraerMetadatosDescripcion(s.descripcion || '');
            const fechaReal = metaDesc.fechaAgenda || s.fechaConsulta;
            const horaReal = metaDesc.horaAgenda || s.horaConsulta;
            const ubicGuardada = storageObtenerUbicacion(s.id, fechaReal, horaReal);

            if (
              !s.recursoFisicoId &&
              (metaDesc.recursoId || ubicGuardada?.recursoFisicoId) &&
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
