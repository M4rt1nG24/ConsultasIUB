import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-priority-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './priority-badge.html',
  styleUrl: './priority-badge.css',
})
export class PriorityBadge {
  @Input() prioridad: 'Alta' | 'Media' | 'Baja' | string = 'Media';

  get clasePrioridad(): string {
    const p = (this.prioridad || '').toLowerCase();
    if (p === 'alta') return 'prio-alta';
    if (p === 'baja') return 'prio-baja';
    return 'prio-media';
  }
}
