import {
  Component,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatWebSocketService } from '../../core/services/chat-websocket.service';
import {
  CanalChat,
  EstadoConexionWebSocket,
  MensajeChat,
  UsuarioChat
} from '../../core/models/chat.models';

// Interface local para cumplimiento estricto de interfaces en Angular
export interface VistaFiltroChat {
  tipo: 'todos' | 'canales' | 'usuarios';
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css'
})
export class Chat {
  readonly chatWs = inject(ChatWebSocketService);

  @ViewChild('scrollMensajes') private scrollMensajes?: ElementRef<HTMLDivElement>;
  @ViewChild('inputMensaje') private inputMensaje?: ElementRef<HTMLInputElement>;

  // Modelos de entrada
  mensajeTexto: string = '';
  busqueda: string = '';
  filtroActivo = signal<'todos' | 'canales' | 'usuarios'>('todos');

  // Modal de configuración de endpoint WebSocket (FastAPI / Node)
  mostrarConfig = signal<boolean>(false);
  urlTemporal: string = '';

  // Señales expuestas desde el servicio
  readonly estadoConexion = this.chatWs.estadoConexion;
  readonly canalActivo = this.chatWs.canalActivo;
  readonly mensajes = this.chatWs.mensajesDelCanalActivo;
  readonly usuarioActual = this.chatWs.usuarioActual;
  readonly canales = this.chatWs.canales;
  readonly usuariosOnline = this.chatWs.usuariosOnline;

  // Filtrado de canales según texto de búsqueda
  readonly canalesFiltrados = computed(() => {
    const q = this.busqueda.trim().toLowerCase();
    const lista = this.canales();
    if (!q) return lista;
    return lista.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        (c.descripcion && c.descripcion.toLowerCase().includes(q))
    );
  });

  // Filtrado de usuarios en línea según búsqueda
  readonly usuariosFiltrados = computed(() => {
    const q = this.busqueda.trim().toLowerCase();
    const lista = this.usuariosOnline();
    if (!q) return lista;
    return lista.filter(
      (u) =>
        u.nombre.toLowerCase().includes(q) ||
        u.rol.toLowerCase().includes(q) ||
        u.correo.toLowerCase().includes(q)
    );
  });

  constructor() {
    this.urlTemporal = this.estadoConexion().url;

    // Efecto reactivo para auto-scroll al recibir o enviar mensajes
    effect(() => {
      // Registrar dependencia del arreglo de mensajes
      this.mensajes();
      setTimeout(() => this.scrollHaciaAbajo(), 50);
    });
  }

  enviar(): void {
    const texto = this.mensajeTexto.trim();
    if (!texto) return;

    this.chatWs.enviarMensaje(texto);
    this.mensajeTexto = '';
    setTimeout(() => {
      this.scrollHaciaAbajo();
      this.inputMensaje?.nativeElement.focus();
    }, 30);
  }

  seleccionarCanal(canal: CanalChat): void {
    this.chatWs.seleccionarCanal(canal.id);
    setTimeout(() => {
      this.scrollHaciaAbajo();
      this.inputMensaje?.nativeElement.focus();
    }, 50);
  }

  abrirChatPrivado(usuario: UsuarioChat): void {
    this.chatWs.crearOabrirChatDirectoCon(usuario);
    setTimeout(() => {
      this.scrollHaciaAbajo();
      this.inputMensaje?.nativeElement.focus();
    }, 50);
  }

  reconectar(): void {
    this.chatWs.reconectar();
  }

  abrirModalConfig(): void {
    this.urlTemporal = this.estadoConexion().url;
    this.mostrarConfig.set(true);
  }

  guardarConfig(): void {
    if (this.urlTemporal.trim()) {
      this.chatWs.cambiarUrlServidor(this.urlTemporal.trim());
    }
    this.mostrarConfig.set(false);
  }

  cancelarConfig(): void {
    this.mostrarConfig.set(false);
  }

  limpiarHistorial(): void {
    if (confirm('¿Deseas reiniciar el historial de mensajes de este chat?')) {
      this.chatWs.limpiarHistorial();
    }
  }

  private scrollHaciaAbajo(): void {
    try {
      if (this.scrollMensajes?.nativeElement) {
        this.scrollMensajes.nativeElement.scrollTop =
          this.scrollMensajes.nativeElement.scrollHeight;
      }
    } catch {}
  }
}
