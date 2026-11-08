export interface Coordenadas {
  lat: number;
  lng: number;
}

export interface ResultadoGeorreferenciacion {
  distanciaKm: number;
  tiempoTrasladoMinutos: number;
  nivelTrafico?: "Bajo" | "Moderado" | "Alto";
}

// Coordenadas base/central (Lo Barnechea)
export const COORDENADAS_BASE: Coordenadas = {
  lat: -33.3542,
  lng: -70.5175,
};

// Diccionario de coordenadas reales por comuna de la Región Metropolitana
export const COORDENADAS_COMUNAS: Record<string, Coordenadas> = {
  "Lo Barnechea": { lat: -33.3542, lng: -70.5175 },
  Vitacura: { lat: -33.3865, lng: -70.5732 },
  "Las Condes": { lat: -33.4116, lng: -70.5664 },
  "La Reina": { lat: -33.4437, lng: -70.5356 },
  Providencia: { lat: -33.4314, lng: -70.6093 },
  Ñuñoa: { lat: -33.4569, lng: -70.5975 },
  Peñalolén: { lat: -33.4862, lng: -70.5378 },
  Macul: { lat: -33.4894, lng: -70.5989 },
  Santiago: { lat: -33.4489, lng: -70.6693 },
  "La Florida": { lat: -33.5227, lng: -70.5983 },
  Huechuraba: { lat: -33.3741, lng: -70.6368 },
  Colina: { lat: -33.2019, lng: -70.6753 },
  Maipú: { lat: -33.511, lng: -70.7578 },
  "Puente Alto": { lat: -33.6117, lng: -70.5758 },
  "San Miguel": { lat: -33.4986, lng: -70.6514 },
};

/**
 * Obtiene coordenadas aproximadas según la comuna y la dirección del cliente.
 */
export const obtenerCoordenadasPorDireccion = (
  comuna: string,
  direccion: string = "",
): Coordenadas => {
  const base = COORDENADAS_COMUNAS[comuna] || COORDENADAS_BASE;
  let hash = 0;
  for (let i = 0; i < direccion.length; i++) {
    hash = (hash << 5) - hash + direccion.charCodeAt(i);
    hash |= 0;
  }
  const offsetLat = ((hash % 40) - 20) * 0.0003;
  const offsetLng = (((hash >> 4) % 40) - 20) * 0.0003;
  return {
    lat: Number((base.lat + offsetLat).toFixed(5)),
    lng: Number((base.lng + offsetLng).toFixed(5)),
  };
};

/**
 * Calcula la distancia en línea recta (Fórmula Haversine)
 * y entrega estimación realista de distancia, tiempo de viaje urbano y nivel de tráfico.
 */
export const calcularDistanciaYTiempo = (
  destino: Coordenadas,
  origen: Coordenadas = COORDENADAS_BASE,
  horaReferencia?: string,
): ResultadoGeorreferenciacion => {
  const R = 6371; // Radio de la Tierra en kilómetros
  const dLat = ((destino.lat - origen.lat) * Math.PI) / 180;
  const dLng = ((destino.lng - origen.lng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((origen.lat * Math.PI) / 180) *
      Math.cos((destino.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Factor de corrección para trayecto por calles (+30% aprox sobre línea recta)
  const distanciaRealKm = Number((R * c * 1.3).toFixed(1));

  // Factor de tráfico según franja horaria
  let factorTrafico = 1.0;
  let nivelTrafico: "Bajo" | "Moderado" | "Alto" = "Moderado";

  if (horaReferencia && horaReferencia.includes(":")) {
    const h = parseInt(horaReferencia.split(":")[0], 10);
    if ((h >= 7 && h <= 9) || (h >= 18 && h <= 20)) {
      factorTrafico = 1.35;
      nivelTrafico = "Alto";
    } else if (h >= 11 && h <= 16) {
      factorTrafico = 0.9;
      nivelTrafico = "Bajo";
    }
  }

  // Promedio urbano ~25 km/h + 5 min base
  const velocidadPromedioKmH = 25;
  const tiempoBase = (distanciaRealKm / velocidadPromedioKmH) * 60;
  const tiempoMinutos = Math.max(5, Math.round(tiempoBase * factorTrafico) + 5);

  return {
    distanciaKm: distanciaRealKm,
    tiempoTrasladoMinutos: tiempoMinutos,
    nivelTrafico,
  };
};
