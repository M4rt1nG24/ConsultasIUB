import { PrioridadSolicitudApi } from '../models/api-principal.models';

/** true cuando hay localStorage disponible (no en SSR). */
export const hayStorage = (): boolean => typeof localStorage !== 'undefined';

/** Lee una clave de localStorage; devuelve `porDefecto` si no existe o no hay storage. */
export function leerStorage(clave: string, porDefecto = ''): string {
  return hayStorage() ? localStorage.getItem(clave) || porDefecto : porDefecto;
}

/** Guarda una clave en localStorage si está disponible. */
export function escribirStorage(clave: string, valor: string): void {
  if (hayStorage()) localStorage.setItem(clave, valor);
}

/** Guarda varias claves en localStorage de una vez. */
export function guardarVariosStorage(valores: Record<string, string>): void {
  if (!hayStorage()) return;
  for (const [clave, valor] of Object.entries(valores)) localStorage.setItem(clave, valor);
}

/** Elimina varias claves de localStorage de una vez. */
export function borrarVariosStorage(claves: string[]): void {
  if (!hayStorage()) return;
  for (const clave of claves) localStorage.removeItem(clave);
}

/** Datos de la sesión activa guardados en localStorage al iniciar sesión. */
export const sesion = {
  rol: (porDefecto = 'ESTUDIANTE') => leerStorage('rolActivo', porDefecto),
  idUsuario: () => Number(leerStorage('idUsuarioActivo')) || 0,
  nombre: () => leerStorage('nombreUsuarioActivo'),
  correo: () => leerStorage('correoActivo'),
  identificacion: () => leerStorage('identificacionUsuarioActivo')
};

const dos = (n: number): string => String(n).padStart(2, '0');

/** Fecha local en formato YYYY-MM-DD. */
export function fechaIsoLocal(fecha: Date = new Date()): string {
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

/** Fecha de mañana en formato YYYY-MM-DD. */
export function fechaMananaIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return fechaIsoLocal(d);
}

/** Marca de tiempo legible: DD/MM/YYYY - HH:mm */
export function marcaTiempo(fecha: Date = new Date()): string {
  return `${dos(fecha.getDate())}/${dos(fecha.getMonth() + 1)}/${fecha.getFullYear()} - ${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
}

/** Convierte la prioridad del front ('Alta' | 'Media' | 'Baja') al formato de la API. */
export function aPrioridadApi(prioridad?: string): PrioridadSolicitudApi {
  return prioridad === 'Alta' ? 'ALTA' : prioridad === 'Baja' ? 'BAJA' : 'MEDIA';
}

/** Asunto válido para la API (mínimo 5 caracteres, máximo 100). */
export function asuntoSeguro(tema: string): string {
  const t = (tema || '').trim();
  return (t.length >= 5 ? t : `Tema: ${t}`).substring(0, 100);
}

/** Franjas horarias ofrecidas al estudiante para agendar una consulta. */
export const HORARIOS_CONSULTA: ReadonlyArray<{ valor: string; etiqueta: string }> = [
  { valor: '08:00', etiqueta: '08:00 AM - 09:00 AM (Mañana)' },
  { valor: '09:00', etiqueta: '09:00 AM - 10:00 AM (Mañana)' },
  { valor: '10:00', etiqueta: '10:00 AM - 11:00 AM (Mañana)' },
  { valor: '11:00', etiqueta: '11:00 AM - 12:00 PM (Mañana)' },
  { valor: '14:00', etiqueta: '02:00 PM - 03:00 PM (Tarde)' },
  { valor: '15:00', etiqueta: '03:00 PM - 04:00 PM (Tarde)' },
  { valor: '16:00', etiqueta: '04:00 PM - 05:00 PM (Tarde)' },
  { valor: '17:00', etiqueta: '05:00 PM - 06:00 PM (Tarde)' },
  { valor: '18:00', etiqueta: '06:00 PM - 07:00 PM (Noche)' },
  { valor: '19:00', etiqueta: '07:00 PM - 08:00 PM (Noche)' }
];
