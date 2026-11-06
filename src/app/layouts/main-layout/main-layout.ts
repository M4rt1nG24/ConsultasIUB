import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Auth, RolUsuario, RolXModuloItem } from '../../core/services/auth';
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

  // Rol activo y menú cargado dinámicamente desde la tabla rolxmodulo (Auth)
  rolActual = this.authService.rolActivo;
  menuDelRol = this.authService.modulosDelRolActivo;
  busquedaRapida = signal<string>('');

  // Estado para el panel de notificaciones
  mostrarNotificaciones = signal<boolean>(false);

  notificaciones = signal<NotificacionItem[]>([
    { id: 1, mensaje: 'Su consulta #TUT-2026-1045 cambió de estado a: Programada', fecha: 'Hace 10 min', leida: false },
    { id: 2, mensaje: 'El docente Ing. Carlos Mendoza ha respondido su consulta', fecha: 'Hace 1 hora', leida: false },
    { id: 3, mensaje: 'Nueva consulta asignada en Estructura de Datos', fecha: 'Ayer', leida: true }
  ]);

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
    this.router.events.subscribe(() => {
      this.actualizarRol();
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
    this.notificaciones.update(lista =>
      lista.map(item => ({ ...item, leida: true }))
    );
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

    try {
      // 1. Detectar el primer modelo instalado en Ollama
      const tagsRes = await fetch('http://localhost:11434/api/tags');
      const tagsData = await tagsRes.json();
      const modelo = tagsData?.models?.[0]?.name || 'llama3.2';

      // 2. Enviar pregunta a Ollama
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
            ...historialActual
          ],
          stream: false
        })
      });

      const chatData = await chatRes.json();
      const respuesta = chatData?.message?.content || 'No se recibió respuesta de Ollama.';

      this.mensajesIA.set([
        ...historialActual,
        { role: 'assistant', content: respuesta }
      ]);
    } catch {
      this.mensajesIA.set([
        ...historialActual,
        {
          role: 'assistant',
          content: 'Error: Asegúrate de que Ollama esté abierto y con un modelo descargado (ej: ollama run llama3.2).'
        }
      ]);
    } finally {
      this.cargandoIA.set(false);
    }
  }
}
