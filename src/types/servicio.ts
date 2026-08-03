// Tipos para los servicios y cotizaciones (HU 4 y 10)
export type TipoServicio =
  | "Sofás"
  | "Sillones"
  | "Sillas"
  | "Colchones"
  | "Alfombras"
  | "Ventanas"
  | "Ventanales"
  | "Aseo profundo"
  | "Servicio combinado";

export type EstadoServicio =
  | "Cotización"
  | "Pendiente"
  | "Confirmado"
  | "Programado"
  | "En Ruta"
  | "En Servicio"
  | "Finalizado"
  | "Cancelado";

export interface Servicio {
  id: string;
  clienteId: string;
  clienteNombre: string;
  tipoServicio: TipoServicio;
  cantidad: number;
  observaciones?: string;
  tiempoEstimadoMinutos: number;
  fechaProgramada: string;
  estado: EstadoServicio;
  montoTotal: number;
}
