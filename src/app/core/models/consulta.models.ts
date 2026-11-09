import { CalificacionResumenSolicitudApi, DocenteResumenApi } from './api-principal.models';

export interface MensajeInteraccion {
  id?: number;
  autor: string;
  rol: 'ESTUDIANTE' | 'DOCENTE' | 'ADMIN';
  fechaHora: string;
  mensaje: string;
  adjuntos?: string[];
}

export type EstadoConsultaFront =
  | 'Pendiente'
  | 'Programada'
  | 'En proceso'
  | 'Completada'
  | 'Resuelta'
  | 'Cancelada'
  | 'Rechazada'
  | 'Inactiva';

export interface ConsultaUnificada {
  id: number;
  radicado: string;
  fechaCreacion?: string;
  estudianteId?: number;
  estudiante: string;
  documento: string;
  correoEstudiante: string;
  nombrePrograma?: string;
  moduloId?: number;
  asignatura: string;
  tema: string;
  descripcion: string;
  docenteId?: number;
  identificacionDocente?: string | null;
  tutor: string;
  fechaConsulta?: string;
  horaConsulta?: string;
  fecha: string;
  franja: string;
  modalidad?: string;
  ubicacion: string;
  recursoFisicoId?: number | null;
  prioridad: 'Alta' | 'Media' | 'Baja';
  estado: EstadoConsultaFront;
  tipoAtencion?: string;
  observaciones: string;
  retroalimentacionDocente?: string | null;
  calificacion?: CalificacionResumenSolicitudApi | null;
  asistencia?: number;
  folioAuditoria?: string;
  reasignado?: boolean;
  docenteSeleccionado?: string;
  mensajes: MensajeInteraccion[];
}

export interface CursoSistema {
  id: number;
  asignacionId?: number;
  codigo: string;
  asignatura: string;
  descripcion?: string;
  docente: string;
  docenteId?: number;
  docentesAsignados?: DocenteResumenApi[];
  estado: 'Activo' | 'Inactivo';
}

export interface UsuarioSistema {
  id: number;
  tipoIdentificacion?: 'CC' | 'TI' | string;
  identificacion?: string;
  tipoDocumentoId?: number | null;
  tipoDocumentoSigla?: string | null;
  nombre: string;
  nombreSolo?: string;
  apellido?: string;
  email: string;
  rol: 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE';
  estado: 'Activo' | 'Inactivo';
  programaId?: number | null;
  programa: string;
  fechaCreacion?: string;
}
