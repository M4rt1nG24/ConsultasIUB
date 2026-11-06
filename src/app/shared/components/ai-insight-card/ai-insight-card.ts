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
    'Se detectó un incremento del 24% en consultas de Estructura de Datos (Árboles AVL). Se sugiere habilitar una sesión grupal de refuerzo en la Sala de Informática 10.';
  @Input() etiqueta = 'Análisis Predictivo';
}
