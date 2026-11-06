import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface FiltroSelectConfig {
  label: string;
  valor: string;
}

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filter-bar.html',
  styleUrl: './filter-bar.css',
})
export class FilterBar {
  @Input() placeholder = 'Buscar por radicado, estudiante, curso o palabra clave...';
  @Input() texto = '';
  @Input() mostrarSelect = false;
  @Input() etiquetaSelect = 'Todos';
  @Input() opcionesSelect: FiltroSelectConfig[] = [];
  @Input() valorSelect = '';

  @Output() textoChange = new EventEmitter<string>();
  @Output() valorSelectChange = new EventEmitter<string>();
  @Output() limpiar = new EventEmitter<void>();

  onTextoChange(nuevo: string): void {
    this.texto = nuevo;
    this.textoChange.emit(nuevo);
  }

  onSelectChange(nuevo: string): void {
    this.valorSelect = nuevo;
    this.valorSelectChange.emit(nuevo);
  }

  limpiarFiltros(): void {
    this.texto = '';
    this.valorSelect = '';
    this.textoChange.emit('');
    this.valorSelectChange.emit('');
    this.limpiar.emit();
  }
}
