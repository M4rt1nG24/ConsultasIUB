import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kpi-card.html',
  styleUrl: './kpi-card.css',
})
export class KpiCard {
  @Input() label = 'Indicador';
  @Input() valor: string | number = '0';
  @Input() icono = '📊';
  @Input() tendencia = '';
  @Input() variante: 'blue' | 'green' | 'amber' | 'cyan' = 'blue';
}
