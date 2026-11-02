export interface HorarioDia {
  activo: boolean;
  horaInicio: string; // Formato "HH:mm" (ej. "08:00")
  horaFin: string; // Formato "HH:mm" (ej. "19:00")
}

export const HORARIOS_ATENCION: { [key: number]: HorarioDia } = {
  0: { activo: false, horaInicio: "00:00", horaFin: "00:00" }, // Domingo (Cerrado)
  1: { activo: true, horaInicio: "08:00", horaFin: "19:00" }, // Lunes
  2: { activo: true, horaInicio: "08:00", horaFin: "19:00" }, // Martes
  3: { activo: true, horaInicio: "08:00", horaFin: "19:00" }, // Miércoles
  4: { activo: true, horaInicio: "08:00", horaFin: "19:00" }, // Jueves
  5: { activo: true, horaInicio: "08:00", horaFin: "19:00" }, // Viernes
  6: { activo: true, horaInicio: "08:00", horaFin: "14:00" }, // Sábado (hasta las 14:00 / 2 PM)
};

/**
 * Valida si una fecha y hora específica cae dentro de los márgenes permitidos.
 */
export const esHorarioValido = (fechaHoraStr: string | Date): boolean => {
  const fecha = new Date(fechaHoraStr);
  const diaSemana = fecha.getDay(); // 0 = Domingo, 1 = Lunes, etc.
  const configuracionDia = HORARIOS_ATENCION[diaSemana];

  if (!configuracionDia || !configuracionDia.activo) {
    return false; // El día no se atiende
  }

  // Extraer horas y minutos en formato numérico para comparar con facilidad
  const horas = fecha.getHours();
  const minutos = fecha.getMinutes();
  const tiempoEnMinutos = horas * 60 + minutos;

  const [hInicio, mInicio] = configuracionDia.horaInicio.split(":").map(Number);
  const inicioEnMinutos = hInicio * 60 + mInicio;

  const [hFin, mFin] = configuracionDia.horaFin.split(":").map(Number);
  const finEnMinutos = hFin * 60 + mFin;

  return tiempoEnMinutos >= inicioEnMinutos && tiempoEnMinutos <= finEnMinutos;
};
