import {
  AfterViewInit,
  Directive,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject
} from '@angular/core';
import { igualJson } from '../../core/utils/sincronizacion';
declare const DataTable: any;


@Directive({
  selector: 'table[appDataTable]',
  standalone: true
})
export class DataTableDirective implements AfterViewInit, OnChanges, OnDestroy {
  private el = inject(ElementRef<HTMLTableElement>);
  private dtInstance: any = null;
  private initTimer: any = null;
  /** Página y texto de búsqueda a restaurar tras reconstruir la tabla. */
  private estadoPrevio: { pagina: number; busqueda: string } | null = null;

  /**
   * Pasa aquí el arreglo o signal leído (ej. [appDataTable]="usuarios()")
   * para que DataTables se actualice automáticamente cuando agregues, edites o filtres filas.
   */
  @Input('appDataTable') dataTrigger: unknown;

  /**
   * Cantidad de registros por página por defecto (5 o 10)
   */
  @Input() pageLength = 5;

  ngAfterViewInit(): void {
    this.scheduleInit();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const cambio = changes['dataTrigger'];
    if (cambio && !cambio.firstChange) {
      // Si los datos son idénticos (misma respuesta del backend) no se reconstruye la tabla:
      // reconstruirla es lo que la hacía "desaparecer y aparecer".
      if (this.dtInstance && igualJson(cambio.previousValue, cambio.currentValue)) {
        return;
      }
      // Destruir sincrónicamente DataTables ANTES de que Angular actualice el @for en el <tbody>,
      // evitando que dtInstance.destroy() sobreescriba las filas nuevas con el snapshot vacío inicial.
      this.destroyDataTable();
      this.scheduleInit();
    }
  }

  private destroyDataTable(): void {
    if (this.dtInstance) {
      try {
        this.estadoPrevio = {
          pagina: Number(this.dtInstance.page()) || 0,
          busqueda: String(this.dtInstance.search() || '')
        };
      } catch {
        this.estadoPrevio = null;
      }
      try {
        this.dtInstance.destroy();
      } catch {
        // Ignorar errores al destruir instancia previa
      }
      this.dtInstance = null;
    }
  }

  private scheduleInit(): void {
    if (this.initTimer) {
      clearTimeout(this.initTimer);
    }
    this.initTimer = setTimeout(() => {
      this.initDataTable();
    }, 50);
  }

  private initDataTable(): void {
    const tableEl = this.el.nativeElement;
    if (!tableEl || typeof window === 'undefined') return;

    // Si el arreglo aún está vacío (ej. esperando respuesta HTTP tras recargar la página),
    // no inicializar DataTables sobre la tabla vacía para no bloquear las filas que renderizará Angular.
    if (Array.isArray(this.dataTrigger) && this.dataTrigger.length === 0) {
      return;
    }

    try {
      this.destroyDataTable();

      this.dtInstance = new DataTable(tableEl, {
        pageLength: this.pageLength,
        lengthMenu: [5, 10, 25, 50],
        retrieve: true,
        language: {
          search: '🔍 Buscar en tabla:',
          lengthMenu: 'Mostrar _MENU_ registros por página',
          info: 'Mostrando _START_ a _END_ de _TOTAL_ registros',
          infoEmpty: 'Mostrando 0 a 0 de 0 registros',
          infoFiltered: '(filtrado de _MAX_ registros totales)',
          zeroRecords: 'No se encontraron registros coincidentes',
          emptyTable: 'No hay datos disponibles en esta tabla',
          paginate: {
            first: '« Primero',
            previous: '‹ Anterior',
            next: 'Siguiente ›',
            last: 'Último »'
          }
        }
      });
      this.restaurarEstado();
    } catch {
      // Fallback silencioso en entorno de pruebas unitarias sin DOM completo
    }
  }

  /** Mantiene al usuario en la misma página y con el mismo filtro tras actualizar datos. */
  private restaurarEstado(): void {
    const estado = this.estadoPrevio;
    this.estadoPrevio = null;
    if (!estado || !this.dtInstance) return;
    try {
      if (estado.busqueda) {
        this.dtInstance.search(estado.busqueda).draw();
      }
      const totalPaginas = Number(this.dtInstance.page.info()?.pages) || 0;
      if (estado.pagina > 0 && estado.pagina < totalPaginas) {
        this.dtInstance.page(estado.pagina).draw(false);
      }
    } catch {
      // Si la API de DataTables no está disponible, se deja la tabla en su estado inicial.
    }
  }

  ngOnDestroy(): void {
    if (this.initTimer) {
      clearTimeout(this.initTimer);
    }
    this.destroyDataTable();
  }
}

