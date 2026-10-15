import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: './dashboard-reportes.css',
  templateUrl: './dashboard-reportes.html',
})
export class DashboardReportes {
  modalExportarAbierto = signal<boolean>(false);
  mensajeToast = signal<string | null>(null);

  // Opciones de exportación
  periodoSeleccionado = '2026-2';
  incluirGraficos = true;
  incluirDetalleDocente = true;

  abrirModalExportar() {
    this.modalExportarAbierto.set(true);
  }

  cerrarModalExportar() {
    this.modalExportarAbierto.set(false);
  }

  descargarReporte() {
    this.cerrarModalExportar();
    this.mensajeToast.set('📄 Generando y descargando informe PDF consolidado IUB...');
    setTimeout(() => {
      this.mensajeToast.set(null);
    }, 4500);
  }
}
