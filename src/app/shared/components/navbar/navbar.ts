import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface NotifNavbarItem {
  id: number;
  mensaje: string;
  fecha: string;
  leida: boolean;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  @Input() rol = 'ESTUDIANTE';
  @Input() busquedaGlobal = '';
  @Input() notificaciones: NotifNavbarItem[] = [];
  @Input() pendientes = 0;
  @Input() mostrarNotificaciones = false;

  @Output() busquedaGlobalChange = new EventEmitter<string>();
  @Output() toggleNotif = new EventEmitter<void>();
  @Output() marcarLeidas = new EventEmitter<void>();
}
