import { Injectable, computed, inject, signal } from '@angular/core';
import { Auth } from './auth';
import {
  CanalChat,
  EstadoConexionWebSocket,
  MensajeChat,
  MensajeWebSocket,
  RolChat,
  UsuarioChat
} from '../models/chat.models';

const CANALES_INICIALES: CanalChat[] = [
  {
    id: 'general',
    nombre: 'Sala General • Consultas IUB',
    descripcion: 'Canal institucional en vivo para todos los usuarios conectados',
    icono: '🏛️',
    tipo: 'general',
    mensajesNoLeidos: 0,
    ultimoMensaje: '¡Bienvenidos al módulo de chat en tiempo real!',
    ultimaHora: 'Ahora',
    activo: true
  },
  {
    id: 'tutorias',
    nombre: 'Mesa de Ayuda y Tutorías',
    descripcion: 'Espacio para orientación académica inmediata con docentes',
    icono: '🎓',
    tipo: 'grupo',
    mensajesNoLeidos: 0,
    ultimoMensaje: 'Docentes disponibles para atención en vivo',
    ultimaHora: 'Ahora',
    activo: false
  },
  {
    id: 'soporte',
    nombre: 'Soporte y Coordinación',
    descripcion: 'Consultas sobre inscripciones, salones y trámites',
    icono: '🛠️',
    tipo: 'grupo',
    mensajesNoLeidos: 0,
    ultimoMensaje: 'Atención administrativa de lunes a viernes',
    ultimaHora: 'Hoy',
    activo: false
  }
];

@Injectable({
  providedIn: 'root'
})
export class ChatWebSocketService {
  private auth = inject(Auth);

  // URL configurable para WebSocket (FastAPI por defecto en puerto 8000, o Node en 3000)
  private defaultWsUrl = typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:8000/ws`
    : 'ws://localhost:8000/ws';

  private socket: WebSocket | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private timerReconexion: any = null;
  private heartbeatInterval: any = null;

  // =========================================================================
  // SEÑALES REACTIVAS (ESTADO DEL CHAT)
  // =========================================================================
  readonly estadoConexion = signal<EstadoConexionWebSocket>({
    conectado: false,
    reconectando: false,
    url: this.defaultWsUrl,
    usuariosConectados: 1,
    ultimoError: null
  });

  readonly canales = signal<CanalChat[]>(CANALES_INICIALES);
  readonly canalActivoId = signal<string>('general');
  readonly mensajes = signal<MensajeChat[]>([]);
  readonly usuariosOnline = signal<UsuarioChat[]>([]);

  // Canal seleccionado actualmente
  readonly canalActivo = computed(() => {
    const id = this.canalActivoId();
    return this.canales().find((c) => c.id === id) || this.canales()[0];
  });

  // Mensajes correspondientes al canal seleccionado
  readonly mensajesDelCanalActivo = computed(() => {
    const canalId = this.canalActivoId();
    return this.mensajes().filter((m) => m.canalId === canalId);
  });

  // Perfil del usuario actual en formato UsuarioChat
  readonly usuarioActual = computed<UsuarioChat>(() => {
    const rolRaw = this.auth.rolActivo();
    const rolNorm: RolChat =
      rolRaw === 'ADMIN'
        ? 'ADMINISTRADOR'
        : rolRaw === 'DOCENTE'
        ? 'DOCENTE'
        : 'ESTUDIANTE';

    const nombre = this.auth.nombreActivo() || 'Usuario IUB';
    const correo = this.auth.correoActivo() || 'usuario@unibarranquilla.edu.co';
    const id = this.auth.usuarioIdActivo() || this.obtenerOgenerarIdSesion();

    return {
      id,
      nombre,
      correo,
      rol: rolNorm,
      avatar: this.generarAvatar(nombre),
      online: true
    };
  });

  constructor() {
    this.iniciarBroadcastChannel();
    this.cargarMensajesLocales();
    this.conectar();
  }

  // =========================================================================
  // GESTIÓN DE CONEXIÓN WEBSOCKET
  // =========================================================================

  /**
   * Conecta al endpoint de WebSocket. Si el socket nativo falla (por ejemplo si el
   * servidor FastAPI aún no está iniciado), la capa BroadcastChannel garantiza
   * sincronización 100% en tiempo real entre ventanas/pestañas del navegador.
   */
  conectar(customUrl?: string): void {
    if (typeof window === 'undefined') return;

    if (customUrl) {
      this.defaultWsUrl = customUrl;
    }

    const url = this.defaultWsUrl;
    this.estadoConexion.update((s) => ({ ...s, url, reconectando: true, ultimoError: null }));

    try {
      if (this.socket) {
        try {
          this.socket.close();
        } catch {}
      }

      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.estadoConexion.update((s) => ({
          ...s,
          conectado: true,
          reconectando: false,
          ultimoError: null
        }));

        // Notificar presencia al backend
        this.emitirEventoWS({
          tipo: 'usuario_conectado',
          usuario: this.usuarioActual(),
          timestamp: new Date().toISOString()
        });

        this.iniciarHeartbeat();
        this.agregarMensajeSistema(
          `🟢 Conexión WebSocket establecida con ${url}`,
          this.canalActivoId()
        );
      };

      this.socket.onmessage = (event) => {
        try {
          const data: MensajeWebSocket = JSON.parse(event.data);
          this.procesarEventoRecibido(data, 'websocket');
        } catch (e) {
          console.warn('[WS] Error parseando mensaje:', e);
        }
      };

      this.socket.onerror = (_err) => {
        // En caso de que el backend en FastAPI esté offline o bloqueado, usamos fallback local
        this.estadoConexion.update((s) => ({
          ...s,
          conectado: false,
          ultimoError: `No se pudo conectar al WebSocket (${url}). Modo sincronización local activo.`
        }));
      };

      this.socket.onclose = () => {
        this.estadoConexion.update((s) => ({
          ...s,
          conectado: false
        }));
        this.limpiarHeartbeat();
        this.programarReconexion();
      };
    } catch (err: any) {
      this.estadoConexion.update((s) => ({
        ...s,
        conectado: false,
        reconectando: false,
        ultimoError: err?.message || 'Error al iniciar WebSocket'
      }));
    }
  }

  desconectar(): void {
    this.limpiarHeartbeat();
    if (this.timerReconexion) {
      clearTimeout(this.timerReconexion);
      this.timerReconexion = null;
    }
    if (this.socket) {
      try {
        this.emitirEventoWS({
          tipo: 'usuario_desconectado',
          usuario: this.usuarioActual(),
          timestamp: new Date().toISOString()
        });
        this.socket.close();
      } catch {}
      this.socket = null;
    }
    this.estadoConexion.update((s) => ({ ...s, conectado: false, reconectando: false }));
  }

  reconectar(): void {
    this.desconectar();
    this.conectar();
  }

  cambiarUrlServidor(nuevaUrl: string): void {
    if (!nuevaUrl.trim()) return;
    this.defaultWsUrl = nuevaUrl.trim();
    this.reconectar();
  }

  private programarReconexion(): void {
    if (this.timerReconexion) return;
    this.timerReconexion = setTimeout(() => {
      this.timerReconexion = null;
      if (!this.estadoConexion().conectado) {
        this.conectar();
      }
    }, 7000);
  }

  private iniciarHeartbeat(): void {
    this.limpiarHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ tipo: 'ping', timestamp: new Date().toISOString() }));
      }
    }, 30000);
  }

  private limpiarHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // =========================================================================
  // BROADCAST CHANNEL (SINCRONIZACIÓN ENTRE PESTAÑAS / CLIENTES)
  // =========================================================================
  private iniciarBroadcastChannel(): void {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;

    try {
      this.broadcastChannel = new BroadcastChannel('consultas_iub_chat_realtime');
      this.broadcastChannel.onmessage = (event) => {
        if (event.data) {
          this.procesarEventoRecibido(event.data, 'broadcast');
        }
      };

      // Anunciar presencia a otras pestañas
      setTimeout(() => {
        this.transmitirBroadcast({
          tipo: 'usuario_conectado',
          usuario: this.usuarioActual(),
          timestamp: new Date().toISOString()
        });
      }, 500);

      // Escuchar cierre de pestaña para notificar desconexión
      window.addEventListener('beforeunload', () => {
        this.transmitirBroadcast({
          tipo: 'usuario_desconectado',
          usuario: this.usuarioActual(),
          timestamp: new Date().toISOString()
        });
      });
    } catch (e) {
      console.warn('BroadcastChannel no disponible:', e);
    }
  }

  private transmitirBroadcast(data: MensajeWebSocket): void {
    try {
      this.broadcastChannel?.postMessage(data);
    } catch {}
  }

  // =========================================================================
  // GESTIÓN Y PROCESAMIENTO DE MENSAJES Y EVENTOS
  // =========================================================================

  /**
   * Envía un mensaje de texto al canal activo y lo transmite por WebSocket y BroadcastChannel.
   */
  enviarMensaje(contenido: string, canalId?: string): MensajeChat | null {
    const texto = contenido.trim();
    if (!texto) return null;

    const canalDestino = canalId || this.canalActivoId();
    const remitente = this.usuarioActual();
    const nuevoMensaje: MensajeChat = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      canalId: canalDestino,
      remitenteId: remitente.id,
      remitenteNombre: remitente.nombre,
      remitenteRol: remitente.rol,
      remitenteAvatar: remitente.avatar,
      remitenteCorreo: remitente.correo,
      contenido: texto,
      fechaHora: this.obtenerHoraActual(),
      esMio: true,
      tipo: 'texto',
      estado: 'enviado'
    };

    // 1. Guardar y mostrar inmediatamente en la UI local (sin recargar)
    this.mensajes.update((lista) => [...lista, nuevoMensaje]);
    this.actualizarUltimoMensajeCanal(canalDestino, `${remitente.nombre}: ${texto}`, nuevoMensaje.fechaHora);
    this.guardarMensajesLocales();

    // 2. Enviar por WebSocket al backend FastAPI / Node
    const payload: MensajeWebSocket = {
      tipo: 'mensaje',
      canalId: canalDestino,
      mensaje: nuevoMensaje,
      timestamp: new Date().toISOString()
    };
    this.emitirEventoWS(payload);

    // 3. Transmitir por BroadcastChannel a otras pestañas (evidencia multi-cliente en el mismo equipo)
    this.transmitirBroadcast(payload);

    return nuevoMensaje;
  }

  seleccionarCanal(canalId: string): void {
    this.canalActivoId.set(canalId);
    this.canales.update((lista) =>
      lista.map((c) => (c.id === canalId ? { ...c, activo: true, mensajesNoLeidos: 0 } : { ...c, activo: false }))
    );
  }

  crearOabrirChatDirectoCon(usuario: UsuarioChat): void {
    const canalId = `direct_${usuario.id}`;
    const existe = this.canales().some((c) => c.id === canalId);

    if (!existe) {
      const nuevoCanal: CanalChat = {
        id: canalId,
        nombre: usuario.nombre,
        descripcion: `Chat privado con ${usuario.rol} (${usuario.correo})`,
        icono: usuario.avatar || '👤',
        tipo: 'directo',
        mensajesNoLeidos: 0,
        ultimoMensaje: 'Conversación directa iniciada',
        ultimaHora: 'Ahora',
        activo: true,
        usuarioDestinoId: usuario.id
      };
      this.canales.update((c) => [...c, nuevoCanal]);
    }

    this.seleccionarCanal(canalId);
  }

  private procesarEventoRecibido(data: MensajeWebSocket, origen: 'websocket' | 'broadcast'): void {
    if (!data || !data.tipo) return;

    switch (data.tipo) {
      case 'mensaje':
        if (data.mensaje) {
          const msg = data.mensaje;
          const yo = this.usuarioActual();
          const esPropio = String(msg.remitenteId) === String(yo.id);

          // Si el mensaje viene de otra pestaña o del backend, y no es el propio:
          if (!esPropio) {
            // Evitar duplicados por id
            const yaExiste = this.mensajes().some((m) => m.id === msg.id);
            if (!yaExiste) {
              const recibido: MensajeChat = {
                ...msg,
                esMio: false,
                estado: 'entregado'
              };
              this.mensajes.update((lista) => [...lista, recibido]);

              // Incrementar contador si no está en el canal activo
              if (msg.canalId !== this.canalActivoId()) {
                this.incrementarNoLeidos(msg.canalId);
              }
              this.actualizarUltimoMensajeCanal(
                msg.canalId,
                `${msg.remitenteNombre}: ${msg.contenido}`,
                msg.fechaHora
              );
              this.guardarMensajesLocales();
            }
          }
        }
        break;

      case 'usuario_conectado':
        if (data.usuario) {
          const usr = data.usuario;
          const yo = this.usuarioActual();
          if (String(usr.id) !== String(yo.id)) {
            this.usuariosOnline.update((lista) => {
              const filtrada = lista.filter((u) => String(u.id) !== String(usr.id));
              return [...filtrada, { ...usr, online: true }];
            });
            this.actualizarContadorUsuarios();
            this.agregarMensajeSistema(`🟢 ${usr.nombre} (${usr.rol}) se ha conectado al chat.`, 'general');

            // Responderle con nuestra presencia si vino por broadcast
            if (origen === 'broadcast') {
              this.transmitirBroadcast({
                tipo: 'lista_usuarios',
                usuarios: [yo, ...this.usuariosOnline()],
                timestamp: new Date().toISOString()
              });
            }
          }
        }
        break;

      case 'usuario_desconectado':
        if (data.usuario) {
          const usr = data.usuario;
          this.usuariosOnline.update((lista) => lista.filter((u) => String(u.id) !== String(usr.id)));
          this.actualizarContadorUsuarios();
          this.agregarMensajeSistema(`🔴 ${usr.nombre} se ha desconectado.`, 'general');
        }
        break;

      case 'lista_usuarios':
        if (Array.isArray(data.usuarios)) {
          const yo = this.usuarioActual();
          const otros = data.usuarios.filter((u) => String(u.id) !== String(yo.id));
          this.usuariosOnline.set(otros);
          this.actualizarContadorUsuarios();
        }
        break;

      default:
        break;
    }
  }

  private emitirEventoWS(payload: MensajeWebSocket): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(payload));
      } catch (err) {
        console.warn('[WS] Error enviando socket:', err);
      }
    }
  }

  private agregarMensajeSistema(contenido: string, canalId: string): void {
    const msg: MensajeChat = {
      id: `sys_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      canalId: canalId || 'general',
      remitenteId: 'SISTEMA',
      remitenteNombre: 'Sistema WebSocket',
      remitenteRol: 'SISTEMA',
      remitenteAvatar: '⚡',
      contenido,
      fechaHora: this.obtenerHoraActual(),
      esMio: false,
      tipo: 'sistema'
    };
    this.mensajes.update((lista) => [...lista, msg]);
  }

  private actualizarUltimoMensajeCanal(canalId: string, texto: string, hora: string): void {
    this.canales.update((lista) =>
      lista.map((c) =>
        c.id === canalId ? { ...c, ultimoMensaje: texto, ultimaHora: hora } : c
      )
    );
  }

  private incrementarNoLeidos(canalId: string): void {
    this.canales.update((lista) =>
      lista.map((c) =>
        c.id === canalId ? { ...c, mensajesNoLeidos: c.mensajesNoLeidos + 1 } : c
      )
    );
  }

  private actualizarContadorUsuarios(): void {
    const total = 1 + this.usuariosOnline().length;
    this.estadoConexion.update((s) => ({ ...s, usuariosConectados: total }));
  }

  // =========================================================================
  // PERSISTENCIA LOCAL Y UTILIDADES
  // =========================================================================

  private cargarMensajesLocales(): void {
    if (typeof window === 'undefined') return;
    try {
      const data = localStorage.getItem('consultas_iub_chat_msgs');
      if (data) {
        const parsed: MensajeChat[] = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ajustar esMio según el usuario actual
          const yo = this.usuarioActual();
          const adaptados = parsed.map((m) => ({
            ...m,
            esMio: String(m.remitenteId) === String(yo.id)
          }));
          this.mensajes.set(adaptados);
          return;
        }
      }
    } catch {}

    // Mensajes de bienvenida institucionales por defecto
    const hora = this.obtenerHoraActual();
    const bienvenida: MensajeChat[] = [
      {
        id: 'msg_init_1',
        canalId: 'general',
        remitenteId: 'docente_coord',
        remitenteNombre: 'Prof. Carlos Mendoza',
        remitenteRol: 'DOCENTE',
        remitenteAvatar: '👨‍🏫',
        remitenteCorreo: 'cmendoza@unibarranquilla.edu.co',
        contenido: '¡Buenos días a todos! Bienvenidos al canal institucional de consultas y tutorías en vivo.',
        fechaHora: hora,
        esMio: false,
        tipo: 'texto',
        estado: 'leido'
      },
      {
        id: 'msg_init_2',
        canalId: 'general',
        remitenteId: 'estudiante_ana',
        remitenteNombre: 'Ana Lucía Gómez',
        remitenteRol: 'ESTUDIANTE',
        remitenteAvatar: '👩‍🎓',
        remitenteCorreo: 'agomez@unibarranquilla.edu.co',
        contenido: 'Buenos días profesor, ¿los horarios de asesoría para Ingeniería de Software ya están publicados?',
        fechaHora: hora,
        esMio: false,
        tipo: 'texto',
        estado: 'leido'
      }
    ];
    this.mensajes.set(bienvenida);
    this.guardarMensajesLocales();
  }

  private guardarMensajesLocales(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('consultas_iub_chat_msgs', JSON.stringify(this.mensajes()));
    } catch {}
  }

  limpiarHistorial(): void {
    this.mensajes.set([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('consultas_iub_chat_msgs');
    }
    this.agregarMensajeSistema('Historial de chat reiniciado.', this.canalActivoId());
  }

  private obtenerHoraActual(): string {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private generarAvatar(nombre: string): string {
    const inicial = (nombre || 'U').trim().charAt(0).toUpperCase();
    return inicial;
  }

  private obtenerOgenerarIdSesion(): string {
    if (typeof window === 'undefined') return 'usr_anonimo';
    let id = sessionStorage.getItem('iub_chat_session_id');
    if (!id) {
      id = `usr_${Math.floor(1000 + Math.random() * 9000)}`;
      sessionStorage.setItem('iub_chat_session_id', id);
    }
    return id;
  }
}
