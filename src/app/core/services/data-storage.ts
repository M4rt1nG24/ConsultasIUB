import { PrioridadSolicitudApi } from '../models/api-principal.models';

const STORAGE_KEY_UBICACIONES = 'iub_ubicaciones_consulta_v1';
const STORAGE_KEY_ATENCIONES = 'iub_atenciones_docente_cache';
const STORAGE_KEY_SOLICITUDES_PENDIENTES = 'iub_solicitudes_pendientes_bd';

export interface UbicacionInfoLocal {
  ubicacion: string;
  recursoFisicoId?: number | null;
  modalidad: string;
}

export interface SolicitudPendienteBd {
  localId: number;
  prioridad: PrioridadSolicitudApi;
  asunto: string;
  descripcion: string;
  fechaConsulta: string;
  horaConsulta: string;
  docenteId: number;
  moduloId: number;
}

export function guardarUbicacionLocal(
  clave: string,
  info: UbicacionInfoLocal
): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEY_UBICACIONES);
    const mapa = raw ? JSON.parse(raw) : {};
    mapa[clave] = info;
    localStorage.setItem(STORAGE_KEY_UBICACIONES, JSON.stringify(mapa));
  } catch {}
}

export function obtenerUbicacionLocal(
  id: number,
  fechaConsulta: string,
  horaConsulta: string
): UbicacionInfoLocal | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY_UBICACIONES);
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

export function guardarAtencionDocenteLocal(
  id: number | string,
  datos: {
    tipoAtencion: string;
    tema: string;
    observaciones: string;
    asistencia: number;
  }
): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const mapa = obtenerAtencionesDocenteLocales();
    mapa[String(id)] = datos;
    localStorage.setItem(STORAGE_KEY_ATENCIONES, JSON.stringify(mapa));
  } catch {}
}

export function obtenerAtencionesDocenteLocales(): Record<string, any> {
  if (typeof localStorage === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_ATENCIONES) || '{}');
  } catch {
    return {};
  }
}

export function encolarSolicitudPendienteBD(solicitud: SolicitudPendienteBd): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const cola: SolicitudPendienteBd[] = obtenerSolicitudesPendientesBD();
    cola.push(solicitud);
    guardarSolicitudesPendientesBD(cola);
  } catch {}
}

export function obtenerSolicitudesPendientesBD(): SolicitudPendienteBd[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SOLICITUDES_PENDIENTES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function guardarSolicitudesPendientesBD(cola: SolicitudPendienteBd[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SOLICITUDES_PENDIENTES, JSON.stringify(cola));
  } catch {}
}


export function cargarCacheDeStorage<T>(key: string, fallback: T): T {
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

export function guardarCacheEnStorage(key: string, data: any): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

import { TipoDocumentoResponseApi } from '../models/api-principal.models';

export const STORAGE_KEY_CONSULTAS = 'iub_consultas_api_cache';
export const STORAGE_KEY_CURSOS = 'iub_cursos_api_cache';
export const STORAGE_KEY_USUARIOS = 'iub_usuarios_api_cache';
export const STORAGE_KEY_CONSULTA_ACTIVA = 'iub_consulta_activa_id';

export const TIPOS_DOC_FALLBACK: TipoDocumentoResponseApi[] = [
  { id: 1, sigla: 'CC', nombre: 'Cédula de Ciudadanía', estado: true },
  { id: 2, sigla: 'TI', nombre: 'Tarjeta de Identidad', estado: true },
  { id: 3, sigla: 'CE', nombre: 'Cédula de Extranjería', estado: true },
  { id: 4, sigla: 'PAS', nombre: 'Pasaporte', estado: true },
];
