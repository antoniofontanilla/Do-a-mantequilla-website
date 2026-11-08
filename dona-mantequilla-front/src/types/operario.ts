export interface Operario {
  id: string;
  nombre: string;
  rut: string; // Campo obligatorio para identificación
  telefono?: string; // Teléfono de contacto directo
  email?: string; // Correo de contacto/notificaciones
  comunaBase: string; // 1. Cercanía
  activo: boolean;
  // Criterios HU 6: Asignación Automática de Operarios
  especialidades?: string[]; // 3. Especialidad
  zonaCobertura?: string[]; // 6. Zona de cobertura
  jornadaInicio?: string; // 5. Jornada (ej. "08:00")
  jornadaFin?: string; // 5. Jornada (ej. "19:00")
  capacidadDiariaMinutos?: number; // 4. Carga laboral máxima diaria
}
