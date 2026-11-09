import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { ApiPrincipal, LoginResponseApi, MeResponseApi, ModuloInfoApi } from './api-principal';
import { Data, UsuarioSistema } from './data';
import { EspaciosAux } from './espacios-aux';

export type RolUsuario = 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE';

export interface RolXModuloItem {
  id: number;
  rol: RolUsuario;
  titulo: string;
  ruta: string;
  icono: string;
  orden: number;
  estado: 'Activo' | 'Inactivo';
}

export interface SesionJWT {
  token: string;
  usuario: UsuarioSistema;
  rol: RolUsuario;
  modulosPermitidos: RolXModuloItem[];
  expiraEn: number;
}

const STORAGE_KEY_TOKEN = 'iub_jwt_token';
const STORAGE_KEY_MODULOS_DB = 'iub_modulos_rol_db';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private dataService = inject(Data);
  private apiPrincipal = inject(ApiPrincipal, { optional: true });
  private espaciosService = inject(EspaciosAux, { optional: true });

  rolActivo = signal<RolUsuario>(this.obtenerRolInicial());
  correoActivo = signal<string>(this.obtenerCorreoInicial());
  nombreActivo = signal<string>(this.obtenerNombreInicial());
  identificacionActiva = signal<string>(this.obtenerIdentificacionInicial());
  usuarioIdActivo = signal<number>(this.obtenerUsuarioIdInicial());
  tokenJWT = signal<string | null>(this.obtenerTokenInicial());

  /**
   * Módulos activos del rol cargados desde la tabla modulo_x_rol (rolxmodulo) de PostgreSQL
   * a través de POST /auth/login y GET /auth/me.
   */
  modulosDesdeBD = signal<ModuloInfoApi[]>(this.obtenerModulosBDIniciales());

  tablaRolXModulo = computed<RolXModuloItem[]>(() =>
    this.construirMenuDesdeBD(this.rolActivo(), this.modulosDesdeBD())
  );

  modulosDelRolActivo = computed(() =>
    this.obtenerModulosPorRol(this.rolActivo())
  );

  constructor() {
    const tokenActual = this.tokenJWT();
    const rutaActual = typeof window !== 'undefined' ? window.location.pathname : '';
    const esRutaPublica =
      rutaActual.startsWith('/login') ||
      rutaActual.startsWith('/registro') ||
      rutaActual.startsWith('/principal');

    if (tokenActual && this.esTokenValido(tokenActual) && !esRutaPublica) {
      this.sincronizarPerfilActual();
      this.dataService.sincronizarDesdeBackend();
      this.espaciosService?.sincronizarDesdeBackend();
    }
  }

  /**
   * Convierte únicamente los registros de la tabla modulo_x_rol (devueltos por el backend)
   * en los ítems de navegación del rol autenticado.
   */
  private construirMenuDesdeBD(rol: RolUsuario, modulosRemotos: ModuloInfoApi[]): RolXModuloItem[] {
    const lista = modulosRemotos || [];
    const items: RolXModuloItem[] = [];
    const rutasAgregadas = new Set<string>();

    const agregarItem = (titulo: string, ruta: string, icono: string, orden: number) => {
      if (rutasAgregadas.has(ruta)) return;
      rutasAgregadas.add(ruta);
      items.push({
        id: items.length + 1,
        rol,
        titulo,
        ruta,
        icono,
        orden,
        estado: 'Activo'
      });
    };

    const codigosActivos = new Set(lista.map((m) => (m.nombre || '').toUpperCase().trim()));
    const rutasActivas = new Set(lista.map((m) => (m.ruta || '').toLowerCase().trim()));

    if (rol === 'ADMIN') {
      if (codigosActivos.has('DASHBOARD') || rutasActivas.has('/dashboard') || rutasActivas.has('/admin/reportes')) {
        agregarItem('Reportes y Analítica', '/admin/reportes', '📊', 1);
      }
      if (codigosActivos.has('USUARIOS') || rutasActivas.has('/usuarios') || rutasActivas.has('/admin/usuarios')) {
        agregarItem('Gestión de Usuarios', '/admin/usuarios', '👥', 2);
      }
      if (codigosActivos.has('GESTION_SOLICITUDES') || rutasActivas.has('/solicitudes') || rutasActivas.has('/admin/consultas')) {
        agregarItem('Reasignar Consultas', '/admin/consultas', '🔄', 3);
      }
      if (
        codigosActivos.has('ROLES_PERMISOS') ||
        codigosActivos.has('ASIGNACION_DOCENTES') ||
        rutasActivas.has('/roles-permisos') ||
        rutasActivas.has('/asignacion-docentes') ||
        rutasActivas.has('/admin/cursos-roles')
      ) {
        agregarItem('Cursos y Roles', '/admin/cursos-roles', '🎓', 4);
      }
      if (codigosActivos.has('PROGRAMAS_ASIGNATURAS') || rutasActivas.has('/programas-asignaturas') || rutasActivas.has('/admin/programas')) {
        agregarItem('Programas Académicos', '/admin/programas', '🎓', 5);
      }
      if (codigosActivos.has('INFRAESTRUCTURA') || rutasActivas.has('/infraestructura') || rutasActivas.has('/admin/sedes')) {
        agregarItem('Gestión de Sedes', '/admin/sedes', '🏢', 6);
        agregarItem('Salones de Sedes', '/admin/salones', '🏫', 7);
      }
    } else if (rol === 'DOCENTE') {
      if (
        codigosActivos.has('ATENCION_SOLICITUDES') ||
        codigosActivos.has('DASHBOARD') ||
        rutasActivas.has('/atender-solicitudes') ||
        rutasActivas.has('/docente/asignadas')
      ) {
        agregarItem('Bandeja Asignadas', '/docente/asignadas', '📥', 1);
        agregarItem('Crear Consulta', '/docente/crear-consulta', '➕', 2);
        agregarItem('Atención de Consulta', '/docente/atencion', '✏️', 3);
      }
      if (codigosActivos.has('CALIFICACIONES') || rutasActivas.has('/calificaciones') || rutasActivas.has('/docente/historial')) {
        agregarItem('Historial de Tutorías', '/docente/historial', '📚', 4);
      }
      if (codigosActivos.has('DISPONIBILIDAD_DOCENTE') || rutasActivas.has('/disponibilidad-docente') || rutasActivas.has('/docente/disponibilidad')) {
        agregarItem('Mi Disponibilidad', '/docente/disponibilidad', '🕒', 5);
      }
    } else if (rol === 'ESTUDIANTE') {
      if (
        codigosActivos.has('MIS_SOLICITUDES') ||
        codigosActivos.has('DASHBOARD') ||
        rutasActivas.has('/mis-solicitudes') ||
        rutasActivas.has('/estudiante/mis-solicitudes')
      ) {
        agregarItem('Mis Solicitudes', '/estudiante/mis-solicitudes', '📋', 1);
        agregarItem('Crear Consulta', '/estudiante/crear', '➕', 2);
      }
      if (
        codigosActivos.has('CALIFICACIONES') ||
        codigosActivos.has('NOTIFICACIONES') ||
        rutasActivas.has('/calificaciones') ||
        rutasActivas.has('/estudiante/detalle')
      ) {
        agregarItem('Detalle e Interacción', '/estudiante/detalle', '💬', 3);
      }
      if (codigosActivos.has('PERFIL') || rutasActivas.has('/perfil') || rutasActivas.has('/estudiante/directorio-tutorias')) {
        agregarItem('Directorio de Tutorías', '/estudiante/directorio-tutorias', '📖', 4);
      }
    }

    // Incluir cualquier módulo personalizado creado en modulos_sistema con ruta directa del rol
    const prefijoRol = rol === 'ADMIN' ? '/admin/' : rol === 'DOCENTE' ? '/docente/' : '/estudiante/';
    for (const m of lista) {
      const rutaLimpia = (m.ruta || '').trim();
      if (rutaLimpia.startsWith(prefijoRol) && !rutasAgregadas.has(rutaLimpia)) {
        agregarItem(m.nombre, rutaLimpia, m.icono || '📌', items.length + 1);
      }
    }

    return items.sort((a, b) => a.orden - b.orden);
  }

  /**
   * Verifica que exista un JWT con estructura válida en sesión.
   * No usa Date.now() local para no invalidar sesiones cuando la fecha del sistema
   * operativo del equipo difiere del reloj UTC del servidor en Render.
   */
  esTokenValido(token?: string | null): boolean {
    const tk = token ?? this.tokenJWT();
    if (!tk) return false;
    return tk.split('.').length === 3;
  }

  sincronizarPerfilActual(): void {
    if (!this.apiPrincipal || !this.apiPrincipal.baseUrl || !this.esTokenValido()) return;
    this.apiPrincipal.miPerfil().subscribe({
      next: (perfil: MeResponseApi) => {
        const rolNormalizado: RolUsuario =
          perfil.rol === 'ADMINISTRADOR' ? 'ADMIN' : (perfil.rol as RolUsuario);
        this.rolActivo.set(rolNormalizado);
        this.correoActivo.set(perfil.correo || '');
        this.nombreActivo.set(perfil.nombre || '');
        this.identificacionActiva.set(perfil.identificacion || '');
        this.usuarioIdActivo.set(perfil.id);
        this.modulosDesdeBD.set(perfil.modulos || []);

        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('rolActivo', rolNormalizado);
          localStorage.setItem('correoActivo', perfil.correo || '');
          localStorage.setItem('nombreUsuarioActivo', perfil.nombre || '');
          localStorage.setItem('identificacionUsuarioActivo', perfil.identificacion || '');
          localStorage.setItem('idUsuarioActivo', String(perfil.id));
          localStorage.setItem(STORAGE_KEY_MODULOS_DB, JSON.stringify(perfil.modulos || []));
        }
      },
      error: (err) => {
        if (err?.status === 401) {
          this.cerrarSesion();
        }
      }
    });
  }

  obtenerModulosPorRol(rol: RolUsuario): RolXModuloItem[] {
    return this.construirMenuDesdeBD(rol, this.modulosDesdeBD());
  }

  obtenerRutaInicialPorRol(rol: RolUsuario): string {
    const modulos = this.obtenerModulosPorRol(rol);
    if (modulos.length > 0) {
      return modulos[0].ruta;
    }
    if (rol === 'ADMIN') return '/admin/reportes';
    if (rol === 'DOCENTE') return '/docente/asignadas';
    return '/estudiante/mis-solicitudes';
  }

  /**
   * Autentica contra el endpoint POST /auth/login de la API configurada en environment.ts
   * y sincroniza todos los catálogos desde el backend.
   */
  autenticarConApi(
    correo: string,
    password: string,
    _rolSeleccionado?: RolUsuario
  ): Observable<{ exito: boolean; mensaje: string; rutaRedireccion?: string; sesion?: SesionJWT }> {
    if (!correo.trim() || !password) {
      return of({
        exito: false,
        mensaje: 'Por favor ingresa tu correo institucional y contraseña.'
      });
    }

    if (!this.apiPrincipal || !this.apiPrincipal.baseUrl) {
      return of({
        exito: false,
        mensaje: 'La URL de la API aún no está configurada en src/environments/environment.ts.'
      });
    }

    return this.apiPrincipal.login({ correo: correo.trim(), password }).pipe(
      map((res: LoginResponseApi) => {
        const rolNormalizado: RolUsuario =
          res.rol === 'ADMINISTRADOR' ? 'ADMIN' : (res.rol as RolUsuario);

        const usuarioRemoto: UsuarioSistema = {
          id: res.id_usuario,
          tipoIdentificacion: 'CC',
          identificacion: String(1045000000 + res.id_usuario),
          nombre: res.nombre,
          email: res.correo,
          rol: rolNormalizado,
          estado: 'Activo',
          programa: ''
        };

        this.rolActivo.set(rolNormalizado);
        this.correoActivo.set(res.correo);
        this.nombreActivo.set(res.nombre);
        this.usuarioIdActivo.set(res.id_usuario);
        this.tokenJWT.set(res.token);
        this.modulosDesdeBD.set(res.modulos || []);

        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('iub_consultas_api_cache');
          localStorage.removeItem('iub_consulta_activa_id');
          localStorage.setItem('rolActivo', rolNormalizado);
          localStorage.setItem('correoActivo', res.correo);
          localStorage.setItem('nombreUsuarioActivo', res.nombre);
          localStorage.setItem('idUsuarioActivo', String(res.id_usuario));
          localStorage.setItem(STORAGE_KEY_TOKEN, res.token);
          localStorage.setItem('token', res.token);
          localStorage.setItem('id_usuario', String(res.id_usuario));
          localStorage.setItem(STORAGE_KEY_MODULOS_DB, JSON.stringify(res.modulos || []));
        }

        // Limpiar lista previa antes de sincronizar los registros reales del nuevo perfil desde PostgreSQL
        this.dataService.consultas.set([]);
        this.dataService.consultaActivaId.set(0);

        // Completar datos de perfil (/auth/me) como identificación y sincronizar catálogos
        this.sincronizarPerfilActual();
        this.dataService.sincronizarDesdeBackend();
        this.espaciosService?.sincronizarDesdeBackend();

        const modulosPermitidos = this.obtenerModulosPorRol(rolNormalizado);
        const rutaRedireccion = this.obtenerRutaInicialPorRol(rolNormalizado);

        return {
          exito: true,
          mensaje: 'Autenticación exitosa.',
          rutaRedireccion,
          sesion: {
            token: res.token,
            usuario: usuarioRemoto,
            rol: rolNormalizado,
            modulosPermitidos,
            expiraEn: Date.now() + 8 * 60 * 60 * 1000
          }
        };
      }),
      catchError((err) => {
        const detalle =
          err?.error?.detail ||
          err?.error?.message ||
          'No se pudo iniciar sesión. Verifica tus credenciales o la conexión con el backend.';
        return of({
          exito: false,
          mensaje: detalle
        });
      })
    );
  }

  tienePermisoRuta(url: string, rolEsperado?: RolUsuario): boolean {
    const rolActual = this.rolActivo();
    if (rolEsperado && rolActual !== rolEsperado) {
      return false;
    }

    const modulos = this.obtenerModulosPorRol(rolActual);
    if (modulos.length === 0) {
      return true;
    }
    const rutaLimpia = url.split('?')[0];
    return modulos.some(m => rutaLimpia.startsWith(m.ruta));
  }

  sincronizarRolDesdeUrl(url: string): void {
    if (url.startsWith('/admin')) {
      this.rolActivo.set('ADMIN');
    } else if (url.startsWith('/docente')) {
      this.rolActivo.set('DOCENTE');
    } else if (url.startsWith('/estudiante')) {
      this.rolActivo.set('ESTUDIANTE');
    }
  }

  cerrarSesion(): void {
    this.tokenJWT.set(null);
    this.nombreActivo.set('');
    this.correoActivo.set('');
    this.identificacionActiva.set('');
    this.usuarioIdActivo.set(0);
    this.modulosDesdeBD.set([]);
    this.dataService.consultas.set([]);
    this.dataService.consultaActivaId.set(0);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('rolActivo');
      localStorage.removeItem('correoActivo');
      localStorage.removeItem('nombreUsuarioActivo');
      localStorage.removeItem('token');
      localStorage.removeItem('id_usuario');
      localStorage.removeItem('identificacionUsuarioActivo');
      localStorage.removeItem('idUsuarioActivo');
      localStorage.removeItem('iub_consultas_api_cache');
      localStorage.removeItem('iub_consulta_activa_id');
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_MODULOS_DB);
    }
  }

  private obtenerRolInicial(): RolUsuario {
    try {
      if (typeof localStorage === 'undefined') return 'ESTUDIANTE';
      const guardado = localStorage.getItem('rolActivo') as RolUsuario | null;
      if (guardado === 'ADMIN' || guardado === 'DOCENTE' || guardado === 'ESTUDIANTE') {
        return guardado;
      }
      return 'ESTUDIANTE';
    } catch {
      return 'ESTUDIANTE';
    }
  }

  private obtenerCorreoInicial(): string {
    try {
      if (typeof localStorage === 'undefined') return '';
      return localStorage.getItem('correoActivo') || '';
    } catch {
      return '';
    }
  }

  private obtenerNombreInicial(): string {
    try {
      if (typeof localStorage === 'undefined') return '';
      return localStorage.getItem('nombreUsuarioActivo') || '';
    } catch {
      return '';
    }
  }

  private obtenerIdentificacionInicial(): string {
    try {
      if (typeof localStorage === 'undefined') return '';
      return localStorage.getItem('identificacionUsuarioActivo') || '';
    } catch {
      return '';
    }
  }

  private obtenerUsuarioIdInicial(): number {
    try {
      if (typeof localStorage === 'undefined') return 0;
      return Number(localStorage.getItem('idUsuarioActivo') || 0);
    } catch {
      return 0;
    }
  }

  private obtenerTokenInicial(): string | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      const tk = localStorage.getItem(STORAGE_KEY_TOKEN);
      if (!tk || tk.split('.').length !== 3) {
        return null;
      }
      return tk;
    } catch {
      return null;
    }
  }

  private obtenerModulosBDIniciales(): ModuloInfoApi[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(STORAGE_KEY_MODULOS_DB);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
