import { ServicioCatalogo } from "../types/servicio";

export const SERVICIOS_BASE: ServicioCatalogo[] = [
  {
    id: "1",
    nombre: "Sofás",
    descripcion: "Limpieza y desinfección profunda de tapiz de sofás",
    tiempoEstimadoMinutos: 90,
    activo: true,
  },
  {
    id: "2",
    nombre: "Sillones",
    descripcion:
      "Limpieza e higienización de sillones individuales o reclinables",
    tiempoEstimadoMinutos: 45,
    activo: true,
  },
  {
    id: "3",
    nombre: "Sillas",
    descripcion: "Lavado de tapizado de sillas de comedor o escritorio",
    tiempoEstimadoMinutos: 20,
    activo: true,
  },
  {
    id: "4",
    nombre: "Colchones",
    descripcion:
      "Eliminación de ácaros y manchas en colchones (1 a 2 plazas, King)",
    tiempoEstimadoMinutos: 60,
    activo: true,
  },
  {
    id: "5",
    nombre: "Alfombras",
    descripcion:
      "Lavado en seco o extracción para alfombras dimensionales o muro a muro",
    tiempoEstimadoMinutos: 75,
    activo: true,
  },
  {
    id: "6",
    nombre: "Ventanas",
    descripcion: "Limpieza de cristales y rieles de ventanas estándar",
    tiempoEstimadoMinutos: 30,
    activo: true,
  },
  {
    id: "7",
    nombre: "Ventanales",
    descripcion: "Limpieza profunda de ventanales grandes y termopaneles",
    tiempoEstimadoMinutos: 45,
    activo: true,
  },
  {
    id: "8",
    nombre: "Aseo profundo",
    descripcion:
      "Servicio integral de aseo profundo para cocinas, baños o áreas comunes",
    tiempoEstimadoMinutos: 180,
    activo: true,
  },
  {
    id: "9",
    nombre: "Servicio combinado",
    descripcion: "Pack personalizado que combina múltiples áreas del hogar",
    tiempoEstimadoMinutos: 120,
    activo: true,
  },
];
