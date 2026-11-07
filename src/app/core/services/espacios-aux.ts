import { Injectable, effect, inject, signal } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import {
  ApiPrincipal,
  RecursoFisicoResponseApi,
  SedeResponseApi,
  TipoEstructuraApi,
  ZonaResponseApi
} from './api-principal';

export interface SedeItem {
  id: number;
  codigo: string;
  nombre: string;
  tipoEstructura?: TipoEstructuraApi;
  ciudad: string;
  direccion: string;
  telefono: string;
  coordinador: string;
  capacidadAulas: number;
  estado: 'Activa' | 'En Mantenimiento' | 'Inactiva';
}

export type TipoSalon =
  | 'Sala de Informática'
  | 'Laboratorio'
  | 'Salón de Clase'
  | 'Aula de Tutoría'
  | 'Auditorio'
  | 'Sala Virtual';

export interface SalonSedeItem {
  id: number;
  sedeId?: number;
  zonaId?: number | null;
  codigo: string;
  nombre: string;
  tipo: TipoSalon;
  sedeNombre: string;
  bloquePiso: string;
  capacidad: number;
  equipamiento: string;
  estado: 'Disponible' | 'Ocupado' | 'En Mantenimiento' | 'Inactivo';
}

const STORAGE_KEY_SEDES = 'iub_sedes_api_cache';
const STORAGE_KEY_SALONES = 'iub_salones_api_cache';
const STORAGE_KEY_META_SEDES = 'iub_meta_sedes_v1';
const STORAGE_KEY_META_SALONES = 'iub_meta_salones_v1';

@Injectable({
  providedIn: 'root'
})
export class EspaciosAux {
  private readonly api = inject(ApiPrincipal, { optional: true });

  sedes = signal<SedeItem[]>(this.cargarCache(STORAGE_KEY_SEDES, []));
  zonas = signal<ZonaResponseApi[]>([]);
  salones = signal<SalonSedeItem[]>(this.cargarCache(STORAGE_KEY_SALONES, []));

  constructor() {
    effect(() => {
      const listaSedes = this.sedes();
      if (listaSedes.length > 0 && typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_SEDES, JSON.stringify(listaSedes));
      }
    });
    effect(() => {
      const listaSalones = this.salones();
      if (listaSalones.length > 0 && typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_SALONES, JSON.stringify(listaSalones));
      }
    });
  }

  private cargarCache<T>(key: string, fallback: T): T {
    try {
      if (typeof localStorage === 'undefined') return fallback;
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? (parsed as T) : fallback;
    } catch {
      return fallback;
    }
  }

  guardarMetaSede(id: number, meta: Partial<SedeItem>): void {
    try {
      if (typeof localStorage === 'undefined' || !id) return;
      const raw = localStorage.getItem(STORAGE_KEY_META_SEDES);
      const mapa = raw ? JSON.parse(raw) : {};
      mapa[String(id)] = { ...(mapa[String(id)] || {}), ...meta };
      localStorage.setItem(STORAGE_KEY_META_SEDES, JSON.stringify(mapa));
    } catch {
      // Ignorar errores de storage
    }
  }

  private obtenerMetaSede(id: number): Partial<SedeItem> | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(STORAGE_KEY_META_SEDES);
      if (!raw) return null;
      return JSON.parse(raw)[String(id)] || null;
    } catch {
      return null;
    }
  }

  guardarMetaSalon(id: number, meta: Partial<SalonSedeItem>): void {
    try {
      if (typeof localStorage === 'undefined' || !id) return;
      const raw = localStorage.getItem(STORAGE_KEY_META_SALONES);
      const mapa = raw ? JSON.parse(raw) : {};
      mapa[String(id)] = { ...(mapa[String(id)] || {}), ...meta };
      localStorage.setItem(STORAGE_KEY_META_SALONES, JSON.stringify(mapa));
    } catch {
      // Ignorar errores de storage
    }
  }

  private obtenerMetaSalon(id: number): Partial<SalonSedeItem> | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(STORAGE_KEY_META_SALONES);
      if (!raw) return null;
      return JSON.parse(raw)[String(id)] || null;
    } catch {
      return null;
    }
  }

  /**
   * Obtiene las sedes activas disponibles para agendar tutorías
   */
  obtenerSedesActivas(): SedeItem[] {
    return this.sedes().filter(s => s.estado === 'Activa');
  }

  /**
   * Obtiene los espacios/salones pertenecientes a una sede específica
   */
  obtenerEspaciosPorSede(sedeNombreOId: string | number): SalonSedeItem[] {
    const todos = this.salones().filter(
      s => s.estado !== 'Inactivo' && s.estado !== 'En Mantenimiento'
    );
    if (!sedeNombreOId) return todos;

    if (typeof sedeNombreOId === 'number') {
      return todos.filter(s => s.sedeId === sedeNombreOId);
    }
    const nombreLimpio = sedeNombreOId.toLowerCase().trim();
    return todos.filter(s => s.sedeNombre.toLowerCase().trim() === nombreLimpio);
  }

  /**
   * Sincroniza sedes (/sedes), zonas (/zonas) y recursos físicos (/recursos-fisicos).
   * Si el usuario es ADMIN solicita incluirInactivos=true; si es ESTUDIANTE/DOCENTE
   * solicita incluirInactivos=false, y si el endpoint restringe por rol (403),
   * utiliza la caché sincronizada o el catálogo institucional para que el estudiante
   * siempre pueda elegir sede y salón disponible.
   */
  sincronizarDesdeBackend(): void {
    if (!this.api || !this.api.baseUrl || !this.api.tieneTokenActivo()) return;

    const rolActual =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('rolActivo') || 'ESTUDIANTE'
        : 'ESTUDIANTE';
    const incluirInactivos = rolActual === 'ADMIN';

    forkJoin({
      sedesRemotas: this.api
        .listarSedes(incluirInactivos)
        .pipe(catchError(() => of(null))),
      zonasRemotas: this.api
        .listarZonas(undefined, incluirInactivos)
        .pipe(catchError(() => of(null))),
      recursosRemotos: this.api
        .listarRecursosFisicos(undefined, undefined, incluirInactivos)
        .pipe(catchError(() => of(null)))
    }).subscribe(({ sedesRemotas, zonasRemotas, recursosRemotos }) => {
      if (sedesRemotas === null && recursosRemotos === null) {
        return;
      }

      const listaSedes = sedesRemotas || [];
      const listaZonas = zonasRemotas || [];
      const listaRecursos = recursosRemotos || [];

      this.zonas.set(listaZonas);

      const sedesMapeadas: SedeItem[] = listaSedes.map((s) => {
        const zonasSede = listaZonas.filter((z) => z.sedeId === s.id);
        const recursosSede = listaRecursos.filter((r) => r.sedeId === s.id);
        const nombresZonas = zonasSede.map((z) => z.nombre).join(', ');
        const meta = this.obtenerMetaSede(s.id);

        return {
          id: s.id,
          codigo: meta?.codigo || `SED-${String(s.id).padStart(2, '0')}`,
          nombre: s.nombre,
          tipoEstructura: s.tipoEstructura,
          ciudad:
            meta?.ciudad ||
            (s.nombre.toLowerCase().includes('soledad') ? 'Soledad' : 'Barranquilla'),
          direccion:
            meta?.direccion ||
            (nombresZonas ? `${nombresZonas}` : `Estructura por ${s.tipoEstructura}`),
          telefono: meta?.telefono || `(605) 385 5050`,
          coordinador:
            meta?.coordinador || `${zonasSede.length} zona(s) configurada(s)`,
          capacidadAulas:
            recursosSede.length > 0
              ? recursosSede.length
              : Number(meta?.capacidadAulas || 0),
          estado: s.estado ? 'Activa' : 'Inactiva'
        };
      });

      if (sedesRemotas !== null) {
        this.sedes.set(sedesMapeadas);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_SEDES, JSON.stringify(sedesMapeadas));
        }
      }

      const salonesMapeados: SalonSedeItem[] = listaRecursos.map((r) => {
        const sedeObj = listaSedes.find((s) => s.id === r.sedeId);
        const zonaObj = listaZonas.find((z) => z.id === r.zonaId);
        const meta = this.obtenerMetaSalon(r.id);

        let tipoLocal: TipoSalon = meta?.tipo || 'Salón de Clase';
        if (!meta?.tipo) {
          if (r.tipo === 'LABORATORIO') tipoLocal = 'Laboratorio';
          else if (r.tipo === 'SALA') tipoLocal = 'Sala de Informática';
          else if (r.tipo === 'OFICINA') tipoLocal = 'Aula de Tutoría';
          else if (r.tipo === 'AUDITORIO') tipoLocal = 'Auditorio';
        }

        return {
          id: r.id,
          sedeId: r.sedeId,
          zonaId: r.zonaId,
          codigo: meta?.codigo || `${r.tipo.substring(0, 3)}-${String(r.id).padStart(2, '0')}`,
          nombre: r.nombre,
          tipo: tipoLocal,
          sedeNombre: sedeObj ? sedeObj.nombre : meta?.sedeNombre || 'Sede Institucional',
          bloquePiso:
            meta?.bloquePiso || zonaObj?.nombre || r.ubicacion || 'Ubicación Principal',
          capacidad: Number(meta?.capacidad || 30),
          equipamiento:
            meta?.equipamiento ||
            `Tipo: ${r.tipo}${zonaObj ? ' • Zona: ' + zonaObj.nombre : ''}`,
          estado: r.estado ? 'Disponible' : 'Inactivo'
        };
      });

      if (recursosRemotos !== null) {
        this.salones.set(salonesMapeados);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_SALONES, JSON.stringify(salonesMapeados));
        }
      }
    });
  }
}
