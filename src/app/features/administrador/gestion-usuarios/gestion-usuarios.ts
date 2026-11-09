import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiPrincipal, RolApi } from '../../../core/services/api-principal';
import { Data, UsuarioSistema } from '../../../core/services/data';
import { DataTableDirective } from '../../../shared/directives/datatable.directive';

@Component({
  selector: 'app-gestion-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTableDirective],
  styleUrl: './gestion-usuarios.css',
  templateUrl: './gestion-usuarios.html',
})
export class GestionUsuarios {
  private dataService = inject(Data);
  private apiPrincipal = inject(ApiPrincipal, { optional: true });

  // Lista reactiva de usuarios compartida con todo el sistema
  usuarios = this.dataService.usuarios;

  // Filtros reactivos
  filtroTexto = signal<string>('');
  filtroRol = signal<string>('');

  usuariosFiltrados = computed(() => {
    const texto = this.filtroTexto().toLowerCase().trim();
    const rol = this.filtroRol();

    return this.usuarios().filter(u => {
      const ident = (u.identificacion || '').toLowerCase();
      const tipoIdent = (u.tipoIdentificacion || 'CC').toLowerCase();
      const coincideTexto =
        !texto ||
        u.nombre.toLowerCase().includes(texto) ||
        u.email.toLowerCase().includes(texto) ||
        u.programa.toLowerCase().includes(texto) ||
        ident.includes(texto) ||
        tipoIdent.includes(texto);

      const coincideRol = !rol || u.rol === rol;

      return coincideTexto && coincideRol;
    });
  });

  // Estado del Modal
  modalAbierto = signal<boolean>(false);
  modoModal = signal<'crear' | 'editar'>('crear');
  mensajeFeedback = signal<string | null>(null);

  // Modelo de formulario temporal
  formData: UsuarioSistema = {
    id: 0,
    tipoIdentificacion: 'CC',
    identificacion: '',
    nombre: '',
    email: '',
    rol: 'ESTUDIANTE',
    estado: 'Activo',
    programa: 'Ingeniería de Sistemas'
  };

  abrirModalCrear(): void {
    this.modoModal.set('crear');
    this.formData = {
      id: Date.now(),
      tipoIdentificacion: 'CC',
      identificacion: '',
      nombre: '',
      email: '',
      rol: 'ESTUDIANTE',
      estado: 'Activo',
      programa: 'Ingeniería de Sistemas'
    };
    this.modalAbierto.set(true);
  }

  abrirModalEditar(usuario: UsuarioSistema): void {
    this.modoModal.set('editar');
    this.formData = {
      ...usuario,
      tipoIdentificacion: usuario.tipoIdentificacion || 'CC',
      identificacion: usuario.identificacion || ''
    };
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  guardarUsuario(): void {
    if (
      !this.formData.nombre.trim() ||
      !this.formData.email.trim() ||
      !String(this.formData.identificacion || '').trim()
    ) {
      alert(
        'Por favor complete los campos obligatorios (Tipo de Identificación, Número de Identificación, Nombre y Correo).'
      );
      return;
    }

    const payload: UsuarioSistema = {
      ...this.formData,
      tipoIdentificacion: this.formData.tipoIdentificacion || 'CC',
      identificacion: String(this.formData.identificacion).trim(),
      nombre: this.formData.nombre.trim(),
      email: this.formData.email.trim()
    };

    if (this.modoModal() === 'crear') {
      const idTemp = Date.now();
      this.usuarios.update(lista => [
        ...lista,
        { ...payload, id: idTemp }
      ]);
      this.mostrarNotificacion('¡Usuario registrado exitosamente en el sistema!');

      if (this.apiPrincipal && typeof localStorage !== 'undefined' && localStorage.getItem('iub_jwt_token')) {
        const partes = payload.nombre.trim().split(' ');
        const primerNombre = partes[0] || 'Usuario';
        const apellido = partes.slice(1).join(' ') || 'IUB';
        const rolApi: RolApi = payload.rol === 'ADMIN' ? 'ADMINISTRADOR' : payload.rol;

        this.apiPrincipal
          .crearUsuario({
            identificacion: payload.identificacion,
            nombre: primerNombre,
            apellido: apellido,
            correo: payload.email,
            password: 'Password123#IUB',
            rol: rolApi,
            tipoDocumentoId: payload.tipoIdentificacion === 'TI' ? 2 : 1
          })
          .subscribe({
            next: (uRemoto) => {
              this.usuarios.update(lista =>
                lista.map(u => (u.id === idTemp ? { ...u, id: uRemoto.id } : u))
              );
            },
            error: () => {}
          });
      }
    } else {
      this.usuarios.update(lista =>
        lista.map(u => (u.id === payload.id ? { ...payload } : u))
      );
      this.mostrarNotificacion('¡Información del usuario actualizada correctamente!');

      if (this.apiPrincipal && typeof localStorage !== 'undefined' && localStorage.getItem('iub_jwt_token')) {
        const partes = payload.nombre.trim().split(' ');
        const primerNombre = partes[0] || 'Usuario';
        const apellido = partes.slice(1).join(' ') || 'IUB';

        this.apiPrincipal
          .actualizarUsuario(payload.id, {
            nombre: primerNombre,
            apellido: apellido,
            correo: payload.email,
            tipoDocumentoId: payload.tipoIdentificacion === 'TI' ? 2 : 1
          })
          .subscribe({ error: () => {} });
      }
    }

    this.cerrarModal();
  }

  cambiarEstadoUsuario(usuario: UsuarioSistema): void {
    const nuevoEstado = usuario.estado === 'Activo' ? 'Inactivo' : 'Activo';
    this.usuarios.update(lista =>
      lista.map(u => (u.id === usuario.id ? { ...u, estado: nuevoEstado } : u))
    );
    this.mostrarNotificacion(
      `¡Estado del usuario ${usuario.nombre} cambiado a ${nuevoEstado}!`
    );

    if (this.apiPrincipal && typeof localStorage !== 'undefined' && localStorage.getItem('iub_jwt_token')) {
      if (nuevoEstado === 'Activo') {
        this.apiPrincipal.activarUsuario(usuario.id).subscribe({ error: () => {} });
      } else {
        this.apiPrincipal.desactivarUsuario(usuario.id).subscribe({ error: () => {} });
      }
    }
  }

  mostrarNotificacion(msg: string): void {
    this.mensajeFeedback.set(msg);
    setTimeout(() => {
      this.mensajeFeedback.set(null);
    }, 4000);
  }
}
