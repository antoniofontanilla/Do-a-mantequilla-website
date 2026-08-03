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
}
