import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { Auth } from './auth';

// ============================================================================
// INTERFACES BASADAS EN EL ESQUEMA MYSQL (schema.sql)
// Tablas: servicios_externos, consultas_servicio_externo, festivos, correos_enviados
// ============================================================================

export interface ServicioExterno {
  id?: number;
  nombre: string;
  url_base: string;
  descripcion: string | null;
  estado: number; // 1 = Activo, 0 = Inactivo
  creado?: string;
  actualizado?: string;
}

export interface ConsultaServicioExterno {
  id?: number;
  servicio_id: number;
  referencia: string; // UUID CHAR(36)
  endpoint: string;
  codigo_http: number | null;
  exito: number; // 1 = Éxito, 0 = Fallo
  duracion_ms: number | null;
  detalle: string | null;
  estado: number; // 1 = Activo, 0 = Inactivo
  creado?: string;
  actualizado?: string;
}

export interface FestivoExterno {
  id?: number;
  servicio_id: number;
  consulta_servicio_id: number | null;
  fecha: string; // YYYY-MM-DD
  pais: string; // 'CO'
  nombre: string;
  anio: number;
  estado: number; // 1 = Activo, 0 = Inactivo
  creado?: string;
  actualizado?: string;
}

export type EstadoEnvioCorreo = 'ENVIADO' | 'FALLIDO';

export interface CorreoEnviadoExterno {
  id?: number;
  servicio_id: number;
  consulta_servicio_id: number;
  destinatario: string;
  asunto: string;
  estado_envio: EstadoEnvioCorreo;
  respuesta_proveedor: string | null;
  estado: number; // 1 = Activo, 0 = Inactivo
  creado?: string;
  actualizado?: string;
}

export interface SolicitudEnvioCorreoBrevo {
  destinatario: string;
  asunto: string;
  contenidoHtml?: string;
  contenidoTexto?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ServiciosExternos {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(Auth);

  /**
   * URL base del microservicio adicional (Express + MySQL 8)
   * Puedes ajustar el puerto según tu configuración local (ej. 3001 o 4000).
   */
  readonly apiUrl = 'http://localhost:3001/api';

  // Signals reactivos para almacenar el estado en memoria de las 4 tablas
  readonly servicios = signal<ServicioExterno[]>([
    {
      id: 1,
      nombre: 'Nager.Date',
      url_base: 'https://date.nager.at/api/v3',
      descripcion: 'API pública de días festivos oficiales por país y año',
      estado: 1,
      creado: '2026-10-01 08:00:00',
      actualizado: '2026-10-01 08:00:00'
    },
    {
      id: 2,
      nombre: 'Brevo',
      url_base: 'https://api.brevo.com/v3/smtp/email',
      descripcion: 'Servicio de correo transaccional HTTP para notificaciones de tutorías',
      estado: 1,
      creado: '2026-10-01 08:00:00',
      actualizado: '2026-10-01 08:00:00'
    }
  ]);

  readonly consultasAuditoria = signal<ConsultaServicioExterno[]>([]);
  readonly festivos = signal<FestivoExterno[]>([]);
  readonly correosEnviados = signal<CorreoEnviadoExterno[]>([]);

  /**
   * Construye los headers HTTP incluyendo el token JWT si existe sesión activa
   */
  private obtenerHeaders(): HttpHeaders {
    const token = this.authService.tokenJWT();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  // ==========================================================================
  // 1. TABLA: servicios_externos
  // ==========================================================================

  listarServiciosExternos(): Observable<ServicioExterno[]> {
    return this.http
      .get<ServicioExterno[]>(`${this.apiUrl}/servicios-externos`, {
        headers: this.obtenerHeaders()
      })
      .pipe(
        tap((lista) => this.servicios.set(lista)),
        catchError(() => of(this.servicios()))
      );
  }

  crearServicioExterno(payload: Omit<ServicioExterno, 'id' | 'creado' | 'actualizado'>): Observable<ServicioExterno> {
    return this.http
      .post<ServicioExterno>(`${this.apiUrl}/servicios-externos`, payload, {
        headers: this.obtenerHeaders()
      })
      .pipe(
        tap((nuevo) => this.servicios.update((actual) => [...actual, nuevo]))
      );
  }

  actualizarServicioExterno(id: number, payload: Partial<ServicioExterno>): Observable<ServicioExterno> {
    return this.http
      .put<ServicioExterno>(`${this.apiUrl}/servicios-externos/${id}`, payload, {
        headers: this.obtenerHeaders()
      })
      .pipe(
        tap((actualizado) =>
          this.servicios.update((lista) =>
            lista.map((item) => (item.id === id ? { ...item, ...actualizado } : item))
          )
        )
      );
  }

  /**
   * Borrado lógico (cambia estado 1 <-> 0) según lineamiento del taller
   */
  cambiarEstadoServicioExterno(id: number, nuevoEstado: 0 | 1): Observable<ServicioExterno> {
    return this.http
      .patch<ServicioExterno>(
        `${this.apiUrl}/servicios-externos/${id}/estado`,
        { estado: nuevoEstado },
        { headers: this.obtenerHeaders() }
      )
      .pipe(
        tap(() =>
          this.servicios.update((lista) =>
            lista.map((item) => (item.id === id ? { ...item, estado: nuevoEstado } : item))
          )
        )
      );
  }

  // ==========================================================================
  // 2. TABLA: consultas_servicio_externo (Auditoría de llamadas HTTP a APIs)
  // ==========================================================================

  listarConsultasServicioExterno(): Observable<ConsultaServicioExterno[]> {
    return this.http
      .get<ConsultaServicioExterno[]>(`${this.apiUrl}/consultas-servicio-externo`, {
        headers: this.obtenerHeaders()
      })
      .pipe(
        tap((lista) => this.consultasAuditoria.set(lista)),
        catchError(() => of(this.consultasAuditoria()))
      );
  }

  obtenerConsultaPorReferencia(referenciaUuid: string): Observable<ConsultaServicioExterno> {
    return this.http.get<ConsultaServicioExterno>(
      `${this.apiUrl}/consultas-servicio-externo/referencia/${referenciaUuid}`,
      { headers: this.obtenerHeaders() }
    );
  }

  cambiarEstadoConsultaExterno(id: number, nuevoEstado: 0 | 1): Observable<ConsultaServicioExterno> {
    return this.http
      .patch<ConsultaServicioExterno>(
        `${this.apiUrl}/consultas-servicio-externo/${id}/estado`,
        { estado: nuevoEstado },
        { headers: this.obtenerHeaders() }
      )
      .pipe(
        tap(() =>
          this.consultasAuditoria.update((lista) =>
            lista.map((item) => (item.id === id ? { ...item, estado: nuevoEstado } : item))
          )
        )
      );
  }

  // ==========================================================================
  // 3. TABLA: festivos (Integración con Nager.Date)
  // ==========================================================================

  listarFestivos(anio: number = new Date().getFullYear(), pais: string = 'CO'): Observable<FestivoExterno[]> {
    const params = new HttpParams()
      .set('anio', String(anio))
      .set('pais', pais);

    return this.http
      .get<FestivoExterno[]>(`${this.apiUrl}/festivos`, {
        headers: this.obtenerHeaders(),
        params
      })
      .pipe(
        tap((lista) => this.festivos.set(lista)),
        catchError(() => of(this.festivos()))
      );
  }

  /**
   * Dispara en el backend la consulta a Nager.Date para un año y país,
   * registrando la traza en `consultas_servicio_externo` y guardando en `festivos`.
   */
  sincronizarFestivosDesdeNager(anio: number, pais: string = 'CO'): Observable<FestivoExterno[]> {
    return this.http
      .post<FestivoExterno[]>(
        `${this.apiUrl}/festivos/sincronizar`,
        { anio, pais },
        { headers: this.obtenerHeaders() }
      )
      .pipe(
        tap((lista) => this.festivos.set(lista))
      );
  }

  /**
   * Verifica en memoria si una fecha YYYY-MM-DD corresponde a un día festivo activo
   */
  esFechaFestiva(fechaIso: string): FestivoExterno | undefined {
    return this.festivos().find(
      (f) => f.fecha === fechaIso && f.estado === 1
    );
  }

  cambiarEstadoFestivo(id: number, nuevoEstado: 0 | 1): Observable<FestivoExterno> {
    return this.http
      .patch<FestivoExterno>(
        `${this.apiUrl}/festivos/${id}/estado`,
        { estado: nuevoEstado },
        { headers: this.obtenerHeaders() }
      )
      .pipe(
        tap(() =>
          this.festivos.update((lista) =>
            lista.map((item) => (item.id === id ? { ...item, estado: nuevoEstado } : item))
          )
        )
      );
  }

  // ==========================================================================
  // 4. TABLA: correos_enviados (Integración con Brevo API HTTP)
  // ==========================================================================

  listarCorreosEnviados(): Observable<CorreoEnviadoExterno[]> {
    return this.http
      .get<CorreoEnviadoExterno[]>(`${this.apiUrl}/correos-enviados`, {
        headers: this.obtenerHeaders()
      })
      .pipe(
        tap((lista) => this.correosEnviados.set(lista)),
        catchError(() => of(this.correosEnviados()))
      );
  }

  /**
   * Envía un correo transaccional mediante el endpoint del backend conectado a Brevo,
   * el cual registra automáticamente en `consultas_servicio_externo` y `correos_enviados`.
   */
  enviarCorreoTransaccional(payload: SolicitudEnvioCorreoBrevo): Observable<CorreoEnviadoExterno> {
    return this.http
      .post<CorreoEnviadoExterno>(`${this.apiUrl}/correos-enviados/enviar`, payload, {
        headers: this.obtenerHeaders()
      })
      .pipe(
        tap((nuevoCorreo) =>
          this.correosEnviados.update((lista) => [nuevoCorreo, ...lista])
        )
      );
  }

  cambiarEstadoCorreoEnviado(id: number, nuevoEstado: 0 | 1): Observable<CorreoEnviadoExterno> {
    return this.http
      .patch<CorreoEnviadoExterno>(
        `${this.apiUrl}/correos-enviados/${id}/estado`,
        { estado: nuevoEstado },
        { headers: this.obtenerHeaders() }
      )
      .pipe(
        tap(() =>
          this.correosEnviados.update((lista) =>
            lista.map((item) => (item.id === id ? { ...item, estado: nuevoEstado } : item))
          )
        )
      );
  }
}
