export interface Operario {
  id: string;
  nombre: string;
  rut: string; // Campo obligatorio para identificación
  telefono?: string; // Teléfono de contacto directo
  email?: string; // Correo de contacto/notificaciones
  comunaBase: string; // Para sugerir asignaciones por cercanía
  activo: boolean;
}
