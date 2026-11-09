import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { ApiPrincipal, LoginResponseApi } from './api-principal';
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

const STORAGE_KEY_ROLXMODULO = 'iub_rolxmodulo_v1';
const STORAGE_KEY_TOKEN = 'iub_jwt_token';

const TABLA_ROL_X_MODULO_INICIAL: RolXModuloItem[] = [
  // ==========================================
  // PERMISOS ROL 1: ADMINISTRADOR (rolxmodulo)
  // ==========================================
  {
    id: 1,
    rol: 'ADMIN',
    titulo: 'Reportes y Analítica',
    ruta: '/admin/reportes',
    icono: '📊',
    orden: 1,
    estado: 'Activo'
  },
  {
    id: 2,
    rol: 'ADMIN',
    titulo: 'Gestión de Usuarios',
    ruta: '/admin/usuarios',
    icono: '👥',
    orden: 2,
    estado: 'Activo'
  },
  {
    id: 3,
    rol: 'ADMIN',
    titulo: 'Reasignar Consultas',
    ruta: '/admin/consultas',
    icono: '🔄',
    orden: 3,
    estado: 'Activo'
  },
  {
    id: 4,
    rol: 'ADMIN',
    titulo: 'Cursos y Roles',
    ruta: '/admin/cursos-roles',
    icono: '🎓',
    orden: 4,
    estado: 'Activo'
  },
  {
    id: 5,
    rol: 'ADMIN',
    titulo: 'Gestión de Sedes',
    ruta: '/admin/sedes',
    icono: '🏢',
    orden: 5,
    estado: 'Activo'
  },
  {
    id: 6,
    rol: 'ADMIN',
    titulo: 'Salones de Sedes',
    ruta: '/admin/salones',
    icono: '🏫',
    orden: 6,
    estado: 'Activo'
  },

  // ==========================================
  // PERMISOS ROL 2: DOCENTE (rolxmodulo)
  // ==========================================
  {
    id: 7,
    rol: 'DOCENTE',
    titulo: 'Bandeja Asignadas',
    ruta: '/docente/asignadas',
    icono: '📥',
    orden: 1,
    estado: 'Activo'
  },
  {
    id: 8,
    rol: 'DOCENTE',
    titulo: 'Atención de Consulta',
    ruta: '/docente/atencion',
    icono: '✏️',
    orden: 2,
    estado: 'Activo'
  },
  {
    id: 9,
    rol: 'DOCENTE',
    titulo: 'Historial de Tutorías',
    ruta: '/docente/historial',
    icono: '📚',
    orden: 3,
    estado: 'Activo'
  },

  // ==========================================
  // PERMISOS ROL 3: ESTUDIANTE (rolxmodulo)
  // ==========================================
  {
    id: 10,
    rol: 'ESTUDIANTE',
    titulo: 'Mis Solicitudes',
    ruta: '/estudiante/mis-solicitudes',
    icono: '📋',
    orden: 1,
    estado: 'Activo'
  },
  {
    id: 11,
    rol: 'ESTUDIANTE',
    titulo: 'Crear Consulta',
    ruta: '/estudiante/crear',
    icono: '➕',
    orden: 2,
    estado: 'Activo'
  },
  {
    id: 12,
    rol: 'ESTUDIANTE',
    titulo: 'Detalle e Interacción',
    ruta: '/estudiante/detalle',
    icono: '💬',
    orden: 3,
    estado: 'Activo'
  },
  {
    id: 13,
    rol: 'ESTUDIANTE',
    titulo: 'Directorio de Tutorías',
    ruta: '/estudiante/directorio-tutorias',
    icono: '📖',
    orden: 4,
    estado: 'Activo'
  }
];

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private dataService = inject(Data);
  private apiPrincipal = inject(ApiPrincipal, { optional: true });
  private espaciosService = inject(EspaciosAux, { optional: true });

  // Tabla simulada rolxmodulo sincronizada con localStorage
  tablaRolXModulo = signal<RolXModuloItem[]>(this.cargarRolXModulo());

  rolActivo = signal<RolUsuario>(this.obtenerRolInicial());
  correoActivo = signal<string>(this.obtenerCorreoInicial());
  tokenJWT = signal<string | null>(this.obtenerTokenInicial());

  // Módulos cargados dinámicamente desde rolxmodulo según el rol activo
  modulosDelRolActivo = computed(() =>
    this.obtenerModulosPorRol(this.rolActivo())
  );

  obtenerModulosPorRol(rol: RolUsuario): RolXModuloItem[] {
    return this.tablaRolXModulo()
      .filter(m => m.rol === rol && m.estado === 'Activo')
      .sort((a, b) => a.orden - b.orden);
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

  autenticar(
    correo: string,
    password: string,
    rolSeleccionado: RolUsuario
  ): { exito: boolean; mensaje: string; rutaRedireccion?: string; sesion?: SesionJWT } {
    const correoLimpio = correo.trim().toLowerCase();

    if (!correoLimpio || !password) {
      return {
        exito: false,
        mensaje: 'Por favor ingresa tu correo institucional y contraseña.'
      };
    }

    // Buscar en la tabla de usuarios de Data (incluye los creados o editados por el Admin)
    const usuarios = this.dataService.usuarios();
    const usuario = usuarios.find(u => u.email.toLowerCase() === correoLimpio);

    if (!usuario) {
      return {
        exito: false,
        mensaje: 'El correo ingresado no se encuentra registrado en el sistema.'
      };
    }

    if (usuario.estado !== 'Activo') {
      return {
        exito: false,
        mensaje: `La cuenta de ${usuario.nombre} se encuentra Inactiva. Contacta al Administrador.`
      };
    }

    if (usuario.rol !== rolSeleccionado) {
      return {
        exito: false,
        mensaje: `El correo ingresado pertenece al rol ${usuario.rol}, no al rol ${rolSeleccionado}.`
      };
    }

    // Validación de contraseña (por defecto 12345678 para usuarios institucionales)
    if (password !== '12345678') {
      return {
        exito: false,
        mensaje: 'Contraseña incorrecta. Verifica e intenta nuevamente.'
      };
    }

    // Consultar módulos asignados en rolxmodulo para este rol
    const modulosPermitidos = this.obtenerModulosPorRol(usuario.rol);
    const expiraEn = Date.now() + 8 * 60 * 60 * 1000; // 8 horas
    const token = this.generarTokenJWT({
      sub: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
      modulos: modulosPermitidos.map(m => m.ruta),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiraEn / 1000)
    });

    this.rolActivo.set(usuario.rol);
    this.correoActivo.set(usuario.email);
    this.tokenJWT.set(token);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('rolActivo', usuario.rol);
      localStorage.setItem('correoActivo', usuario.email);
      localStorage.setItem('nombreUsuarioActivo', usuario.nombre);
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
    }

    const rutaRedireccion = this.obtenerRutaInicialPorRol(usuario.rol);

    return {
      exito: true,
      mensaje: 'Autenticación exitosa.',
      rutaRedireccion,
      sesion: {
        token,
        usuario,
        rol: usuario.rol,
        modulosPermitidos,
        expiraEn
      }
    };
  }

  /**
   * Autentica contra el endpoint real POST /auth/login de la API principal en Render
   * (https://sistemaconsultas-api.onrender.com/auth/login) y sincroniza todos los catálogos.
   * Si el usuario corresponde a las credenciales locales o el servidor está iniciando,
   * hace fallback transparente a `autenticar()` local.
   */
  autenticarConApi(
    correo: string,
    password: string,
    rolSeleccionado: RolUsuario
  ): Observable<{ exito: boolean; mensaje: string; rutaRedireccion?: string; sesion?: SesionJWT }> {
    if (!this.apiPrincipal) {
      return of(this.autenticar(correo, password, rolSeleccionado));
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
          programa: 'Ingeniería de Sistemas'
        };

        this.rolActivo.set(rolNormalizado);
        this.correoActivo.set(res.correo);
        this.tokenJWT.set(res.token);

        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('rolActivo', rolNormalizado);
          localStorage.setItem('correoActivo', res.correo);
          localStorage.setItem('nombreUsuarioActivo', res.nombre);
          localStorage.setItem(STORAGE_KEY_TOKEN, res.token);
          localStorage.setItem('token', res.token);
          localStorage.setItem('id_usuario', String(res.id_usuario));
        }

        // Sincronizar datos desde el backend PostgreSQL una vez guardado el Bearer token
        this.dataService.sincronizarDesdeBackend();
        this.espaciosService?.sincronizarDesdeBackend();

        const modulosPermitidos = this.obtenerModulosPorRol(rolNormalizado);
        const rutaRedireccion = this.obtenerRutaInicialPorRol(rolNormalizado);

        return {
          exito: true,
          mensaje: 'Autenticación exitosa con API Principal.',
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
      catchError(() => {
        // Fallback al validador institucional local
        return of(this.autenticar(correo, password, rolSeleccionado));
      })
    );
  }

  tienePermisoRuta(url: string, rolEsperado?: RolUsuario): boolean {
    const rolActual = this.rolActivo();
    if (rolEsperado && rolActual !== rolEsperado) {
      return false;
    }

    const modulos = this.obtenerModulosPorRol(rolActual);
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
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('rolActivo');
      localStorage.removeItem('correoActivo');
      localStorage.removeItem('nombreUsuarioActivo');
      localStorage.removeItem('token');
      localStorage.removeItem('id_usuario');
      localStorage.removeItem(STORAGE_KEY_TOKEN);
    }
  }

  private generarTokenJWT(payload: Record<string, unknown>): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encode = (obj: Record<string, unknown>) => {
      try {
        return btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
      } catch {
        return 'eyJhbGciOiJIUzI1NiJ9';
      }
    };
    const firmaSimulada = 'iub_signature_2026_verified';
    return `${encode(header)}.${encode(payload)}.${firmaSimulada}`;
  }

  private cargarRolXModulo(): RolXModuloItem[] {
    try {
      if (typeof localStorage === 'undefined') return TABLA_ROL_X_MODULO_INICIAL;
      const guardado = localStorage.getItem(STORAGE_KEY_ROLXMODULO);
      if (!guardado) {
        localStorage.setItem(
          STORAGE_KEY_ROLXMODULO,
          JSON.stringify(TABLA_ROL_X_MODULO_INICIAL)
        );
        return TABLA_ROL_X_MODULO_INICIAL;
      }
      return JSON.parse(guardado) as RolXModuloItem[];
    } catch {
      return TABLA_ROL_X_MODULO_INICIAL;
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

  private obtenerTokenInicial(): string | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      return localStorage.getItem(STORAGE_KEY_TOKEN);
    } catch {
      return null;
    }
  }
}
