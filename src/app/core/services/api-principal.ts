import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
export * from '../models/api-principal.models';
import {
  RolApi,
  EstadoSolicitudApi,
  PrioridadSolicitudApi,
  TipoEstructuraApi,
  TipoRecursoFisicoApi,
  TipoNotificacionApi,
  ModuloInfoApi,
  LoginRequestApi,
  LoginResponseApi,
  MeResponseApi,
  RegistroUsuarioRequestApi,
  ForgotPasswordRequestApi,
  ResetPasswordRequestApi,
  CambiarPasswordRequestApi,
  UsuarioResponseApi,
  UpdateUsuarioRequestApi,
  DocenteResumenApi,
  RolResponseApi,
  RegistroRolRequestApi,
  ModuloAsignacionResponseApi,
  AsignarModulosRequestApi,
  ModuloSistemaResponseApi,
  RegistroModuloSistemaRequestApi,
  ProgAcademicoResponseApi,
  ModuloResponseApi,
  RegistroModuloRequestApi,
  DocenteModuloResponseApi,
  AsignarDocenteModuloRequestApi,
  PeriodoResponseApi,
  RegistroPeriodoRequestApi,
  TipoDocumentoResponseApi,
  RegistroTipoDocumentoRequestApi,
  DisponibilidadResponseApi,
  RegistroDisponibilidadRequestApi,
  UpdateDisponibilidadRequestApi,
  PromedioCalificacionesResponseApi,
  CalificacionResumenSolicitudApi,
  SolicitudConsultaResponseApi,
  RegistroSolicitudConsultaRequestApi,
  UpdateSolicitudConsultaRequestApi,
  CambiarEstadoSolicitudRequestApi,
  ReasignarDocenteRequestApi,
  AsignarRecursoFisicoRequestApi,
  CalificacionRequestApi,
  CalificacionResponseApi,
  ComentarioResponseApi,
  RegistroComentarioRequestApi,
  NotificacionResponseApi,
  SedeResponseApi,
  RegistroSedeRequestApi,
  ZonaResponseApi,
  RegistroZonaRequestApi,
  RecursoFisicoResponseApi,
  RegistroRecursoFisicoRequestApi
} from '../models/api-principal.models';

const STORAGE_KEY_TOKEN = 'iub_jwt_token';

@Injectable({
  providedIn: 'root'
})
export class ApiPrincipal {
  private readonly http = inject(HttpClient);

  /**
   * URL base remota directa del backend en Render.
   */
  readonly urlRemotaDirecta = 'https://sistemaconsultas-api.onrender.com';
  private readonly usarProxyMismoOrigen = typeof window !== 'undefined';

  get baseUrl(): string {
    if (typeof localStorage !== 'undefined') {
      const personalizada = localStorage.getItem('iub_api_url');
      if (
        personalizada &&
        personalizada.trim() &&
        !personalizada.includes('onrender.com') &&
        !personalizada.includes('sistemaconsultas-api')
      ) {
        return personalizada.trim().replace(/\/+$/, '');
      }
    }
    // En el navegador, siempre usar el proxy de mismo origen (/api-proxy)
    // para evitar cualquier bloqueo de CORS en localhost (Angular CLI) o proxies inversos.
    if (this.usarProxyMismoOrigen) {
      return '/api-proxy';
    }
    return this.urlRemotaDirecta;
  }

  establecerBaseUrl(url: string): void {
    if (typeof localStorage !== 'undefined') {
      if (url && url.trim() && !url.includes('onrender.com')) {
        localStorage.setItem('iub_api_url', url.trim().replace(/\/+$/, ''));
      } else {
        localStorage.removeItem('iub_api_url');
      }
    }
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
    return this.http.post<LoginResponseApi>(`${this.baseUrl}/auth/login`, payload);
  }

  registrarUsuarioPublico(payload: RegistroUsuarioRequestApi): Observable<string> {
    return this.http.post(`${this.baseUrl}/auth/register`, payload, {
      responseType: 'text'
    });
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
    if (err.status === 0) {
      return 'El servidor backend en la nube (Render) está despertando de su suspensión o tardó en responder. Por favor espera unos segundos y reintenta.';
    }
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
        try {
          const parsed = JSON.parse(body);
          if (parsed && typeof parsed === 'object') {
            return this.extraerMensajeError({ error: parsed, status: err.status }, porDefecto);
          }
        } catch {}
        return body;
      }
    }
    return err.message || porDefecto;
  }
}

