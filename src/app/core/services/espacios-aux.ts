import { Injectable, inject, signal } from '@angular/core';
import { ApiPrincipal, RecursoFisicoResponseApi, SedeResponseApi } from './api-principal';

export interface SedeItem {
  id: number;
  codigo: string;
  nombre: string;
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
  | 'Sala Virtual';

export interface SalonSedeItem {
  id: number;
  codigo: string;
  nombre: string;
  tipo: TipoSalon;
  sedeNombre: string;
  bloquePiso: string;
  capacidad: number;
  equipamiento: string;
  estado: 'Disponible' | 'Ocupado' | 'En Mantenimiento' | 'Inactivo';
}

@Injectable({
  providedIn: 'root'
})
export class EspaciosAux {
  private readonly api = inject(ApiPrincipal, { optional: true });

  sedes = signal<SedeItem[]>([
    {
      id: 1,
      codigo: 'SED-BAQ-01',
      nombre: 'Sede Plaza de la Paz',
      ciudad: 'Barranquilla',
      direccion: 'Cra. 45 # 48-31, Barrio Abajo',
      telefono: '(605) 385 5050',
      coordinador: 'Ing. Roberto Pineda',
      capacidadAulas: 38,
      estado: 'Activa'
    },
    {
      id: 2,
      codigo: 'SED-SOL-01',
      nombre: 'Sede Soledad Principal',
      ciudad: 'Soledad',
      direccion: 'Calle 18 # 39-100, Soledad, Atlántico',
      telefono: '(605) 311 2400',
      coordinador: 'Ing. Carlos Mendoza',
      capacidadAulas: 45,
      estado: 'Activa'
    },
    {
      id: 3,
      codigo: 'SED-BAQ-02',
      nombre: 'Sede Posgrados y Educación Continua',
      ciudad: 'Barranquilla',
      direccion: 'Cra. 54 # 68-80, El Prado',
      telefono: '(605) 385 5060',
      coordinador: 'Ing. Diana Rodríguez',
      capacidadAulas: 18,
      estado: 'Activa'
    },
    {
      id: 4,
      codigo: 'SED-VIR-01',
      nombre: 'Campus Virtual Institucional IUB',
      ciudad: 'Barranquilla / Remoto',
      direccion: 'Plataforma Microsoft Teams & Google Meet',
      telefono: '(605) 385 5050 Ext. 402',
      coordinador: 'Ing. Laura Gómez',
      capacidadAulas: 120,
      estado: 'Activa'
    }
  ]);

  salones = signal<SalonSedeItem[]>([
    {
      id: 1,
      codigo: 'INF-101',
      nombre: 'Sala de Informática 10 (Desarrollo y Algoritmia)',
      tipo: 'Sala de Informática',
      sedeNombre: 'Sede Plaza de la Paz',
      bloquePiso: 'Bloque B - Piso 2',
      capacidad: 30,
      equipamiento: '30 PCs Core i7, Video Beam, Tablero Acrílico',
      estado: 'Disponible'
    },
    {
      id: 2,
      codigo: 'LAB-204',
      nombre: 'Laboratorio de Redes, IoT e Inteligencia Artificial #4',
      tipo: 'Laboratorio',
      sedeNombre: 'Sede Plaza de la Paz',
      bloquePiso: 'Bloque C - Piso 3',
      capacidad: 25,
      equipamiento: '25 Estaciones GPU, Switches Cisco, Pantalla Smart 75"',
      estado: 'Disponible'
    },
    {
      id: 3,
      codigo: 'SAL-302',
      nombre: 'Salón de Clase 302B (Ciencias Básicas)',
      tipo: 'Salón de Clase',
      sedeNombre: 'Sede Soledad Principal',
      bloquePiso: 'Bloque A - Piso 3',
      capacidad: 40,
      equipamiento: 'Televisor 65", Aire Acondicionado, Tablero Doble',
      estado: 'Disponible'
    },
    {
      id: 4,
      codigo: 'INF-208',
      nombre: 'Sala de Informática 27 (Bases de Datos y Web)',
      tipo: 'Sala de Informática',
      sedeNombre: 'Sede Plaza de la Paz',
      bloquePiso: 'Bloque B - Piso 3',
      capacidad: 28,
      equipamiento: '28 PCs, Motor SQL / PostgreSQL, Proyector HD',
      estado: 'Ocupado'
    },
    {
      id: 5,
      codigo: 'TUT-105',
      nombre: 'Aula de Tutorías y Semilleros A1',
      tipo: 'Aula de Tutoría',
      sedeNombre: 'Sede Posgrados y Educación Continua',
      bloquePiso: 'Edificio Central - Piso 1',
      capacidad: 12,
      equipamiento: 'Mesa colaborativa, Pantalla interactiva, Wi-Fi 6',
      estado: 'Disponible'
    }
  ]);

  /**
   * Sincroniza sedes y recursos físicos (salones) desde la API principal en Render
   * (GET /sedes y GET /recursos-fisicos)
   */
  sincronizarDesdeBackend(): void {
    if (!this.api) return;

    this.api.listarSedes(true).subscribe({
      next: (sedesRemotas: SedeResponseApi[]) => {
        if (!sedesRemotas || sedesRemotas.length === 0) return;
        const mapeadas: SedeItem[] = sedesRemotas.map((s, idx) => ({
          id: s.id,
          codigo: `SED-IUB-0${idx + 1}`,
          nombre: s.nombre,
          ciudad: s.nombre.toLowerCase().includes('soledad') ? 'Soledad' : 'Barranquilla',
          direccion: `Estructura por ${s.tipoEstructura}`,
          telefono: '(605) 385 5050',
          coordinador: 'Coordinación de Infraestructura IUB',
          capacidadAulas: 35,
          estado: s.estado ? 'Activa' : 'Inactiva'
        }));
        this.sedes.set(mapeadas);
      },
      error: () => {
        // Conserva sedes locales en caso de no tener sesión activa o conexión
      }
    });

    this.api.listarRecursosFisicos(undefined, undefined, true).subscribe({
      next: (recursosRemotos: RecursoFisicoResponseApi[]) => {
        if (!recursosRemotos || recursosRemotos.length === 0) return;
        const sedesActuales = this.sedes();
        const mapeados: SalonSedeItem[] = recursosRemotos.map((r, idx) => {
          const sedeObj = sedesActuales.find((s) => s.id === r.sedeId);
          let tipoLocal: TipoSalon = 'Salón de Clase';
          if (r.tipo === 'LABORATORIO') tipoLocal = 'Laboratorio';
          else if (r.tipo === 'SALA') tipoLocal = 'Sala de Informática';
          else if (r.tipo === 'OFICINA') tipoLocal = 'Aula de Tutoría';

          return {
            id: r.id,
            codigo: `${r.tipo.substring(0, 3)}-${100 + idx}`,
            nombre: r.nombre,
            tipo: tipoLocal,
            sedeNombre: sedeObj ? sedeObj.nombre : 'Sede Plaza de la Paz',
            bloquePiso: r.ubicacion || 'Edificio Principal',
            capacidad: 30,
            equipamiento: `Espacio ${r.tipo} institucional dotado`,
            estado: r.estado ? 'Disponible' : 'Inactivo'
          };
        });
        this.salones.set(mapeados);
      },
      error: () => {
        // Conserva salones locales
      }
    });
  }
}
