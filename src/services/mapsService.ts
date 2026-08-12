export interface Coordenadas {
  lat: number;
  lng: number;
}

export interface ResultadoGeorreferenciacion {
  distanciaKm: number;
  tiempoTrasladoMinutos: number;
}

// Coordenadas base/central (ejemplo Santiago Centro)
const COORDENADAS_BASE: Coordenadas = {
  lat: -33.3542,
  lng: -70.5175,
};

/**
 * Calcula la distancia en línea recta (Fórmula Haversine)
 * y entrega estimación realista de distancia y tiempo de viaje urbano.
 */
export const calcularDistanciaYTiempo = (
  destino: Coordenadas,
  origen: Coordenadas = COORDENADAS_BASE,
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

  // Promedio urbano ~25 km/h + 5 min base
  const velocidadPromedioKmH = 25;
  const tiempoMinutos =
    Math.round((distanciaRealKm / velocidadPromedioKmH) * 60) + 5;

  return {
    distanciaKm: distanciaRealKm,
    tiempoTrasladoMinutos: tiempoMinutos,
  };
};
