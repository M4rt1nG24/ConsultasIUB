import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Header } from '../../shared/components/header/header';
import { Footer } from '../../shared/components/footer/footer';

export type RolUsuario = 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE';

export interface OpcionMenu {
  titulo: string;
  ruta: string;
  icono: string;
  rol: RolUsuario;
}

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
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, Header, Footer],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css'
})
export class MainLayout {
  private router = inject(Router);

  // Rol activo (Por defecto ESTUDIANTE)
  rolActual = signal<RolUsuario>('ESTUDIANTE');

  // Estado para el panel de notificaciones
  mostrarNotificaciones = signal<boolean>(false);

  notificaciones = signal<NotificacionItem[]>([
    { id: 1, mensaje: 'Su consulta #CNS-2026-0104 cambió de estado a: En proceso', fecha: 'Hace 10 min', leida: false },
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

  private todasLasOpciones: OpcionMenu[] = [
    // ==========================================
    // ROL 1: ADMINISTRADOR
    // ==========================================
    {
      titulo: 'Reportes y Analítica',
      ruta: '/admin/reportes',
      icono: '📊',
      rol: 'ADMIN'
    },
    {
      titulo: 'Gestión de Usuarios',
      ruta: '/admin/usuarios',
      icono: '👥',
      rol: 'ADMIN'
    },
    {
      titulo: 'Reasignar Consultas',
      ruta: '/admin/consultas',
      icono: '🔄',
      rol: 'ADMIN'
    },
    {
      titulo: 'Cursos y Roles',
      ruta: '/admin/cursos-roles',
      icono: '🎓',
      rol: 'ADMIN'
    },

    // ==========================================
    // ROL 2: DOCENTE
    // ==========================================
    {
      titulo: 'Bandeja Asignadas',
      ruta: '/docente/asignadas',
      icono: '📥',
      rol: 'DOCENTE'
    },
    {
      titulo: 'Atención de Consulta',
      ruta: '/docente/atencion',
      icono: '✏️',
      rol: 'DOCENTE'
    },
    {
      titulo: 'Historial de Tutorías',
      ruta: '/docente/historial',
      icono: '📚',
      rol: 'DOCENTE'
    },

    // ==========================================
    // ROL 3: ESTUDIANTE
    // ==========================================
    {
      titulo: 'Mis Solicitudes',
      ruta: '/estudiante/mis-solicitudes',
      icono: '📋',
      rol: 'ESTUDIANTE'
    },
    {
      titulo: 'Crear Consulta',
      ruta: '/estudiante/crear',
      icono: '➕',
      rol: 'ESTUDIANTE'
    },
    {
      titulo: 'Detalle e Interacción',
      ruta: '/estudiante/detalle',
      icono: '💬',
      rol: 'ESTUDIANTE'
    },
    {
      titulo: 'Directorio de Tutorías',
      ruta: '/estudiante/directorio-tutorias',
      icono: '📖',
      rol: 'ESTUDIANTE'
    },
  ];

  menuDelRol = computed(() =>
    this.todasLasOpciones.filter(opcion => opcion.rol === this.rolActual())
  );

  constructor() {
    this.actualizarRol();
    this.router.events.subscribe(() => {
      this.actualizarRol();
    });
  }

  private actualizarRol(): void {
    const url = this.router.url;
    if (url.startsWith('/admin')) {
      this.rolActual.set('ADMIN');
    } else if (url.startsWith('/docente')) {
      this.rolActual.set('DOCENTE');
    } else if (url.startsWith('/estudiante')) {
      this.rolActual.set('ESTUDIANTE');
    } else {
      const guardado = localStorage.getItem('rolActivo') as RolUsuario | null;
      if (guardado === 'ADMIN' || guardado === 'DOCENTE' || guardado === 'ESTUDIANTE') {
        this.rolActual.set(guardado);
      }
    }
  }

  // Cambiar de rol en el simulador y navegar a su primera pantalla
  cambiarRol(nuevoRol: RolUsuario) {
    this.rolActual.set(nuevoRol);
    localStorage.setItem('rolActivo', nuevoRol);
    const primeraRuta = this.menuDelRol()[0]?.ruta;
    if (primeraRuta) {
      this.router.navigate([primeraRuta]);
    }
  }

  // Alternar apertura del panel de notificaciones
  toggleNotificaciones() {
    this.mostrarNotificaciones.update(v => !v);
  }

  // Marcar todas como leídas
  marcarTodasLeidas() {
    this.notificaciones.update(lista =>
      lista.map(item => ({ ...item, leida: true }))
    );
  }

  // Cierre de sesión de usuarios
  cerrarSesion() {
    localStorage.removeItem('rolActivo');
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