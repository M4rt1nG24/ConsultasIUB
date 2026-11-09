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

export interface MensajeInteraccion {
  id?: number;
  autor: string;
  rol: 'ESTUDIANTE' | 'DOCENTE' | 'ADMIN';
  fechaHora: string;
  mensaje: string;
  adjuntos?: string[];
}

export interface ConsultaUnificada {
  id: number;
  radicado: string;
  fechaCreacion?: string;
  estudianteId?: number;
  estudiante: string;
  documento: string;
  correoEstudiante: string;
  nombrePrograma?: string;
  moduloId?: number;
  asignatura: string;
  tema: string;
  descripcion: string;
  docenteId?: number;
  identificacionDocente?: string | null;
  tutor: string;
  fechaConsulta?: string;
  horaConsulta?: string;
  fecha: string;
  franja: string;
  modalidad: string;
  ubicacion: string;
  recursoFisicoId?: number | null;
  prioridad: 'Alta' | 'Media' | 'Baja';
  estado: 'Pendiente' | 'Programada' | 'En proceso' | 'Completada' | 'Resuelta' | 'Cancelada' | 'Inactiva';
  tipoAtencion: string;
  observaciones: string;
  retroalimentacionDocente?: string | null;
  calificacion?: CalificacionResumenSolicitudApi | null;
  asistencia: number;
  folioAuditoria: string;
  reasignado: boolean;
  docenteSeleccionado?: string;
  mensajes: MensajeInteraccion[];
}

export interface CursoSistema {
  id: number;
  asignacionId?: number;
  codigo: string;
  asignatura: string;
  descripcion?: string;
  docente: string;
  docenteId?: number;
  docentesAsignados?: DocenteResumenApi[];
  estado: 'Activo' | 'Inactivo';
}

export interface UsuarioSistema {
  id: number;
  tipoIdentificacion?: 'CC' | 'TI' | string;
  identificacion?: string;
  tipoDocumentoId?: number | null;
  tipoDocumentoSigla?: string | null;
  nombre: string;
  nombreSolo?: string;
  apellido?: string;
  email: string;
  rol: 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE';
  estado: 'Activo' | 'Inactivo';
  programaId?: number | null;
  programa: string;
  fechaCreacion?: string;
}

const STORAGE_KEY_CONSULTAS = 'iub_consultas_api_cache';
const STORAGE_KEY_CURSOS = 'iub_cursos_api_cache';
const STORAGE_KEY_USUARIOS = 'iub_usuarios_api_cache';
const STORAGE_KEY_CONSULTA_ACTIVA = 'iub_consulta_activa_id';

@Injectable({
  providedIn: 'root'
})
export class Data {
  private readonly api = inject(ApiPrincipal, { optional: true });

  consultas = signal<ConsultaUnificada[]>(this.cargarCache(STORAGE_KEY_CONSULTAS, []));
  cursos = signal<CursoSistema[]>(this.cargarCache(STORAGE_KEY_CURSOS, []));
  usuarios = signal<UsuarioSistema[]>(this.cargarCache(STORAGE_KEY_USUARIOS, []));
  programas = signal<ProgAcademicoResponseApi[]>([]);
  tiposDocumento = signal<TipoDocumentoResponseApi[]>([]);
  periodosAcademicos = signal<PeriodoResponseApi[]>([]);
  disponibilidadesDocentes = signal<DisponibilidadResponseApi[]>([]);
  notificaciones = signal<NotificacionResponseApi[]>([]);

  constructor() {
    effect(() => {
      const listaConsultas = this.consultas();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_CONSULTAS, JSON.stringify(listaConsultas));
      }
    });
    effect(() => {
      const listaCursos = this.cursos();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_CURSOS, JSON.stringify(listaCursos));
      }
    });
    effect(() => {
      const listaUsuarios = this.usuarios();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_USUARIOS, JSON.stringify(listaUsuarios));
      }
    });
  }

  private cargarCache<T>(key: string, fallback: T): T {
    try {
      if (typeof localStorage === 'undefined') return fallback;
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T) : fallback;
    } catch {
      return fallback;
    }
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

    this.api
      .listarDisponibilidadDocente(docenteId, true)
      .pipe(catchError(() => of([] as DisponibilidadResponseApi[])))
      .subscribe((slots) => {
        const listaSlots = slots || [];
        if (listaSlots.length === 0) {
          for (let dia = 1; dia <= 6; dia++) {
            this.api!
              .crearDisponibilidadDocente({
                docenteId,
                diaSemana: dia,
                horaInicio: '07:00:00',
                horaFin: '21:00:00'
              })
              .pipe(catchError(() => of(null)))
              .subscribe();
          }
        }
      });

    if (rolActual === 'ADMIN') {
      const modulosActuales = this.cursos();
      for (const curso of modulosActuales) {
        const yaAsignado = curso.docentesAsignados?.some((d) => d.id === docenteId);
        if (!yaAsignado && curso.id > 0) {
          this.api
            .asignarDocenteModulo({
              docenteId,
              moduloId: curso.id
            })
            .pipe(catchError(() => of(null)))
            .subscribe();
        }
      }
    }
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

  private extraerMetadatosActaComentario(rawContenido: string): {
    esActa: boolean;
    tipoAtencion?: string;
    tema?: string;
    asistencia?: number;
    textoLimpio: string;
  } {
    const texto = (rawContenido || '').trim();
    const match = texto.match(
      /^\[ActaDocente\s*\|\s*Tipo:([^\]|]+)\|\s*Tema:([^\]|]+)\|\s*Asistencia:([01])\]\s*(.*)$/is
    );
    if (!match) {
      return { esActa: false, textoLimpio: texto };
    }
    return {
      esActa: true,
      tipoAtencion: match[1].trim(),
      tema: match[2].trim(),
      asistencia: Number(match[3]),
      textoLimpio: match[4].trim() || 'Consulta atendida satisfactoriamente por el docente.'
    };
  }

  private extraerMetadatosDescripcion(rawDesc: string): {
    descripcionLimpia: string;
    ubicacion: string | null;
    modalidad: string | null;
    recursoId: number | null;
    asignatura: string | null;
    fechaAgenda: string | null;
    horaAgenda: string | null;
  } {
    let texto = (rawDesc || '').trim();
    let ubicacion: string | null = null;
    let modalidad: string | null = null;
    let recursoId: number | null;
    recursoId = null;
    let asignatura: string | null = null;
    let fechaAgenda: string | null = null;
    let horaAgenda: string | null = null;

    const matchBloque = texto.match(/^\[((?:Espacio|Modalidad|Asignatura|Agenda):[^\]]+)\]\s*/i);
    if (matchBloque) {
      const interior = matchBloque[1];
      const segmentos = interior.split('|').map((seg) => seg.trim());
      for (const seg of segmentos) {
        if (/^Espacio:/i.test(seg)) {
          ubicacion = seg.replace(/^Espacio:\s*/i, '').trim() || null;
        } else if (/^Modalidad:/i.test(seg)) {
          modalidad = seg.replace(/^Modalidad:\s*/i, '').trim() || null;
        } else if (/^RecursoID:/i.test(seg)) {
          const idNum = Number(seg.replace(/^RecursoID:\s*/i, '').trim());
          if (!Number.isNaN(idNum) && idNum > 0) recursoId = idNum;
        } else if (/^Asignatura:/i.test(seg)) {
          asignatura = seg.replace(/^Asignatura:\s*/i, '').trim() || null;
        } else if (/^Agenda:/i.test(seg)) {
          const valAgenda = seg.replace(/^Agenda:\s*/i, '').trim();
          const [f, h] = valAgenda.split('_');
          if (f && /^\d{4}-\d{2}-\d{2}$/.test(f)) fechaAgenda = f;
          if (h && /^\d{2}:\d{2}/.test(h)) horaAgenda = h.length === 5 ? `${h}:00` : h;
        }
      }
      texto = texto.slice(matchBloque[0].length).trim() || texto;
    }

    return {
      descripcionLimpia: texto,
      ubicacion,
      modalidad,
      recursoId,
      asignatura,
      fechaAgenda,
      horaAgenda
    };
  }

  cargarComentariosDeConsulta(idSolicitud: number): void {
    if (!this.api || !this.api.baseUrl || !idSolicitud) return;

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

              const metaActa = this.extraerMetadatosActaComentario(com.contenido);
              if (metaActa.esActa) {
                if (metaActa.tipoAtencion) tipoAtencionDetectado = metaActa.tipoAtencion;
                if (metaActa.tema) temaDetectado = metaActa.tema;
                if (metaActa.asistencia !== undefined) asistenciaDetectada = metaActa.asistencia;
              }

              return {
                id: com.id,
                autor: com.nombreAutor,
                rol: esDocente ? 'DOCENTE' : esEstudiante ? 'ESTUDIANTE' : 'ADMIN',
                fechaHora: this.formatearFechaHora(com.fechaCreacion),
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

  private formatearFechaHora(iso: string): string {
    if (!iso) return '';
    return iso.replace('T', ' ').substring(0, 16);
  }

  private obtenerFranjaDesdeHora(hora: string): string {
    const h = parseInt((hora || '09:00').split(':')[0], 10);
    if (h < 12) return 'Mañana (08:00 AM - 12:00 PM)';
    if (h < 18) return 'Tarde (02:00 PM - 06:00 PM)';
    return 'Noche (06:00 PM - 09:00 PM)';
  }

  private obtenerHoraPorFranja(franja: string, horaExplicita?: string): string {
    if (horaExplicita && /^\d{2}:\d{2}/.test(horaExplicita.trim())) {
      const h = horaExplicita.trim();
      return h.length === 5 ? `${h}:00` : h.substring(0, 8);
    }
    const f = (franja || '').toLowerCase();
    if (f.includes('08:00 am - 10:00')) return '08:00:00';
    if (f.includes('10:00 am - 12:00')) return '10:00:00';
    if (f.includes('02:00 pm - 04:00')) return '14:00:00';
    if (f.includes('04:00 pm - 06:00')) return '16:00:00';
    if (f.includes('mañana') || f.includes('08:00') || f.includes('10:00')) {
      return '09:00:00';
    }
    if (f.includes('noche') || f.includes('06:00 pm')) {
      return '18:00:00';
    }
    return '14:00:00';
  }

  private obtenerFechaFuturaIso(fechaInput?: string): string {
    if (fechaInput && /^\d{4}-\d{2}-\d{2}/.test(fechaInput.trim())) {
      return fechaInput.trim().substring(0, 10);
    }
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    return `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, '0')}-${String(manana.getDate()).padStart(2, '0')}`;
  }

  private guardarUbicacionLocal(
    clave: string,
    info: { ubicacion: string; recursoFisicoId?: number | null; modalidad: string }
  ): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem('iub_ubicaciones_consulta_v1');
      const mapa = raw ? JSON.parse(raw) : {};
      mapa[clave] = info;
      localStorage.setItem('iub_ubicaciones_consulta_v1', JSON.stringify(mapa));
    } catch {
      // Ignorar errores de storage
    }
  }

  private obtenerUbicacionLocal(
    id: number,
    fechaConsulta: string,
    horaConsulta: string
  ): { ubicacion: string; recursoFisicoId?: number | null; modalidad: string } | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem('iub_ubicaciones_consulta_v1');
      if (!raw) return null;
      const mapa = JSON.parse(raw);
      return (
        mapa[`ID_${id}`] ||
        mapa[`FH_${fechaConsulta}_${(horaConsulta || '').substring(0, 5)}`] ||
        null
      );
    } catch {
      return null;
    }
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
    if (!salonNombre || !salonNombre.trim()) {
      return {
        disponible: false,
        mensaje: 'Selecciona un espacio o salón de la sede para verificar su disponibilidad.'
      };
    }

    const fechaLimpia = this.obtenerFechaFuturaIso(fechaConsulta);
    const horaIso = this.obtenerHoraPorFranja(horaOFranja, horaOFranja);
    const horaCorta = horaIso.substring(0, 5);
    const salonLimpio = salonNombre.toLowerCase().trim();
    const sedeLimpia = (sedeNombre || '').toLowerCase().trim();

    const conflicto = this.consultas().find(c => {
      if (excluirConsultaId && c.id === excluirConsultaId) return false;
      if (c.estado === 'Cancelada' || c.estado === 'Inactiva') return false;

      const ubicacionActual = (c.ubicacion || '').toLowerCase();
      const mismoRecursoId =
        Boolean(recursoFisicoId && c.recursoFisicoId && c.recursoFisicoId === recursoFisicoId);
      const mismoNombreSalon =
        ubicacionActual.includes(salonLimpio) &&
        (!sedeLimpia || ubicacionActual.includes(sedeLimpia) || !ubicacionActual.includes(' - '));

      if (!mismoRecursoId && !mismoNombreSalon) return false;

      const fechaC = (c.fechaConsulta || c.fecha.split('•')[0] || '').trim().substring(0, 10);
      if (fechaC !== fechaLimpia) return false;

      const horaC = (c.horaConsulta || c.fecha.split('•')[1] || '').trim().substring(0, 5);
      return horaC === horaCorta;
    });

    if (conflicto) {
      return {
        disponible: false,
        mensaje: `Ocupado: "${salonNombre}" (${sedeNombre}) ya tiene agendada la consulta ${conflicto.radicado} (${conflicto.asignatura}) el ${fechaLimpia} a las ${horaCorta}.`,
        conflicto
      };
    }

    return {
      disponible: true,
      mensaje: `Disponible: "${salonNombre}" en ${sedeNombre} está libre el ${fechaLimpia} a las ${horaCorta}.`
    };
  }

  private construirEtiquetaMetaConsulta(info: {
    ubicacion?: string;
    modalidad?: string;
    recursoFisicoId?: number | null;
    asignatura?: string;
    fechaAgenda?: string;
    horaAgenda?: string;
  }): string {
    const partes: string[] = [];
    if (info.ubicacion && info.ubicacion !== 'Por asignar') {
      partes.push(`Espacio: ${info.ubicacion}`);
    }
    if (info.modalidad) {
      partes.push(`Modalidad: ${info.modalidad}`);
    }
    if (info.recursoFisicoId) {
      partes.push(`RecursoID:${info.recursoFisicoId}`);
    }
    if (info.asignatura) {
      partes.push(`Asignatura: ${info.asignatura}`);
    }
    if (info.fechaAgenda && info.horaAgenda) {
      partes.push(`Agenda: ${info.fechaAgenda}_${info.horaAgenda.substring(0, 5)}`);
    }
    return partes.length > 0 ? `[${partes.join(' | ')}] ` : '';
  }

  private encontrarSlotBackendParaDocente(
    docenteId: number,
    fechaBaseIso: string,
    horaBaseIso: string,
    slots: DisponibilidadResponseApi[]
  ): { fecha: string; hora: string } {
    const activos = (slots || []).filter((s) => s.estado !== false);
    if (activos.length === 0) {
      return { fecha: fechaBaseIso, hora: horaBaseIso };
    }

    const [anio, mes, dia] = fechaBaseIso.split('-').map(Number);
    const fechaInicio = new Date(anio || 2026, (mes || 1) - 1, dia || 1);
    const horaCortaBase = horaBaseIso.substring(0, 5);

    for (let offset = 0; offset <= 21; offset++) {
      const dt = new Date(fechaInicio.getTime());
      dt.setDate(dt.getDate() + offset);
      const jsDay = dt.getDay();
      const isoDay = jsDay === 0 ? 7 : jsDay;
      const fechaCand = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

      const slotsDia = activos.filter((s) => s.diaSemana === isoDay);
      for (const slot of slotsDia) {
        const ini = (slot.horaInicio || '08:00').substring(0, 5);
        const fin = (slot.horaFin || '18:00').substring(0, 5);

        const horasCandidatas: string[] = [];
        if (horaCortaBase >= ini && horaCortaBase <= fin) {
          horasCandidatas.push(`${horaCortaBase}:00`);
        }

        const [hIni, mIni] = ini.split(':').map(Number);
        const [hFin, mFin] = fin.split(':').map(Number);
        const minTotalesIni = hIni * 60 + (mIni || 0);
        const minTotalesFin = hFin * 60 + (mFin || 0);

        for (let m = minTotalesIni; m <= minTotalesFin; m += 30) {
          const hh = String(Math.floor(m / 60)).padStart(2, '0');
          const mm = String(m % 60).padStart(2, '0');
          const cand = `${hh}:${mm}:00`;
          if (!horasCandidatas.includes(cand)) {
            horasCandidatas.push(cand);
          }
        }

        for (const hCand of horasCandidatas) {
          const hCorta = hCand.substring(0, 5);
          const ocupado = this.consultas().some(
            (c) =>
              c.docenteId === docenteId &&
              c.estado !== 'Cancelada' &&
              c.estado !== 'Inactiva' &&
              c.fechaConsulta === fechaCand &&
              (c.horaConsulta || '').substring(0, 5) === hCorta
          );
          if (!ocupado) {
            return { fecha: fechaCand, hora: hCand };
          }
        }
      }
    }

    const primero = activos[0];
    const iniPrimero = (primero.horaInicio || '09:00').substring(0, 5);
    return { fecha: fechaBaseIso, hora: `${iniPrimero}:00` };
  }

  crearConsulta(datos: {
    estudiante?: string;
    documento?: string;
    correoEstudiante?: string;
    asignatura: string;
    tema: string;
    descripcion?: string;
    tutor?: string;
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
    const fechaIso = this.obtenerFechaFuturaIso(datos.fecha);
    const horaIso = this.obtenerHoraPorFranja(datos.franja, datos.hora);
    const fechaFormateada = `${fechaIso} • ${horaIso.substring(0, 5)}`;

    const listaCursos = this.cursos();
    const cursoMatch =
      listaCursos.find(
        c => c.asignatura.toLowerCase() === (datos.asignatura || '').toLowerCase()
      ) || listaCursos[0];

    let tutorAsignado = (datos.tutor || '').trim();
    if (!tutorAsignado || tutorAsignado.includes('Automática') || tutorAsignado === 'En asignación') {
      tutorAsignado = cursoMatch ? cursoMatch.docente : '';
    }

    const docentesDelCurso = cursoMatch?.docentesAsignados || [];
    const docentesActivos = this.usuarios().filter(u => u.rol === 'DOCENTE');

    // Priorizar SIEMPRE el docente exacto elegido por el usuario (por nombre en usuarios o en el curso)
    const docenteElegidoEnUsuarios = tutorAsignado
      ? docentesActivos.find(
          u => u.nombre.trim().toLowerCase() === tutorAsignado.toLowerCase()
        )
      : undefined;

    const docenteElegidoEnCurso = tutorAsignado
      ? docentesDelCurso.find(
          d => `${d.nombre} ${d.apellido || ''}`.trim().toLowerCase() === tutorAsignado.toLowerCase()
        )
      : undefined;

    const docenteFallbackCurso = docentesDelCurso[0]
      ? {
          id: docentesDelCurso[0].id,
          nombre: `${docentesDelCurso[0].nombre} ${docentesDelCurso[0].apellido || ''}`.trim()
        }
      : undefined;

    const docenteObj =
      (docenteElegidoEnUsuarios
        ? { id: docenteElegidoEnUsuarios.id, nombre: docenteElegidoEnUsuarios.nombre }
        : undefined) ||
      (docenteElegidoEnCurso
        ? {
            id: docenteElegidoEnCurso.id,
            nombre: `${docenteElegidoEnCurso.nombre} ${docenteElegidoEnCurso.apellido || ''}`.trim()
          }
        : undefined) ||
      (cursoMatch?.docenteId
        ? docentesActivos.find(u => u.id === cursoMatch.docenteId)
        : undefined) ||
      docenteFallbackCurso ||
      docentesActivos[0];

    const nombreEstudianteSesion =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('nombreUsuarioActivo') || ''
        : '';
    const correoEstudianteSesion =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('correoActivo') || ''
        : '';
    const docEstudianteSesion =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('identificacionUsuarioActivo') || ''
        : '';

    const modalidadFinal = datos.modalidad.includes('Virtual') ? 'Virtual' : 'Presencial';
    const ubicacionFinal =
      datos.ubicacion ||
      (modalidadFinal === 'Virtual' ? 'Sala Virtual Institucional' : 'Por asignar');

    const nueva: ConsultaUnificada = {
      id: Date.now(),
      radicado,
      estudiante: datos.estudiante || nombreEstudianteSesion,
      documento: datos.documento || docEstudianteSesion,
      correoEstudiante: datos.correoEstudiante || correoEstudianteSesion,
      moduloId: cursoMatch?.id,
      asignatura: datos.asignatura || cursoMatch?.asignatura || 'Asignatura General',
      tema: datos.tema,
      descripcion: datos.descripcion || datos.tema,
      docenteId: docenteObj?.id || cursoMatch?.docenteId,
      tutor: docenteObj?.nombre || tutorAsignado,
      fechaConsulta: fechaIso,
      horaConsulta: horaIso,
      fecha: fechaFormateada,
      franja: datos.franja || this.obtenerFranjaDesdeHora(horaIso),
      modalidad: modalidadFinal,
      ubicacion: ubicacionFinal,
      recursoFisicoId: datos.recursoFisicoId || null,
      prioridad: datos.prioridad || 'Media',
      estado: 'Pendiente',
      tipoAtencion: 'Tutoría Individual',
      observaciones: 'Pendiente de revisión y respuesta del docente.',
      asistencia: 0,
      folioAuditoria: `AUD-${new Date().getFullYear()}-${num}`,
      reasignado: false,
      docenteSeleccionado: '',
      mensajes: [
        {
          autor: datos.estudiante || nombreEstudianteSesion,
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

      const moduloIdPreferido = cursoMatch?.id || 1;
      const docenteId = docenteObj?.id || cursoMatch?.docenteId || 1;
      const rolActual =
        typeof localStorage !== 'undefined'
          ? localStorage.getItem('rolActivo') || 'ESTUDIANTE'
          : 'ESTUDIANTE';

      const asuntoSeguro =
        nueva.tema.trim().length >= 5
          ? nueva.tema.trim().substring(0, 100)
          : `Tema: ${nueva.tema.trim()}`.substring(0, 100);

      const etiquetaMeta = this.construirEtiquetaMetaConsulta({
        ubicacion: ubicacionFinal,
        modalidad: modalidadFinal,
        recursoFisicoId: datos.recursoFisicoId || null,
        asignatura: nueva.asignatura,
        fechaAgenda: fechaIso,
        horaAgenda: horaIso
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
                    radicado: creadaRemota.numeroConsulta || c.radicado
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

      this.api
        .registrarSolicitudConsulta({
          prioridad: prioridadApi,
          asunto: asuntoSeguro,
          descripcion: descripcionParaApi,
          fechaConsulta: fechaIso,
          horaConsulta: horaIso,
          docenteId,
          moduloId: moduloIdPreferido
        })
        .subscribe({
          next: (creadaRemota) => vincularEspacioYRefrescar(creadaRemota),
          error: (errInicial) => {
            if (errInicial?.status === 503) {
              this.consultas.update(lista => lista.filter(c => c.id !== nueva.id));
              alert(
                this.api!.extraerMensajeError(
                  errInicial,
                  'El servidor en Render devolvió 503 porque intentó validar festivos en el servicio externo. Sube los cambios del backend (git push) a Render para desactivar el servicio externo.'
                )
              );
              return;
            }
            // Mantener SIEMPRE el docenteId elegido por el estudiante para que aparezca en el perfil de ese docente.
            // Si el backend rechazó por horario de disponibilidad_docente o porque el docente está vinculado a otro módulo:
            this.api!
              .listarDisponibilidadDocente(docenteId, false)
              .pipe(catchError(() => of([] as DisponibilidadResponseApi[])))
              .subscribe((slotsDocente) => {
                const slotValido = this.encontrarSlotBackendParaDocente(
                  docenteId,
                  fechaIso,
                  horaIso,
                  slotsDocente
                );

                const cursoConEseDocente = this.cursos().find((c) =>
                  c.docentesAsignados?.some((d) => d.id === docenteId)
                );
                const moduloValido = cursoConEseDocente?.id || moduloIdPreferido;

                this.api!
                  .registrarSolicitudConsulta({
                    prioridad: prioridadApi,
                    asunto: asuntoSeguro,
                    descripcion: descripcionParaApi,
                    fechaConsulta: slotValido.fecha,
                    horaConsulta: slotValido.hora,
                    docenteId,
                    moduloId: moduloValido
                  })
                  .subscribe({
                    next: (creadaRemota) => vincularEspacioYRefrescar(creadaRemota),
                    error: (errRetryDocente) => {
                      // Último recurso si el docente aún no tenía ningún módulo en BD
                      this.api?.listarDocentesPorModulo(moduloIdPreferido).subscribe({
                        next: (docentesModulo) => {
                          const docAlterno = docentesModulo?.[0]?.id;
                          if (docAlterno) {
                            this.api!
                              .listarDisponibilidadDocente(docAlterno, false)
                              .pipe(catchError(() => of([] as DisponibilidadResponseApi[])))
                              .subscribe((slotsAlt) => {
                                const slotAlt = this.encontrarSlotBackendParaDocente(
                                  docAlterno,
                                  fechaIso,
                                  horaIso,
                                  slotsAlt
                                );
                                this.api
                                  ?.registrarSolicitudConsulta({
                                    prioridad: prioridadApi,
                                    asunto: asuntoSeguro,
                                    descripcion: descripcionParaApi,
                                    fechaConsulta: slotAlt.fecha,
                                    horaConsulta: slotAlt.hora,
                                    docenteId: docAlterno,
                                    moduloId: moduloIdPreferido
                                  })
                                  .subscribe({
                                    next: (creadaRemota) => vincularEspacioYRefrescar(creadaRemota),
                                    error: () => {
                                      this.consultas.update(lista => lista.filter(c => c.id !== nueva.id));
                                      alert(
                                        this.api!.extraerMensajeError(
                                          errRetryDocente,
                                          'No se pudo registrar la consulta en la base de datos.'
                                        )
                                      );
                                    }
                                  });
                              });
                          } else {
                            this.consultas.update(lista => lista.filter(c => c.id !== nueva.id));
                            alert(
                              this.api!.extraerMensajeError(
                                errInicial,
                                'No se pudo registrar la consulta en la base de datos.'
                              )
                            );
                          }
                        },
                        error: () => {
                          this.consultas.update(lista => lista.filter(c => c.id !== nueva.id));
                          alert(
                            this.api!.extraerMensajeError(
                              errInicial,
                              'No se pudo registrar la consulta en la base de datos.'
                            )
                          );
                        }
                      });
                    }
                  });
              });
          }
        });
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

      const fechaConsulta = cambios.fechaConsulta || actual.fechaConsulta || this.obtenerFechaFuturaIso();
      const horaConsulta = cambios.horaConsulta
        ? this.obtenerHoraPorFranja('', cambios.horaConsulta)
        : cambios.franja
          ? this.obtenerHoraPorFranja(cambios.franja)
          : actual.horaConsulta || '09:00:00';

      const ubicacionFinal = cambios.ubicacion || actual.ubicacion;
      const modalidadFinal = cambios.modalidad || actual.modalidad;
      const recursoIdFinal =
        cambios.recursoFisicoId !== undefined ? cambios.recursoFisicoId : actual.recursoFisicoId;
      const etiquetaMeta = this.construirEtiquetaMetaConsulta({
        ubicacion: ubicacionFinal,
        modalidad: modalidadFinal,
        recursoFisicoId: recursoIdFinal,
        asignatura: asignaturaFinal,
        fechaAgenda: fechaConsulta,
        horaAgenda: horaConsulta
      });
      const parsedPrev = this.extraerMetadatosDescripcion(cambios.descripcion || actual.descripcion || '');
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
      next: (tipos) => this.tiposDocumento.set(tipos || []),
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

    // 1. Obtener Usuarios (si es ADMIN) o Docentes públicos (si es ESTUDIANTE/DOCENTE)
    const usuariosObs =
      rolActual === 'ADMIN'
        ? this.api.listarUsuarios(true).pipe(
            map((usuariosRemotos: UsuarioResponseApi[]) =>
              (usuariosRemotos || []).map(
                (u): UsuarioSistema => ({
                  id: u.id,
                  tipoIdentificacion: (u.tipoDocumentoSigla === 'TI' ? 'TI' : 'CC') as 'CC' | 'TI',
                  identificacion: u.identificacion || '',
                  tipoDocumentoId: u.tipoDocumentoId,
                  tipoDocumentoSigla: u.tipoDocumentoSigla || 'CC',
                  nombre: `${u.nombre} ${u.apellido || ''}`.trim(),
                  nombreSolo: u.nombre,
                  apellido: u.apellido || '',
                  email: u.correo || '',
                  rol: u.rol === 'ADMINISTRADOR' ? 'ADMIN' : u.rol,
                  estado: u.estado ? 'Activo' : 'Inactivo',
                  programaId: u.programaId,
                  programa:
                    u.programaNombre ||
                    (u.rol === 'ADMINISTRADOR'
                      ? 'Coordinación / Administración'
                      : u.rol === 'DOCENTE'
                        ? 'Docencia Universitaria'
                        : 'Sin programa asignado'),
                  fechaCreacion: u.fechaCreacion
                })
              )
            ),
            catchError(() =>
              this.api!.listarDocentes().pipe(
                map((docentes: DocenteResumenApi[]) =>
                  (docentes || []).map(
                    (d): UsuarioSistema => ({
                      id: d.id,
                      nombre: `${d.nombre} ${d.apellido || ''}`.trim(),
                      nombreSolo: d.nombre,
                      apellido: d.apellido || '',
                      email: '',
                      rol: 'DOCENTE',
                      estado: 'Activo',
                      programa: 'Docencia Universitaria'
                    })
                  )
                ),
                catchError(() => of([] as UsuarioSistema[]))
              )
            )
          )
        : this.api.listarDocentes().pipe(
            map((docentes: DocenteResumenApi[]) =>
              (docentes || []).map(
                (d): UsuarioSistema => ({
                  id: d.id,
                  nombre: `${d.nombre} ${d.apellido || ''}`.trim(),
                  nombreSolo: d.nombre,
                  apellido: d.apellido || '',
                  email: '',
                  rol: 'DOCENTE',
                  estado: 'Activo',
                  programa: 'Docencia Universitaria'
                })
              )
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
            const asigAdmin = asignacionesAdmin.find(
              (a) => a.moduloId === modulo.id && a.estado
            );
            const primerDocenteModulo = docentes[0];
            const docenteFallback =
              docentesGenerales[idx % Math.max(docentesGenerales.length, 1)];

            // Extraer código y docente titular guardados en modulo.descripcion ([Codigo:XXX | Docente:YYY])
            let codigoExtraido = `MOD-${String(modulo.id).padStart(2, '0')}`;
            let docenteExtraido = '';
            const matchMetaModulo = (modulo.descripcion || '').match(
              /^\[Codigo:\s*([^\]|]+)(?:\s*\|\s*Docente:\s*([^\]]+))?\]/i
            );
            if (matchMetaModulo) {
              if (matchMetaModulo[1]?.trim()) {
                codigoExtraido = matchMetaModulo[1].trim();
              }
              if (matchMetaModulo[2]?.trim()) {
                docenteExtraido = matchMetaModulo[2].trim();
              }
            }

            const docPorMeta = docenteExtraido
              ? docentesGenerales.find(
                  (u) => u.nombre.trim().toLowerCase() === docenteExtraido.toLowerCase()
                )
              : undefined;

            // Si el usuario actual es ADMIN, garantizar que todos los docentes activos estén habilitados en docentes_modulos
            // para evitar errores de asignación cuando un estudiante elija un docente específico
            if (rolActual === 'ADMIN' && modulo.estado) {
              for (const doc of docentesActivos) {
                const yaVinculado = docentes.some((d) => d.id === doc.id);
                if (!yaVinculado) {
                  this.api!
                    .asignarDocenteModulo({
                      docenteId: doc.id,
                      moduloId: modulo.id
                    })
                    .pipe(catchError(() => of(null)))
                    .subscribe();
                }
              }
            }

            const nombreDocente =
              docPorMeta?.nombre ||
              docenteExtraido ||
              (primerDocenteModulo
                ? `${primerDocenteModulo.nombre} ${primerDocenteModulo.apellido || ''}`.trim()
                : asigAdmin
                  ? asigAdmin.nombreDocente
                  : docenteFallback?.nombre || 'Sin docente asignado');

            const idDocente =
              docPorMeta?.id ||
              primerDocenteModulo?.id ||
              asigAdmin?.docenteId ||
              docenteFallback?.id;

            return {
              id: modulo.id,
              asignacionId: asigAdmin?.id,
              codigo: codigoExtraido,
              asignatura: modulo.nombre,
              descripcion: modulo.descripcion || '',
              docente: nombreDocente,
              docenteId: idDocente,
              docentesAsignados: docentes,
              estado: modulo.estado ? 'Activo' : 'Inactivo'
            };
          });
          this.cursos.set(cursosMapeados);
        });
      }

      // 3. Sincronizar Solicitudes de Consulta (/solicitudes-consultas)
      this.api!.listarSolicitudesConsulta().subscribe({
        next: (solicitudesRemotas: SolicitudConsultaResponseApi[]) => {
          const lista = solicitudesRemotas || [];
          const mapeadas: ConsultaUnificada[] = lista.map((s) => {
            let estadoLocal: ConsultaUnificada['estado'] = 'Pendiente';
            if (s.estado === 'EN_PROCESO') estadoLocal = 'En proceso';
            else if (s.estado === 'RESUELTA') estadoLocal = 'Completada';
            else if (s.estado === 'CANCELADA' || s.estado === 'RECHAZADA') estadoLocal = 'Cancelada';

            let prioridadLocal: ConsultaUnificada['prioridad'] = 'Media';
            if (s.prioridad === 'ALTA') prioridadLocal = 'Alta';
            else if (s.prioridad === 'BAJA') prioridadLocal = 'Baja';

            const usuarioEstudiante = usuariosMapeados.find((u) => u.id === s.estudianteId);
            const correoOPrograma =
              usuarioEstudiante?.email ||
              s.nombrePrograma ||
              (s.identificacionEstudiante ? `Doc: ${s.identificacionEstudiante}` : '');

            const metaDesc = this.extraerMetadatosDescripcion(s.descripcion || '');
            const descripcionLimpia = metaDesc.descripcionLimpia;

            const fechaReal = metaDesc.fechaAgenda || s.fechaConsulta;
            const horaReal = metaDesc.horaAgenda || s.horaConsulta;
            const horaCorta = (horaReal || '').substring(0, 5);
            const ubicGuardada = this.obtenerUbicacionLocal(s.id, fechaReal, horaReal);
            const nombreRecursoApi =
              s.nombreRecursoFisico && s.nombreRecursoFisico !== 'Sin asignar'
                ? s.nombreRecursoFisico
                : null;
            const nombreRecurso =
              metaDesc.ubicacion ||
              nombreRecursoApi ||
              ubicGuardada?.ubicacion ||
              'Por asignar';
            const recursoId =
              s.recursoFisicoId ||
              metaDesc.recursoId ||
              ubicGuardada?.recursoFisicoId ||
              null;
            const modalidadResuelta =
              metaDesc.modalidad ||
              ubicGuardada?.modalidad ||
              (nombreRecurso.toLowerCase().includes('virtual') ? 'Virtual' : 'Presencial');
            const asignaturaResuelta = metaDesc.asignatura || s.nombreModulo;
            const asuntoLimpio = (s.asunto || '').replace(/^Tema:\s*/i, '');

            // Si el usuario actual es DOCENTE asignado o ADMIN y la solicitud tiene un recursoId pendiente de vincular en la columna recurso_fisico_id
            if (
              !s.recursoFisicoId &&
              recursoId &&
              (s.estado === 'PENDIENTE' || s.estado === 'EN_PROCESO') &&
              (rolActual === 'ADMIN' || (rolActual === 'DOCENTE' && s.docenteId === idUsuarioActivo))
            ) {
              this.api!
                .asignarRecursoFisicoSolicitud(s.id, recursoId)
                .pipe(catchError(() => of(null)))
                .subscribe();
            }

            const metaRetro = s.retroalimentacionDocente
              ? this.extraerMetadatosActaComentario(s.retroalimentacionDocente)
              : null;
            const observacionesIniciales =
              (metaRetro?.textoLimpio && metaRetro.textoLimpio.trim()) ||
              (estadoLocal === 'Completada'
                ? 'Consulta atendida y resuelta por el docente.'
                : estadoLocal === 'Cancelada'
                  ? 'Solicitud cancelada.'
                  : 'Pendiente de revisión y respuesta del docente.');

            return {
              id: s.id,
              radicado: s.numeroConsulta || `CON-${s.id}`,
              fechaCreacion: this.formatearFechaHora(s.fechaCreacion),
              estudianteId: s.estudianteId,
              estudiante: s.nombreCompletoEstudiante,
              documento: s.identificacionEstudiante || 'N/A',
              correoEstudiante: correoOPrograma,
              nombrePrograma: s.nombrePrograma || usuarioEstudiante?.programa || 'Sin programa',
              moduloId: s.moduloId,
              asignatura: asignaturaResuelta,
              tema: metaRetro?.tema || asuntoLimpio,
              descripcion: descripcionLimpia,
              docenteId: s.docenteId,
              identificacionDocente: s.identificacionDocente || null,
              tutor: s.nombreCompletoDocente,
              fechaConsulta: fechaReal,
              horaConsulta: horaReal,
              fecha: `${fechaReal} • ${horaCorta}`,
              franja: this.obtenerFranjaDesdeHora(horaReal),
              modalidad: modalidadResuelta,
              ubicacion: nombreRecurso,
              recursoFisicoId: recursoId,
              prioridad: prioridadLocal,
              estado: estadoLocal,
              tipoAtencion: metaRetro?.tipoAtencion || 'Tutoría Individual',
              observaciones: observacionesIniciales,
              retroalimentacionDocente: metaRetro?.textoLimpio || s.retroalimentacionDocente || null,
              calificacion: s.calificacion || null,
              asistencia:
                metaRetro?.asistencia !== undefined
                  ? metaRetro.asistencia
                  : estadoLocal === 'Completada'
                    ? 1
                    : 0,
              folioAuditoria: `AUD-${s.numeroConsulta || s.id}`,
              reasignado: false,
              docenteSeleccionado: s.nombreCompletoDocente,
              mensajes: [
                {
                  autor: s.nombreCompletoEstudiante,
                  rol: 'ESTUDIANTE',
                  fechaHora: this.formatearFechaHora(s.fechaCreacion),
                  mensaje: descripcionLimpia
                }
              ]
            };
          });
          this.consultas.set(mapeadas);

          const activaId = this.consultaActivaId() || mapeadas[0]?.id;
          if (activaId) {
            this.consultaActivaId.set(activaId);
          }
          // Cargar comentarios y actas docentes para todas las solicitudes listadas
          for (const item of mapeadas) {
            this.cargarComentariosDeConsulta(item.id);
          }
        },
        error: () => {}
      });
    });
  }
}
