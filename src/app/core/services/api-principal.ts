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
import { leerStorage } from '../utils/comun';

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

  // Helpers para peticiones autenticadas: anteponen baseUrl y añaden el token JWT.
  private opcionesAuth(params?: HttpParams) {
    return params ? { headers: this.obtenerHeaders(), params } : { headers: this.obtenerHeaders() };
  }

  private getAuth<T>(ruta: string, params?: HttpParams): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${ruta}`, this.opcionesAuth(params));
  }

  private postAuth<T>(ruta: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${ruta}`, body, this.opcionesAuth());
  }

  private putAuth<T>(ruta: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${ruta}`, body, this.opcionesAuth());
  }

  private patchAuth<T>(ruta: string, body: unknown): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${ruta}`, body, this.opcionesAuth());
  }

  private deleteAuth<T>(ruta: string, params?: HttpParams): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${ruta}`, this.opcionesAuth(params));
  }

  private obtenerHeaders(): HttpHeaders {
    const token = leerStorage(STORAGE_KEY_TOKEN);
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return token ? headers.set('Authorization', `Bearer ${token}`) : headers;
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
    return this.getAuth<MeResponseApi>(`/auth/me`);
  }

  forgotPassword(payload: ForgotPasswordRequestApi): Observable<string> {
    return this.http.post<string>(`${this.baseUrl}/auth/forgot-password`, payload);
  }

  resetPassword(payload: ResetPasswordRequestApi): Observable<string> {
    return this.http.post<string>(`${this.baseUrl}/auth/reset-password`, payload);
  }

  cambiarPassword(payload: CambiarPasswordRequestApi): Observable<string> {
    return this.postAuth<string>(`/auth/cambiar-password`, payload);
  }

  // ==========================================================================
  // 2. USUARIOS (/usuarios)
  // ==========================================================================

  listarUsuarios(incluirInactivos = true): Observable<UsuarioResponseApi[]> {
    const params = new HttpParams().set('incluir_inactivos', String(incluirInactivos));
    return this.getAuth<UsuarioResponseApi[]>(`/usuarios`, params);
  }

  listarDocentes(): Observable<DocenteResumenApi[]> {
    return this.getAuth<DocenteResumenApi[]>(`/usuarios/docentes`);
  }

  obtenerUsuario(idUsuario: number): Observable<UsuarioResponseApi> {
    return this.getAuth<UsuarioResponseApi>(`/usuarios/${idUsuario}`);
  }

  crearUsuario(payload: RegistroUsuarioRequestApi): Observable<UsuarioResponseApi> {
    return this.postAuth<UsuarioResponseApi>(`/usuarios`, payload);
  }

  actualizarUsuario(idUsuario: number, payload: UpdateUsuarioRequestApi): Observable<UsuarioResponseApi> {
    return this.putAuth<UsuarioResponseApi>(`/usuarios/${idUsuario}`, payload);
  }

  desactivarUsuario(idUsuario: number): Observable<void> {
    return this.deleteAuth<void>(`/usuarios/${idUsuario}`);
  }

  activarUsuario(idUsuario: number): Observable<UsuarioResponseApi> {
    return this.patchAuth<UsuarioResponseApi>(`/usuarios/${idUsuario}/activar`, {});
  }

  // ==========================================================================
  // 3. ROLES Y ROL X MÓDULO (/roles, /modulos-sistema)
  // ==========================================================================

  listarRoles(incluirInactivos = true): Observable<RolResponseApi[]> {
    const params = new HttpParams().set('incluir_inactivos', String(incluirInactivos));
    return this.getAuth<RolResponseApi[]>(`/roles`, params);
  }

  obtenerModulosDeRol(idRol: number): Observable<ModuloAsignacionResponseApi[]> {
    return this.getAuth<ModuloAsignacionResponseApi[]>(`/roles/${idRol}/modulos`);
  }

  reemplazarModulosDeRol(idRol: number, moduloIds: number[]): Observable<ModuloAsignacionResponseApi[]> {
    return this.putAuth<ModuloAsignacionResponseApi[]>(`/roles/${idRol}/modulos`, { moduloIds });
  }

  listarModulosSistema(incluirInactivos = true): Observable<ModuloSistemaResponseApi[]> {
    const params = new HttpParams().set('incluir_inactivos', String(incluirInactivos));
    return this.getAuth<ModuloSistemaResponseApi[]>(`/modulos-sistema`, params);
  }

  // ==========================================================================
  // 4. PROGRAMAS, MÓDULOS, PERIODOS, TIPOS DE DOCUMENTO Y DISPONIBILIDAD
  // ==========================================================================

  listarProgramas(): Observable<ProgAcademicoResponseApi[]> {
    return this.getAuth<ProgAcademicoResponseApi[]>(`/programas`);
  }

  crearPrograma(nombre: string): Observable<ProgAcademicoResponseApi> {
    return this.postAuth<ProgAcademicoResponseApi>(`/programas`, { nombre });
  }

  actualizarPrograma(idPrograma: number, nombre: string): Observable<ProgAcademicoResponseApi> {
    return this.putAuth<ProgAcademicoResponseApi>(`/programas/${idPrograma}`, { nombre });
  }

  eliminarPrograma(idPrograma: number): Observable<void> {
    return this.deleteAuth<void>(`/programas/${idPrograma}`);
  }

  listarTiposDocumento(incluirInactivos = false): Observable<TipoDocumentoResponseApi[]> {
    const params = new HttpParams().set('incluir_inactivos', String(incluirInactivos));
    return this.getAuth<TipoDocumentoResponseApi[]>(`/tipos-documento`, params);
  }

  crearTipoDocumento(payload: RegistroTipoDocumentoRequestApi): Observable<TipoDocumentoResponseApi> {
    return this.postAuth<TipoDocumentoResponseApi>(`/tipos-documento`, payload);
  }

  listarPeriodosAcademicos(incluirInactivos = false): Observable<PeriodoResponseApi[]> {
    const params = new HttpParams().set('incluir_inactivos', String(incluirInactivos));
    return this.getAuth<PeriodoResponseApi[]>(`/periodos-academicos`, params);
  }

  crearPeriodoAcademico(payload: RegistroPeriodoRequestApi): Observable<PeriodoResponseApi> {
    return this.postAuth<PeriodoResponseApi>(`/periodos-academicos`, payload);
  }

  listarDisponibilidadDocente(
    docenteId?: number,
    incluirInactivos = false
  ): Observable<DisponibilidadResponseApi[]> {
    let params = new HttpParams().set('incluir_inactivos', String(incluirInactivos));
    if (docenteId) {
      params = params.set('docenteId', String(docenteId));
    }
    return this.getAuth<DisponibilidadResponseApi[]>(`/disponibilidad-docente`, params);
  }

  crearDisponibilidadDocente(
    payload: RegistroDisponibilidadRequestApi
  ): Observable<DisponibilidadResponseApi> {
    return this.postAuth<DisponibilidadResponseApi>(`/disponibilidad-docente`, payload);
  }

  actualizarDisponibilidadDocente(
    idDisponibilidad: number,
    payload: UpdateDisponibilidadRequestApi
  ): Observable<DisponibilidadResponseApi> {
    return this.putAuth<DisponibilidadResponseApi>(`/disponibilidad-docente/${idDisponibilidad}`, payload);
  }

  eliminarDisponibilidadDocente(idDisponibilidad: number): Observable<void> {
    return this.deleteAuth<void>(`/disponibilidad-docente/${idDisponibilidad}`);
  }

  activarDisponibilidadDocente(idDisponibilidad: number): Observable<DisponibilidadResponseApi> {
    return this.patchAuth<DisponibilidadResponseApi>(`/disponibilidad-docente/${idDisponibilidad}/activar`, {});
  }

  obtenerPromedioCalificacionesDocente(
    idDocente: number
  ): Observable<PromedioCalificacionesResponseApi> {
    return this.getAuth<PromedioCalificacionesResponseApi>(`/docentes/${idDocente}/calificaciones/promedio`);
  }

  listarModulosAsignaturas(): Observable<ModuloResponseApi[]> {
    return this.getAuth<ModuloResponseApi[]>(`/modulos`);
  }

  crearModuloAsignatura(payload: RegistroModuloRequestApi): Observable<ModuloResponseApi> {
    return this.postAuth<ModuloResponseApi>(`/modulos`, payload);
  }

  actualizarModuloAsignatura(idModulo: number, payload: RegistroModuloRequestApi): Observable<ModuloResponseApi> {
    return this.putAuth<ModuloResponseApi>(`/modulos/${idModulo}`, payload);
  }

  desactivarModuloAsignatura(idModulo: number): Observable<void> {
    return this.deleteAuth<void>(`/modulos/${idModulo}`);
  }

  listarDocentesPorModulo(idModulo: number): Observable<DocenteResumenApi[]> {
    return this.getAuth<DocenteResumenApi[]>(`/modulos/${idModulo}/docentes`);
  }

  listarDocentesModulos(incluirInactivos = true): Observable<DocenteModuloResponseApi[]> {
    const params = new HttpParams().set('incluir_inactivos', String(incluirInactivos));
    return this.getAuth<DocenteModuloResponseApi[]>(`/docentes-modulos`, params);
  }

  asignarDocenteModulo(payload: AsignarDocenteModuloRequestApi): Observable<DocenteModuloResponseApi> {
    return this.postAuth<DocenteModuloResponseApi>(`/docentes-modulos`, payload);
  }

  desactivarDocenteModulo(idAsignacion: number): Observable<void> {
    return this.deleteAuth<void>(`/docentes-modulos/${idAsignacion}`);
  }

  activarDocenteModulo(idAsignacion: number): Observable<DocenteModuloResponseApi> {
    return this.patchAuth<DocenteModuloResponseApi>(`/docentes-modulos/${idAsignacion}/activar`, {});
  }

  // ==========================================================================
  // 5. SOLICITUDES DE CONSULTA (/solicitudes-consultas)
  // ==========================================================================

  listarSolicitudesConsulta(): Observable<SolicitudConsultaResponseApi[]> {
    return this.getAuth<SolicitudConsultaResponseApi[]>(`/solicitudes-consultas`);
  }

  obtenerSolicitudConsulta(idSolicitud: number): Observable<SolicitudConsultaResponseApi> {
    return this.getAuth<SolicitudConsultaResponseApi>(`/solicitudes-consultas/${idSolicitud}`);
  }

  registrarSolicitudConsulta(payload: RegistroSolicitudConsultaRequestApi): Observable<SolicitudConsultaResponseApi> {
    return this.postAuth<SolicitudConsultaResponseApi>(`/solicitudes-consultas`, payload);
  }

  actualizarSolicitudConsulta(
    idSolicitud: number,
    payload: UpdateSolicitudConsultaRequestApi
  ): Observable<SolicitudConsultaResponseApi> {
    return this.putAuth<SolicitudConsultaResponseApi>(`/solicitudes-consultas/${idSolicitud}`, payload);
  }

  eliminarSolicitudConsulta(idSolicitud: number): Observable<void> {
    return this.deleteAuth<void>(`/solicitudes-consultas/${idSolicitud}`);
  }

  cambiarEstadoSolicitud(
    idSolicitud: number,
    payload: CambiarEstadoSolicitudRequestApi
  ): Observable<SolicitudConsultaResponseApi> {
    return this.patchAuth<SolicitudConsultaResponseApi>(`/solicitudes-consultas/${idSolicitud}/estado`, payload);
  }

  reasignarDocenteSolicitud(
    idSolicitud: number,
    docenteId: number
  ): Observable<SolicitudConsultaResponseApi> {
    return this.patchAuth<SolicitudConsultaResponseApi>(`/solicitudes-consultas/${idSolicitud}/docente`, { docenteId });
  }

  asignarRecursoFisicoSolicitud(
    idSolicitud: number,
    recursoFisicoId: number
  ): Observable<SolicitudConsultaResponseApi> {
    return this.patchAuth<SolicitudConsultaResponseApi>(`/solicitudes-consultas/${idSolicitud}/recurso-fisico`, {
      recursoFisicoId,
      recurso_fisico_id: recursoFisicoId
    });
  }

  calificarSolicitud(
    idSolicitud: number,
    payload: CalificacionRequestApi
  ): Observable<CalificacionResponseApi> {
    return this.postAuth<CalificacionResponseApi>(`/solicitudes-consultas/${idSolicitud}/calificacion`, payload);
  }

  obtenerCalificacionSolicitud(idSolicitud: number): Observable<CalificacionResponseApi> {
    return this.getAuth<CalificacionResponseApi>(`/solicitudes-consultas/${idSolicitud}/calificacion`);
  }

  // ==========================================================================
  // 6. COMENTARIOS Y NOTIFICACIONES (/comentarios, /notificaciones)
  // ==========================================================================

  listarComentariosPorSolicitud(solicitudConsultaId: number): Observable<ComentarioResponseApi[]> {
    return this.getAuth<ComentarioResponseApi[]>(`/comentarios/solicitud/${solicitudConsultaId}`);
  }

  registrarComentario(payload: RegistroComentarioRequestApi): Observable<ComentarioResponseApi> {
    return this.postAuth<ComentarioResponseApi>(`/comentarios`, payload);
  }

  actualizarComentario(idComentario: number, contenido: string): Observable<ComentarioResponseApi> {
    return this.putAuth<ComentarioResponseApi>(`/comentarios/${idComentario}`, { contenido });
  }

  eliminarComentario(idComentario: number): Observable<void> {
    return this.deleteAuth<void>(`/comentarios/${idComentario}`);
  }

  listarNotificaciones(): Observable<NotificacionResponseApi[]> {
    return this.getAuth<NotificacionResponseApi[]>(`/notificaciones`);
  }

  contarNotificacionesNoLeidas(): Observable<number> {
    return this.getAuth<number>(`/notificaciones/no-leidas/count`);
  }

  marcarNotificacionLeida(idNotificacion: number): Observable<NotificacionResponseApi> {
    return this.patchAuth<NotificacionResponseApi>(`/notificaciones/${idNotificacion}/leer`, {});
  }

  eliminarNotificacion(idNotificacion: number): Observable<void> {
    return this.deleteAuth<void>(`/notificaciones/${idNotificacion}`);
  }

  // ==========================================================================
  // 7. INFRAESTRUCTURA FÍSICA: SEDES, ZONAS Y SALONES (/sedes, /zonas, /recursos-fisicos)
  // ==========================================================================

  listarSedes(incluirInactivos = true): Observable<SedeResponseApi[]> {
    const params = new HttpParams().set('incluirInactivos', String(incluirInactivos));
    return this.getAuth<SedeResponseApi[]>(`/sedes`, params);
  }

  crearSede(payload: RegistroSedeRequestApi): Observable<SedeResponseApi> {
    return this.postAuth<SedeResponseApi>(`/sedes`, payload);
  }

  actualizarSede(idSede: number, payload: RegistroSedeRequestApi): Observable<SedeResponseApi> {
    return this.putAuth<SedeResponseApi>(`/sedes/${idSede}`, payload);
  }

  desactivarSede(idSede: number): Observable<void> {
    return this.deleteAuth<void>(`/sedes/${idSede}`);
  }

  activarSede(idSede: number): Observable<SedeResponseApi> {
    return this.patchAuth<SedeResponseApi>(`/sedes/${idSede}/activar`, {});
  }

  listarZonas(sedeId?: number, incluirInactivos = true): Observable<ZonaResponseApi[]> {
    let params = new HttpParams().set('incluirInactivos', String(incluirInactivos));
    if (sedeId) {
      params = params.set('sedeId', String(sedeId));
    }
    return this.getAuth<ZonaResponseApi[]>(`/zonas`, params);
  }

  crearZona(payload: RegistroZonaRequestApi): Observable<ZonaResponseApi> {
    return this.postAuth<ZonaResponseApi>(`/zonas`, payload);
  }

  actualizarZona(idZona: number, payload: RegistroZonaRequestApi): Observable<ZonaResponseApi> {
    return this.putAuth<ZonaResponseApi>(`/zonas/${idZona}`, payload);
  }

  desactivarZona(idZona: number): Observable<void> {
    return this.deleteAuth<void>(`/zonas/${idZona}`);
  }

  activarZona(idZona: number): Observable<ZonaResponseApi> {
    return this.patchAuth<ZonaResponseApi>(`/zonas/${idZona}/activar`, {});
  }

  listarZonasDeSede(idSede: number, incluirInactivos = false): Observable<ZonaResponseApi[]> {
    const params = new HttpParams().set('incluirInactivos', String(incluirInactivos));
    return this.getAuth<ZonaResponseApi[]>(`/sedes/${idSede}/zonas`, params);
  }

  listarRecursosDeSede(
    idSede: number,
    incluirInactivos = false
  ): Observable<RecursoFisicoResponseApi[]> {
    const params = new HttpParams().set('incluirInactivos', String(incluirInactivos));
    return this.getAuth<RecursoFisicoResponseApi[]>(`/sedes/${idSede}/recursos-fisicos`, params);
  }

  listarRecursosDeZona(
    idZona: number,
    incluirInactivos = false
  ): Observable<RecursoFisicoResponseApi[]> {
    const params = new HttpParams().set('incluirInactivos', String(incluirInactivos));
    return this.getAuth<RecursoFisicoResponseApi[]>(`/zonas/${idZona}/recursos-fisicos`, params);
  }

  listarRecursosFisicos(
    sedeId?: number,
    zonaId?: number,
    incluirInactivos = true
  ): Observable<RecursoFisicoResponseApi[]> {
    let params = new HttpParams().set('incluirInactivos', String(incluirInactivos));
    if (sedeId) params = params.set('sedeId', String(sedeId));
    if (zonaId) params = params.set('zonaId', String(zonaId));
    return this.getAuth<RecursoFisicoResponseApi[]>(`/recursos-fisicos`, params);
  }

  crearRecursoFisico(payload: RegistroRecursoFisicoRequestApi): Observable<RecursoFisicoResponseApi> {
    return this.postAuth<RecursoFisicoResponseApi>(`/recursos-fisicos`, payload);
  }

  actualizarRecursoFisico(
    idRecurso: number,
    payload: RegistroRecursoFisicoRequestApi
  ): Observable<RecursoFisicoResponseApi> {
    return this.putAuth<RecursoFisicoResponseApi>(`/recursos-fisicos/${idRecurso}`, payload);
  }

  desactivarRecursoFisico(idRecurso: number): Observable<void> {
    return this.deleteAuth<void>(`/recursos-fisicos/${idRecurso}`);
  }

  activarRecursoFisico(idRecurso: number): Observable<RecursoFisicoResponseApi> {
    return this.patchAuth<RecursoFisicoResponseApi>(`/recursos-fisicos/${idRecurso}/activar`, {});
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

