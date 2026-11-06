import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface ItemSidebar {
  titulo: string;
  ruta: string;
  icono: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  @Input() rol = 'ESTUDIANTE';
  @Input() opciones: ItemSidebar[] = [];
  @Output() cerrarSesion = new EventEmitter<void>();
}
