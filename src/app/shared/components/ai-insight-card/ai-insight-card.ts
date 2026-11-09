import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ai-insight-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-insight-card.html',
  styleUrl: './ai-insight-card.css',
})
export class AiInsightCard {
  @Input() titulo = 'Recomendación Inteligente IA (MiTutoría IUB)';
  @Input() mensaje =
    'A la espera de datos del servidor para generar recomendaciones de analítica predictiva.';
  @Input() etiqueta = 'Análisis Predictivo';
}
