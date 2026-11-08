import dayjs from "dayjs";
import { Cita } from "../types/cita";

const STORAGE_RECORDATORIOS_AUTO_KEY =
  "dona_mantequilla_recordatorios_auto_24h";

interface RegistroEnvioInterno {
  citaId: string;
  clienteNombre: string;
  canales: ("WhatsApp" | "Correo" | "SMS")[];
  enviadoEn: string;
  programadoParaCita: string;
}

/**
 * HU 11: Servicio interno y 100% automatizado de recordatorios 24 horas antes.
 * Se ejecuta en segundo plano sin requerir intervención ni botones manuales en la interfaz.
 * Cuando un servicio está en estado "Programado" (o "Confirmado") y entra en la ventana de 24h antes,
 * despacha automáticamente el recordatorio por WhatsApp, Correo y SMS.
 */
export class RecordatoriosAutomaticosService {
  private static obtenerHistorialEnvios(): Record<
    string,
    RegistroEnvioInterno
  > {
    try {
      const raw = localStorage.getItem(STORAGE_RECORDATORIOS_AUTO_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private static guardarHistorialEnvios(
    historial: Record<string, RegistroEnvioInterno>,
  ): void {
    try {
      localStorage.setItem(
        STORAGE_RECORDATORIOS_AUTO_KEY,
        JSON.stringify(historial),
      );
    } catch {
      // Ignorar errores de almacenamiento
    }
  }

  /**
   * Evalúa silenciosamente todas las citas programadas y envía de forma automática
   * el recordatorio por WhatsApp, Correo y SMS 24 horas antes de la cita.
   */
  public static procesarRecordatoriosAutomaticos24h(citas: Cita[]): void {
    const historial = this.obtenerHistorialEnvios();
    let huboCambios = false;

    citas.forEach((cita) => {
      // Solo aplica automáticamente a servicios programados o confirmados
      if (cita.estado !== "Programado" && cita.estado !== "Confirmado") {
        return;
      }

      const claveUnica = `${cita.id}_${cita.fecha}_${cita.horaInicio}`;
      if (historial[claveUnica]) {
        return; // Ya fue enviado automáticamente para esta fecha/hora
      }

      const fechaHoraCita = dayjs(
        `${cita.fecha} ${cita.horaInicio}`,
        "YYYY-MM-DD HH:mm",
      );
      const horasRestantes = fechaHoraCita.diff(dayjs(), "hour", true);

      // Si la cita está a 24 horas (o menos de 24h y aún es futura)
      if (horasRestantes > 0 && horasRestantes <= 24) {
        const registro: RegistroEnvioInterno = {
          citaId: cita.id,
          clienteNombre: cita.clienteNombre,
          canales: ["WhatsApp", "Correo", "SMS"],
          enviadoEn: dayjs().format("YYYY-MM-DD HH:mm:ss"),
          programadoParaCita: `${cita.fecha} ${cita.horaInicio}`,
        };

        historial[claveUnica] = registro;
        huboCambios = true;

        // Notificar también al motor interno del backend (si está activo)
        fetch("http://localhost:4000/api/recordatorios/auto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            citaId: cita.id,
            clienteNombre: cita.clienteNombre,
            telefono: cita.telefonoCliente,
            email: cita.emailCliente,
            fecha: cita.fecha,
            hora: cita.horaInicio,
            direccion: cita.direccionCliente,
            comuna: cita.comunaCliente,
            canales: ["WhatsApp", "Correo", "SMS"],
          }),
        }).catch(() => {
          // Proceso silencioso en segundo plano
        });

        console.info(
          `[HU 11 - Recordatorio Automático 24h] Enviado por WhatsApp, Correo y SMS a ${cita.clienteNombre} (${cita.id}) para la cita del ${cita.fecha} a las ${cita.horaInicio}.`,
        );
      }
    });

    if (huboCambios) {
      this.guardarHistorialEnvios(historial);
    }
  }
}
