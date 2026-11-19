// ============================================================================
// INTERFACES DEL MÓDULO DE CHAT EN TIEMPO REAL (WEBSOCKET & ANGULAR)
// Cumplimiento estricto: "SE REVISARÁ EL USO DE INTERFACES EN TODO EL PROYECTO"
// ============================================================================

export type RolChat = 'ADMINISTRADOR' | 'DOCENTE' | 'ESTUDIANTE' | 'SISTEMA';

export type TipoCanal = 'general' | 'directo' | 'grupo';

export type TipoMensaje = 'texto' | 'sistema' | 'archivo' | 'alerta';

export type EstadoMensaje = 'enviando' | 'enviado' | 'entregado' | 'leido';

export type TipoEventoWS =
  | 'mensaje'
  | 'usuario_conectado'
  | 'usuario_desconectado'
  | 'lista_usuarios'
  | 'escribiendo'
  | 'ping'
  | 'pong';

/**
 * Representa a un usuario conectado al ecosistema de Chat.
 */
export interface UsuarioChat {
  id: string | number;
  nombre: string;
  correo: string;
  rol: RolChat;
  avatar?: string;
  online: boolean;
  escribiendo?: boolean;
  ultimoAcceso?: string;
}

/**
 * Representa un mensaje individual enviado a través del WebSocket.
 */
export interface MensajeChat {
  id: string;
  canalId: string;
  remitenteId: string | number;
  remitenteNombre: string;
  remitenteRol: RolChat;
  remitenteAvatar?: string;
  remitenteCorreo?: string;
  contenido: string;
  fechaHora: string;
  esMio?: boolean;
  tipo?: TipoMensaje;
  estado?: EstadoMensaje;
  adjuntoUrl?: string;
}

/**
 * Representa un canal o sala de conversación (ej. Sala General, Grupo Tutorías o Chat Privado).
 */
export interface CanalChat {
  id: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  tipo: TipoCanal;
  mensajesNoLeidos: number;
  ultimoMensaje?: string;
  ultimaHora?: string;
  activo: boolean;
  usuarioDestinoId?: string | number;
}

/**
 * Estructura de trama (payload) transmitida por el WebSocket entre clientes y FastAPI/Node.
 */
export interface MensajeWebSocket {
  tipo: TipoEventoWS;
  canalId?: string;
  mensaje?: MensajeChat;
  usuario?: UsuarioChat;
  usuarios?: UsuarioChat[];
  datos?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Estado reactivo del servicio WebSocket en el cliente Angular.
 */
export interface EstadoConexionWebSocket {
  conectado: boolean;
  reconectando: boolean;
  url: string;
  usuariosConectados: number;
  ultimoError?: string | null;
  latenciaMs?: number;
}
