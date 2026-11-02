import { Operario } from "../types/operario";

export const MOCK_OPERARIOS: Operario[] = [
  {
    id: "OP-001",
    rut: "18.765.432-1",
    nombre: "Juan Pérez",
    telefono: "+56912345678",
    email: "juan.perez@empresa.cl",
    comunaBase: "Lo Barnechea",
    activo: true,
  },
  {
    id: "OP-002",
    rut: "16.543.210-K",
    nombre: "Carlos Gómez",
    telefono: "+56987654321",
    email: "carlos.gomez@empresa.cl",
    comunaBase: "Las Condes",
    activo: true,
  },
];
