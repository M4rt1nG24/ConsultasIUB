import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-modal.html',
  styleUrl: './confirm-modal.css',
})
export class ConfirmModal {
  @Input() abierto = false;
  @Input() titulo = '⚠️ Confirmar Acción';
  @Input() mensaje = '¿Estás seguro de que deseas continuar con esta operación?';
  @Input() textoConfirmar = 'Confirmar';
  @Input() textoCancelar = 'Cancelar';

  @Output() confirmar = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();
}
