import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  ApiPrincipal,
  EstadoSolicitudApi,
  ModuloResponseApi,
  PrioridadSolicitudApi,
  SolicitudConsultaResponseApi,
  UsuarioResponseApi
} from './api-principal';

export interface MensajeInteraccion {
  autor: string;
  rol: 'ESTUDIANTE' | 'DOCENTE' | 'ADMIN';
  fechaHora: string;
  mensaje: string;
  adjuntos?: string[];
}

export interface ConsultaUnificada {
  id: number;
  radicado: string;
  estudiante: string;
  documento: string;
  correoEstudiante: string;
  asignatura: string;
  tema: string;
  descripcion: string;
  tutor: string;
  fecha: string;
  franja: string;
  modalidad: string;
  ubicacion: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
  estado: 'Pendiente' | 'Programada' | 'En proceso' | 'Completada' | 'Resuelta' | 'Cancelada' | 'Inactiva';
  tipoAtencion: string;
  observaciones: string;
  asistencia: number;
  folioAuditoria: string;
  reasignado: boolean;
  docenteSeleccionado?: string;
  mensajes: MensajeInteraccion[];
}

export interface CursoSistema {
  id: number;
  codigo: string;
  asignatura: string;
  docente: string;
  estado: 'Activo' | 'Inactivo';
}

export interface UsuarioSistema {
  id: number;
  tipoIdentificacion: 'CC' | 'TI';
  identificacion: string;
  nombre: string;
  email: string;
  rol: 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE';
  estado: 'Activo' | 'Inactivo';
  programa: string;
}

const STORAGE_KEY_CONSULTAS = 'iub_consultas_v1';
const STORAGE_KEY_CURSOS = 'iub_cursos_v1';
const STORAGE_KEY_USUARIOS = 'iub_usuarios_v1';

const CONSULTAS_INICIALES: ConsultaUnificada[] = [
  {
    id: 1,
    radicado: 'TUT-2026-1045',
    estudiante: 'Carlos Mario Pérez',
    documento: '1045892110',
    correoEstudiante: 'meclavijo@unibarranquilla.edu.co',
    asignatura: 'Estructura de Datos',
    tema: 'Árboles binarios y balanceo AVL',
    descripcion:
      'Profesor, al intentar ejecutar la rotación doble izquierda-derecha en el árbol AVL, el factor de balance queda con valor 2 en lugar de 0 o 1. Adjunto el código fuente.',
    tutor: 'Ing. Carlos Mendoza',
    fecha: '16/10/2026 - 10:00 AM',
    franja: 'Mañana (08:00 AM - 12:00 PM)',
    modalidad: 'Presencial',
    ubicacion: 'Sede Plaza de la Paz - Sala de Informática 10',
    prioridad: 'Alta',
    estado: 'Programada',
    tipoAtencion: 'Tutoría Individual',
    observaciones:
      'El estudiante debe llevar el código del taller implementado hasta rotación simple.',
    asistencia: 1,
    folioAuditoria: 'AUD-2026-1045',
    reasignado: false,
    docenteSeleccionado: '',
    mensajes: [
      {
        autor: 'Carlos Mario Pérez',
        rol: 'ESTUDIANTE',
        fechaHora: '14/10/2026 - 10:15 AM',
        mensaje:
          'Profesor, tengo inconvenientes con el cálculo del factor de equilibrio en la inserción de nodos del taller 3.',
        adjuntos: ['taller_arboles.cpp', 'error_consola.png']
      },
      {
        autor: 'Ing. Carlos Mendoza',
        rol: 'DOCENTE',
        fechaHora: '14/10/2026 - 11:30 AM',
        mensaje:
          'Hola Carlos. Revisé tu código adjunto; la rotación doble derecha-izquierda se está invocando antes de recalcular la altura del subárbol izquierdo. Prueba actualizando primero las alturas.'
      }
    ]
  },
  {
    id: 2,
    radicado: 'TUT-2026-1052',
    estudiante: 'María José Herrera',
    documento: '1042301994',
    correoEstudiante: 'mjherrera@unibarranquilla.edu.co',
    asignatura: 'Bases de Datos Relacionales',
    tema: 'Normalización 3FN y Boyce-Codd',
    descripcion:
      'Dudas sobre dependencias funcionales transitivas en el modelo relacional del proyecto final.',
    tutor: 'Ing. Laura Gómez',
    fecha: '15/10/2026 - 02:00 PM',
    franja: 'Tarde (02:00 PM - 06:00 PM)',
    modalidad: 'Virtual',
    ubicacion: 'Enlace Google Meet institucional',
    prioridad: 'Media',
    estado: 'Pendiente',
    tipoAtencion: 'Tutoría Individual',
    observaciones: 'Solicitud en cola de revisión para atención de tutor titular.',
    asistencia: 1,
    folioAuditoria: 'AUD-2026-1052',
    reasignado: false,
    docenteSeleccionado: '',
    mensajes: [
      {
        autor: 'María José Herrera',
        rol: 'ESTUDIANTE',
        fechaHora: '15/10/2026 - 09:00 AM',
        mensaje: 'Buen día profesora, solicito revisión de las tablas normalizadas hasta 3FN.'
      }
    ]
  },
  {
    id: 3,
    radicado: 'TUT-2026-0988',
    estudiante: 'Juan Camilo Sarmiento',
    documento: '1043912003',
    correoEstudiante: 'jcsarmiento@unibarranquilla.edu.co',
    asignatura: 'Programación Web',
    tema: 'Enrutamiento y Signals con Angular',
    descripcion: 'Consulta sobre comunicación reactiva entre componentes usando Signals.',
    tutor: 'Ing. Roberto Pineda',
    fecha: '08/10/2026 - 02:00 PM',
    franja: 'Tarde (02:00 PM - 06:00 PM)',
    modalidad: 'Presencial',
    ubicacion: 'Sede Plaza de la Paz - Laboratorio de Redes #4',
    prioridad: 'Baja',
    estado: 'Completada',
    tipoAtencion: 'Tutoría Individual',
    observaciones:
      'El estudiante asimiló los conceptos de reactividad con Signals y resolvió dudas prácticas.',
    asistencia: 1,
    folioAuditoria: 'AUD-2026-0988',
    reasignado: false,
    docenteSeleccionado: '',
    mensajes: [
      {
        autor: 'Juan Camilo Sarmiento',
        rol: 'ESTUDIANTE',
        fechaHora: '08/10/2026 - 01:10 PM',
        mensaje: 'Profesor, ¿cómo comparto un signal entre dos vistas de diferentes roles?'
      },
      {
        autor: 'Ing. Roberto Pineda',
        rol: 'DOCENTE',
        fechaHora: '08/10/2026 - 02:45 PM',
        mensaje:
          'Tutoría finalizada y firmada digitalmente con control de asistencia. Se implementó un servicio singleton con Signals.'
      }
    ]
  },
  {
    id: 4,
    radicado: 'TUT-2026-1060',
    estudiante: 'Valeria Morales Díaz',
    documento: '1042789301',
    correoEstudiante: 'vmorales@unibarranquilla.edu.co',
    asignatura: 'Estructura de Datos',
    tema: 'Complejidad algorítmica Big-O y grafos',
    descripcion: 'Revisión grupal de algoritmos de camino mínimo Dijkstra.',
    tutor: 'Ing. Carlos Ruiz',
    fecha: '10/10/2026 - 10:15 AM',
    franja: 'Mañana (08:00 AM - 12:00 PM)',
    modalidad: 'Presencial',
    ubicacion: 'Sede Plaza de la Paz - Sala de Informática 10',
    prioridad: 'Media',
    estado: 'Completada',
    tipoAtencion: 'Tutoría Grupal',
    observaciones:
      'Participación activa. Se pactó entrega de ejercicios complementarios para la próxima semana.',
    asistencia: 1,
    folioAuditoria: 'AUD-2026-1060',
    reasignado: false,
    docenteSeleccionado: '',
    mensajes: [
      {
        autor: 'Valeria Morales Díaz',
        rol: 'ESTUDIANTE',
        fechaHora: '10/10/2026 - 09:00 AM',
        mensaje: 'Solicitamos tutoría grupal para repasar recorrido de grafos.'
      },
      {
        autor: 'Ing. Carlos Ruiz',
        rol: 'DOCENTE',
        fechaHora: '10/10/2026 - 11:15 AM',
        mensaje: 'Participación activa. Se pactó entrega de ejercicios complementarios.'
      }
    ]
  }
];

const CURSOS_INICIALES: CursoSistema[] = [
  { id: 1, codigo: 'SIS-402', asignatura: 'Programación Web', docente: 'Ing. Roberto Pineda', estado: 'Activo' },
  { id: 2, codigo: 'SIS-501', asignatura: 'Bases de Datos Relacionales', docente: 'Ing. Laura Gómez', estado: 'Activo' },
  { id: 3, codigo: 'SIS-603', asignatura: 'Estructura de Datos', docente: 'Ing. Carlos Mendoza', estado: 'Activo' },
  { id: 4, codigo: 'SIS-704', asignatura: 'Inteligencia Artificial', docente: 'Ing. Diana Rodríguez', estado: 'Activo' }
];

const USUARIOS_INICIALES: UsuarioSistema[] = [
  {
    id: 1,
    tipoIdentificacion: 'CC',
    identificacion: '1140852100',
    nombre: 'Coordinación Sistemas',
    email: 'coordinacion.sistemas@unibarranquilla.edu.co',
    rol: 'ADMIN',
    estado: 'Activo',
    programa: 'Ingeniería de Sistemas'
  },
  {
    id: 2,
    tipoIdentificacion: 'CC',
    identificacion: '72245890',
    nombre: 'Ing. Roberto Pineda',
    email: 'rpineda@unibarranquilla.edu.co',
    rol: 'DOCENTE',
    estado: 'Activo',
    programa: 'Ingeniería de Sistemas'
  },
  {
    id: 3,
    tipoIdentificacion: 'CC',
    identificacion: '32890145',
    nombre: 'Ing. Laura Gómez',
    email: 'lgomez@unibarranquilla.edu.co',
    rol: 'DOCENTE',
    estado: 'Activo',
    programa: 'Ciencias Básicas'
  },
  {
    id: 4,
    tipoIdentificacion: 'CC',
    identificacion: '72310492',
    nombre: 'Ing. Carlos Mendoza',
    email: 'cmendoza@unibarranquilla.edu.co',
    rol: 'DOCENTE',
    estado: 'Activo',
    programa: 'Ingeniería de Sistemas'
  },
  {
    id: 5,
    tipoIdentificacion: 'CC',
    identificacion: '1045678912',
    nombre: 'Ing. Diana Rodríguez',
    email: 'drodriguez@unibarranquilla.edu.co',
    rol: 'DOCENTE',
    estado: 'Activo',
    programa: 'Ingeniería de Software'
  },
  {
    id: 6,
    tipoIdentificacion: 'CC',
    identificacion: '1045892110',
    nombre: 'Carlos Mario Pérez',
    email: 'meclavijo@unibarranquilla.edu.co',
    rol: 'ESTUDIANTE',
    estado: 'Activo',
    programa: 'Ingeniería de Software'
  }
];

@Injectable({
  providedIn: 'root'
})
export class Data {
  private readonly api = inject(ApiPrincipal, { optional: true });

  consultas = signal<ConsultaUnificada[]>(this.cargarDesdeStorage(STORAGE_KEY_CONSULTAS, CONSULTAS_INICIALES));
  cursos = signal<CursoSistema[]>(this.cargarDesdeStorage(STORAGE_KEY_CURSOS, CURSOS_INICIALES));
  usuarios = signal<UsuarioSistema[]>(this.cargarDesdeStorage(STORAGE_KEY_USUARIOS, USUARIOS_INICIALES));

  // Consulta activa seleccionada para ver detalle o atender entre vistas
  consultaActivaId = signal<number>(1);

  consultaActiva = computed(() => {
    const id = this.consultaActivaId();
    const lista = this.consultas();
    return lista.find(c => c.id === id) || lista[0] || null;
  });

  docentesDisponibles = computed(() =>
    this.usuarios()
      .filter(u => u.rol === 'DOCENTE' && u.estado === 'Activo')
      .map(u => u.nombre)
  );

  constructor() {
    effect(() => {
      this.guardarEnStorage(STORAGE_KEY_CONSULTAS, this.consultas());
    });
    effect(() => {
      this.guardarEnStorage(STORAGE_KEY_CURSOS, this.cursos());
    });
    effect(() => {
      this.guardarEnStorage(STORAGE_KEY_USUARIOS, this.usuarios());
    });

    if (typeof localStorage !== 'undefined' && localStorage.getItem('iub_jwt_token')) {
      setTimeout(() => this.sincronizarDesdeBackend(), 300);
    }
  }

  seleccionarConsulta(id: number): void {
    this.consultaActivaId.set(id);
  }

  crearConsulta(datos: {
    estudiante?: string;
    documento?: string;
    correoEstudiante?: string;
    asignatura: string;
    tema: string;
    descripcion?: string;
    tutor?: string;
    modalidad: string;
    franja: string;
    fecha?: string;
    ubicacion?: string;
    prioridad?: 'Alta' | 'Media' | 'Baja';
  }): ConsultaUnificada {
    const num = Math.floor(1000 + Math.random() * 9000);
    const radicado = `TUT-2026-${num}`;
    const ahora = new Date();
    const fechaFormateada =
      datos.fecha ||
      `${String(ahora.getDate()).padStart(2, '0')}/${String(ahora.getMonth() + 1).padStart(2, '0')}/${ahora.getFullYear()} - ${datos.franja.split(' ')[0]}`;

    // Si es asignación automática, buscar el docente titular del curso
    let tutorAsignado = datos.tutor || '';
    if (!tutorAsignado || tutorAsignado.includes('Automática') || tutorAsignado === 'En asignación') {
      const cursoMatch = this.cursos().find(
        c => c.asignatura.toLowerCase() === datos.asignatura.toLowerCase()
      );
      tutorAsignado = cursoMatch ? cursoMatch.docente : 'Ing. Roberto Pineda';
    }

    const nueva: ConsultaUnificada = {
      id: Date.now(),
      radicado,
      estudiante: datos.estudiante || 'Carlos Mario Pérez',
      documento: datos.documento || '1045892110',
      correoEstudiante: datos.correoEstudiante || 'meclavijo@unibarranquilla.edu.co',
      asignatura: datos.asignatura,
      tema: datos.tema,
      descripcion:
        datos.descripcion ||
        `Solicitud académica sobre ${datos.tema} en la asignatura ${datos.asignatura}.`,
      tutor: tutorAsignado,
      fecha: fechaFormateada,
      franja: datos.franja,
      modalidad: datos.modalidad.includes('Virtual') ? 'Virtual' : 'Presencial',
      ubicacion:
        datos.ubicacion ||
        (datos.modalidad.includes('Virtual')
          ? 'Enlace Google Meet institucional'
          : 'Sede Plaza de la Paz - Sala de Tutorías'),
      prioridad: datos.prioridad || 'Media',
      estado: 'Pendiente',
      tipoAtencion: 'Tutoría Individual',
      observaciones: 'Solicitud radicada por el estudiante. Pendiente de atención por el docente.',
      asistencia: 1,
      folioAuditoria: `AUD-2026-${num}`,
      reasignado: false,
      docenteSeleccionado: '',
      mensajes: [
        {
          autor: datos.estudiante || 'Carlos Mario Pérez',
          rol: 'ESTUDIANTE',
          fechaHora: 'Recién radicado',
          mensaje: datos.descripcion || datos.tema
        }
      ]
    };

    this.consultas.update(lista => [nueva, ...lista]);
    this.consultaActivaId.set(nueva.id);

    // Si hay conexión con la API y sesión activa, persistir en PostgreSQL
    if (this.api && typeof localStorage !== 'undefined' && localStorage.getItem('iub_jwt_token')) {
      const docenteMatch = this.usuarios().find(
        u => u.rol === 'DOCENTE' && u.nombre.toLowerCase().includes(tutorAsignado.toLowerCase())
      );
      const moduloMatch = this.cursos().find(
        c => c.asignatura.toLowerCase() === datos.asignatura.toLowerCase()
      );

      const hoy = new Date();
      const fechaIso = hoy.toISOString().split('T')[0];
      const horaIso = `${String(hoy.getHours()).padStart(2, '0')}:${String(hoy.getMinutes()).padStart(2, '0')}:00`;

      let prioridadApi: PrioridadSolicitudApi = 'MEDIA';
      if (datos.prioridad === 'Alta') prioridadApi = 'ALTA';
      else if (datos.prioridad === 'Baja') prioridadApi = 'BAJA';

      this.api
        .registrarSolicitudConsulta({
          prioridad: prioridadApi,
          asunto: datos.tema.trim(),
          descripcion: datos.descripcion || datos.tema,
          fechaConsulta: fechaIso,
          horaConsulta: horaIso,
          docenteId: docenteMatch ? docenteMatch.id : 1,
          moduloId: moduloMatch ? moduloMatch.id : 1
        })
        .subscribe({
          next: (remota) => {
            this.consultas.update(lista =>
              lista.map(c =>
                c.id === nueva.id
                  ? {
                      ...c,
                      id: remota.id,
                      radicado: remota.numeroConsulta || c.radicado,
                      folioAuditoria: `AUD-${remota.numeroConsulta || remota.id}`
                    }
                  : c
              )
            );
          },
          error: () => {}
        });
    }

    return nueva;
  }

  atenderConsultaDocente(
    id: number,
    datos: {
      tipoAtencion: string;
      temaTratado: string;
      observaciones: string;
      asistenciaConfirmada: boolean;
    }
  ): void {
    const ahora = new Date();
    const marcaTiempo = `${String(ahora.getDate()).padStart(2, '0')}/${String(ahora.getMonth() + 1).padStart(2, '0')}/${ahora.getFullYear()} - ${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;

    this.consultas.update(lista =>
      lista.map(c => {
        if (c.id !== id) return c;
        const nuevoMensaje: MensajeInteraccion = {
          autor: `Docente: ${c.tutor}`,
          rol: 'DOCENTE',
          fechaHora: marcaTiempo,
          mensaje:
            datos.observaciones.trim() ||
            `Tutoría atendida sobre: ${datos.temaTratado}. Asistencia verificada.`
        };
        return {
          ...c,
          tipoAtencion: datos.tipoAtencion,
          tema: datos.temaTratado,
          observaciones:
            datos.observaciones.trim() ||
            `Sesión completada satisfactoriamente (${datos.tipoAtencion}).`,
          asistencia: datos.asistenciaConfirmada ? 1 : 0,
          estado: 'Completada',
          fecha: marcaTiempo,
          mensajes: [...c.mensajes, nuevoMensaje]
        };
      })
    );

    if (this.api && typeof localStorage !== 'undefined' && localStorage.getItem('iub_jwt_token')) {
      this.api
        .cambiarEstadoSolicitud(id, {
          estado: 'RESUELTA',
          motivo: datos.observaciones || 'Tutoría atendida por el docente.'
        })
        .subscribe({ error: () => {} });

      if (datos.observaciones.trim()) {
        this.api
          .registrarComentario({
            solicitudConsultaId: id,
            contenido: datos.observaciones.trim()
          })
          .subscribe({ error: () => {} });
      }
    }
  }

  reasignarTutor(id: number, nuevoDocente: string): void {
    this.consultas.update(lista =>
      lista.map(c => {
        if (c.id !== id) return c;
        return {
          ...c,
          tutor: nuevoDocente,
          reasignado: true,
          docenteSeleccionado: nuevoDocente,
          estado: c.estado === 'Pendiente' ? 'Programada' : c.estado,
          observaciones: `Consulta reasignada por Coordinación Académica al docente ${nuevoDocente}.`
        };
      })
    );

    if (this.api && typeof localStorage !== 'undefined' && localStorage.getItem('iub_jwt_token')) {
      const docenteObj = this.usuarios().find(
        u => u.rol === 'DOCENTE' && u.nombre.toLowerCase().includes(nuevoDocente.toLowerCase())
      );
      if (docenteObj) {
        this.api.reasignarDocenteSolicitud(id, docenteObj.id).subscribe({ error: () => {} });
      }
    }
  }

  actualizarConsulta(id: number, cambios: Partial<ConsultaUnificada>): void {
    this.consultas.update(lista =>
      lista.map(c => (c.id === id ? { ...c, ...cambios } : c))
    );
  }

  cambiarEstadoConsulta(
    id: number,
    nuevoEstado: ConsultaUnificada['estado'],
    motivo?: string
  ): void {
    this.consultas.update(lista =>
      lista.map(c => {
        if (c.id !== id) return c;
        return {
          ...c,
          estado: nuevoEstado,
          observaciones: motivo ? motivo : c.observaciones
        };
      })
    );

    if (this.api) {
      let estadoApi: EstadoSolicitudApi = 'PENDIENTE';
      if (nuevoEstado === 'En proceso' || nuevoEstado === 'Programada') estadoApi = 'EN_PROCESO';
      else if (nuevoEstado === 'Completada' || nuevoEstado === 'Resuelta') estadoApi = 'RESUELTA';
      else if (nuevoEstado === 'Cancelada' || nuevoEstado === 'Inactiva') estadoApi = 'CANCELADA';

      this.api
        .cambiarEstadoSolicitud(id, { estado: estadoApi, motivo: motivo || null })
        .subscribe({ error: () => {} });
    }
  }

  agregarComentario(id: number, autor: string, rol: 'ESTUDIANTE' | 'DOCENTE' | 'ADMIN', texto: string): void {
    if (!texto.trim()) return;
    const ahora = new Date();
    const fechaHora = `${String(ahora.getDate()).padStart(2, '0')}/${String(ahora.getMonth() + 1).padStart(2, '0')}/${ahora.getFullYear()} - ${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;

    this.consultas.update(lista =>
      lista.map(c => {
        if (c.id !== id) return c;
        return {
          ...c,
          mensajes: [
            ...c.mensajes,
            {
              autor,
              rol,
              fechaHora,
              mensaje: texto.trim()
            }
          ]
        };
      })
    );

    if (this.api) {
      this.api
        .registrarComentario({
          solicitudConsultaId: id,
          contenido: texto.trim()
        })
        .subscribe({ error: () => {} });
    }
  }

  /**
   * Sincroniza usuarios, módulos (asignaturas) y solicitudes de consulta
   * desde la API principal en Render (https://sistemaconsultas-api.onrender.com)
   */
  sincronizarDesdeBackend(): void {
    if (!this.api) return;

    // 1. Sincronizar Usuarios (/usuarios)
    this.api.listarUsuarios(true).subscribe({
      next: (usuariosRemotos: UsuarioResponseApi[]) => {
        if (!usuariosRemotos || usuariosRemotos.length === 0) return;
        const mapeados: UsuarioSistema[] = usuariosRemotos.map((u) => ({
          id: u.id,
          tipoIdentificacion: u.tipoDocumentoSigla === 'TI' ? 'TI' : 'CC',
          identificacion: u.identificacion || String(1045000000 + u.id),
          nombre: `${u.nombre} ${u.apellido || ''}`.trim(),
          email: u.correo || `usuario${u.id}@unibarranquilla.edu.co`,
          rol: u.rol === 'ADMINISTRADOR' ? 'ADMIN' : u.rol,
          estado: u.estado ? 'Activo' : 'Inactivo',
          programa: u.programaNombre || 'Ingeniería de Sistemas'
        }));
        this.usuarios.set(mapeados);
      },
      error: () => {}
    });

    // 2. Sincronizar Módulos / Asignaturas (/modulos)
    this.api.listarModulosAsignaturas().subscribe({
      next: (modulosRemotos: ModuloResponseApi[]) => {
        if (!modulosRemotos || modulosRemotos.length === 0) return;
        const docentes = this.docentesDisponibles();
        const mapeados: CursoSistema[] = modulosRemotos.map((m, idx) => ({
          id: m.id,
          codigo: `IUB-MOD-${100 + m.id}`,
          asignatura: m.nombre,
          docente: docentes[idx % Math.max(docentes.length, 1)] || 'Ing. Roberto Pineda',
          estado: m.estado ? 'Activo' : 'Inactivo'
        }));
        this.cursos.set(mapeados);
      },
      error: () => {}
    });

    // 3. Sincronizar Solicitudes de Consulta (/solicitudes-consultas)
    this.api.listarSolicitudesConsulta().subscribe({
      next: (solicitudesRemotas: SolicitudConsultaResponseApi[]) => {
        if (!solicitudesRemotas || solicitudesRemotas.length === 0) return;
        const mapeadas: ConsultaUnificada[] = solicitudesRemotas.map((s) => {
          let estadoLocal: ConsultaUnificada['estado'] = 'Pendiente';
          if (s.estado === 'EN_PROCESO') estadoLocal = 'Programada';
          else if (s.estado === 'RESUELTA') estadoLocal = 'Completada';
          else if (s.estado === 'CANCELADA' || s.estado === 'RECHAZADA') estadoLocal = 'Cancelada';

          let prioridadLocal: ConsultaUnificada['prioridad'] = 'Media';
          if (s.prioridad === 'ALTA') prioridadLocal = 'Alta';
          else if (s.prioridad === 'BAJA') prioridadLocal = 'Baja';

          return {
            id: s.id,
            radicado: s.numeroConsulta || `TUT-2026-${1000 + s.id}`,
            estudiante: s.nombreCompletoEstudiante,
            documento: s.identificacionEstudiante || '1045000000',
            correoEstudiante: 'estudiante@unibarranquilla.edu.co',
            asignatura: s.nombreModulo,
            tema: s.asunto,
            descripcion: s.descripcion,
            tutor: s.nombreCompletoDocente,
            fecha: `${s.fechaConsulta} - ${s.horaConsulta}`,
            franja: 'Jornada Académica',
            modalidad: s.nombreRecursoFisico?.toLowerCase().includes('virtual')
              ? 'Virtual'
              : 'Presencial',
            ubicacion: s.nombreRecursoFisico || 'Sede Plaza de la Paz',
            prioridad: prioridadLocal,
            estado: estadoLocal,
            tipoAtencion: 'Tutoría Individual',
            observaciones: s.descripcion,
            asistencia: estadoLocal === 'Completada' ? 1 : 0,
            folioAuditoria: `AUD-${s.numeroConsulta || s.id}`,
            reasignado: false,
            docenteSeleccionado: s.nombreCompletoDocente,
            mensajes: [
              {
                autor: s.nombreCompletoEstudiante,
                rol: 'ESTUDIANTE',
                fechaHora: s.fechaCreacion,
                mensaje: s.descripcion
              }
            ]
          };
        });
        this.consultas.set(mapeadas);
      },
      error: () => {}
    });
  }

  private cargarDesdeStorage<T>(clave: string, valorInicial: T): T {
    try {
      if (typeof localStorage === 'undefined') return valorInicial;
      const guardado = localStorage.getItem(clave);
      if (!guardado) return valorInicial;
      return JSON.parse(guardado) as T;
    } catch {
      return valorInicial;
    }
  }

  private guardarEnStorage<T>(clave: string, valor: T): void {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(clave, JSON.stringify(valor));
    } catch {
      // Ignorar errores de cuota en storage
    }
  }
}
