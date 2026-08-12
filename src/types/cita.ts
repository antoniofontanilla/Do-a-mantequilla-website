import { ItemServicioSeleccionado } from "./servicio";

export interface Cita {
  id: string;
  clienteId: string;
  clienteNombre: string;
  direccionCliente: string;
  comunaCliente: string;

  items: ItemServicioSeleccionado[];

  // Tiempos calculados integrados
  duracionServiciosMinutos: number;
  tiempoTrasladoMinutos: number; // Distancia / traslado desde Lo Barnechea (HU 3)
  tiempoTotalRequeridoMinutos: number; // Servicios + Traslado

  // Agendamiento
  fecha: string; // Formato YYYY-MM-DD
  horaInicio: string; // Formato HH:mm
  horaFinEstimada: string; // Formato HH:mm

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

  observacionesGenerales?: string;
}
