import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.css',
})
export class StatusBadge {
  @Input() estado = 'Pendiente';

  get claseEstado(): string {
    const val = (this.estado || '').toLowerCase();
    if (val.includes('complet') || val.includes('resuelt') || val.includes('activ') || val.includes('disponible')) {
      return 'badge-success';
    }
    if (val.includes('programad') || val.includes('proceso') || val.includes('ocupad')) {
      return 'badge-info';
    }
    if (val.includes('inactiv') || val.includes('cerrad') || val.includes('cancel')) {
      return 'badge-danger';
    }
    return 'badge-warning';
  }
}
