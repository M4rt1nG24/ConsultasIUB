import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';

// ============================================================================
// ENUMS Y TIPOS DEL ESQUEMA DE LA API PRINCIPAL
// ============================================================================

export type RolApi = 'ADMINISTRADOR' | 'DOCENTE' | 'ESTUDIANTE';
export type EstadoSolicitudApi = 'PENDIENTE' | 'RECHAZADA' | 'EN_PROCESO' | 'RESUELTA' | 'CANCELADA';
export type PrioridadSolicitudApi = 'ALTA' | 'MEDIA' | 'BAJA';
export type TipoEstructuraApi = 'BLOQUES' | 'SALONES' | 'PISOS';
export type TipoRecursoFisicoApi = 'SALON' | 'LABORATORIO' | 'AUDITORIO' | 'SALA' | 'OFICINA';
export type TipoNotificacionApi =
  | 'NUEVA_SOLICITUD'
  | 'CAMBIO_ESTADO'
  | 'REASIGNACION'
  | 'ASIGNACION_RECURSO'
  | 'CAMBIO_AGENDAMIENTO'
  | 'CANCELACION'
  | 'COMENTARIO';

// ============================================================================
// INTERFACES DE AUTENTICACIÓN Y PERFIL (/auth)
// ============================================================================

export interface ModuloInfoApi {
  nombre: string;
  ruta: string | null;
  icono: string | null;
}

export interface LoginRequestApi {
  correo: string;
  password: string;
}

export interface LoginResponseApi {
  token: string;
  id_usuario: number;
  correo: string;
  nombre: string;
  rol: RolApi;
  tipo?: string;
  modulos: ModuloInfoApi[];
}

export interface MeResponseApi {
  id: number;
  identificacion: string;
  correo: string;
  nombre: string;
  rol: RolApi;
  modulos: ModuloInfoApi[];
}

export interface RegistroUsuarioRequestApi {
  identificacion: string;
  nombre: string;
  apellido: string;
  correo: string;
  password: string;
  rol: RolApi;
  programaId?: number | null;
  tipoDocumentoId?: number | null;
}

export interface ForgotPasswordRequestApi {
  correo: string;
}

export interface ResetPasswordRequestApi {
  token: string;
  nuevaPassword: string;
}

export interface CambiarPasswordRequestApi {
  passwordActual: string;
  nuevaPassword: string;
}

// ============================================================================
// INTERFACES DE USUARIOS (/usuarios)
// ============================================================================

export interface UsuarioResponseApi {
  id: number;
  identificacion: string | null;
  nombre: string;
  apellido: string;
  correo: string | null;
  rol: RolApi;
  programaId: number | null;
  programaNombre: string | null;
  tipoDocumentoId: number | null;
  tipoDocumentoSigla: string | null;
  tipoDocumentoNombre: string | null;
  estado: boolean;
  fechaCreacion: string;
}

export interface UpdateUsuarioRequestApi {
  nombre: string;
  apellido: string;
  correo: string;
  programaId?: number | null;
  tipoDocumentoId?: number | null;
}

export interface DocenteResumenApi {
  id: number;
  nombre: string;
  apellido: string;
}

// ============================================================================
// INTERFACES DE ROLES Y MÓDULOS DEL SISTEMA (/roles, /modulos-sistema)
// ============================================================================

export interface RolResponseApi {
  id: number;
  nombre: string;
  descripcion: string | null;
  estado: boolean;
}

export interface RegistroRolRequestApi {
  nombre: string;
  descripcion?: string | null;
}

export interface ModuloAsignacionResponseApi {
  id: number;
  nombre: string;
  ruta: string | null;
  icono: string | null;
}

export interface AsignarModulosRequestApi {
  moduloIds: number[];
}

export interface ModuloSistemaResponseApi {
  id: number;
  nombre: string;
  descripcion: string | null;
  ruta: string | null;
  icono: string | null;
  estado: boolean;
}

export interface RegistroModuloSistemaRequestApi {
  nombre: string;
  descripcion?: string | null;
  ruta?: string | null;
  icono?: string | null;
}

// ============================================================================
// INTERFACES ACADÉMICAS (/programas, /modulos, /docentes-modulos, /periodos-academicos)
// ============================================================================

export interface ProgAcademicoResponseApi {
  id: number;
  nombre: string;
  estado: boolean;
}

export interface ModuloResponseApi {
  id: number;
  nombre: string;
  descripcion: string | null;
  estado: boolean;
}

export interface RegistroModuloRequestApi {
  nombre: string;
  descripcion: string;
}

export interface DocenteModuloResponseApi {
  id: number;
  docenteId: number;
  nombreDocente: string;
  moduloId: number;
  nombreModulo: string;
  estado: boolean;
}

export interface AsignarDocenteModuloRequestApi {
  docenteId: number;
  moduloId: number;
}

export interface PeriodoResponseApi {
  id: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  estado: boolean;
}

export interface RegistroPeriodoRequestApi {
  nombre: string;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string; // YYYY-MM-DD
}

export interface TipoDocumentoResponseApi {
  id: number;
  nombre: string;
  sigla: string;
  estado: boolean;
}

export interface RegistroTipoDocumentoRequestApi {
  nombre: string;
  sigla: string;
}

export interface DisponibilidadResponseApi {
  id: number;
  docenteId: number;
  nombreDocente: string;
  diaSemana: number; // 1 (Lunes) .. 7 (Domingo)
  horaInicio: string; // HH:mm
  horaFin: string; // HH:mm
  estado: boolean;
}

export interface RegistroDisponibilidadRequestApi {
  docenteId?: number | null;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}

export interface UpdateDisponibilidadRequestApi {
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}

export interface PromedioCalificacionesResponseApi {
  docenteId: number;
  promedio: number;
  total: number;
}

// ============================================================================
// INTERFACES DE SOLICITUDES DE CONSULTA Y COMENTARIOS (/solicitudes-consultas, /comentarios)
// ============================================================================

export interface CalificacionResumenSolicitudApi {
  puntaje: number;
  comentario: string | null;
  fecha: string;
}

export interface SolicitudConsultaResponseApi {
  id: number;
  numeroConsulta: string;
  estado: EstadoSolicitudApi;
  prioridad: PrioridadSolicitudApi;
  asunto: string;
  descripcion: string;
  fechaCreacion: string;
  fechaConsulta: string;
  horaConsulta: string;
  estudianteId: number;
  identificacionEstudiante: string | null;
  nombreCompletoEstudiante: string;
  docenteId: number;
  identificacionDocente: string | null;
  nombreCompletoDocente: string;
  moduloId: number;
  nombreModulo: string;
  nombrePrograma?: string | null;
  recursoFisicoId?: number | null;
  nombreRecursoFisico?: string | null;
  calificacion?: CalificacionResumenSolicitudApi | null;
  retroalimentacionDocente?: string | null;
}

export interface RegistroSolicitudConsultaRequestApi {
  prioridad: PrioridadSolicitudApi;
  asunto: string;
  descripcion: string;
  fechaConsulta: string; // YYYY-MM-DD
  horaConsulta: string; // HH:mm:ss
  docenteId: number;
  moduloId: number;
}

export interface UpdateSolicitudConsultaRequestApi {
  prioridad: PrioridadSolicitudApi;
  asunto: string;
  descripcion: string;
  fechaConsulta: string;
  horaConsulta: string;
  moduloId: number;
  motivo?: string | null;
}

export interface CambiarEstadoSolicitudRequestApi {
  estado: EstadoSolicitudApi;
  motivo?: string | null;
}

export interface ReasignarDocenteRequestApi {
  docenteId: number;
}

export interface AsignarRecursoFisicoRequestApi {
  recursoFisicoId: number;
}

export interface CalificacionRequestApi {
  puntaje: number;
  comentario?: string | null;
}

export interface CalificacionResponseApi {
  id: number;
  solicitudId: number;
  puntaje: number;
  comentario: string | null;
  docenteId: number;
  estudianteId: number;
  fechaCreacion: string;
}

export interface ComentarioResponseApi {
  id: number;
  autorId: number;
  nombreAutor: string;
  consultaId: number;
  numeroConsulta: string;
  contenido: string;
  fechaCreacion: string;
  editado?: boolean;
}

export interface RegistroComentarioRequestApi {
  contenido: string;
  solicitudConsultaId: number;
}

export interface NotificacionResponseApi {
  id: number;
  remitenteId: number;
  nombreRemitente: string;
  destinatarioId: number;
  nombreDestinatario: string;
  solicitudConsultaId: number;
  numeroConsulta: string;
  tipo: TipoNotificacionApi;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fechaCreacion: string;
}

// ============================================================================
// INTERFACES DE INFRAESTRUCTURA FÍSICA (/sedes, /zonas, /recursos-fisicos)
// ============================================================================

export interface SedeResponseApi {
  id: number;
  nombre: string;
  tipoEstructura: TipoEstructuraApi;
  estado: boolean;
}

export interface RegistroSedeRequestApi {
  nombre: string;
  tipoEstructura: TipoEstructuraApi;
}

export interface ZonaResponseApi {
  id: number;
  sedeId: number;
  nombre: string;
  estado: boolean;
}

export interface RegistroZonaRequestApi {
  sedeId: number;
  nombre: string;
}

export interface RecursoFisicoResponseApi {
  id: number;
  sedeId: number;
  zonaId: number | null;
  nombre: string;
  tipo: TipoRecursoFisicoApi;
  ubicacion: string;
  estado: boolean;
}

export interface RegistroRecursoFisicoRequestApi {
  sedeId: number;
  zonaId?: number | null;
  nombre: string;
  tipo?: TipoRecursoFisicoApi;
}

const STORAGE_KEY_TOKEN = 'iub_jwt_token';

@Injectable({
  providedIn: 'root'
})
export class ApiPrincipal {
  private readonly http = inject(HttpClient);

  /**
   * URL base configurada en src/environments/environment.ts.
   * En despliegue sobre Render (mismo origen con regla Rewrite /api-proxy/*) evita el bloqueo CORS.
   */
  readonly urlRemotaDirecta = environment.apiUrl;
  private usarProxyMismoOrigen =
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';

  get baseUrl(): string {
    return this.usarProxyMismoOrigen ? '/api-proxy' : this.urlRemotaDirecta;
  }

  /**
   * Verifica si existe un token JWT activo en localStorage.
   * No compara contra Date.now() local para evitar falsos positivos cuando el reloj
   * del sistema operativo del cliente difiere de la hora UTC del servidor.
   */
  tieneTokenActivo(): boolean {
    try {
      if (typeof localStorage === 'undefined') return false;
      const token = localStorage.getItem(STORAGE_KEY_TOKEN);
      return Boolean(token && token.split('.').length === 3);
    } catch {
      return false;
    }
  }

  private obtenerHeaders(): HttpHeaders {
    const token =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem(STORAGE_KEY_TOKEN) || ''
        : '';

    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  // ==========================================================================
  // 1. AUTH (/auth)
  // ==========================================================================

  login(payload: LoginRequestApi): Observable<LoginResponseApi> {
    return this.http.post<LoginResponseApi>(`${this.baseUrl}/auth/login`, payload).pipe(
      catchError((err) => {
        if (this.usarProxyMismoOrigen && (err?.status === 404 || err?.status === 405)) {
          this.usarProxyMismoOrigen = false;
          return this.http.post<LoginResponseApi>(`${this.urlRemotaDirecta}/auth/login`, payload);
        }
        throw err;
      })
    );
  }

  registrarUsuarioPublico(payload: RegistroUsuarioRequestApi): Observable<string> {
    return this.http.post<string>(`${this.baseUrl}/auth/register`, payload);
  }

  miPerfil(): Observable<MeResponseApi> {
    return this.http.get<MeResponseApi>(`${this.baseUrl}/auth/me`, {
      headers: this.obtenerHeaders()
    });
  }

  forgotPassword(payload: ForgotPasswordRequestApi): Observable<string> {
    return this.http.post<string>(`${this.baseUrl}/auth/forgot-password`, payload);
  }

  resetPassword(payload: ResetPasswordRequestApi): Observable<string> {
    return this.http.post<string>(`${this.baseUrl}/auth/reset-password`, payload);
  }

  cambiarPassword(payload: CambiarPasswordRequestApi): Observable<string> {
    return this.http.post<string>(`${this.baseUrl}/auth/cambiar-password`, payload, {
      headers: this.obtenerHeaders()
    });
  }

  // ==========================================================================
  // 2. USUARIOS (/usuarios)
  // ==========================================================================

  listarUsuarios(incluirInactivos = true): Observable<UsuarioResponseApi[]> {
    const params = new HttpParams().set('incluir_inactivos', String(incluirInactivos));
    return this.http.get<UsuarioResponseApi[]>(`${this.baseUrl}/usuarios`, {
      headers: this.obtenerHeaders(),
      params
    });
  }

  listarDocentes(): Observable<DocenteResumenApi[]> {
    return this.http.get<DocenteResumenApi[]>(`${this.baseUrl}/usuarios/docentes`, {
      headers: this.obtenerHeaders()
    });
  }

  obtenerUsuario(idUsuario: number): Observable<UsuarioResponseApi> {
    return this.http.get<UsuarioResponseApi>(`${this.baseUrl}/usuarios/${idUsuario}`, {
      headers: this.obtenerHeaders()
    });
  }

  crearUsuario(payload: RegistroUsuarioRequestApi): Observable<UsuarioResponseApi> {
    return this.http.post<UsuarioResponseApi>(`${this.baseUrl}/usuarios`, payload, {
      headers: this.obtenerHeaders()
    });
  }

  actualizarUsuario(idUsuario: number, payload: UpdateUsuarioRequestApi): Observable<UsuarioResponseApi> {
    return this.http.put<UsuarioResponseApi>(`${this.baseUrl}/usuarios/${idUsuario}`, payload, {
      headers: this.obtenerHeaders()
    });
  }

  desactivarUsuario(idUsuario: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/usuarios/${idUsuario}`, {
      headers: this.obtenerHeaders()
    });
  }

  activarUsuario(idUsuario: number): Observable<UsuarioResponseApi> {
    return this.http.patch<UsuarioResponseApi>(
      `${this.baseUrl}/usuarios/${idUsuario}/activar`,
      {},
      { headers: this.obtenerHeaders() }
    );
  }

  // ==========================================================================
  // 3. ROLES Y ROL X MÓDULO (/roles, /modulos-sistema)
  // ==========================================================================

  listarRoles(incluirInactivos = true): Observable<RolResponseApi[]> {
    const params = new HttpParams().set('incluir_inactivos', String(incluirInactivos));
    return this.http.get<RolResponseApi[]>(`${this.baseUrl}/roles`, {
      headers: this.obtenerHeaders(),
      params
    });
  }

  obtenerModulosDeRol(idRol: number): Observable<ModuloAsignacionResponseApi[]> {
    return this.http.get<ModuloAsignacionResponseApi[]>(`${this.baseUrl}/roles/${idRol}/modulos`, {
      headers: this.obtenerHeaders()
    });
  }

  reemplazarModulosDeRol(idRol: number, moduloIds: number[]): Observable<ModuloAsignacionResponseApi[]> {
    return this.http.put<ModuloAsignacionResponseApi[]>(
      `${this.baseUrl}/roles/${idRol}/modulos`,
      { moduloIds },
      { headers: this.obtenerHeaders() }
    );
  }

  listarModulosSistema(incluirInactivos = true): Observable<ModuloSistemaResponseApi[]> {
    const params = new HttpParams().set('incluir_inactivos', String(incluirInactivos));
    return this.http.get<ModuloSistemaResponseApi[]>(`${this.baseUrl}/modulos-sistema`, {
      headers: this.obtenerHeaders(),
      params
    });
  }

  // ==========================================================================
  // 4. PROGRAMAS, MÓDULOS, PERIODOS, TIPOS DE DOCUMENTO Y DISPONIBILIDAD
  // ==========================================================================

  listarProgramas(): Observable<ProgAcademicoResponseApi[]> {
    return this.http.get<ProgAcademicoResponseApi[]>(`${this.baseUrl}/programas`, {
      headers: this.obtenerHeaders()
    });
  }

  crearPrograma(nombre: string): Observable<ProgAcademicoResponseApi> {
    return this.http.post<ProgAcademicoResponseApi>(
      `${this.baseUrl}/programas`,
      { nombre },
      { headers: this.obtenerHeaders() }
    );
  }

  actualizarPrograma(idPrograma: number, nombre: string): Observable<ProgAcademicoResponseApi> {
    return this.http.put<ProgAcademicoResponseApi>(
      `${this.baseUrl}/programas/${idPrograma}`,
      { nombre },
      { headers: this.obtenerHeaders() }
    );
  }

  eliminarPrograma(idPrograma: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/programas/${idPrograma}`, {
      headers: this.obtenerHeaders()
    });
  }

  listarTiposDocumento(incluirInactivos = false): Observable<TipoDocumentoResponseApi[]> {
    const params = new HttpParams().set('incluir_inactivos', String(incluirInactivos));
    return this.http.get<TipoDocumentoResponseApi[]>(`${this.baseUrl}/tipos-documento`, {
      headers: this.obtenerHeaders(),
      params
    });
  }

  crearTipoDocumento(payload: RegistroTipoDocumentoRequestApi): Observable<TipoDocumentoResponseApi> {
    return this.http.post<TipoDocumentoResponseApi>(`${this.baseUrl}/tipos-documento`, payload, {
      headers: this.obtenerHeaders()
    });
  }

  listarPeriodosAcademicos(incluirInactivos = false): Observable<PeriodoResponseApi[]> {
    const params = new HttpParams().set('incluir_inactivos', String(incluirInactivos));
    return this.http.get<PeriodoResponseApi[]>(`${this.baseUrl}/periodos-academicos`, {
      headers: this.obtenerHeaders(),
      params
    });
  }

  crearPeriodoAcademico(payload: RegistroPeriodoRequestApi): Observable<PeriodoResponseApi> {
    return this.http.post<PeriodoResponseApi>(`${this.baseUrl}/periodos-academicos`, payload, {
      headers: this.obtenerHeaders()
    });
  }

  listarDisponibilidadDocente(
    docenteId?: number,
    incluirInactivos = false
  ): Observable<DisponibilidadResponseApi[]> {
    let params = new HttpParams().set('incluir_inactivos', String(incluirInactivos));
    if (docenteId) {
      params = params.set('docenteId', String(docenteId));
    }
    return this.http.get<DisponibilidadResponseApi[]>(`${this.baseUrl}/disponibilidad-docente`, {
      headers: this.obtenerHeaders(),
      params
    });
  }

  crearDisponibilidadDocente(
    payload: RegistroDisponibilidadRequestApi
  ): Observable<DisponibilidadResponseApi> {
    return this.http.post<DisponibilidadResponseApi>(
      `${this.baseUrl}/disponibilidad-docente`,
      payload,
      { headers: this.obtenerHeaders() }
    );
  }

  actualizarDisponibilidadDocente(
    idDisponibilidad: number,
    payload: UpdateDisponibilidadRequestApi
  ): Observable<DisponibilidadResponseApi> {
    return this.http.put<DisponibilidadResponseApi>(
      `${this.baseUrl}/disponibilidad-docente/${idDisponibilidad}`,
      payload,
      { headers: this.obtenerHeaders() }
    );
  }

  eliminarDisponibilidadDocente(idDisponibilidad: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/disponibilidad-docente/${idDisponibilidad}`,
      { headers: this.obtenerHeaders() }
    );
  }

  activarDisponibilidadDocente(idDisponibilidad: number): Observable<DisponibilidadResponseApi> {
    return this.http.patch<DisponibilidadResponseApi>(
      `${this.baseUrl}/disponibilidad-docente/${idDisponibilidad}/activar`,
      {},
      { headers: this.obtenerHeaders() }
    );
  }

  obtenerPromedioCalificacionesDocente(
    idDocente: number
  ): Observable<PromedioCalificacionesResponseApi> {
    return this.http.get<PromedioCalificacionesResponseApi>(
      `${this.baseUrl}/docentes/${idDocente}/calificaciones/promedio`,
      { headers: this.obtenerHeaders() }
    );
  }

  listarModulosAsignaturas(): Observable<ModuloResponseApi[]> {
    return this.http.get<ModuloResponseApi[]>(`${this.baseUrl}/modulos`, {
      headers: this.obtenerHeaders()
    });
  }

  crearModuloAsignatura(payload: RegistroModuloRequestApi): Observable<ModuloResponseApi> {
    return this.http.post<ModuloResponseApi>(`${this.baseUrl}/modulos`, payload, {
      headers: this.obtenerHeaders()
    });
  }

  actualizarModuloAsignatura(idModulo: number, payload: RegistroModuloRequestApi): Observable<ModuloResponseApi> {
    return this.http.put<ModuloResponseApi>(`${this.baseUrl}/modulos/${idModulo}`, payload, {
      headers: this.obtenerHeaders()
    });
  }

  desactivarModuloAsignatura(idModulo: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/modulos/${idModulo}`, {
      headers: this.obtenerHeaders()
    });
  }

  listarDocentesPorModulo(idModulo: number): Observable<DocenteResumenApi[]> {
    return this.http.get<DocenteResumenApi[]>(`${this.baseUrl}/modulos/${idModulo}/docentes`, {
      headers: this.obtenerHeaders()
    });
  }

  listarDocentesModulos(incluirInactivos = true): Observable<DocenteModuloResponseApi[]> {
    const params = new HttpParams().set('incluir_inactivos', String(incluirInactivos));
    return this.http.get<DocenteModuloResponseApi[]>(`${this.baseUrl}/docentes-modulos`, {
      headers: this.obtenerHeaders(),
      params
    });
  }

  asignarDocenteModulo(payload: AsignarDocenteModuloRequestApi): Observable<DocenteModuloResponseApi> {
    return this.http.post<DocenteModuloResponseApi>(`${this.baseUrl}/docentes-modulos`, payload, {
      headers: this.obtenerHeaders()
    });
  }

  desactivarDocenteModulo(idAsignacion: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/docentes-modulos/${idAsignacion}`, {
      headers: this.obtenerHeaders()
    });
  }

  activarDocenteModulo(idAsignacion: number): Observable<DocenteModuloResponseApi> {
    return this.http.patch<DocenteModuloResponseApi>(
      `${this.baseUrl}/docentes-modulos/${idAsignacion}/activar`,
      {},
      { headers: this.obtenerHeaders() }
    );
  }

  // ==========================================================================
  // 5. SOLICITUDES DE CONSULTA (/solicitudes-consultas)
  // ==========================================================================

  listarSolicitudesConsulta(): Observable<SolicitudConsultaResponseApi[]> {
    return this.http.get<SolicitudConsultaResponseApi[]>(`${this.baseUrl}/solicitudes-consultas`, {
      headers: this.obtenerHeaders()
    });
  }

  obtenerSolicitudConsulta(idSolicitud: number): Observable<SolicitudConsultaResponseApi> {
    return this.http.get<SolicitudConsultaResponseApi>(
      `${this.baseUrl}/solicitudes-consultas/${idSolicitud}`,
      { headers: this.obtenerHeaders() }
    );
  }

  registrarSolicitudConsulta(payload: RegistroSolicitudConsultaRequestApi): Observable<SolicitudConsultaResponseApi> {
    return this.http.post<SolicitudConsultaResponseApi>(
      `${this.baseUrl}/solicitudes-consultas`,
      payload,
      { headers: this.obtenerHeaders() }
    );
  }

  actualizarSolicitudConsulta(
    idSolicitud: number,
    payload: UpdateSolicitudConsultaRequestApi
  ): Observable<SolicitudConsultaResponseApi> {
    return this.http.put<SolicitudConsultaResponseApi>(
      `${this.baseUrl}/solicitudes-consultas/${idSolicitud}`,
      payload,
      { headers: this.obtenerHeaders() }
    );
  }

  eliminarSolicitudConsulta(idSolicitud: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/solicitudes-consultas/${idSolicitud}`, {
      headers: this.obtenerHeaders()
    });
  }

  cambiarEstadoSolicitud(
    idSolicitud: number,
    payload: CambiarEstadoSolicitudRequestApi
  ): Observable<SolicitudConsultaResponseApi> {
    return this.http.patch<SolicitudConsultaResponseApi>(
      `${this.baseUrl}/solicitudes-consultas/${idSolicitud}/estado`,
      payload,
      { headers: this.obtenerHeaders() }
    );
  }

  reasignarDocenteSolicitud(
    idSolicitud: number,
    docenteId: number
  ): Observable<SolicitudConsultaResponseApi> {
    return this.http.patch<SolicitudConsultaResponseApi>(
      `${this.baseUrl}/solicitudes-consultas/${idSolicitud}/docente`,
      { docenteId },
      { headers: this.obtenerHeaders() }
    );
  }

  asignarRecursoFisicoSolicitud(
    idSolicitud: number,
    recursoFisicoId: number
  ): Observable<SolicitudConsultaResponseApi> {
    return this.http.patch<SolicitudConsultaResponseApi>(
      `${this.baseUrl}/solicitudes-consultas/${idSolicitud}/recurso-fisico`,
      { recursoFisicoId },
      { headers: this.obtenerHeaders() }
    );
  }

  calificarSolicitud(
    idSolicitud: number,
    payload: CalificacionRequestApi
  ): Observable<CalificacionResponseApi> {
    return this.http.post<CalificacionResponseApi>(
      `${this.baseUrl}/solicitudes-consultas/${idSolicitud}/calificacion`,
      payload,
      { headers: this.obtenerHeaders() }
    );
  }

  obtenerCalificacionSolicitud(idSolicitud: number): Observable<CalificacionResponseApi> {
    return this.http.get<CalificacionResponseApi>(
      `${this.baseUrl}/solicitudes-consultas/${idSolicitud}/calificacion`,
      { headers: this.obtenerHeaders() }
    );
  }

  // ==========================================================================
  // 6. COMENTARIOS Y NOTIFICACIONES (/comentarios, /notificaciones)
  // ==========================================================================

  listarComentariosPorSolicitud(solicitudConsultaId: number): Observable<ComentarioResponseApi[]> {
    return this.http.get<ComentarioResponseApi[]>(
      `${this.baseUrl}/comentarios/solicitud/${solicitudConsultaId}`,
      { headers: this.obtenerHeaders() }
    );
  }

  registrarComentario(payload: RegistroComentarioRequestApi): Observable<ComentarioResponseApi> {
    return this.http.post<ComentarioResponseApi>(`${this.baseUrl}/comentarios`, payload, {
      headers: this.obtenerHeaders()
    });
  }

  actualizarComentario(idComentario: number, contenido: string): Observable<ComentarioResponseApi> {
    return this.http.put<ComentarioResponseApi>(
      `${this.baseUrl}/comentarios/${idComentario}`,
      { contenido },
      { headers: this.obtenerHeaders() }
    );
  }

  eliminarComentario(idComentario: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/comentarios/${idComentario}`, {
      headers: this.obtenerHeaders()
    });
  }

  listarNotificaciones(): Observable<NotificacionResponseApi[]> {
    return this.http.get<NotificacionResponseApi[]>(`${this.baseUrl}/notificaciones`, {
      headers: this.obtenerHeaders()
    });
  }

  contarNotificacionesNoLeidas(): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/notificaciones/no-leidas/count`, {
      headers: this.obtenerHeaders()
    });
  }

  marcarNotificacionLeida(idNotificacion: number): Observable<NotificacionResponseApi> {
    return this.http.patch<NotificacionResponseApi>(
      `${this.baseUrl}/notificaciones/${idNotificacion}/leer`,
      {},
      { headers: this.obtenerHeaders() }
    );
  }

  eliminarNotificacion(idNotificacion: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/notificaciones/${idNotificacion}`, {
      headers: this.obtenerHeaders()
    });
  }

  // ==========================================================================
  // 7. INFRAESTRUCTURA FÍSICA: SEDES, ZONAS Y SALONES (/sedes, /zonas, /recursos-fisicos)
  // ==========================================================================

  listarSedes(incluirInactivos = true): Observable<SedeResponseApi[]> {
    const params = new HttpParams().set('incluirInactivos', String(incluirInactivos));
    return this.http.get<SedeResponseApi[]>(`${this.baseUrl}/sedes`, {
      headers: this.obtenerHeaders(),
      params
    });
  }

  crearSede(payload: RegistroSedeRequestApi): Observable<SedeResponseApi> {
    return this.http.post<SedeResponseApi>(`${this.baseUrl}/sedes`, payload, {
      headers: this.obtenerHeaders()
    });
  }

  actualizarSede(idSede: number, payload: RegistroSedeRequestApi): Observable<SedeResponseApi> {
    return this.http.put<SedeResponseApi>(`${this.baseUrl}/sedes/${idSede}`, payload, {
      headers: this.obtenerHeaders()
    });
  }

  desactivarSede(idSede: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/sedes/${idSede}`, {
      headers: this.obtenerHeaders()
    });
  }

  activarSede(idSede: number): Observable<SedeResponseApi> {
    return this.http.patch<SedeResponseApi>(
      `${this.baseUrl}/sedes/${idSede}/activar`,
      {},
      { headers: this.obtenerHeaders() }
    );
  }

  listarZonas(sedeId?: number, incluirInactivos = true): Observable<ZonaResponseApi[]> {
    let params = new HttpParams().set('incluirInactivos', String(incluirInactivos));
    if (sedeId) {
      params = params.set('sedeId', String(sedeId));
    }
    return this.http.get<ZonaResponseApi[]>(`${this.baseUrl}/zonas`, {
      headers: this.obtenerHeaders(),
      params
    });
  }

  crearZona(payload: RegistroZonaRequestApi): Observable<ZonaResponseApi> {
    return this.http.post<ZonaResponseApi>(`${this.baseUrl}/zonas`, payload, {
      headers: this.obtenerHeaders()
    });
  }

  actualizarZona(idZona: number, payload: RegistroZonaRequestApi): Observable<ZonaResponseApi> {
    return this.http.put<ZonaResponseApi>(`${this.baseUrl}/zonas/${idZona}`, payload, {
      headers: this.obtenerHeaders()
    });
  }

  desactivarZona(idZona: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/zonas/${idZona}`, {
      headers: this.obtenerHeaders()
    });
  }

  activarZona(idZona: number): Observable<ZonaResponseApi> {
    return this.http.patch<ZonaResponseApi>(
      `${this.baseUrl}/zonas/${idZona}/activar`,
      {},
      { headers: this.obtenerHeaders() }
    );
  }

  listarZonasDeSede(idSede: number, incluirInactivos = false): Observable<ZonaResponseApi[]> {
    const params = new HttpParams().set('incluirInactivos', String(incluirInactivos));
    return this.http.get<ZonaResponseApi[]>(`${this.baseUrl}/sedes/${idSede}/zonas`, {
      headers: this.obtenerHeaders(),
      params
    });
  }

  listarRecursosDeSede(
    idSede: number,
    incluirInactivos = false
  ): Observable<RecursoFisicoResponseApi[]> {
    const params = new HttpParams().set('incluirInactivos', String(incluirInactivos));
    return this.http.get<RecursoFisicoResponseApi[]>(
      `${this.baseUrl}/sedes/${idSede}/recursos-fisicos`,
      {
        headers: this.obtenerHeaders(),
        params
      }
    );
  }

  listarRecursosDeZona(
    idZona: number,
    incluirInactivos = false
  ): Observable<RecursoFisicoResponseApi[]> {
    const params = new HttpParams().set('incluirInactivos', String(incluirInactivos));
    return this.http.get<RecursoFisicoResponseApi[]>(
      `${this.baseUrl}/zonas/${idZona}/recursos-fisicos`,
      {
        headers: this.obtenerHeaders(),
        params
      }
    );
  }

  listarRecursosFisicos(
    sedeId?: number,
    zonaId?: number,
    incluirInactivos = true
  ): Observable<RecursoFisicoResponseApi[]> {
    let params = new HttpParams().set('incluirInactivos', String(incluirInactivos));
    if (sedeId) params = params.set('sedeId', String(sedeId));
    if (zonaId) params = params.set('zonaId', String(zonaId));
    return this.http.get<RecursoFisicoResponseApi[]>(`${this.baseUrl}/recursos-fisicos`, {
      headers: this.obtenerHeaders(),
      params
    });
  }

  crearRecursoFisico(payload: RegistroRecursoFisicoRequestApi): Observable<RecursoFisicoResponseApi> {
    return this.http.post<RecursoFisicoResponseApi>(`${this.baseUrl}/recursos-fisicos`, payload, {
      headers: this.obtenerHeaders()
    });
  }

  actualizarRecursoFisico(
    idRecurso: number,
    payload: RegistroRecursoFisicoRequestApi
  ): Observable<RecursoFisicoResponseApi> {
    return this.http.put<RecursoFisicoResponseApi>(
      `${this.baseUrl}/recursos-fisicos/${idRecurso}`,
      payload,
      { headers: this.obtenerHeaders() }
    );
  }

  desactivarRecursoFisico(idRecurso: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/recursos-fisicos/${idRecurso}`, {
      headers: this.obtenerHeaders()
    });
  }

  activarRecursoFisico(idRecurso: number): Observable<RecursoFisicoResponseApi> {
    return this.http.patch<RecursoFisicoResponseApi>(
      `${this.baseUrl}/recursos-fisicos/${idRecurso}/activar`,
      {},
      { headers: this.obtenerHeaders() }
    );
  }

  /**
   * Extrae el mensaje de error legible del formato uniforme del backend FastAPI/Express:
   * { timestamp, status, error, message, errors }
   */
  extraerMensajeError(err: any, porDefecto = 'Ocurrió un error al procesar la solicitud.'): string {
    if (!err) return porDefecto;
    const body = err.error;
    if (body) {
      if (body.errors && typeof body.errors === 'object') {
        const detalles = Object.entries(body.errors)
          .map(([campo, msg]) => `${campo}: ${msg}`)
          .join(' | ');
        if (detalles) {
          return body.message && body.message !== 'Error de validación.'
            ? `${body.message} (${detalles})`
            : detalles;
        }
      }
      if (typeof body.message === 'string' && body.message.trim()) {
        return body.message;
      }
      if (typeof body.detail === 'string' && body.detail.trim()) {
        return body.detail;
      }
      if (typeof body === 'string' && body.trim()) {
        return body;
      }
    }
    return err.message || porDefecto;
  }
}

