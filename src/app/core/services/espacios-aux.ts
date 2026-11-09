import { Injectable, effect, inject, signal } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import {
  ApiPrincipal,
  RecursoFisicoResponseApi,
  SedeResponseApi,
  TipoEstructuraApi,
  TipoRecursoFisicoApi,
  ZonaResponseApi
} from './api-principal';

/**
 * Modelo de Sede institucional sincronizado 1:1 con la tabla 'sedes' de PostgreSQL.
 * Columnas: id, nombre, tipo_estructura (BLOQUES, SALONES, PISOS), estado.
 */
export interface SedeItem {
  id: number;
  nombre: string;
  tipoEstructura: TipoEstructuraApi;
  estado: 'Activa' | 'Inactiva';
  totalZonas: number;
  totalRecursos: number;
}

/**
 * Modelo de Espacio Físico (Salón/Laboratorio) sincronizado 1:1 con la tabla 'recursos_fisicos' de PostgreSQL.
 * Columnas: id, sede_id, zona_id, nombre, tipo (SALON, LABORATORIO, AUDITORIO, SALA, OFICINA), estado.
 */
export interface SalonSedeItem {
  id: number;
  sedeId: number;
  sedeNombre: string;
  zonaId?: number | null;
  zonaNombre?: string;
  bloquePiso?: string;
  nombre: string;
  tipo: TipoRecursoFisicoApi;
  ubicacion: string;
  estado: 'Disponible' | 'Inactivo';
}

const STORAGE_KEY_SEDES = 'iub_sedes_api_cache';
const STORAGE_KEY_SALONES = 'iub_salones_api_cache';

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
    const todos = this.salones().filter(s => s.estado === 'Disponible');
    if (!sedeNombreOId) return todos;

    if (typeof sedeNombreOId === 'number') {
      return todos.filter(s => s.sedeId === sedeNombreOId);
    }
    const nombreLimpio = String(sedeNombreOId).toLowerCase().trim();
    return todos.filter(s => s.sedeNombre.toLowerCase().trim() === nombreLimpio);
  }

  /**
   * Sincroniza sedes (/sedes), zonas (/zonas) y recursos físicos (/recursos-fisicos)
   * directamente desde PostgreSQL vía FastAPI.
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

        return {
          id: s.id,
          nombre: s.nombre,
          tipoEstructura: s.tipoEstructura,
          estado: s.estado ? 'Activa' : 'Inactiva',
          totalZonas: zonasSede.length,
          totalRecursos: recursosSede.length
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
        const nombreZonaResuelta =
          r.nombreZona || (zonaObj ? zonaObj.nombre : (r.zonaId ? `Zona ${r.zonaId}` : 'Sin zona asignada'));

        return {
          id: r.id,
          sedeId: r.sedeId,
          zonaId: r.zonaId,
          nombre: r.nombre,
          tipo: r.tipo,
          sedeNombre: r.nombreSede || (sedeObj ? sedeObj.nombre : 'Sede Institucional'),
          zonaNombre: nombreZonaResuelta,
          bloquePiso: nombreZonaResuelta,
          ubicacion: r.ubicacion || `${sedeObj?.nombre || 'Sede'} - ${r.nombre}`,
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
