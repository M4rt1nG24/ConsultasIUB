// ============================================================================
// MODELOS Y CONTRATOS DE DATOS DE LA API PRINCIPAL (FASTAPI - IUB)
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
  correo?: string;
}

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
  fechaInicio: string;
  fechaFin: string;
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
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
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
  fechaConsulta: string;
  horaConsulta: string;
  docenteId: number;
  moduloId: number;
  estudianteId?: number | null;
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
  nombreSede?: string | null;
  nombreZona?: string | null;
}

export interface RegistroRecursoFisicoRequestApi {
  sedeId: number;
  zonaId?: number | null;
  nombre: string;
  tipo?: TipoRecursoFisicoApi;
}


