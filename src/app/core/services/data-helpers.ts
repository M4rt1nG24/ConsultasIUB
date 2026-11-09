import { DisponibilidadResponseApi } from '../models/api-principal.models';
import { ConsultaUnificada } from '../models/consulta.models';

export function extraerMetadatosActaComentario(rawContenido: string): {
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

export function extraerMetadatosDescripcion(rawDesc: string): {
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
  let recursoId: number | null = null;
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

export function formatearFechaHora(iso: string): string {
  if (!iso) return '';
  return iso.replace('T', ' ').substring(0, 16);
}

export function obtenerFranjaDesdeHora(hora: string): string {
  const h = parseInt((hora || '09:00').split(':')[0], 10);
  if (h < 12) return 'Mañana (08:00 AM - 12:00 PM)';
  if (h < 18) return 'Tarde (02:00 PM - 06:00 PM)';
  return 'Noche (06:00 PM - 09:00 PM)';
}

export function obtenerHoraPorFranja(franja: string, horaExplicita?: string): string {
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

export function obtenerFechaFuturaIso(fechaInput?: string): string {
  if (fechaInput && /^\d{4}-\d{2}-\d{2}/.test(fechaInput.trim())) {
    return fechaInput.trim().substring(0, 10);
  }
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  return `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, '0')}-${String(manana.getDate()).padStart(2, '0')}`;
}

export function construirEtiquetaMetaConsulta(info: {
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

export function encontrarSlotBackendParaDocente(
  docenteId: number,
  fechaBaseIso: string,
  horaBaseIso: string,
  slots: DisponibilidadResponseApi[],
  consultas: ConsultaUnificada[]
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
        const ocupado = consultas.some(
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


import {
  UsuarioResponseApi,
  DocenteResumenApi,
  ModuloResponseApi,
  DocenteModuloResponseApi,
  SolicitudConsultaResponseApi
} from '../models/api-principal.models';
import { CursoSistema, UsuarioSistema } from '../models/consulta.models';

export function mapearUsuarioApiAFront(u: UsuarioResponseApi): UsuarioSistema {
  return {
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
  };
}

export function mapearDocenteApiAFront(d: DocenteResumenApi): UsuarioSistema {
  return {
    id: d.id,
    nombre: `${d.nombre} ${d.apellido || ''}`.trim(),
    nombreSolo: d.nombre,
    apellido: d.apellido || '',
    email: d.correo || '',
    rol: 'DOCENTE',
    estado: 'Activo',
    programa: 'Docencia Universitaria'
  };
}

export function mapearModuloApiAFront(
  modulo: ModuloResponseApi,
  docentes: DocenteResumenApi[],
  asignacionesAdmin: DocenteModuloResponseApi[],
  docentesGenerales: UsuarioSistema[],
  idx: number
): CursoSistema {
  const asigAdmin = asignacionesAdmin.find(
    (a) => a.moduloId === modulo.id && a.estado
  );
  const primerDocenteModulo = docentes[0];
  const docenteFallback = docentesGenerales[idx % Math.max(docentesGenerales.length, 1)];

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
}

export function mapearSolicitudApiAFront(
  s: SolicitudConsultaResponseApi,
  usuariosMapeados: UsuarioSistema[],
  ubicGuardada?: { ubicacion?: string; recursoFisicoId?: number | null; modalidad?: string } | null
): ConsultaUnificada {
  let estadoLocal: ConsultaUnificada['estado'] = 'Pendiente';
  if (s.estado === 'EN_PROCESO') estadoLocal = 'En proceso';
  else if (s.estado === 'RESUELTA') estadoLocal = 'Resuelta';
  else if (s.estado === 'CANCELADA') estadoLocal = 'Cancelada';
  else if (s.estado === 'RECHAZADA') estadoLocal = 'Rechazada';

  let prioridadLocal: ConsultaUnificada['prioridad'] = 'Media';
  if (s.prioridad === 'ALTA') prioridadLocal = 'Alta';
  else if (s.prioridad === 'BAJA') prioridadLocal = 'Baja';

  const usuarioEstudiante = usuariosMapeados.find((u) => u.id === s.estudianteId);
  const correoOPrograma =
    usuarioEstudiante?.email ||
    s.nombrePrograma ||
    (s.identificacionEstudiante ? `Doc: ${s.identificacionEstudiante}` : '');

  const metaDesc = extraerMetadatosDescripcion(s.descripcion || '');
  const descripcionLimpia = metaDesc.descripcionLimpia;

  const fechaReal = metaDesc.fechaAgenda || s.fechaConsulta;
  const horaReal = metaDesc.horaAgenda || s.horaConsulta;
  const horaCorta = (horaReal || '').substring(0, 5);
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

  const metaRetro = s.retroalimentacionDocente
    ? extraerMetadatosActaComentario(s.retroalimentacionDocente)
    : null;
  const observacionesIniciales =
    (metaRetro?.textoLimpio && metaRetro.textoLimpio.trim()) ||
    (estadoLocal === 'Resuelta'
      ? 'Consulta atendida y resuelta por el docente.'
      : estadoLocal === 'Cancelada'
        ? 'Solicitud cancelada.'
        : estadoLocal === 'Rechazada'
          ? 'Solicitud rechazada por el docente.'
          : 'Pendiente de revisión y respuesta del docente.');

  return {
    id: s.id,
    radicado: s.numeroConsulta || `CON-${s.id}`,
    fechaCreacion: formatearFechaHora(s.fechaCreacion),
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
    franja: obtenerFranjaDesdeHora(horaReal),
    modalidad: modalidadResuelta,
    ubicacion: nombreRecurso,
    recursoFisicoId: recursoId,
    prioridad: prioridadLocal,
    estado: estadoLocal,
    observaciones: observacionesIniciales,
    retroalimentacionDocente: metaRetro?.textoLimpio || s.retroalimentacionDocente || null,
    calificacion: s.calificacion || null,
    asistencia:
      metaRetro?.asistencia !== undefined
        ? metaRetro.asistencia
        : estadoLocal === 'Resuelta'
          ? 1
          : 0,
    folioAuditoria: s.numeroConsulta || `CON-${s.id}`,
    reasignado: false,
    docenteSeleccionado: s.nombreCompletoDocente,
    mensajes: [
      {
        autor: s.nombreCompletoEstudiante,
        rol: 'ESTUDIANTE',
        fechaHora: formatearFechaHora(s.fechaCreacion),
        mensaje: descripcionLimpia
      }
    ]
  };
}


export function encontrarDocenteParaConsulta(
  datos: { tutor?: string; docenteId?: number; asignatura?: string; moduloId?: number },
  cursos: CursoSistema[],
  usuarios: UsuarioSistema[]
): { docenteObj?: { id: number; nombre: string }; cursoMatch?: CursoSistema; tutorAsignado: string } {
  const cursoMatch =
    (datos.moduloId ? cursos.find((c) => c.id === datos.moduloId) : undefined) ||
    cursos.find((c) => c.asignatura.toLowerCase() === (datos.asignatura || '').toLowerCase()) ||
    cursos[0];

  let tutorAsignado = (datos.tutor || '').trim();
  if (!tutorAsignado || tutorAsignado.includes('Automática') || tutorAsignado === 'En asignación') {
    tutorAsignado = cursoMatch ? cursoMatch.docente : '';
  }

  const docentesDelCurso = cursoMatch?.docentesAsignados || [];
  const docentesActivos = usuarios.filter((u) => u.rol === 'DOCENTE');

  const docenteDirectoPorId = datos.docenteId
    ? docentesActivos.find((u) => u.id === datos.docenteId) ||
      docentesDelCurso.find((d) => d.id === datos.docenteId)
    : undefined;

  const docenteElegidoEnUsuarios = tutorAsignado
    ? docentesActivos.find((u) => u.nombre.trim().toLowerCase() === tutorAsignado.toLowerCase())
    : undefined;

  const docenteElegidoEnCurso = tutorAsignado
    ? docentesDelCurso.find(
        (d) => `${d.nombre} ${d.apellido || ''}`.trim().toLowerCase() === tutorAsignado.toLowerCase()
      )
    : undefined;

  const docenteFallbackCurso = docentesDelCurso[0]
    ? {
        id: docentesDelCurso[0].id,
        nombre: `${docentesDelCurso[0].nombre} ${docentesDelCurso[0].apellido || ''}`.trim()
      }
    : undefined;

  const docenteObj =
    (docenteDirectoPorId
      ? {
          id: docenteDirectoPorId.id,
          nombre:
            'apellido' in docenteDirectoPorId && (docenteDirectoPorId as any).apellido
              ? `${docenteDirectoPorId.nombre} ${(docenteDirectoPorId as any).apellido}`.trim()
              : docenteDirectoPorId.nombre
        }
      : undefined) ||
    (docenteElegidoEnUsuarios
      ? { id: docenteElegidoEnUsuarios.id, nombre: docenteElegidoEnUsuarios.nombre }
      : undefined) ||
    (docenteElegidoEnCurso
      ? {
          id: docenteElegidoEnCurso.id,
          nombre: `${docenteElegidoEnCurso.nombre} ${docenteElegidoEnCurso.apellido || ''}`.trim()
        }
      : undefined) ||
    (cursoMatch?.docenteId ? docentesActivos.find((u) => u.id === cursoMatch.docenteId) : undefined) ||
    docenteFallbackCurso ||
    docentesActivos[0];

  return { docenteObj, cursoMatch, tutorAsignado };
}

export function verificarDisponibilidadEspacioHelper(
  consultas: ConsultaUnificada[],
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

  const fechaLimpia = obtenerFechaFuturaIso(fechaConsulta);
  const horaIso = obtenerHoraPorFranja(horaOFranja, horaOFranja);
  const horaCorta = horaIso.substring(0, 5);
  const salonLimpio = salonNombre.toLowerCase().trim();
  const sedeLimpia = (sedeNombre || '').toLowerCase().trim();

  const conflicto = consultas.find((c) => {
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
    mensaje: `Disponible: "${salonNombre}" (${sedeNombre}) está libre el ${fechaLimpia} a las ${horaCorta}.`
  };
}


import { catchError, of } from 'rxjs';
import { ApiPrincipal } from './api-principal';
import { PrioridadSolicitudApi } from '../models/api-principal.models';

export function registrarSolicitudConFallback(
  api: ApiPrincipal,
  req: {
    prioridad: PrioridadSolicitudApi;
    asunto: string;
    descripcion: string;
    fechaConsulta: string;
    horaConsulta: string;
    docenteId: number;
    moduloId: number;
  },
  consultas: ConsultaUnificada[],
  cursos: CursoSistema[],
  callbacks: {
    onSuccess: (creada: SolicitudConsultaResponseApi) => void;
    onErrorFinal: (errInfo: { slot?: { fecha: string; hora: string }; docenteId: number; moduloId: number }) => void;
  }
): void {
  api.registrarSolicitudConsulta(req).subscribe({
    next: (creada) => callbacks.onSuccess(creada),
    error: () => {
      api
        .listarDisponibilidadDocente(req.docenteId, false)
        .pipe(catchError(() => of([] as DisponibilidadResponseApi[])))
        .subscribe((slots) => {
          const slot = encontrarSlotBackendParaDocente(
            req.docenteId,
            req.fechaConsulta,
            req.horaConsulta,
            slots,
            consultas
          );
          const cursoDocente = cursos.find((c) =>
            c.docentesAsignados?.some((d) => d.id === req.docenteId)
          );
          const moduloValido = cursoDocente?.id || req.moduloId;

          api
            .registrarSolicitudConsulta({
              ...req,
              fechaConsulta: slot.fecha,
              horaConsulta: slot.hora,
              moduloId: moduloValido
            })
            .subscribe({
              next: (creada) => callbacks.onSuccess(creada),
              error: () => {
                api.listarDocentesPorModulo(req.moduloId).subscribe({
                  next: (docentesModulo) => {
                    const docAlt = docentesModulo?.[0]?.id;
                    if (docAlt) {
                      api
                        .listarDisponibilidadDocente(docAlt, false)
                        .pipe(catchError(() => of([] as DisponibilidadResponseApi[])))
                        .subscribe((slotsAlt) => {
                          const slotAlt = encontrarSlotBackendParaDocente(
                            docAlt,
                            req.fechaConsulta,
                            req.horaConsulta,
                            slotsAlt,
                            consultas
                          );
                          api
                            .registrarSolicitudConsulta({
                              ...req,
                              docenteId: docAlt,
                              fechaConsulta: slotAlt.fecha,
                              horaConsulta: slotAlt.hora
                            })
                            .subscribe({
                              next: (creada) => callbacks.onSuccess(creada),
                              error: () =>
                                callbacks.onErrorFinal({
                                  slot: slotAlt,
                                  docenteId: docAlt,
                                  moduloId: req.moduloId
                                })
                            });
                        });
                    } else {
                      callbacks.onErrorFinal({
                        slot,
                        docenteId: req.docenteId,
                        moduloId: moduloValido
                      });
                    }
                  },
                  error: () =>
                    callbacks.onErrorFinal({
                      slot,
                      docenteId: req.docenteId,
                      moduloId: moduloValido
                    })
                });
              }
            });
        });
    }
  });
}


export function asegurarDisponibilidadDocenteHelper(
  api: ApiPrincipal,
  docenteId: number,
  cursos: CursoSistema[],
  rolActual: string
): void {
  api
    .listarDisponibilidadDocente(docenteId, true)
    .pipe(catchError(() => of([] as DisponibilidadResponseApi[])))
    .subscribe((slots) => {
      if (!slots || slots.length === 0) {
        for (let dia = 1; dia <= 6; dia++) {
          api
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
    for (const curso of cursos) {
      const yaAsignado = curso.docentesAsignados?.some((d) => d.id === docenteId);
      if (!yaAsignado && curso.id > 0) {
        api
          .asignarDocenteModulo({ docenteId, moduloId: curso.id })
          .pipe(catchError(() => of(null)))
          .subscribe();
      }
    }
  }
}
