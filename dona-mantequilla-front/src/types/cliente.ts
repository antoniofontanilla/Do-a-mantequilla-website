export interface Cliente {
  id: string;
  nombreCompleto: string;
  rut: string;
  telefono: string;
  email: string;
  direccion: string;
  comuna: string;
  region: string;
  observaciones?: string;
  direccionValidada: boolean;
  latitud?: number;
  longitud?: number;
  createdAt: string;

  // Nuevos campos para la cita asociada
  fechaCita?: string; // Ejemplo: "2026-08-20"
  horaCita?: string; // Ejemplo: "10:30"
  servicio?: string; // Ejemplo: "Instalación / Soporte"

  // Métricas calculadas (HU 3)
  distanciaKm?: number;
  tiempoTrasladoMinutos?: number;
}
