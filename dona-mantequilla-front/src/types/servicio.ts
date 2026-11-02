// Tipos de servicio estandarizados según HU 4
export type CategoriaServicio =
  | "Sofás"
  | "Sillones"
  | "Sillas"
  | "Colchones"
  | "Alfombras"
  | "Ventanas"
  | "Ventanales"
  | "Aseo profundo"
  | "Servicio combinado";

// Estructura para el Catálogo Base de Servicios
export interface ServicioCatalogo {
  id: string;
  nombre: CategoriaServicio;
  descripcion: string;
  tiempoEstimadoMinutos: number; // Tiempo promedio base por unidad
  activo: boolean;
}

// Estructura de un servicio seleccionado en una orden/solicitud
export interface ItemServicioSeleccionado {
  servicioId: string;
  nombre: CategoriaServicio;
  cantidad: number;
  tiempoEstimadoMinutosTotal: number; // (tiempo base * cantidad)
  observaciones?: string;
}

// Estructura completa para la solicitud o cotización de un cliente
export interface SolicitudServicio {
  id?: string;
  clienteId: string;
  items: ItemServicioSeleccionado[];
  tiempoTotalEstimadoMinutos: number;
  observacionesGenerales?: string;
  estado:
    | "Cotización"
    | "Pendiente"
    | "Confirmado"
    | "Programado"
    | "En Ruta"
    | "En Servicio"
    | "Finalizado"
    | "Reprogramado"
    | "Cancelado";
  createdAt?: string;
}
