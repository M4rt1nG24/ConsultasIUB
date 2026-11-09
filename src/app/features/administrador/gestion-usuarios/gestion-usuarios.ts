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
  private api = inject(ApiPrincipal, { optional: true });

  // Lista reactiva de usuarios compartida con todo el sistema
  usuarios = this.dataService.usuarios;
  programas = this.dataService.programas;
  tiposDocumento = this.dataService.tiposDocumento;

  // Filtros reactivos
  filtroTexto = signal<string>('');
  filtroRol = signal<string>('');

  usuariosFiltrados = computed(() => {
    const texto = this.filtroTexto().toLowerCase().trim();
    const rol = this.filtroRol();

    return this.usuarios().filter(u => {
      const coincideTexto =
        !texto ||
        u.nombre.toLowerCase().includes(texto) ||
        u.email.toLowerCase().includes(texto) ||
        u.programa.toLowerCase().includes(texto) ||
        (u.identificacion || '').toLowerCase().includes(texto);

      const coincideRol = !rol || u.rol === rol;

      return coincideTexto && coincideRol;
    });
  });

  // Estado del Modal
  modalAbierto = signal<boolean>(false);
  modoModal = signal<'crear' | 'editar'>('crear');
  mensajeFeedback = signal<string | null>(null);

  // Modelo de formulario temporal
  formData: UsuarioSistema & { passwordInicial?: string } = {
    id: 0,
    identificacion: '',
    tipoDocumentoId: null,
    nombre: '',
    nombreSolo: '',
    apellido: '',
    email: '',
    rol: 'ESTUDIANTE',
    estado: 'Activo',
    programaId: null,
    programa: '',
    passwordInicial: 'ClaveIub#2026!'
  };

  abrirModalCrear(): void {
    this.modoModal.set('crear');
    const primerTipoDoc = this.tiposDocumento()[0]?.id ?? 1;
    const primerPrograma = this.programas()[0]?.id ?? null;
    this.formData = {
      id: Date.now(),
      identificacion: '',
      tipoDocumentoId: primerTipoDoc,
      nombre: '',
      nombreSolo: '',
      apellido: '',
      email: '',
      rol: 'ESTUDIANTE',
      estado: 'Activo',
      programaId: primerPrograma,
      programa: this.programas()[0]?.nombre || '',
      passwordInicial: 'ClaveIub#2026!'
    };
    this.modalAbierto.set(true);
  }

  abrirModalEditar(usuario: UsuarioSistema): void {
    this.modoModal.set('editar');
    const partes = (usuario.nombre || '').trim().split(/\s+/);
    this.formData = {
      ...usuario,
      identificacion: usuario.identificacion || '',
      nombreSolo: usuario.nombreSolo || partes[0] || '',
      apellido: usuario.apellido || partes.slice(1).join(' ') || 'Institucional',
      tipoDocumentoId: usuario.tipoDocumentoId ?? (this.tiposDocumento()[0]?.id ?? 1),
      programaId: usuario.programaId ?? null,
      passwordInicial: ''
    };
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  guardarUsuario(): void {
    let nombre = (this.formData.nombreSolo || '').trim();
    let apellido = (this.formData.apellido || '').trim();

    if (!nombre && this.formData.nombre.trim()) {
      const partes = this.formData.nombre.trim().split(/\s+/);
      nombre = partes[0] || '';
      apellido = apellido || partes.slice(1).join(' ') || 'IUB';
    }

    if (!nombre || !apellido || !this.formData.email.trim()) {
      alert('Por favor complete Nombres, Apellidos y Correo Institucional.');
      return;
    }

    const identificacion = (this.formData.identificacion || '').trim() || String(Date.now()).slice(-10);
    const rolApi: RolApi =
      this.formData.rol === 'ADMIN' ? 'ADMINISTRADOR' : this.formData.rol;
    const programaId = this.formData.programaId ? Number(this.formData.programaId) : null;
    const tipoDocumentoId = this.formData.tipoDocumentoId
      ? Number(this.formData.tipoDocumentoId)
      : (this.tiposDocumento()[0]?.id ? Number(this.tiposDocumento()[0].id) : 1);

    if (this.modoModal() === 'crear') {
      const password = (this.formData.passwordInicial || 'ClaveIub#2026!').trim();
      if (password.length < 10) {
        alert('La contraseña inicial debe tener al menos 10 caracteres, incluir mayúscula, minúscula, número y símbolo.');
        return;
      }

      if (this.api && this.api.baseUrl) {
        this.api
          .crearUsuario({
            identificacion,
            nombre,
            apellido,
            correo: this.formData.email.trim().toLowerCase(),
            password,
            rol: rolApi,
            programaId,
            tipoDocumentoId
          })
          .subscribe({
            next: (creado) => {
              if (rolApi === 'DOCENTE' && creado?.id) {
                this.dataService.asegurarDisponibilidadDocente(creado.id);
              }
              this.dataService.sincronizarDesdeBackend();
              this.cerrarModal();
              this.mostrarNotificacion('¡Usuario registrado exitosamente en la base de datos!');
            },
            error: (err) => {
              alert(this.api!.extraerMensajeError(err, 'No se pudo registrar el usuario en la base de datos.'));
            }
          });
      } else {
        this.usuarios.update(lista => [
          ...lista,
          {
            ...this.formData,
            id: Date.now(),
            nombre: `${nombre} ${apellido}`.trim()
          }
        ]);
        this.cerrarModal();
        this.mostrarNotificacion('¡Usuario registrado exitosamente en el sistema!');
      }
    } else {
      if (this.api && this.api.baseUrl) {
        this.api
          .actualizarUsuario(this.formData.id, {
            nombre,
            apellido,
            correo: this.formData.email.trim().toLowerCase(),
            programaId,
            tipoDocumentoId
          })
          .subscribe({
            next: () => {
              this.dataService.sincronizarDesdeBackend();
              this.cerrarModal();
              this.mostrarNotificacion('¡Información del usuario actualizada correctamente!');
            },
            error: (err) => {
              alert(this.api!.extraerMensajeError(err, 'No se pudo actualizar el usuario en la base de datos.'));
            }
          });
      } else {
        this.usuarios.update(lista =>
          lista.map(u =>
            u.id === this.formData.id
              ? { ...this.formData, nombre: `${nombre} ${apellido}`.trim() }
              : u
          )
        );
        this.cerrarModal();
        this.mostrarNotificacion('¡Información del usuario actualizada correctamente!');
      }
    }
  }

  cambiarEstadoUsuario(usuario: UsuarioSistema): void {
    const nuevoEstado = usuario.estado === 'Activo' ? 'Inactivo' : 'Activo';
    this.usuarios.update(lista =>
      lista.map(u => (u.id === usuario.id ? { ...u, estado: nuevoEstado } : u))
    );

    if (this.api && this.api.baseUrl) {
      if (nuevoEstado === 'Activo') {
        this.api.activarUsuario(usuario.id).subscribe({
          next: () => this.dataService.sincronizarDesdeBackend(),
          error: () => {}
        });
      } else {
        this.api.desactivarUsuario(usuario.id).subscribe({
          next: () => this.dataService.sincronizarDesdeBackend(),
          error: () => {}
        });
      }
    }

    this.mostrarNotificacion(
      `¡Estado del usuario ${usuario.nombre} cambiado a ${nuevoEstado}!`
    );
  }

  mostrarNotificacion(msg: string): void {
    this.mensajeFeedback.set(msg);
    setTimeout(() => {
      this.mensajeFeedback.set(null);
    }, 4000);
  }
}
