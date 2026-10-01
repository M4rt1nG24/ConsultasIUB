export interface Reporte {
  id: number;
  titulo: string;
  tipo: string;
  fecha: string;
  estado: 'Completado' | 'Pendiente';
}