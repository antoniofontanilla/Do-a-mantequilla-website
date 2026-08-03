// Algoritmo Módulo 11 para la validación legal del RUT Chileno
export const validarRutChileno = (rut: string): boolean => {
  if (!rut || typeof rut !== "string") return false;

  const valorLimpio = rut.replace(/[^0-9kK]/g, "");
  if (valorLimpio.length < 8) return false;

  const cuerpo = valorLimpio.slice(0, -1);
  const dvIngresado = valorLimpio.slice(-1).toUpperCase();

  let suma = 0;
  let multiplicador = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo.charAt(i), 10) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const resto = suma % 11;
  const dvCalculado =
    11 - resto === 11 ? "0" : 11 - resto === 10 ? "K" : String(11 - resto);

  return dvIngresado === dvCalculado;
};

// Formateador de RUT (ej: 123456789 -> 12.345.678-9)
export const formatearRut = (rut: string): string => {
  const valorLimpio = rut.replace(/[^0-9kK]/g, "");
  if (valorLimpio.length < 2) return valorLimpio;

  const cuerpo = valorLimpio.slice(0, -1);
  const dv = valorLimpio.slice(-1).toUpperCase();

  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
};
