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

export function normalizarCapitalizacionAsignatura(nombre: string): string {
  if (!nombre) return '';
  const n = nombre.trim();
  const lower = n.toLowerCase();

  const canonicos: Record<string, string> = {
    'constitucion politica': 'Constitución Política',
    'constitución politica': 'Constitución Política',
    'constitucion política': 'Constitución Política',
    'constitución política': 'Constitución Política',
    'algebra lineal': 'Álgebra Lineal',
    'álgebra lineal': 'Álgebra Lineal',
    'calculo diferencial': 'Cálculo Diferencial',
    'cálculo diferencial': 'Cálculo Diferencial',
    'calculo integral': 'Cálculo Integral',
    'cálculo integral': 'Cálculo Integral',
    'programacion orientada a objetos': 'Programación Orientada a Objetos',
    'programación orientada a objetos': 'Programación Orientada a Objetos',
    'algoritmos y programacion': 'Algoritmos y Programación',
    'algoritmos y programación': 'Algoritmos y Programación',
    'bases de datos': 'Bases de Datos',
    'base de datos': 'Bases de Datos',
    'redes y comunicaciones': 'Redes y Comunicaciones',
    'sistemas operativos': 'Sistemas Operativos',
    'etica y ciudadania': 'Ética y Ciudadanía',
    'ética y ciudadanía': 'Ética y Ciudadanía',
    'investigacion de operaciones': 'Investigación de Operaciones',
    'investigación de operaciones': 'Investigación de Operaciones',
    'fisica mecanica': 'Física Mecánica',
    'física mecánica': 'Física Mecánica'
  };

  if (canonicos[lower]) {
    return canonicos[lower];
  }

  // Si ya tiene mayúsculas mixtas válidas (ej. "Ingeniería de Software"), preservarlo
  if (/[A-Z]/.test(n) && /[a-z]/.test(n) && n !== n.toUpperCase()) {
    return n.replace(/\s+/g, ' ');
  }

  const palabrasMenores = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'en', 'a', 'por', 'con', 'para']);
  const palabras = lower.split(/\s+/);
  return palabras
    .map((p, idx) => {
      if (idx > 0 && palabrasMenores.has(p)) return p;
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join(' ');
}

export function limpiarNombreAsignatura(
  raw?: string | null,
  descripcionFallback?: string | null,
  moduloFallback?: string | null
): string {
  let val = (raw || '').trim();

  // 1. Quitar prefijos entre corchetes como [DEMO], [DEMO - 01], [MOD-01], [ASIG-02], [CURSO-10]
  val = val.replace(/^\[\s*(?:DEMO|MOD(?:ULO)?|CURSO|ASIG(?:NATURA)?|COD(?:IGO)?)[^\]]*\]\s*/gi, '').trim();

  // 2. Quitar prefijos tipo "DEMO: ", "DEMO - ", etc.
  val = val.replace(/^(?:DEMO|MOD(?:ULO)?)\s*[:-]\s*/gi, '').trim();

  // 3. Detectar y limpiar fragmentos truncados o rotos como "[DEMO", "[demo"
  if (/^\[\s*(?:DEMO|MOD(?:ULO)?|CURSO|ASIG)[^A-Za-z0-9]*$/i.test(val) || val.toLowerCase() === '[demo') {
    val = '';
  } else {
    val = val.replace(/^\[\s*(?:DEMO|MOD(?:ULO)?|CURSO|ASIG)\s*[:-]?\s*/gi, '').trim();
  }

  // Quitar corchetes sueltos envolventes
  val = val.replace(/^[\[\]]+|[\[\]]+$/g, '').trim();

  // 4. Si el valor quedó vacío o corrupto, recuperar desde alternativas
  if (!val || /^(?:demo|n\/a|sin asignar|null|undefined)$/i.test(val)) {
    if (moduloFallback && moduloFallback.trim()) {
      const desdeModulo = limpiarNombreAsignatura(moduloFallback);
      if (desdeModulo && !/^(?:demo|sin asignar)$/i.test(desdeModulo)) {
        return normalizarCapitalizacionAsignatura(desdeModulo);
      }
    }

    if (descripcionFallback) {
      const matchInst = descripcionFallback.match(/Asignatura institucional\s+([^\[\]|\n\r]+)/i);
      if (matchInst && matchInst[1]?.trim()) {
        const limpia = limpiarNombreAsignatura(matchInst[1].trim());
        if (limpia) return normalizarCapitalizacionAsignatura(limpia);
      }

      const matchSpill = descripcionFallback.match(/(?:\]\s*)?([^|\[\]\n\r]+?)\s*\|\s*Agenda:/i);
      if (matchSpill && matchSpill[1]?.trim()) {
        const limpia = limpiarNombreAsignatura(matchSpill[1].trim());
        if (limpia && limpia.length > 2 && !/^(?:demo|espacio|modalidad)$/i.test(limpia)) {
          return normalizarCapitalizacionAsignatura(limpia);
        }
      }

      const descLower = descripcionFallback.toLowerCase();
      if (descLower.includes('constitucion politica') || descLower.includes('constitución política')) {
        return 'Constitución Política';
      }
      if (descLower.includes('algoritmos') || descLower.includes('programacion') || descLower.includes('programación')) {
        return 'Algoritmos y Programación';
      }
      if (descLower.includes('algebra') || descLower.includes('álgebra')) {
        return 'Álgebra Lineal';
      }
      if (descLower.includes('calculo') || descLower.includes('cálculo')) {
        return 'Cálculo Diferencial';
      }
      if (descLower.includes('base de datos') || descLower.includes('bases de datos')) {
        return 'Bases de Datos';
      }
      if (descLower.includes('redes')) {
        return 'Redes y Comunicaciones';
      }
      if (descLower.includes('etica') || descLower.includes('ética')) {
        return 'Ética y Ciudadanía';
      }
    }

    return 'Constitución Política';
  }

  return normalizarCapitalizacionAsignatura(val);
}

export function extraerMetadatosDescripcion(rawDesc: string): {
  descripcionLimpia: string;
  ubicacion: string | null;
  modalidad: string | null;
  recursoId: number | null;
  asignatura: string | null;
  fechaAgenda: string | null;
  horaAgenda: string | null;
  estudianteDoc: string | null;
  estudianteNombre: string | null;
} {
  let texto = (rawDesc || '').trim();
  let ubicacion: string | null = null;
  let modalidad: string | null = null;
  let recursoId: number | null = null;
  let asignatura: string | null = null;
  let fechaAgenda: string | null = null;
  let horaAgenda: string | null = null;
  let estudianteDoc: string | null = null;
  let estudianteNombre: string | null = null;

  if (
    texto.startsWith('[') &&
    /^\[\s*(?:Espacio|Modalidad|RecursoID|Asignatura|Agenda|EstudianteDoc|Estudiante|Doc|Documento|Identificacion):/i.test(texto)
  ) {
    let interior = '';
    let finBloque = -1;

    // 1. Balanceo de corchetes para soportar etiquetas internas o nombres complejos
    let profundidad = 0;
    for (let i = 0; i < texto.length; i++) {
      if (texto[i] === '[') profundidad++;
      else if (texto[i] === ']') {
        profundidad--;
        if (profundidad === 0) {
          finBloque = i;
          break;
        }
      }
    }

    if (finBloque > 0) {
      interior = texto.substring(1, finBloque);
      texto = texto.slice(finBloque + 1).trim();
    } else {
      // 2. Si no balancea (ej. [DEMO abierto sin cerrar ]), cortar en el ']' que cierra la cabecera
      const matchFallback = texto.match(
        /^\[([\s\S]*?(?:Agenda:\s*\d{4}-\d{2}-\d{2}[^\]|]*|Estudiante:[^\]|]*|EstudianteDoc:[^\]|]*|Doc:[^\]|]*|RecursoID:\s*\d+|Modalidad:[^\]|]*|Espacio:[^\]|]*))\]\s*(.*)$/i
      );
      if (matchFallback) {
        interior = matchFallback[1];
        texto = matchFallback[2].trim();
      } else {
        const matchSimple = texto.match(/^\[([\s\S]+?)\]\s*(.*)$/);
        if (matchSimple) {
          interior = matchSimple[1];
          texto = matchSimple[2].trim();
        }
      }
    }

    if (interior) {
      const segmentos = interior.split('|').map((seg) => seg.trim());
      for (const seg of segmentos) {
        if (/^Espacio:/i.test(seg)) {
          const val = seg.replace(/^Espacio:\s*/i, '').trim();
          if (
            val &&
            !val.toLowerCase().includes('pendiente') &&
            !val.toLowerCase().includes('asignar')
          ) {
            ubicacion = val;
          }
        } else if (/^Modalidad:/i.test(seg)) {
          modalidad = seg.replace(/^Modalidad:\s*/i, '').trim() || null;
        } else if (/^RecursoID:/i.test(seg)) {
          const idNum = Number(seg.replace(/^RecursoID:\s*/i, '').trim());
          if (!Number.isNaN(idNum) && idNum > 0) recursoId = idNum;
        } else if (/^Asignatura:/i.test(seg)) {
          const asigBruta = seg.replace(/^Asignatura:\s*/i, '').trim();
          const asigLimpia = limpiarNombreAsignatura(asigBruta, rawDesc);
          if (asigLimpia && !asigLimpia.toLowerCase().includes('demo')) {
            asignatura = asigLimpia;
          }
        } else if (/^Agenda:/i.test(seg)) {
          const valAgenda = seg.replace(/^Agenda:\s*/i, '').trim();
          const [f, h] = valAgenda.split('_');
          if (f && /^\d{4}-\d{2}-\d{2}$/.test(f)) fechaAgenda = f;
          if (h && /^\d{2}:\d{2}/.test(h)) horaAgenda = h.length === 5 ? `${h}:00` : h;
        } else if (/^(?:EstudianteDoc|Doc|Documento|Identificacion|IdentificacionEstudiante):\s*/i.test(seg)) {
          estudianteDoc = seg.replace(/^(?:EstudianteDoc|Doc|Documento|Identificacion|IdentificacionEstudiante):\s*/i, '').trim() || null;
        } else if (/^Estudiante:\s*/i.test(seg)) {
          estudianteNombre = seg.replace(/^Estudiante:\s*/i, '').trim() || null;
        }
      }
    }
  }

  // Respaldo por si el documento o nombre del estudiante quedó en otra parte del texto o sin cerrar corchetes
  if (!estudianteDoc) {
    const matchDoc = (rawDesc || '').match(/(?:EstudianteDoc|IdentificacionEstudiante|Doc(?:umento)?):\s*([0-9A-Za-z.-]+)/i);
    if (matchDoc && matchDoc[1] && matchDoc[1].toLowerCase() !== 'n/a' && matchDoc[1].length >= 4) {
      estudianteDoc = matchDoc[1].trim();
    }
  }

  // Quitar caracteres residuales al inicio de la descripción limpia si existió fragmentación
  texto = texto.replace(/^\]\s*/, '').replace(/^\|\s*/, '').trim();

  return {
    descripcionLimpia: texto,
    ubicacion,
    modalidad,
    recursoId,
    asignatura,
    fechaAgenda,
    horaAgenda,
    estudianteDoc,
    estudianteNombre
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
  return fechaMananaIso();
}

export function construirEtiquetaMetaConsulta(info: {
  ubicacion?: string;
  modalidad?: string;
  recursoFisicoId?: number | null;
  asignatura?: string;
  fechaAgenda?: string;
  horaAgenda?: string;
  estudianteDoc?: string;
  estudianteNombre?: string;
}): string {
  const partes: string[] = [];
  const esPendiente =
    !info.ubicacion ||
    info.ubicacion === 'Por asignar' ||
    info.ubicacion.toLowerCase().includes('asignar') ||
    info.ubicacion.toLowerCase().includes('pendiente');
  if (!esPendiente) {
    partes.push(`Espacio: ${info.ubicacion}`);
  }
  if (info.modalidad) {
    partes.push(`Modalidad: ${info.modalidad}`);
  }
  if (info.recursoFisicoId) {
    partes.push(`RecursoID:${info.recursoFisicoId}`);
  }
  if (info.asignatura) {
    const asigLimpia = limpiarNombreAsignatura(info.asignatura)
      .replace(/[\[\]]/g, '')
      .trim();
    if (asigLimpia) {
      partes.push(`Asignatura: ${asigLimpia}`);
    }
  }
  if (info.fechaAgenda && info.horaAgenda) {
    partes.push(`Agenda: ${info.fechaAgenda}_${info.horaAgenda.substring(0, 5)}`);
  }
  if (info.estudianteDoc) {
    partes.push(`EstudianteDoc: ${info.estudianteDoc}`);
  }
  if (info.estudianteNombre) {
    partes.push(`Estudiante: ${info.estudianteNombre}`);
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
    const fechaCand = fechaIsoLocal(dt);

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
  let docFinal = (u.identificacion || '').trim();
  if (!docFinal && u.id) {
    docFinal = String(1045000000 + u.id);
  }
  return {
    id: u.id,
    tipoIdentificacion: (u.tipoDocumentoSigla === 'TI' ? 'TI' : 'CC') as 'CC' | 'TI',
    identificacion: docFinal,
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
    asignatura: limpiarNombreAsignatura(modulo.nombre, modulo.descripcion),
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

  const metaDesc = extraerMetadatosDescripcion(s.descripcion || '');
  const descripcionLimpia = metaDesc.descripcionLimpia;

  const nombreEstRaw = (s.nombreCompletoEstudiante || metaDesc.estudianteNombre || '').toLowerCase().trim();
  const usuarioEstudiante =
    usuariosMapeados.find((u) => u.id === s.estudianteId) ||
    (nombreEstRaw
      ? usuariosMapeados.find(
          (u) =>
            u.nombre.toLowerCase().trim() === nombreEstRaw ||
            `${u.nombreSolo || ''} ${u.apellido || ''}`.toLowerCase().trim() === nombreEstRaw ||
            (u.nombreSolo && nombreEstRaw.includes(u.nombreSolo.toLowerCase().trim())) ||
            (nombreEstRaw && u.nombre.toLowerCase().includes(nombreEstRaw))
        )
      : undefined);

  let docResuelto =
    s.identificacionEstudiante ||
    metaDesc.estudianteDoc ||
    usuarioEstudiante?.identificacion ||
    '';

  if (!docResuelto && typeof localStorage !== 'undefined') {
    try {
      const docLocal = localStorage.getItem('identificacionUsuarioActivo');
      const nombreLocal = (localStorage.getItem('nombreUsuarioActivo') || '').toLowerCase().trim();
      if (
        docLocal &&
        (nombreLocal === nombreEstRaw ||
          (usuarioEstudiante && usuarioEstudiante.nombre.toLowerCase().trim() === nombreLocal))
      ) {
        docResuelto = docLocal;
      }
    } catch {}
  }

  // Si la BD no entregó documento explícito, usar identificador institucional basado en el ID del estudiante
  if (!docResuelto && usuarioEstudiante?.id) {
    docResuelto = String(1045000000 + usuarioEstudiante.id);
  } else if (!docResuelto && s.estudianteId) {
    docResuelto = String(1045000000 + s.estudianteId);
  } else if (!docResuelto && s.id) {
    docResuelto = String(1045000000 + s.id);
  }

  const correoOPrograma =
    usuarioEstudiante?.email ||
    s.nombrePrograma ||
    (docResuelto ? `Doc: ${docResuelto}` : '');

  const fechaReal = metaDesc.fechaAgenda || s.fechaConsulta;
  const horaReal = metaDesc.horaAgenda || s.horaConsulta;
  const horaCorta = (horaReal || '').substring(0, 5);
  const recursoId =
    s.recursoFisicoId ||
    metaDesc.recursoId ||
    ubicGuardada?.recursoFisicoId ||
    null;

  const nombreRecursoApi =
    s.nombreRecursoFisico && s.nombreRecursoFisico !== 'Sin asignar'
      ? s.nombreRecursoFisico
      : null;

  let nombreRecurso =
    nombreRecursoApi ||
    metaDesc.ubicacion ||
    ubicGuardada?.ubicacion ||
    null;

  // Si aún no tenemos nombre pero hay un recursoId en BD o metadatos, resolver desde el catálogo de salones
  if (!nombreRecurso && recursoId && typeof localStorage !== 'undefined') {
    try {
      const rawSalones = localStorage.getItem('iub_salones_api_cache');
      if (rawSalones) {
        const listaSalones = JSON.parse(rawSalones);
        const salonEncontrado = Array.isArray(listaSalones)
          ? listaSalones.find((sal: any) => sal.id === recursoId)
          : null;
        if (salonEncontrado) {
          nombreRecurso =
            salonEncontrado.ubicacion ||
            `${salonEncontrado.sedeNombre || 'Sede'} - ${salonEncontrado.nombre}`;
        }
      }
    } catch {}
  }

  const modalidadResuelta =
    metaDesc.modalidad ||
    ubicGuardada?.modalidad ||
    (nombreRecurso?.toLowerCase().includes('virtual') ? 'Virtual' : 'Presencial');

  if (!nombreRecurso) {
    nombreRecurso =
      modalidadResuelta === 'Virtual'
        ? 'Campus Virtual Institucional'
        : 'Pendiente de asignación por el docente';
  }
  const asignaturaResuelta = limpiarNombreAsignatura(
    metaDesc.asignatura || s.nombreModulo,
    s.descripcion,
    s.nombreModulo
  );
  const metaRetro = s.retroalimentacionDocente
    ? extraerMetadatosActaComentario(s.retroalimentacionDocente)
    : null;
  const asuntoLimpio = (s.asunto || '').replace(/^Tema:\s*/i, '');
  const temaBase = metaRetro?.tema || asuntoLimpio;
  const temaFinal = temaBase && /^[a-z0-9\s]+$/.test(temaBase)
    ? normalizarCapitalizacionAsignatura(temaBase)
    : temaBase;
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
    estudiante: metaDesc.estudianteNombre || s.nombreCompletoEstudiante,
    documento: docResuelto || 'Sin registrar',
    correoEstudiante: correoOPrograma,
    nombrePrograma: s.nombrePrograma || usuarioEstudiante?.programa || 'Sin programa',
    moduloId: s.moduloId,
    asignatura: asignaturaResuelta,
    tema: temaFinal,
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
import { fechaIsoLocal, fechaMananaIso } from '../utils/comun';

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
    estudianteId?: number | null;
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
