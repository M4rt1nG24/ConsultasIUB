import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RouterOutlet, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Auth, RolUsuario, RolXModuloItem } from '../../core/services/auth';
import { ApiPrincipal } from '../../core/services/api-principal';
import { Data } from '../../core/services/data';
import { EspaciosAux } from '../../core/services/espacios-aux';
import { Footer } from '../../shared/components/footer/footer';
import { Header } from '../../shared/components/header/header';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Sidebar } from '../../shared/components/sidebar/sidebar';

export type { RolUsuario };
export type OpcionMenu = RolXModuloItem;

export interface NotificacionItem {
  id: number;
  mensaje: string;
  fecha: string;
  leida: boolean;
}

interface MensajeIA {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, FormsModule, Header, Footer, Navbar, Sidebar],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css'
})
export class MainLayout {
  private router = inject(Router);
  private authService = inject(Auth);
  private dataService = inject(Data);
  private espaciosService = inject(EspaciosAux);
  private apiPrincipal = inject(ApiPrincipal, { optional: true });

  // Rol activo y menú cargado dinámicamente desde la tabla rolxmodulo (Auth)
  rolActual = this.authService.rolActivo;
  nombreUsuario = this.authService.nombreActivo;
  menuDelRol = this.authService.modulosDelRolActivo;
  busquedaRapida = signal<string>('');

  // Estado para el panel de notificaciones
  mostrarNotificaciones = signal<boolean>(false);

  notificaciones = signal<NotificacionItem[]>([]);

  notificacionesPendientes = computed(() =>
    this.notificaciones().filter(n => !n.leida).length
  );

  // Chat Asistente IA (Ollama)
  chatAbierto = signal<boolean>(false);
  cargandoIA = signal<boolean>(false);
  preguntaIA: string = '';
  mensajesIA = signal<MensajeIA[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy el asistente IA de MiTutoría IUB. ¿En qué te puedo ayudar hoy?'
    }
  ]);

  constructor() {
    this.actualizarRol();
    this.authService.sincronizarPerfilActual();
    this.dataService.sincronizarDesdeBackend();
    this.espaciosService.sincronizarDesdeBackend();
    this.cargarNotificaciones();
    this.router.events.subscribe(() => {
      this.actualizarRol();
    });
  }

  private cargarNotificaciones(): void {
    if (!this.apiPrincipal || !this.apiPrincipal.baseUrl || !this.apiPrincipal.tieneTokenActivo()) return;
    this.apiPrincipal.listarNotificaciones().subscribe({
      next: (lista) => {
        const mapeadas: NotificacionItem[] = (lista || []).map((n) => ({
          id: n.id,
          mensaje: n.mensaje || n.titulo,
          fecha: n.fechaCreacion,
          leida: n.leida
        }));
        this.notificaciones.set(mapeadas);
      },
      error: () => {}
    });
  }

  private actualizarRol(): void {
    const url = this.router.url;
    this.authService.sincronizarRolDesdeUrl(url);
  }

  // Cambiar de rol y navegar a su primer módulo según rolxmodulo
  cambiarRol(nuevoRol: RolUsuario): void {
    this.rolActual.set(nuevoRol);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('rolActivo', nuevoRol);
    }
    const primeraRuta = this.authService.obtenerRutaInicialPorRol(nuevoRol);
    if (primeraRuta) {
      this.router.navigate([primeraRuta]);
    }
  }

  // Alternar apertura del panel de notificaciones
  toggleNotificaciones(): void {
    this.mostrarNotificaciones.update(v => !v);
  }

  // Marcar todas como leídas
  marcarTodasLeidas(): void {
    const noLeidas = this.notificaciones().filter(n => !n.leida);
    this.notificaciones.update(lista =>
      lista.map(item => ({ ...item, leida: true }))
    );
    if (this.apiPrincipal && this.apiPrincipal.baseUrl) {
      noLeidas.forEach(n => {
        this.apiPrincipal?.marcarNotificacionLeida(n.id).subscribe({ error: () => {} });
      });
    }
  }

  // Cierre de sesión de usuarios limpiando JWT y estado de Auth
  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/login']);
  }

  toggleChat(): void {
    this.chatAbierto.set(!this.chatAbierto());
  }

  async enviarPreguntaIA(): Promise<void> {
    const texto = this.preguntaIA.trim();
    if (!texto || this.cargandoIA()) return;

    const historialActual: MensajeIA[] = [
      ...this.mensajesIA(),
      { role: 'user', content: texto }
    ];
    this.mensajesIA.set(historialActual);
    this.preguntaIA = '';
    this.cargandoIA.set(true);

    // Historial que se envía: solo turnos user/assistant, los últimos 10 y recortados
    // a los límites que acepta el backend (POST /ia/chat).
    const historialEnvio = historialActual
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content.slice(0, 2000) }));

    try {
      let respuesta: string;
      try {
        // 1. Camino principal (local y nube): backend → Open WebUI con el modelo
        //    "consultas-asistente" y la base de conocimiento cargada.
        if (!this.apiPrincipal) throw new Error('API no disponible');
        respuesta = (await firstValueFrom(this.apiPrincipal.chatIA(historialEnvio))).respuesta;
      } catch (errBackend: any) {
        // 2. Solo en desarrollo (localhost): si el backend aún no tiene /ia/chat o la IA
        //    no está configurada, usar Ollama instalado en este mismo equipo.
        const esLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
        const sinIaEnBackend = [404, 503].includes(errBackend?.status);
        if (!esLocal || !sinIaEnBackend) throw errBackend;
        respuesta = await this.preguntarOllamaLocal(historialEnvio);
      }

      this.mensajesIA.set([...historialActual, { role: 'assistant', content: respuesta }]);
    } catch (err: any) {
      const mensaje =
        err?.status === 429
          ? 'Has enviado muchas preguntas seguidas. Espera unos minutos e inténtalo de nuevo.'
          : 'El asistente no está disponible en este momento. Inténtalo más tarde.';
      this.mensajesIA.set([...historialActual, { role: 'assistant', content: mensaje }]);
    } finally {
      this.cargandoIA.set(false);
    }
  }

  /** Respaldo para desarrollo: Ollama local, priorizando el modelo del proyecto. */
  private async preguntarOllamaLocal(
    mensajes: { role: 'user' | 'assistant'; content: string }[]
  ): Promise<string> {
    const tagsRes = await fetch('http://localhost:11434/api/tags');
    const tagsData = await tagsRes.json();
    const modelos: { name: string; remote_host?: string }[] = tagsData?.models || [];
    // Los modelos ":cloud" se ejecutan en ollama.com y pueden exigir suscripción (HTTP 402),
    // así que se prefieren los modelos descargados en este equipo.
    const locales = modelos
      .filter((m) => !m.remote_host && !m.name.endsWith(':cloud'))
      .map((m) => m.name);
    const modelo =
      locales.find((n) => n.startsWith('consultas-asistente')) ||
      locales[0] ||
      modelos[0]?.name ||
      'consultas-asistente';

    const chatRes = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelo,
        messages: [
          {
            role: 'system',
            content: 'Eres el asistente virtual de MiTutoría IUB. Responde siempre en español de forma breve y clara.'
          },
          ...mensajes
        ],
        stream: false
      })
    });
    const chatData = await chatRes.json();
    const texto = String(chatData?.message?.content || '')
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .trim();
    return texto || 'No se recibió respuesta del asistente.';
  }
}
