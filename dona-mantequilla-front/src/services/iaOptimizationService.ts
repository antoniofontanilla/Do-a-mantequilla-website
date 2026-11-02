import { Cita } from "../types/cita";
import { Cliente } from "../types/cliente";
import { Operario } from "../types/operario";
import { MOCK_CLIENTES } from "../data/mockClientes";
import { MOCK_OPERARIOS } from "../data/mockOperarios";
import { esHorarioValido } from "../utils/horariosConfig";

export type TipoSugerencia =
  | "AGRUPAR_COMUNA"
  | "OPTIMIZAR_TRASLADO"
  | "TIEMPO_EXCESIVO"
  | "REPROGRAMAR_PENDIENTE"
  | "VENTANA_ESTRECHA"
  | "ASIGNAR_OPERARIO"
  | "BALANCEO_CARGA";

export type ImpactoNivel = "ALTO" | "MEDIO" | "BAJO";

export interface SugerenciaIA {
  id: string;
  tipo: TipoSugerencia;
  titulo: string;
  descripcion: string;
  impacto: ImpactoNivel;
  ahorroEstimado?: string;
  citasInvolucradas?: string[];
  aplicada?: boolean;
}

export interface ConfiguracionOptimizacion {
  tiempoTrasladoMinimoAlerta: number; // Ej: 15 minutos
  duracionMaxBloqueServicio: number; // Ej: 180 minutos
  priorizarComunasAgrupadas: boolean;
}

const CONFIG_DEFAULT: ConfiguracionOptimizacion = {
  tiempoTrasladoMinimoAlerta: 15,
  duracionMaxBloqueServicio: 180,
  priorizarComunasAgrupadas: true,
};

export class IaOptimizacionService {
  /**
   * Convierte una hora en formato "HH:mm" a minutos desde las 00:00.
   */
  private static horaAMinutos(hora: string): number {
    if (!hora || !hora.includes(":")) return 0;
    const [h, m] = hora.split(":").map(Number);
    return h * 60 + m;
  }

  /**
   * Analiza citas, la nómina completa de clientes y operarios activos.
   */
  public static analizarCitas(
    citas: Cita[],
    clientes: Cliente[] = MOCK_CLIENTES,
    operarios: Operario[] = MOCK_OPERARIOS,
    config: ConfiguracionOptimizacion = CONFIG_DEFAULT,
  ): SugerenciaIA[] {
    const sugerencias: SugerenciaIA[] = [];

    // Excluimos citas canceladas, finalizadas o cotizaciones para el análisis activo
    const citasActivas = (citas || []).filter(
      (c) =>
        c.estado !== "Cancelado" &&
        c.estado !== "Finalizado" &&
        c.estado !== "Cotización",
    );

    // NUEVA REGLA: Validación de Horarios Hábiles (Lun-Vie 8-19h, Sáb 8-14h)
    citasActivas.forEach((cita) => {
      if (cita.fechaHora && !esHorarioValido(cita.fechaHora)) {
        sugerencias.push({
          id: `horario-fuera-de-rango-${cita.id}`,
          tipo: "VENTANA_ESTRECHA",
          titulo: "Cita fuera de horario hábil",
          descripcion: `La cita de ${cita.clienteNombre || "Cliente"} está programada en un horario o día no laborable (Lun-Vie 8:00 - 19:00, Sáb 8:00 - 14:00).`,
          impacto: "ALTO",
          citasInvolucradas: [cita.id],
          aplicada: false,
        });
      }
    });

    // 1. REGLA: Retención de Clientes / Base de Datos
    const idsClientesConCita = new Set(citasActivas.map((c) => c.clienteId));
    const clientesSinCita = clientes.filter(
      (c) => !idsClientesConCita.has(c.id),
    );

    if (clientesSinCita.length > 0) {
      sugerencias.push({
        id: "SUG-SIN-CITA",
        tipo: "REPROGRAMAR_PENDIENTE",
        titulo: "Alerta de Retención de Clientes",
        descripcion: `Existen ${clientesSinCita.length} clientes registrados sin atenciones agendadas actualmente.`,
        impacto: "ALTO",
        citasInvolucradas: [],
        aplicada: false,
      });
    }

    // 2. REGLA: Citas sin Operario Asignado
    const citasSinOperario = citasActivas.filter((c) => !c.operarioId);
    citasSinOperario.forEach((cita) => {
      const operarioSugerido =
        operarios.find((o) => o.comunaBase === cita.comunaCliente) ||
        operarios[0];

      sugerencias.push({
        id: `SUG-ASIGNAR-${cita.id}`,
        tipo: "ASIGNAR_OPERARIO",
        titulo: `Cita sin Asignar: ${cita.clienteNombre}`,
        descripcion: `Sugerencia: Asignar a ${operarioSugerido.nombre} (RUT: ${operarioSugerido.rut}) por cercanía a ${cita.comunaCliente}.`,
        impacto: "ALTO",
        ahorroEstimado: "Optimización de ruta",
        citasInvolucradas: [cita.id],
        aplicada: false,
      });
    });

    // 3. REGLA: Balanceo de Carga entre Operarios
    const cargaOperarios: Record<string, number> = {};
    citasActivas.forEach((c) => {
      if (c.operarioId) {
        cargaOperarios[c.operarioId] = (cargaOperarios[c.operarioId] || 0) + 1;
      }
    });

    const cargas = Object.values(cargaOperarios);
    if (cargas.length >= 2 && Math.abs(cargas[0] - cargas[1]) >= 3) {
      sugerencias.push({
        id: "SUG-BALANCEO",
        tipo: "BALANCEO_CARGA",
        titulo: "Desequilibrio en Carga de Trabajo",
        descripcion:
          "Existe una diferencia de 3 o más citas entre los operarios. Considera reasignar atenciones para equilibrar la jornada.",
        impacto: "MEDIO",
        citasInvolucradas: [],
        aplicada: false,
      });
    }

    // 4. REGLA: Agrupar por Comuna y Fecha
    if (config.priorizarComunasAgrupadas) {
      const mapaComunaFecha = new Map<string, Cita[]>();

      citasActivas.forEach((cita) => {
        const clave = `${cita.fecha}_${cita.comunaCliente}`;
        if (!mapaComunaFecha.has(clave)) {
          mapaComunaFecha.set(clave, []);
        }
        mapaComunaFecha.get(clave)!.push(cita);
      });

      mapaComunaFecha.forEach((grupo, clave) => {
        if (grupo.length >= 2) {
          const [fecha, comuna] = clave.split("_");
          sugerencias.push({
            id: `agrup-${clave}`,
            tipo: "AGRUPAR_COMUNA",
            titulo: `Oportunidad de Ruta: ${comuna}`,
            descripcion: `Tienes ${grupo.length} citas programadas el ${fecha} en ${comuna}. Se recomienda agrupar los horarios de manera continua.`,
            impacto: "ALTO",
            ahorroEstimado: "Hasta 40 min de traslado",
            citasInvolucradas: grupo.map((c) => c.id),
            aplicada: false,
          });
        }
      });
    }

    // 5. REGLA: Tiempos de Traslado Extensos
    citasActivas.forEach((cita) => {
      if (cita.tiempoTrasladoMinutos >= config.tiempoTrasladoMinimoAlerta) {
        sugerencias.push({
          id: `traslado-${cita.id}`,
          tipo: "OPTIMIZAR_TRASLADO",
          titulo: `Traslado extenso: ${cita.comunaCliente}`,
          descripcion: `La cita de ${cita.clienteNombre} (${cita.id}) contempla ${cita.tiempoTrasladoMinutos} min solo de traslado. Revisa si hay personal más cercano.`,
          impacto: "MEDIO",
          ahorroEstimado: `${cita.tiempoTrasladoMinutos} min en trayecto`,
          citasInvolucradas: [cita.id],
          aplicada: false,
        });
      }
    });

    // 6. REGLA: Bloques de Servicio Sobrecargados
    citasActivas.forEach((cita) => {
      if (
        cita.tiempoTotalRequeridoMinutos >= config.duracionMaxBloqueServicio
      ) {
        sugerencias.push({
          id: `tiempo-${cita.id}`,
          tipo: "TIEMPO_EXCESIVO",
          titulo: `Servicio Extenso (${cita.tiempoTotalRequeridoMinutos} min)`,
          descripcion: `La cita para ${cita.clienteNombre} excede las 3 horas totales. Considera asignar más personal.`,
          impacto: "ALTO",
          citasInvolucradas: [cita.id],
          aplicada: false,
        });
      }
    });

    // 7. REGLA: Ventanas Estrechas / Colisiones entre Citas
    const porFecha = new Map<string, Cita[]>();
    citasActivas.forEach((c) => {
      if (!porFecha.has(c.fecha)) porFecha.set(c.fecha, []);
      porFecha.get(c.fecha)!.push(c);
    });

    porFecha.forEach((citasDelDia, fecha) => {
      const ordenadas = [...citasDelDia].sort(
        (a, b) =>
          IaOptimizacionService.horaAMinutos(a.horaInicio) -
          IaOptimizacionService.horaAMinutos(b.horaInicio),
      );

      for (let i = 0; i < ordenadas.length - 1; i++) {
        const actual = ordenadas[i];
        const siguiente = ordenadas[i + 1];

        const finActualMin = IaOptimizacionService.horaAMinutos(
          actual.horaFinEstimada,
        );
        const inicioSiguienteMin = IaOptimizacionService.horaAMinutos(
          siguiente.horaInicio,
        );

        const margenDisponible = inicioSiguienteMin - finActualMin;
        const trasladoRequerido = siguiente.tiempoTrasladoMinutos;

        if (margenDisponible < trasladoRequerido) {
          sugerencias.push({
            id: `ventana-${actual.id}-${siguiente.id}`,
            tipo: "VENTANA_ESTRECHA",
            titulo: `Riesgo de atraso el ${fecha}`,
            descripcion: `Entre la cita de ${actual.clienteNombre} y la de ${siguiente.clienteNombre} hay solo ${margenDisponible} min libres, pero el traslado requiere ${trasladoRequerido} min.`,
            impacto: "ALTO",
            citasInvolucradas: [actual.id, siguiente.id],
            aplicada: false,
          });
        }
      }
    });

    // 8. REGLA: Citas Pendientes de Confirmación
    const pendientes = citasActivas.filter((c) => c.estado === "Pendiente");
    pendientes.forEach((cita) => {
      sugerencias.push({
        id: `pend-${cita.id}`,
        tipo: "REPROGRAMAR_PENDIENTE",
        titulo: `Confirmación requerida: ${cita.clienteNombre}`,
        descripcion: `La cita (${cita.id}) para el ${cita.fecha} está en estado Pendiente. Confirma con el cliente para asegurar la ruta.`,
        impacto: "BAJO",
        citasInvolucradas: [cita.id],
        aplicada: false,
      });
    });

    return sugerencias;
  }

  // Alias por compatibilidad hacia atrás
  public static generarSugerencias(
    citas: Cita[],
    config?: ConfiguracionOptimizacion,
  ): SugerenciaIA[] {
    return IaOptimizacionService.analizarCitas(
      citas,
      MOCK_CLIENTES,
      MOCK_OPERARIOS,
      config,
    );
  }

  /**
   * Estima la hora de término ajustada considerando servicios y tiempo de traslado.
   */
  public static calcularHoraFinEstimada(
    horaInicio: string,
    duracionServiciosMinutos: number,
    tiempoTrasladoMinutos: number,
  ): { horaFinEstimada: string; tiempoTotalMinutos: number } {
    const inicioMin = IaOptimizacionService.horaAMinutos(horaInicio);
    const tiempoTotalMinutos = duracionServiciosMinutos + tiempoTrasladoMinutos;
    const finMin = inicioMin + tiempoTotalMinutos;

    const horas = Math.floor(finMin / 60) % 24;
    const minutos = finMin % 60;

    const horaFinEstimada = `${horas.toString().padStart(2, "0")}:${minutos
      .toString()
      .padStart(2, "0")}`;

    return {
      horaFinEstimada,
      tiempoTotalMinutos,
    };
  }
}
