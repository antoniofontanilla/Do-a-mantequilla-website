import React, { useState, useMemo, useEffect } from "react";
import {
  Modal,
  Form,
  Select,
  DatePicker,
  InputNumber,
  Table,
  Card,
  Tag,
  Alert,
  Button,
  Divider,
  Space,
  Typography,
  Input,
  Radio,
  Badge,
} from "antd";
import {
  ClockCircleOutlined,
  CarOutlined,
  CheckCircleOutlined,
  BulbOutlined,
  UserOutlined,
  StarFilled,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { Cliente } from "../types/cliente";
import { ServicioCatalogo, ItemServicioSeleccionado } from "../types/servicio";
import { Cita } from "../types/cita";
import { Operario } from "../types/operario";
import { MOCK_CLIENTES } from "../data/mockClientes";
import { MOCK_OPERARIOS } from "../data/mockOperarios";
import { SERVICIOS_BASE } from "../utils/serviciosData";
import { IntegracionesTecnicasService } from "../services/integracionesTecnicasService";

const { Option } = Select;
const { Text, Title } = Typography;

interface ModalProgramacionInteligenteProps {
  visible: boolean;
  onCancel: () => void;
  onSave: (nuevaCita: Partial<Cita>) => void;
  clientes: Cliente[];
  serviciosDisponibles: ServicioCatalogo[];
  citasExistentes?: Cita[];
}

interface PropuestaFechaHU5 {
  fecha: string;
  horaInicio: string;
  horaFin: string;
  etiqueta: string;
  motivo: string;
  capacidadLibrePorcentaje: number;
  puntaje: number;
}

export interface EvaluacionOperarioHU6 {
  operario: Operario;
  puntaje: number;
  disponible: boolean;
  dentroDeJornada: boolean;
  enZonaCobertura: boolean;
  tieneEspecialidad: boolean;
  esCercanoBase: boolean;
  citasAsignadasDia: number;
  minutosCargaDia: number;
  detalleCriterios: string[];
}

const CAPACIDAD_DIARIA_MAX_MINUTOS = 480; // 8 horas efectivas de capacidad diaria (HU 5)

const horaAMinutos = (hStr: string): number => {
  if (!hStr || !hStr.includes(":")) return 0;
  const [h, m] = hStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/**
 * Motor HU 6: Evalúa y ordena los operarios según los 6 criterios:
 * 1) Cercanía, 2) Disponibilidad, 3) Especialidad, 4) Carga laboral, 5) Jornada y 6) Zona de cobertura.
 */
export const evaluarOperariosParaCita = (
  comunaCliente: string,
  nombresServicios: string[],
  fecha: string,
  horaInicio: string,
  horaFin: string,
  citasExistentes: Cita[],
  operarios: Operario[] = MOCK_OPERARIOS,
): EvaluacionOperarioHU6[] => {
  const inicioMin = horaAMinutos(horaInicio);
  const finMin = horaAMinutos(horaFin);

  return operarios
    .filter((op) => op.activo)
    .map((op) => {
      let puntaje = 40;
      const detalleCriterios: string[] = [];

      // 1. Cercanía (Comuna base coincide con la del cliente)
      const esCercanoBase = op.comunaBase === comunaCliente;
      if (esCercanoBase) {
        puntaje += 20;
        detalleCriterios.push(`Cercanía: Base en ${op.comunaBase}`);
      }

      // 6. Zona de cobertura
      const enZonaCobertura =
        esCercanoBase || (op.zonaCobertura || []).includes(comunaCliente);
      if (enZonaCobertura && !esCercanoBase) {
        puntaje += 14;
        detalleCriterios.push(`Cobertura: Atiende ${comunaCliente}`);
      } else if (!enZonaCobertura) {
        puntaje -= 10;
        detalleCriterios.push(`Fuera de su zona habitual`);
      }

      // 3. Especialidad
      const tieneEspecialidad =
        nombresServicios.length === 0 ||
        nombresServicios.some((srv) => (op.especialidades || []).includes(srv));
      if (tieneEspecialidad) {
        puntaje += 16;
        detalleCriterios.push(`Especialidad: Califica para el servicio`);
      }

      // 5. Jornada laboral del operario
      const jInicio = horaAMinutos(op.jornadaInicio || "08:00");
      const jFin = horaAMinutos(op.jornadaFin || "19:00");
      const dentroDeJornada = inicioMin >= jInicio && finMin <= jFin;
      if (dentroDeJornada) {
        puntaje += 10;
        detalleCriterios.push(
          `Jornada: ${op.jornadaInicio || "08:00"}-${op.jornadaFin || "19:00"} OK`,
        );
      } else {
        puntaje -= 20;
        detalleCriterios.push(`Excede su jornada laboral`);
      }

      // 2. Disponibilidad (sin colisión de horario ese día) y 4. Carga laboral
      const citasOpDia = citasExistentes.filter(
        (c) =>
          c.operarioId === op.id &&
          c.fecha === fecha &&
          c.estado !== "Cancelado" &&
          c.estado !== "Finalizado",
      );

      const tieneChoqueHorario = citasOpDia.some((c) => {
        const cIni = horaAMinutos(c.horaInicio);
        const cFin = horaAMinutos(c.horaFinEstimada);
        return inicioMin < cFin && finMin > cIni;
      });

      const disponible = !tieneChoqueHorario;
      if (disponible) {
        puntaje += 15;
        detalleCriterios.push(`Disponibilidad: Bloque libre`);
      } else {
        puntaje -= 45;
        detalleCriterios.push(`Ocupado en ese bloque horario`);
      }

      // 4. Carga laboral diaria
      const minutosCargaDia = citasOpDia.reduce(
        (acc, c) => acc + c.tiempoTotalRequeridoMinutos,
        0,
      );
      const citasAsignadasDia = citasOpDia.length;

      // Bonificar menor carga laboral para disminuir tiempos muertos y equilibrar equipo
      const bonoCarga = Math.max(0, 15 - citasAsignadasDia * 5);
      puntaje += bonoCarga;
      detalleCriterios.push(
        `Carga laboral: ${citasAsignadasDia} cita(s) (${minutosCargaDia} min)`,
      );

      return {
        operario: op,
        puntaje: Math.min(99, Math.max(10, puntaje)),
        disponible,
        dentroDeJornada,
        enZonaCobertura,
        tieneEspecialidad,
        esCercanoBase,
        citasAsignadasDia,
        minutosCargaDia,
        detalleCriterios,
      };
    })
    .sort((a, b) => b.puntaje - a.puntaje);
};

export const ModalProgramacionInteligente: React.FC<
  ModalProgramacionInteligenteProps
> = ({
  visible,
  onCancel,
  onSave,
  clientes,
  serviciosDisponibles,
  citasExistentes = [],
}) => {
  const [form] = Form.useForm();
  const [clientesCargados, setClientesCargados] = useState<Cliente[]>(
    clientes.length > 0 ? clientes : MOCK_CLIENTES,
  );

  // Cargar clientes directamente desde la BD MySQL cada vez que se abre el modal
  useEffect(() => {
    const obtenerClientesBD = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/clientes");
        const data = await res.json();
        if (res.ok && Array.isArray(data) && data.length > 0) {
          const mapeados: Cliente[] = data.map((item: any) => ({
            id: item.id.toString(),
            nombreCompleto: item.nombre,
            rut: item.rut,
            telefono: item.telefono || "",
            email: item.email || "",
            direccion: item.direccion,
            comuna: item.comuna,
            region: item.region,
            direccionValidada: true,
            latitud: item.latitud ? Number(item.latitud) : undefined,
            longitud: item.longitud ? Number(item.longitud) : undefined,
            createdAt: "2026-11-07",
            distanciaKm: item.distancia_km ? Number(item.distancia_km) : 5,
            tiempoTrasladoMinutos: item.tiempo_traslado_min
              ? Number(item.tiempo_traslado_min)
              : 15,
          }));
          setClientesCargados(mapeados);
        } else if (clientes.length > 0) {
          setClientesCargados(clientes);
        }
      } catch {
        if (clientes.length > 0) setClientesCargados(clientes);
      }
    };
    if (visible) {
      obtenerClientesBD();
    }
  }, [visible, clientes]);

  const listaClientes =
    clientesCargados.length > 0 ? clientesCargados : MOCK_CLIENTES;
  const listaServicios =
    serviciosDisponibles.length > 0 ? serviciosDisponibles : SERVICIOS_BASE;

  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<Cliente | null>(null);
  const [itemsAgregados, setItemsAgregados] = useState<
    ItemServicioSeleccionado[]
  >([]);
  const [servicioActualId, setServicioActualId] = useState<string | null>(null);
  const [cantidadActual, setCantidadActual] = useState<number>(1);
  const [horarioClientePreferido, setHorarioClientePreferido] = useState<
    "MANANA" | "TARDE" | "FLEXIBLE"
  >("MANANA");

  const [fechaHoraInicio, setFechaHoraInicio] = useState<Dayjs | null>(
    dayjs().add(1, "day").hour(9).minute(0),
  );
  const [operarioSeleccionadoId, setOperarioSeleccionadoId] =
    useState<string>("OP-001");

  // 1. Manejo del cambio de cliente
  const handleClienteChange = (clienteId: string) => {
    const cliente = listaClientes.find((c) => c.id === clienteId) || null;
    setClienteSeleccionado(cliente);
  };

  // 2. Agregar servicio a la lista de la cita
  const handleAgregarServicio = () => {
    if (!servicioActualId) return;
    const servicioObj = listaServicios.find((s) => s.id === servicioActualId);
    if (!servicioObj) return;

    const existe = itemsAgregados.find(
      (item) => item.servicioId === servicioObj.id,
    );
    if (existe) {
      setItemsAgregados(
        itemsAgregados.map((item) =>
          item.servicioId === servicioObj.id
            ? {
                ...item,
                cantidad: item.cantidad + cantidadActual,
                tiempoEstimadoMinutosTotal:
                  (item.cantidad + cantidadActual) *
                  servicioObj.tiempoEstimadoMinutos,
              }
            : item,
        ),
      );
    } else {
      setItemsAgregados([
        ...itemsAgregados,
        {
          servicioId: servicioObj.id,
          nombre: servicioObj.nombre,
          cantidad: cantidadActual,
          tiempoEstimadoMinutosTotal:
            cantidadActual * servicioObj.tiempoEstimadoMinutos,
        },
      ]);
    }

    setServicioActualId(null);
    setCantidadActual(1);
  };

  const handleEliminarServicio = (servicioId: string) => {
    setItemsAgregados(
      itemsAgregados.filter((s) => s.servicioId !== servicioId),
    );
  };

  // 3. Cálculos dinámicos inteligentes
  const duracionServiciosMinutos = useMemo(() => {
    return itemsAgregados.reduce(
      (acc, curr) => acc + curr.tiempoEstimadoMinutosTotal,
      0,
    );
  }, [itemsAgregados]);

  // Tiempo de traslado desde Lo Barnechea (tomado del cliente seleccionado)
  const tiempoTrasladoMinutos =
    clienteSeleccionado?.tiempoTrasladoMinutos ?? 15;
  const distanciaKm = clienteSeleccionado?.distanciaKm ?? 4;

  // Tiempo total requerido (Servicios + Traslado)
  const tiempoTotalRequeridoMinutos =
    duracionServiciosMinutos + tiempoTrasladoMinutos;

  // Hora de término estimada basada en la hora de inicio seleccionada + tiempo total
  const horaFinEstimada = useMemo(() => {
    if (!fechaHoraInicio) return "--:--";
    return fechaHoraInicio
      .add(tiempoTotalRequeridoMinutos, "minute")
      .format("HH:mm");
  }, [fechaHoraInicio, tiempoTotalRequeridoMinutos]);

  // ========================================================================
  // HU 5: Motor que propone automáticamente la mejor fecha y hora
  // ========================================================================
  const mejoresFechasPropuestas = useMemo<PropuestaFechaHU5[]>(() => {
    if (!clienteSeleccionado || itemsAgregados.length === 0) return [];

    const opciones: PropuestaFechaHU5[] = [];
    const minutosAHora = (totalMin: number) => {
      const h = Math.floor(totalMin / 60) % 24;
      const m = totalMin % 60;
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    };

    for (let offset = 0; offset <= 7; offset++) {
      const dia = dayjs().add(offset, "day");
      if (dia.day() === 0) continue;

      const fechaStr = dia.format("YYYY-MM-DD");
      const citasDelDia = citasExistentes.filter(
        (c) =>
          c.fecha === fechaStr &&
          c.estado !== "Cancelado" &&
          c.estado !== "Finalizado",
      );

      const minutosOcupados = citasDelDia.reduce(
        (acc, c) => acc + c.tiempoTotalRequeridoMinutos,
        0,
      );
      if (
        minutosOcupados + tiempoTotalRequeridoMinutos >
        CAPACIDAD_DIARIA_MAX_MINUTOS
      ) {
        continue;
      }

      const capacidadLibrePorcentaje = Math.max(
        5,
        Math.round(
          ((CAPACIDAD_DIARIA_MAX_MINUTOS - minutosOcupados) /
            CAPACIDAD_DIARIA_MAX_MINUTOS) *
            100,
        ),
      );

      let inicioCandidatoMin =
        horarioClientePreferido === "TARDE" ? 14 * 60 : 9 * 60;
      const limiteFinJornadaMin = dia.day() === 6 ? 14 * 60 : 19 * 60;

      const citasOrdenadas = [...citasDelDia].sort(
        (a, b) => horaAMinutos(a.horaInicio) - horaAMinutos(b.horaInicio),
      );

      for (const citaExistente of citasOrdenadas) {
        const inicioExistente = horaAMinutos(citaExistente.horaInicio);
        const finExistente = horaAMinutos(citaExistente.horaFinEstimada);
        const finCandidato = inicioCandidatoMin + tiempoTotalRequeridoMinutos;

        if (
          inicioCandidatoMin < finExistente &&
          finCandidato > inicioExistente
        ) {
          inicioCandidatoMin = finExistente + 15;
        }
      }

      if (
        inicioCandidatoMin + tiempoTotalRequeridoMinutos >
        limiteFinJornadaMin
      ) {
        continue;
      }

      const horaInicioProp = minutosAHora(inicioCandidatoMin);
      const horaFinProp = minutosAHora(
        inicioCandidatoMin + tiempoTotalRequeridoMinutos,
      );

      const coincideComuna = citasDelDia.some(
        (c) => c.comunaCliente === clienteSeleccionado.comuna,
      );

      let puntaje = 82 - offset * 2;
      let etiqueta = "Agenda Disponible";
      let motivo = `Bloque libre según horario del cliente (${duracionServiciosMinutos} min servicio + ${tiempoTrasladoMinutos} min traslado). Capacidad diaria libre: ${capacidadLibrePorcentaje}%.`;

      if (coincideComuna) {
        puntaje += 16;
        etiqueta = "Óptimo por Comuna y Traslado";
        motivo = `Ya existe ruta en ${clienteSeleccionado.comuna} este día: optimiza los ${tiempoTrasladoMinutos} min de traslado y aprovecha la capacidad diaria (${capacidadLibrePorcentaje}% libre).`;
      } else if (capacidadLibrePorcentaje === 100) {
        puntaje += 8;
        etiqueta = "Día 100% Despejado";
      }

      opciones.push({
        fecha: fechaStr,
        horaInicio: horaInicioProp,
        horaFin: horaFinProp,
        etiqueta,
        motivo,
        capacidadLibrePorcentaje,
        puntaje: Math.min(99, puntaje),
      });
    }

    return opciones.sort((a, b) => b.puntaje - a.puntaje).slice(0, 3);
  }, [
    clienteSeleccionado,
    itemsAgregados,
    duracionServiciosMinutos,
    tiempoTrasladoMinutos,
    tiempoTotalRequeridoMinutos,
    horarioClientePreferido,
    citasExistentes,
  ]);

  useEffect(() => {
    if (mejoresFechasPropuestas.length > 0) {
      const mejor = mejoresFechasPropuestas[0];
      const mejorDayjs = dayjs(
        `${mejor.fecha} ${mejor.horaInicio}`,
        "YYYY-MM-DD HH:mm",
      );
      setFechaHoraInicio(mejorDayjs);
      form.setFieldsValue({ fechaHora: mejorDayjs });
    }
  }, [mejoresFechasPropuestas, form]);

  // ========================================================================
  // HU 6: Evaluación y Asignación Automática del Mejor Operario
  // Considera: Cercanía, Disponibilidad, Especialidad, Carga laboral, Jornada, Zona de cobertura
  // ========================================================================
  const rankingOperariosHU6 = useMemo<EvaluacionOperarioHU6[]>(() => {
    if (!clienteSeleccionado) return [];
    const fechaStr = fechaHoraInicio
      ? fechaHoraInicio.format("YYYY-MM-DD")
      : dayjs().format("YYYY-MM-DD");
    const horaIniStr = fechaHoraInicio
      ? fechaHoraInicio.format("HH:mm")
      : "09:00";
    const horaFinStr =
      horaFinEstimada !== "--:--" ? horaFinEstimada : "11:00";

    return evaluarOperariosParaCita(
      clienteSeleccionado.comuna,
      itemsAgregados.map((i) => i.nombre),
      fechaStr,
      horaIniStr,
      horaFinStr,
      citasExistentes,
      MOCK_OPERARIOS,
    );
  }, [
    clienteSeleccionado,
    itemsAgregados,
    fechaHoraInicio,
    horaFinEstimada,
    citasExistentes,
  ]);

  // Auto-seleccionar el mejor operario calculado por el motor HU 6 + Valor Agregado con IA
  useEffect(() => {
    if (rankingOperariosHU6.length > 0) {
      const mejorOpId = rankingOperariosHU6[0].operario.id;
      setOperarioSeleccionadoId(mejorOpId);
      form.setFieldsValue({ operarioId: mejorOpId });
    }

    if (clienteSeleccionado && itemsAgregados.length > 0) {
      IntegracionesTecnicasService.consultarMotorPlanificacionIA({
        clienteNombre: clienteSeleccionado.nombreCompleto,
        direccion: clienteSeleccionado.direccion,
        comuna: clienteSeleccionado.comuna,
        servicio: itemsAgregados.map((i) => i.nombre).join(", "),
        duracionMinutos: duracionServiciosMinutos,
        fechaPreferida: fechaHoraInicio
          ? fechaHoraInicio.format("YYYY-MM-DD")
          : dayjs().format("YYYY-MM-DD"),
        horaPreferida: fechaHoraInicio
          ? fechaHoraInicio.format("HH:mm")
          : "09:00",
      });
    }
  }, [
    rankingOperariosHU6,
    form,
    clienteSeleccionado,
    itemsAgregados,
    duracionServiciosMinutos,
    fechaHoraInicio,
  ]);

  const seleccionarPropuesta = (prop: PropuestaFechaHU5) => {
    const nuevoDayjs = dayjs(
      `${prop.fecha} ${prop.horaInicio}`,
      "YYYY-MM-DD HH:mm",
    );
    setFechaHoraInicio(nuevoDayjs);
    form.setFieldsValue({ fechaHora: nuevoDayjs });
  };

  // Finalizar y guardar cita
  const handleFinalizar = () => {
    form.validateFields().then((values) => {
      if (!clienteSeleccionado) return;
      if (itemsAgregados.length === 0) return;

      const nuevaCita: Partial<Cita> = {
        clienteId: clienteSeleccionado.id,
        clienteNombre: clienteSeleccionado.nombreCompleto,
        direccionCliente: clienteSeleccionado.direccion,
        comunaCliente: clienteSeleccionado.comuna,
        items: itemsAgregados,
        duracionServiciosMinutos,
        tiempoTrasladoMinutos,
        tiempoTotalRequeridoMinutos,
        fecha: values.fechaHora.format("YYYY-MM-DD"),
        horaInicio: values.fechaHora.format("HH:mm"),
        horaFinEstimada,
        estado: "Programado",
        operarioId: values.operarioId || operarioSeleccionadoId,
        observacionesGenerales: values.observacionesGenerales,
      };

      const opAsignado = MOCK_OPERARIOS.find(
        (o) => o.id === nuevaCita.operarioId,
      );
      IntegracionesTecnicasService.sincronizarCitaConCalendarioExterno(
        nuevaCita,
        opAsignado?.nombre || "Equipo Técnico",
      );

      onSave(nuevaCita);
      form.resetFields();
      setClienteSeleccionado(null);
      setItemsAgregados([]);
    });
  };

  const operarioActivoEval = rankingOperariosHU6.find(
    (r) => r.operario.id === operarioSeleccionadoId,
  );

  return (
    <Modal
      title={
        <Space>
          <ClockCircleOutlined style={{ color: "#1890ff" }} />
          <span>
            Programación Inteligente y Asignación Automática de Operarios (HU 5
            y HU 6)
          </span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleFinalizar}
      okText="Confirmar y Agendar"
      cancelText="Cancelar"
      width={860}
      okButtonProps={{
        disabled: !clienteSeleccionado || itemsAgregados.length === 0,
      }}
    >
      <Form form={form} layout="vertical">
        {/* Paso 1: Selección de Cliente y Horario Preferente */}
        <Card
          size="small"
          title="1. Selección de Cliente y Horario Preferente"
          style={{ marginBottom: 16 }}
        >
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Form.Item
              name="clienteId"
              label="Cliente"
              rules={[{ required: true, message: "Seleccione un cliente" }]}
              style={{ flex: 2, minWidth: 260, marginBottom: 8 }}
            >
              <Select
                showSearch
                placeholder="Buscar cliente por nombre o comuna..."
                optionFilterProp="children"
                onChange={handleClienteChange}
              >
                {listaClientes.map((c) => (
                  <Option key={c.id} value={c.id}>
                    {c.nombreCompleto} — {c.comuna} ({c.direccion})
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Horario Preferente del Cliente"
              style={{ flex: 1, minWidth: 220, marginBottom: 8 }}
            >
              <Radio.Group
                value={horarioClientePreferido}
                onChange={(e) => setHorarioClientePreferido(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value="MANANA">Mañana</Radio.Button>
                <Radio.Button value="TARDE">Tarde</Radio.Button>
                <Radio.Button value="FLEXIBLE">Flexible</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </div>

          {clienteSeleccionado && (
            <Alert
              type="info"
              showIcon
              icon={<CarOutlined />}
              message={
                <div>
                  <Text strong>{clienteSeleccionado.nombreCompleto}</Text> (
                  {clienteSeleccionado.comuna})
                  <br />
                  <Text type="secondary">
                    Distancia desde base (Lo Barnechea): <b>{distanciaKm} km</b>{" "}
                    | Tiempo estimado de viaje:{" "}
                    <b>{tiempoTrasladoMinutos} min</b>
                  </Text>
                </div>
              }
            />
          )}
        </Card>

        {/* Paso 2: Selección de Servicios */}
        <Card
          size="small"
          title="2. Catálogo de Servicios"
          style={{ marginBottom: 16 }}
        >
          <Space style={{ marginBottom: 12, display: "flex", width: "100%" }}>
            <Select
              placeholder="Seleccionar servicio..."
              style={{ flex: 1 }}
              value={servicioActualId}
              onChange={(val) => setServicioActualId(val)}
            >
              {listaServicios
                .filter((s) => s.activo)
                .map((s) => (
                  <Option key={s.id} value={s.id}>
                    {s.nombre} ({s.tiempoEstimadoMinutos} min por unidad)
                  </Option>
                ))}
            </Select>

            <InputNumber
              min={1}
              max={10}
              value={cantidadActual}
              onChange={(val) => setCantidadActual(val || 1)}
            />

            <Button
              type="primary"
              onClick={handleAgregarServicio}
              disabled={!servicioActualId}
            >
              Agregar
            </Button>
          </Space>

          <Table
            dataSource={itemsAgregados}
            rowKey={(record) => record.servicioId}
            pagination={false}
            size="small"
            columns={[
              { title: "Servicio", dataIndex: "nombre", key: "nombre" },
              {
                title: "Cant.",
                dataIndex: "cantidad",
                key: "cantidad",
                width: 60,
              },
              {
                title: "Tiempo Estimado Total",
                key: "tiempoEstimadoMinutosTotal",
                render: (_, r) => `${r.tiempoEstimadoMinutosTotal} min`,
              },
              {
                title: "Acción",
                key: "accion",
                render: (_, r) => (
                  <Button
                    type="link"
                    danger
                    onClick={() => handleEliminarServicio(r.servicioId)}
                  >
                    Quitar
                  </Button>
                ),
              },
            ]}
          />
        </Card>

        {/* Paso 3: Resumen Inteligente de Tiempos y Sugerencia Automática de Fecha (HU 5) */}
        <Card
          size="small"
          title="3. Propuesta Automática de Mejor Fecha (HU 5) y Asignación de Operario (HU 6)"
        >
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Tag
                color="blue"
                icon={<ClockCircleOutlined />}
                style={{ padding: "6px 12px", fontSize: 13 }}
              >
                Duración Servicios: <b>{duracionServiciosMinutos} min</b>
              </Tag>
              <Tag
                color="orange"
                icon={<CarOutlined />}
                style={{ padding: "6px 12px", fontSize: 13 }}
              >
                Traslado (Lo Barnechea): <b>{tiempoTrasladoMinutos} min</b>
              </Tag>
              <Tag
                color="green"
                icon={<CheckCircleOutlined />}
                style={{ padding: "6px 12px", fontSize: 13 }}
              >
                Bloque Total Requerido: <b>{tiempoTotalRequeridoMinutos} min</b>
              </Tag>
            </div>

            {/* Panel de Fechas Propuestas Automáticamente (HU 5) */}
            {mejoresFechasPropuestas.length > 0 && (
              <div
                style={{
                  background: "#f6ffed",
                  border: "1px solid #b7eb8f",
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <Space style={{ marginBottom: 8 }}>
                  <BulbOutlined style={{ color: "#52c41a" }} />
                  <Text strong style={{ color: "#237804" }}>
                    Mejores fechas propuestas automáticamente (HU 5):
                  </Text>
                </Space>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {mejoresFechasPropuestas.map((prop, index) => {
                    const seleccionada =
                      fechaHoraInicio?.format("YYYY-MM-DD") === prop.fecha &&
                      fechaHoraInicio?.format("HH:mm") === prop.horaInicio;

                    return (
                      <Card
                        key={`${prop.fecha}-${prop.horaInicio}`}
                        size="small"
                        hoverable
                        onClick={() => seleccionarPropuesta(prop)}
                        style={{
                          flex: 1,
                          minWidth: 220,
                          borderColor: seleccionada ? "#52c41a" : "#d9d9d9",
                          borderWidth: seleccionada ? 2 : 1,
                          background: "#ffffff",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Tag color={index === 0 ? "green" : "blue"}>
                            {index === 0 ? "⭐ Mejor Propuesta" : prop.etiqueta}
                          </Tag>
                          <Text strong style={{ color: "#52c41a" }}>
                            {prop.puntaje}% óptimo
                          </Text>
                        </div>

                        <div style={{ marginTop: 6 }}>
                          <Text strong>
                            📅 {prop.fecha} | ⏰ {prop.horaInicio} ➔{" "}
                            {prop.horaFin}
                          </Text>
                        </div>

                        <Text
                          type="secondary"
                          style={{
                            fontSize: 11,
                            display: "block",
                            marginTop: 4,
                          }}
                        >
                          {prop.motivo}
                        </Text>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            <Divider style={{ margin: "8px 0" }} />

            <div style={{ display: "flex", gap: 16 }}>
              <Form.Item
                name="fechaHora"
                label="Fecha y Hora de Inicio"
                initialValue={fechaHoraInicio}
                rules={[{ required: true, message: "Seleccione fecha y hora" }]}
                style={{ flex: 1 }}
              >
                <DatePicker
                  showTime={{ format: "HH:mm" }}
                  format="YYYY-MM-DD HH:mm"
                  style={{ width: "100%" }}
                  onChange={(val) => setFechaHoraInicio(val)}
                />
              </Form.Item>

              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <Text type="secondary">Hora de término estimada:</Text>
                <Title level={4} style={{ margin: 0, color: "#52c41a" }}>
                  {fechaHoraInicio ? fechaHoraInicio.format("HH:mm") : "--:--"}{" "}
                  ➔ {horaFinEstimada}
                </Title>
              </div>
            </div>

            {/* ============================================================== */}
            {/* HU 6: Asignación Automática de Operarios                       */}
            {/* ============================================================== */}
            {rankingOperariosHU6.length > 0 && (
              <div
                style={{
                  background: "#f9f0ff",
                  border: "1px solid #d3adf7",
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <Form.Item
                  name="operarioId"
                  label={
                    <Space>
                      <UserOutlined style={{ color: "#722ed1" }} />
                      <Text strong style={{ color: "#531dab" }}>
                        Asignación Automática de Operario (HU 6: Cercanía,
                        Disponibilidad, Especialidad, Carga, Jornada y
                        Cobertura)
                      </Text>
                    </Space>
                  }
                  style={{ marginBottom: 8 }}
                >
                  <Select
                    value={operarioSeleccionadoId}
                    onChange={(val) => setOperarioSeleccionadoId(val)}
                  >
                    {rankingOperariosHU6.map((ev, idx) => (
                      <Option key={ev.operario.id} value={ev.operario.id}>
                        <Space>
                          {idx === 0 && (
                            <Badge
                              count="Óptimo IA"
                              style={{ backgroundColor: "#52c41a" }}
                            />
                          )}
                          <Text strong>{ev.operario.nombre}</Text>
                          <Tag color="purple">
                            <StarFilled /> {ev.puntaje}%
                          </Tag>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Base: {ev.operario.comunaBase} | Carga hoy:{" "}
                            {ev.citasAsignadasDia} cita(s)
                          </Text>
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                {operarioActivoEval && (
                  <Space size={[6, 6]} wrap>
                    <Tag
                      color={operarioActivoEval.esCercanoBase ? "green" : "blue"}
                    >
                      📍 Cercanía: Base {operarioActivoEval.operario.comunaBase}
                    </Tag>
                    <Tag
                      color={operarioActivoEval.disponible ? "green" : "red"}
                    >
                      ⏰ Disponibilidad:{" "}
                      {operarioActivoEval.disponible
                        ? "Disponible"
                        : "Con tope horario"}
                    </Tag>
                    <Tag
                      color={
                        operarioActivoEval.tieneEspecialidad
                          ? "purple"
                          : "default"
                      }
                    >
                      🛠️ Especialidad:{" "}
                      {operarioActivoEval.tieneEspecialidad
                        ? "Especialista"
                        : "General"}
                    </Tag>
                    <Tag color="cyan">
                      📊 Carga laboral: {operarioActivoEval.citasAsignadasDia}{" "}
                      cita(s) ({operarioActivoEval.minutosCargaDia} min)
                    </Tag>
                    <Tag
                      color={
                        operarioActivoEval.dentroDeJornada ? "green" : "orange"
                      }
                    >
                      🕒 Jornada:{" "}
                      {operarioActivoEval.operario.jornadaInicio || "08:00"} -{" "}
                      {operarioActivoEval.operario.jornadaFin || "19:00"}
                    </Tag>
                    <Tag
                      color={
                        operarioActivoEval.enZonaCobertura ? "geekblue" : "gold"
                      }
                    >
                      🗺️ Cobertura:{" "}
                      {operarioActivoEval.enZonaCobertura
                        ? `Cubre ${clienteSeleccionado?.comuna}`
                        : "Zona extendida"}
                    </Tag>
                  </Space>
                )}
              </div>
            )}

            <Form.Item
              name="observacionesGenerales"
              label="Observaciones generales"
            >
              <Input.TextArea
                rows={2}
                placeholder="Ej: Llamar antes de llegar, portón negro..."
              />
            </Form.Item>
          </Space>
        </Card>
      </Form>
    </Modal>
  );
};
