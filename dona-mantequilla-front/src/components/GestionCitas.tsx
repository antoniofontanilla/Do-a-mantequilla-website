import React, { useState, useEffect, useMemo } from "react";
import PanelSugerenciasIA from "./PanelSugerenciasIA";
import {
  Table,
  Tag,
  Button,
  Card,
  Space,
  Typography,
  Input,
  Select,
  DatePicker,
  TimePicker,
  Tooltip,
  Popconfirm,
  Badge,
  Row,
  Col,
  Drawer,
  Radio,
  Calendar,
  Empty,
  Modal,
  Steps,
  message,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  CalendarOutlined,
  CarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  RobotOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  UserOutlined,
  LeftOutlined,
  RightOutlined,
  StepForwardOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { Cita } from "../types/cita";
import { Cliente } from "../types/cliente";
import { ServicioCatalogo } from "../types/servicio";
import { MOCK_OPERARIOS } from "../data/mockOperarios";
import {
  ModalProgramacionInteligente,
  evaluarOperariosParaCita,
} from "./ModalProgramacionInteligente";
import { RecordatoriosAutomaticosService } from "../services/recordatoriosService";

const { Title, Text } = Typography;
const { Option } = Select;

export type ModoVistaAgenda = "TABLA" | "DIA" | "SEMANA" | "MES";

// HU 10: Los 9 Estados Oficiales del Servicio
export const LISTA_ESTADOS_HU10: Cita["estado"][] = [
  "Cotización",
  "Pendiente",
  "Confirmado",
  "Programado",
  "En Ruta",
  "En Servicio",
  "Finalizado",
  "Reprogramado",
  "Cancelado",
];

// Flujo secuencial principal para avanzar etapa con 1 clic
const FLUJO_SECUENCIAL_ESTADOS: Cita["estado"][] = [
  "Cotización",
  "Pendiente",
  "Confirmado",
  "Programado",
  "En Ruta",
  "En Servicio",
  "Finalizado",
];

// Colores según el estado de la cita (HU 10)
const ESTADO_COLOR: Record<Cita["estado"], string> = {
  Cotización: "default",
  Pendiente: "warning",
  Confirmado: "processing",
  Programado: "cyan",
  "En Ruta": "purple",
  "En Servicio": "blue",
  Finalizado: "success",
  Reprogramado: "orange",
  Cancelado: "error",
};

const STORAGE_ESTADOS_KEY = "dona_mantequilla_estados_hu10";

const DIAS_SEMANA_NOMBRES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

// Datos iniciales de respaldo
const CITAS_INICIALES: Cita[] = [
  {
    id: "CITA-001",
    clienteId: "CLI-001",
    clienteNombre: "Juan Pérez",
    direccionCliente: "Av. El Tranque 1234",
    comunaCliente: "Lo Barnechea",
    telefonoCliente: "+56 9 8765 4321",
    emailCliente: "juan.perez@email.com",
    items: [
      {
        servicioId: "SERV-001",
        nombre: "Aseo profundo",
        cantidad: 1,
        tiempoEstimadoMinutosTotal: 60,
      },
      {
        servicioId: "SERV-002",
        nombre: "Ventanas",
        cantidad: 1,
        tiempoEstimadoMinutosTotal: 45,
      },
    ],
    duracionServiciosMinutos: 105,
    tiempoTrasladoMinutos: 15,
    tiempoTotalRequeridoMinutos: 120,
    fecha: dayjs().format("YYYY-MM-DD"),
    horaInicio: "09:00",
    horaFinEstimada: "11:00",
    estado: "Programado",
    operarioId: "OP-001",
    observacionesGenerales: "Casa de 2 pisos, portón blanco.",
  },
  {
    id: "CITA-002",
    clienteId: "CLI-002",
    clienteNombre: "María González",
    direccionCliente: "Avenida Las Condes 9876",
    comunaCliente: "Las Condes",
    telefonoCliente: "+56 9 1234 5678",
    emailCliente: "maria.gonzalez@email.com",
    items: [
      {
        servicioId: "SERV-003",
        nombre: "Sofás",
        cantidad: 1,
        tiempoEstimadoMinutosTotal: 30,
      },
    ],
    duracionServiciosMinutos: 30,
    tiempoTrasladoMinutos: 25,
    tiempoTotalRequeridoMinutos: 55,
    fecha: dayjs().add(1, "day").format("YYYY-MM-DD"),
    horaInicio: "11:30",
    horaFinEstimada: "12:25",
    estado: "Pendiente",
    operarioId: "OP-002",
    observacionesGenerales: "Llamar al timbre del departamento 402.",
  },
];

interface GestionCitasProps {
  clientes: Cliente[];
  serviciosDisponibles: ServicioCatalogo[];
}

export const GestionCitas: React.FC<GestionCitasProps> = ({
  clientes,
  serviciosDisponibles,
}) => {
  const [citas, setCitas] = useState<Cita[]>(CITAS_INICIALES);
  const [modalVisible, setModalVisible] = useState(false);
  const [drawerIAVisible, setDrawerIAVisible] = useState(false);

  // HU 9: Modo de visualización de la Agenda (Tabla, Día, Semana, Mes) y fecha pivote del calendario
  const [modoVista, setModoVista] = useState<ModoVistaAgenda>("TABLA");
  const [fechaCalendario, setFechaCalendario] = useState<Dayjs>(dayjs());

  // HU 10: Modal de Reprogramación cuando una cita pasa a estado "Reprogramado"
  const [citaAReprogramar, setCitaAReprogramar] = useState<Cita | null>(null);
  const [nuevaFechaReprog, setNuevaFechaReprog] = useState<Dayjs>(
    dayjs().add(1, "day"),
  );
  const [nuevaHoraReprog, setNuevaHoraReprog] = useState<Dayjs>(
    dayjs().hour(10).minute(0),
  );

  // Cargar las citas de los clientes registrados en la Base de Datos MySQL
  useEffect(() => {
    const cargarCitasDesdeBD = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/clientes");
        const data = await res.json();
        if (res.ok && Array.isArray(data) && data.length > 0) {
          const tiemposBase: Record<string, number> = {
            Sofás: 90,
            Sillones: 45,
            Sillas: 20,
            Colchones: 60,
            Alfombras: 75,
            Ventanas: 30,
            Ventanales: 45,
            "Aseo profundo": 180,
            "Servicio combinado": 120,
          };

          // Leer estados guardados previamente por el administrador
          let estadosGuardados: Record<
            string,
            {
              estado: Cita["estado"];
              fecha?: string;
              horaInicio?: string;
              horaFinEstimada?: string;
            }
          > = {};
          try {
            const raw = localStorage.getItem(STORAGE_ESTADOS_KEY);
            if (raw) estadosGuardados = JSON.parse(raw);
          } catch {
            // Ignorar error de lectura localStorage
          }

          // Distribución inicial representativa de los 9 estados de HU 10
          const estadosCiclo: Cita["estado"][] = [
            "Programado",
            "Confirmado",
            "En Ruta",
            "En Servicio",
            "Pendiente",
            "Cotización",
            "Finalizado",
            "Reprogramado",
            "Confirmado",
          ];

          const citasBD: Cita[] = [];
          data.forEach((item: any, idx: number) => {
            const citaId = `CITA-${item.id.toString().padStart(3, "0")}`;
            const guardado = estadosGuardados[citaId];

            const nombreServicio = item.servicio || "Sofás";
            const duracion = tiemposBase[nombreServicio] || 60;
            const traslado = item.tiempo_traslado_min
              ? Number(item.tiempo_traslado_min)
              : 15;
            const totalMin = duracion + traslado;
            const fechaStr =
              guardado?.fecha ||
              (item.fecha_cita
                ? String(item.fecha_cita).slice(0, 10)
                : dayjs().format("YYYY-MM-DD"));
            const horaInicio =
              guardado?.horaInicio ||
              (item.hora_cita ? String(item.hora_cita).slice(0, 5) : "09:00");

            const [h, m] = horaInicio.split(":").map(Number);
            const finTotal = (h || 9) * 60 + (m || 0) + totalMin;
            const hFin = Math.floor(finTotal / 60) % 24;
            const mFin = finTotal % 60;
            const horaFinEstimada =
              guardado?.horaFinEstimada ||
              `${hFin.toString().padStart(2, "0")}:${mFin
                .toString()
                .padStart(2, "0")}`;

            // HU 6: Evaluar y asignar automáticamente al mejor operario
            const rankingOp = evaluarOperariosParaCita(
              item.comuna || "Lo Barnechea",
              [nombreServicio],
              fechaStr,
              horaInicio,
              horaFinEstimada,
              citasBD,
              MOCK_OPERARIOS,
            );
            const mejorOperarioId = rankingOp[0]?.operario.id || "OP-001";

            citasBD.push({
              id: citaId,
              clienteId: item.id.toString(),
              clienteNombre: item.nombre,
              direccionCliente: item.direccion,
              comunaCliente: item.comuna,
              telefonoCliente: item.telefono || "",
              emailCliente: item.email || "",
              items: [
                {
                  servicioId: `SERV-${item.id}`,
                  nombre: nombreServicio,
                  cantidad: 1,
                  tiempoEstimadoMinutosTotal: duracion,
                },
              ],
              duracionServiciosMinutos: duracion,
              tiempoTrasladoMinutos: traslado,
              tiempoTotalRequeridoMinutos: totalMin,
              fecha: fechaStr,
              horaInicio,
              horaFinEstimada,
              estado:
                guardado?.estado || estadosCiclo[idx % estadosCiclo.length],
              operarioId: mejorOperarioId,
            });
          });

          setCitas(citasBD);
        }
      } catch (err) {
        console.error("Error al cargar citas desde MySQL:", err);
      }
    };
    cargarCitasDesdeBD();
  }, []);

  // HU 11: Ejecución interna y 100% automatizada de recordatorios 24 horas antes (sin interfaz manual)
  useEffect(() => {
    RecordatoriosAutomaticosService.procesarRecordatoriosAutomaticos24h(citas);
    const timer = setInterval(() => {
      RecordatoriosAutomaticosService.procesarRecordatoriosAutomaticos24h(
        citas,
      );
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, [citas]);

  // Persistir cambios de estado/reprogramación en localStorage
  const persistirEstadoCita = (
    citaId: string,
    datos: {
      estado: Cita["estado"];
      fecha?: string;
      horaInicio?: string;
      horaFinEstimada?: string;
    },
  ) => {
    try {
      const raw = localStorage.getItem(STORAGE_ESTADOS_KEY);
      const actual = raw ? JSON.parse(raw) : {};
      actual[citaId] = { ...(actual[citaId] || {}), ...datos };
      localStorage.setItem(STORAGE_ESTADOS_KEY, JSON.stringify(actual));
    } catch {
      // Ignorar si falla localStorage
    }
  };

  // HU 9: Filtros por Cliente, Operario, Estado y Fecha
  const [busquedaText, setBusquedaText] = useState("");
  const [filtroCliente, setFiltroCliente] = useState<string>("TODOS");
  const [filtroOperario, setFiltroOperario] = useState<string>("TODOS");
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [filtroFecha, setFiltroFecha] = useState<Dayjs | null>(null);

  // Lista única de nombres de clientes presentes en agenda para el filtro directo por Cliente (HU 9)
  const clientesEnAgenda = useMemo(() => {
    const nombres = Array.from(new Set(citas.map((c) => c.clienteNombre)));
    return nombres.sort();
  }, [citas]);

  // Conteo por cada uno de los 9 estados (HU 10)
  const conteoPorEstado = useMemo(() => {
    const mapa: Record<string, number> = {};
    LISTA_ESTADOS_HU10.forEach((est) => {
      mapa[est] = 0;
    });
    citas.forEach((c) => {
      mapa[c.estado] = (mapa[c.estado] || 0) + 1;
    });
    return mapa;
  }, [citas]);

  // Guardar nueva cita generada desde el modal
  const handleGuardarCita = (nuevaCitaData: Partial<Cita>) => {
    const nuevaCita: Cita = {
      ...nuevaCitaData,
      id: `CITA-${(citas.length + 1).toString().padStart(3, "0")}`,
    } as Cita;

    setCitas([nuevaCita, ...citas]);
    setModalVisible(false);
  };

  // HU 10: Cambio de estado con soporte para Reprogramación e historial visual
  const handleCambiarEstado = (citaId: string, nuevoEstado: Cita["estado"]) => {
    const citaObj = citas.find((c) => c.id === citaId);
    if (!citaObj) return;

    if (nuevoEstado === "Reprogramado") {
      setCitaAReprogramar(citaObj);
      setNuevaFechaReprog(dayjs(citaObj.fecha, "YYYY-MM-DD").add(1, "day"));
      const [h, m] = (citaObj.horaInicio || "09:00").split(":").map(Number);
      setNuevaHoraReprog(dayjs().hour(h || 9).minute(m || 0));
    }

    setCitas((prev) =>
      prev.map((c) => (c.id === citaId ? { ...c, estado: nuevoEstado } : c)),
    );
    persistirEstadoCita(citaId, { estado: nuevoEstado });
    message.success(
      `Cita ${citaId} (${citaObj.clienteNombre}) actualizada a estado: ${nuevoEstado}`,
    );
  };

  // HU 10: Avanzar automáticamente a la siguiente etapa del flujo operativo
  const handleAvanzarSiguienteEstado = (cita: Cita) => {
    const idxActual = FLUJO_SECUENCIAL_ESTADOS.indexOf(cita.estado);
    if (idxActual >= 0 && idxActual < FLUJO_SECUENCIAL_ESTADOS.length - 1) {
      const siguiente = FLUJO_SECUENCIAL_ESTADOS[idxActual + 1];
      handleCambiarEstado(cita.id, siguiente);
    } else if (cita.estado === "Reprogramado") {
      handleCambiarEstado(cita.id, "Programado");
    }
  };

  // Confirmar nueva fecha y hora en el modal de estado "Reprogramado"
  const confirmarReprogramacion = () => {
    if (!citaAReprogramar) return;
    const fechaStr = nuevaFechaReprog.format("YYYY-MM-DD");
    const horaIniStr = nuevaHoraReprog.format("HH:mm");
    const finMin =
      nuevaHoraReprog.hour() * 60 +
      nuevaHoraReprog.minute() +
      citaAReprogramar.tiempoTotalRequeridoMinutos;
    const horaFinStr = `${Math.floor(finMin / 60)
      .toString()
      .padStart(2, "0")}:${(finMin % 60).toString().padStart(2, "0")}`;

    setCitas((prev) =>
      prev.map((c) =>
        c.id === citaAReprogramar.id
          ? {
              ...c,
              estado: "Reprogramado",
              fecha: fechaStr,
              horaInicio: horaIniStr,
              horaFinEstimada: horaFinStr,
            }
          : c,
      ),
    );

    persistirEstadoCita(citaAReprogramar.id, {
      estado: "Reprogramado",
      fecha: fechaStr,
      horaInicio: horaIniStr,
      horaFinEstimada: horaFinStr,
    });

    message.success(
      `Cita ${citaAReprogramar.id} reprogramada para el ${fechaStr} a las ${horaIniStr} hrs`,
    );
    setCitaAReprogramar(null);
  };

  // Cambio rápido de operario
  const handleCambiarOperario = (citaId: string, nuevoOpId: string) => {
    setCitas(
      citas.map((c) =>
        c.id === citaId ? { ...c, operarioId: nuevoOpId } : c,
      ),
    );
  };

  // Eliminar cita
  const handleEliminarCita = (citaId: string) => {
    setCitas(citas.filter((c) => c.id !== citaId));
  };

  // Filtrado base por Cliente, Operario, Estado y Búsqueda (aplicado a todas las vistas de HU 9)
  const citasBaseFiltradas = useMemo(() => {
    return citas.filter((cita) => {
      const coincideTexto =
        cita.clienteNombre.toLowerCase().includes(busquedaText.toLowerCase()) ||
        cita.comunaCliente.toLowerCase().includes(busquedaText.toLowerCase()) ||
        cita.id.toLowerCase().includes(busquedaText.toLowerCase());

      const coincideCliente =
        filtroCliente === "TODOS" || cita.clienteNombre === filtroCliente;

      const coincideOperario =
        filtroOperario === "TODOS" || cita.operarioId === filtroOperario;

      const coincideEstado =
        filtroEstado === "TODOS" || cita.estado === filtroEstado;

      const coincideFechaTabla =
        modoVista !== "TABLA" ||
        !filtroFecha ||
        cita.fecha === filtroFecha.format("YYYY-MM-DD");

      return (
        coincideTexto &&
        coincideCliente &&
        coincideOperario &&
        coincideEstado &&
        coincideFechaTabla
      );
    });
  }, [
    citas,
    busquedaText,
    filtroCliente,
    filtroOperario,
    filtroEstado,
    filtroFecha,
    modoVista,
  ]);

  // Citas del Día seleccionado (Vista DÍA - HU 9)
  const citasVistaDia = useMemo(() => {
    const fechaStr = fechaCalendario.format("YYYY-MM-DD");
    return [...citasBaseFiltradas]
      .filter((c) => c.fecha === fechaStr)
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  }, [citasBaseFiltradas, fechaCalendario]);

  // Días de la Semana seleccionada (Vista SEMANA - HU 9: Lunes a Domingo)
  const diasSemana = useMemo(() => {
    const diaSemanaActual = fechaCalendario.day();
    const offsetLunes = diaSemanaActual === 0 ? -6 : 1 - diaSemanaActual;
    const inicioSemana = fechaCalendario.add(offsetLunes, "day");
    return Array.from({ length: 7 }, (_, i) => inicioSemana.add(i, "day"));
  }, [fechaCalendario]);

  const obtenerNombreOperario = (opId?: string) => {
    const op = MOCK_OPERARIOS.find((o) => o.id === opId);
    return op ? op.nombre : "Sin asignar";
  };

  // Navegación de fecha según la vista activa (Día, Semana, Mes)
  const navegarPeriodo = (direccion: -1 | 1) => {
    if (modoVista === "DIA") {
      setFechaCalendario(fechaCalendario.add(direccion, "day"));
    } else if (modoVista === "SEMANA") {
      setFechaCalendario(fechaCalendario.add(direccion * 7, "day"));
    } else if (modoVista === "MES") {
      setFechaCalendario(fechaCalendario.add(direccion, "month"));
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Encabezado Principal */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Agenda Visual y Estados del Servicio (HU 9 y HU 10)
          </Title>
          <Text type="secondary">
            Control de operación por Día, Semana y Mes con gestión en vivo de
            los 9 Estados del Servicio
          </Text>
        </div>
        <Space wrap>
          <Radio.Group
            value={modoVista}
            onChange={(e) => setModoVista(e.target.value)}
            buttonStyle="solid"
            size="large"
          >
            <Radio.Button value="TABLA">
              <UnorderedListOutlined /> Lista
            </Radio.Button>
            <Radio.Button value="DIA">
              <ClockCircleOutlined /> Día
            </Radio.Button>
            <Radio.Button value="SEMANA">
              <AppstoreOutlined /> Semana
            </Radio.Button>
            <Radio.Button value="MES">
              <CalendarOutlined /> Mes
            </Radio.Button>
          </Radio.Group>

          <Button
            icon={<RobotOutlined />}
            size="large"
            onClick={() => setDrawerIAVisible(true)}
          >
            Sugerencias IA
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => setModalVisible(true)}
          >
            Nueva Cita Inteligente
          </Button>
        </Space>
      </div>

      {/* HU 10: Tablero Interactivo con los 9 Estados del Servicio */}
      <Card
        size="small"
        title={
          <Space>
            <SyncOutlined style={{ color: "#1677ff" }} />
            <Text strong>
              Estados del Servicio (HU 10) — Haz clic en un estado para filtrar
            </Text>
          </Space>
        }
        extra={
          filtroEstado !== "TODOS" && (
            <Button
              type="link"
              size="small"
              onClick={() => setFiltroEstado("TODOS")}
            >
              Ver todos ({citas.length})
            </Button>
          )
        }
        style={{ marginBottom: 16 }}
      >
        <Space wrap size={[8, 8]}>
          <Tag
            color={filtroEstado === "TODOS" ? "blue" : "default"}
            style={{
              cursor: "pointer",
              padding: "4px 10px",
              fontSize: 13,
              fontWeight: filtroEstado === "TODOS" ? 600 : 400,
            }}
            onClick={() => setFiltroEstado("TODOS")}
          >
            Todos ({citas.length})
          </Tag>
          {LISTA_ESTADOS_HU10.map((estadoItem) => {
            const activo = filtroEstado === estadoItem;
            return (
              <Tag
                key={estadoItem}
                color={ESTADO_COLOR[estadoItem]}
                style={{
                  cursor: "pointer",
                  padding: "4px 10px",
                  fontSize: 13,
                  border: activo ? "2px solid #000" : undefined,
                  fontWeight: activo ? 700 : 500,
                }}
                onClick={() =>
                  setFiltroEstado(activo ? "TODOS" : estadoItem)
                }
              >
                {estadoItem}: <b>{conteoPorEstado[estadoItem] || 0}</b>
              </Tag>
            );
          })}
        </Space>

        {/* Barra visual del ciclo de vida del servicio (HU 10) */}
        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px dashed #f0f0f0",
          }}
        >
          <Steps
            size="small"
            current={3}
            items={FLUJO_SECUENCIAL_ESTADOS.map((etapa) => ({
              title: etapa,
              subTitle: `${conteoPorEstado[etapa] || 0}`,
              status: "process",
            }))}
          />
        </div>
      </Card>

      {/* Barra de Filtros Completa (HU 9: Cliente, Operario, Estado, Fecha) */}
      <Card size="small" style={{ marginBottom: 20 }}>
        <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
          <Space wrap align="center">
            <Input
              placeholder="Buscar cliente, comuna o ID..."
              prefix={<SearchOutlined />}
              value={busquedaText}
              onChange={(e) => setBusquedaText(e.target.value)}
              style={{ width: 220 }}
              allowClear
            />

            {/* Filtro por Cliente (HU 9) */}
            <Select
              value={filtroCliente}
              onChange={(val) => setFiltroCliente(val)}
              style={{ width: 190 }}
              showSearch
              optionFilterProp="children"
            >
              <Option value="TODOS">👤 Todos los Clientes</Option>
              {clientesEnAgenda.map((nombre) => (
                <Option key={nombre} value={nombre}>
                  👤 {nombre}
                </Option>
              ))}
            </Select>

            {/* Filtro por Operario (HU 9) */}
            <Select
              value={filtroOperario}
              onChange={(val) => setFiltroOperario(val)}
              style={{ width: 195 }}
            >
              <Option value="TODOS">👷 Todos los Operarios</Option>
              {MOCK_OPERARIOS.map((op) => (
                <Option key={op.id} value={op.id}>
                  👷 {op.nombre}
                </Option>
              ))}
            </Select>

            {/* Filtro por Estado (HU 9 y HU 10) */}
            <Select
              value={filtroEstado}
              onChange={(val) => setFiltroEstado(val)}
              style={{ width: 175 }}
            >
              <Option value="TODOS">📌 Todos los Estados</Option>
              {LISTA_ESTADOS_HU10.map((est) => (
                <Option key={est} value={est}>
                  <Tag color={ESTADO_COLOR[est]} style={{ marginRight: 4 }}>
                    {est}
                  </Tag>
                </Option>
              ))}
            </Select>

            {modoVista === "TABLA" && (
              <DatePicker
                placeholder="Filtrar por Fecha"
                format="YYYY-MM-DD"
                value={filtroFecha}
                onChange={(val) => setFiltroFecha(val)}
                style={{ width: 155 }}
              />
            )}
          </Space>

          {(busquedaText ||
            filtroCliente !== "TODOS" ||
            filtroOperario !== "TODOS" ||
            filtroEstado !== "TODOS" ||
            filtroFecha) && (
            <Button
              type="link"
              onClick={() => {
                setBusquedaText("");
                setFiltroCliente("TODOS");
                setFiltroOperario("TODOS");
                setFiltroEstado("TODOS");
                setFiltroFecha(null);
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </Space>
      </Card>

      {/* Controles de Navegación de Calendario para vistas DÍA, SEMANA y MES */}
      {modoVista !== "TABLA" && (
        <Card
          size="small"
          style={{
            marginBottom: 16,
            background: "#f0f5ff",
            borderColor: "#adc6ff",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <Space>
              <Button
                icon={<LeftOutlined />}
                onClick={() => navegarPeriodo(-1)}
              />
              <Button onClick={() => setFechaCalendario(dayjs())}>Hoy</Button>
              <Button
                icon={<RightOutlined />}
                onClick={() => navegarPeriodo(1)}
              />
              <DatePicker
                value={fechaCalendario}
                onChange={(val) => val && setFechaCalendario(val)}
                format="YYYY-MM-DD"
                allowClear={false}
              />
            </Space>

            <Title level={4} style={{ margin: 0, color: "#1d39c4" }}>
              {modoVista === "DIA" &&
                `${DIAS_SEMANA_NOMBRES[fechaCalendario.day()]}, ${fechaCalendario.format("DD/MM/YYYY")}`}
              {modoVista === "SEMANA" &&
                `Semana del ${diasSemana[0].format("DD/MM")} al ${diasSemana[6].format("DD/MM/YYYY")}`}
              {modoVista === "MES" &&
                `Mes: ${fechaCalendario.format("YYYY-MM")}`}
            </Title>

            <Space>
              <Tag color="blue">
                Mostrando vista: <b>{modoVista}</b>
              </Tag>
            </Space>
          </div>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 1. VISTA LISTA / TABLA                                                */}
      {/* ===================================================================== */}
      {modoVista === "TABLA" && (
        <Table
          dataSource={citasBaseFiltradas}
          rowKey="id"
          pagination={{ pageSize: 15, showSizeChanger: true }}
          columns={[
            {
              title: "Cita / Fecha",
              key: "idFecha",
              render: (_, r) => (
                <div>
                  <Text strong>{r.id}</Text>
                  <br />
                  <Tag icon={<CalendarOutlined />} style={{ marginTop: 4 }}>
                    {r.fecha}
                  </Tag>
                </div>
              ),
            },
            {
              title: "Cliente y Ubicación",
              key: "cliente",
              render: (_, r) => (
                <div>
                  <Text strong>{r.clienteNombre}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <EnvironmentOutlined /> {r.direccionCliente},{" "}
                    {r.comunaCliente}
                  </Text>
                </div>
              ),
            },
            {
              title: "Operario Asignado (HU 6)",
              key: "operario",
              render: (_, r) => {
                const opActual = MOCK_OPERARIOS.find(
                  (o) => o.id === r.operarioId,
                );
                return (
                  <div>
                    <Select
                      size="small"
                      style={{ width: 175 }}
                      value={r.operarioId || "OP-001"}
                      onChange={(nuevoOpId) =>
                        handleCambiarOperario(r.id, nuevoOpId)
                      }
                    >
                      {MOCK_OPERARIOS.map((op) => (
                        <Option key={op.id} value={op.id}>
                          👷 {op.nombre}
                        </Option>
                      ))}
                    </Select>
                    {opActual && (
                      <div style={{ marginTop: 4 }}>
                        <Tag color="purple" style={{ fontSize: 11 }}>
                          Base: {opActual.comunaBase}
                        </Tag>
                      </div>
                    )}
                  </div>
                );
              },
            },
            {
              title: "Servicios Contratados",
              key: "servicios",
              render: (_, r) => (
                <div>
                  {r.items.map((item) => (
                    <div key={item.servicioId}>
                      <Badge
                        status="processing"
                        text={`${item.nombre} (x${item.cantidad})`}
                      />
                    </div>
                  ))}
                </div>
              ),
            },
            {
              title: "Tiempos y Traslado",
              key: "tiempos",
              render: (_, r) => (
                <div style={{ fontSize: 12 }}>
                  <div>
                    <ClockCircleOutlined /> Servicios:{" "}
                    <b>{r.duracionServiciosMinutos} min</b>
                  </div>
                  <div style={{ color: "#d46b08" }}>
                    <CarOutlined /> Traslado base:{" "}
                    <b>{r.tiempoTrasladoMinutos} min</b>
                  </div>
                  <div style={{ color: "#389e0d", marginTop: 2 }}>
                    <CheckCircleOutlined /> Bloque:{" "}
                    <b>
                      {r.horaInicio} ➔ {r.horaFinEstimada}
                    </b>{" "}
                    ({r.tiempoTotalRequeridoMinutos} min)
                  </div>
                </div>
              ),
            },
            {
              title: "Estado del Servicio (HU 10)",
              key: "estado",
              render: (_, r) => {
                const idxFlujo = FLUJO_SECUENCIAL_ESTADOS.indexOf(r.estado);
                const siguienteEstado =
                  idxFlujo >= 0 &&
                  idxFlujo < FLUJO_SECUENCIAL_ESTADOS.length - 1
                    ? FLUJO_SECUENCIAL_ESTADOS[idxFlujo + 1]
                    : null;

                return (
                  <Space direction="vertical" size={4}>
                    <Select
                      value={r.estado}
                      size="small"
                      style={{ width: 150 }}
                      onChange={(val) =>
                        handleCambiarEstado(r.id, val as Cita["estado"])
                      }
                    >
                      {LISTA_ESTADOS_HU10.map((estadoKey) => (
                        <Option key={estadoKey} value={estadoKey}>
                          <Tag
                            color={ESTADO_COLOR[estadoKey]}
                            style={{ marginRight: 0 }}
                          >
                            {estadoKey}
                          </Tag>
                        </Option>
                      ))}
                    </Select>

                    {siguienteEstado && (
                      <Tooltip title={`Avanzar etapa a: ${siguienteEstado}`}>
                        <Button
                          type="link"
                          size="small"
                          icon={<StepForwardOutlined />}
                          style={{ padding: 0, fontSize: 11, height: "auto" }}
                          onClick={() => handleAvanzarSiguienteEstado(r)}
                        >
                          Pasar a {siguienteEstado}
                        </Button>
                      </Tooltip>
                    )}
                  </Space>
                );
              },
            },
            {
              title: "Acciones",
              key: "acciones",
              render: (_, r) => (
                <Space>
                  <Popconfirm
                    title="¿Eliminar esta cita?"
                    onConfirm={() => handleEliminarCita(r.id)}
                    okText="Sí"
                    cancelText="No"
                  >
                    <Tooltip title="Eliminar cita">
                      <Button type="text" danger icon={<DeleteOutlined />} />
                    </Tooltip>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      )}

      {/* ===================================================================== */}
      {/* 2. VISTA DÍA (HU 9: Agenda detallada por bloques del día)             */}
      {/* ===================================================================== */}
      {modoVista === "DIA" && (
        <Card
          title={
            <Space>
              <ClockCircleOutlined style={{ color: "#1677ff" }} />
              <span>
                Agenda Diaria — {fechaCalendario.format("YYYY-MM-DD")} (
                {citasVistaDia.length} cita(s))
              </span>
            </Space>
          }
        >
          {citasVistaDia.length === 0 ? (
            <Empty description="No hay citas programadas para este día con los filtros seleccionados" />
          ) : (
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
              {citasVistaDia.map((cita) => (
                <Card
                  key={cita.id}
                  size="small"
                  style={{
                    borderLeft: "5px solid #1677ff",
                    background: "#fafafa",
                  }}
                >
                  <Row gutter={[16, 8]} align="middle">
                    <Col xs={24} md={5}>
                      <Tag
                        color="blue"
                        icon={<ClockCircleOutlined />}
                        style={{ fontSize: 14, padding: "4px 10px" }}
                      >
                        {cita.horaInicio} ➔ {cita.horaFinEstimada}
                      </Tag>
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          ID: {cita.id} ({cita.tiempoTotalRequeridoMinutos} min)
                        </Text>
                      </div>
                    </Col>

                    <Col xs={24} md={6}>
                      <Text strong style={{ fontSize: 15 }}>
                        👤 {cita.clienteNombre}
                      </Text>
                      <div style={{ fontSize: 12, color: "#595959" }}>
                        <EnvironmentOutlined /> {cita.direccionCliente},{" "}
                        <b>{cita.comunaCliente}</b>
                      </div>
                    </Col>

                    <Col xs={24} md={5}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Servicios:
                      </Text>
                      <div>
                        {cita.items.map((it) => (
                          <Tag key={it.servicioId} color="geekblue">
                            {it.nombre} (x{it.cantidad})
                          </Tag>
                        ))}
                      </div>
                    </Col>

                    <Col xs={12} md={4}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Operario:
                      </Text>
                      <div>
                        <Tag color="purple" icon={<UserOutlined />}>
                          {obtenerNombreOperario(cita.operarioId)}
                        </Tag>
                      </div>
                    </Col>

                    <Col xs={12} md={4} style={{ textAlign: "right" }}>
                      <Select
                        size="small"
                        value={cita.estado}
                        style={{ width: 145 }}
                        onChange={(val) =>
                          handleCambiarEstado(cita.id, val as Cita["estado"])
                        }
                      >
                        {LISTA_ESTADOS_HU10.map((estadoKey) => (
                          <Option key={estadoKey} value={estadoKey}>
                            <Tag
                              color={ESTADO_COLOR[estadoKey]}
                              style={{ marginRight: 0 }}
                            >
                              {estadoKey}
                            </Tag>
                          </Option>
                        ))}
                      </Select>
                    </Col>
                  </Row>
                </Card>
              ))}
            </Space>
          )}
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 3. VISTA SEMANA (HU 9: Tablero de 7 columnas Lunes a Domingo)         */}
      {/* ===================================================================== */}
      {modoVista === "SEMANA" && (
        <Row gutter={[12, 12]}>
          {diasSemana.map((dia) => {
            const fechaDiaStr = dia.format("YYYY-MM-DD");
            const esHoy = fechaDiaStr === dayjs().format("YYYY-MM-DD");
            const citasDelDia = [...citasBaseFiltradas]
              .filter((c) => c.fecha === fechaDiaStr)
              .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

            return (
              <Col xs={24} sm={12} md={8} lg={6} key={fechaDiaStr}>
                <Card
                  size="small"
                  title={
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          color: esHoy ? "#1677ff" : "inherit",
                          fontWeight: 600,
                        }}
                      >
                        {DIAS_SEMANA_NOMBRES[dia.day()]} {dia.format("DD/MM")}
                      </span>
                      <Badge
                        count={citasDelDia.length}
                        style={{
                          backgroundColor:
                            citasDelDia.length > 0 ? "#1677ff" : "#d9d9d9",
                        }}
                      />
                    </div>
                  }
                  style={{
                    height: "100%",
                    borderColor: esHoy ? "#1677ff" : "#f0f0f0",
                    borderWidth: esHoy ? 2 : 1,
                  }}
                >
                  {citasDelDia.length === 0 ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Sin citas agendadas
                    </Text>
                  ) : (
                    <Space
                      direction="vertical"
                      style={{ width: "100%" }}
                      size="small"
                    >
                      {citasDelDia.map((cita) => (
                        <Card
                          key={cita.id}
                          size="small"
                          hoverable
                          onClick={() => {
                            setFechaCalendario(dia);
                            setModoVista("DIA");
                          }}
                          style={{
                            background: "#f9f9f9",
                            borderLeft: "3px solid #1677ff",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 4,
                            }}
                          >
                            <Tag color="blue" style={{ margin: 0 }}>
                              {cita.horaInicio} - {cita.horaFinEstimada}
                            </Tag>
                            <Tag
                              color={ESTADO_COLOR[cita.estado]}
                              style={{ margin: 0, fontSize: 11 }}
                            >
                              {cita.estado}
                            </Tag>
                          </div>
                          <div>
                            <Text strong style={{ fontSize: 13 }}>
                              👤 {cita.clienteNombre}
                            </Text>
                          </div>
                          <div style={{ fontSize: 11, color: "#595959" }}>
                            📍 {cita.comunaCliente} —{" "}
                            {cita.items.map((i) => i.nombre).join(", ")}
                          </div>
                          <div style={{ marginTop: 4 }}>
                            <Tag
                              color="purple"
                              style={{ fontSize: 11, margin: 0 }}
                            >
                              👷 {obtenerNombreOperario(cita.operarioId)}
                            </Tag>
                          </div>
                        </Card>
                      ))}
                    </Space>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* ===================================================================== */}
      {/* 4. VISTA MES (HU 9: Calendario Mensual Interactivo)                   */}
      {/* ===================================================================== */}
      {modoVista === "MES" && (
        <Card size="small">
          <Calendar
            value={fechaCalendario}
            onChange={(val) => setFechaCalendario(val)}
            onSelect={(val, info) => {
              setFechaCalendario(val);
              if (info.source === "date") {
                setModoVista("DIA");
              }
            }}
            cellRender={(current, info) => {
              if (info.type !== "date") return info.originNode;
              const fechaStr = current.format("YYYY-MM-DD");
              const citasDia = citasBaseFiltradas.filter(
                (c) => c.fecha === fechaStr,
              );
              if (citasDia.length === 0) return null;

              return (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {citasDia.map((cita) => (
                    <li key={cita.id} style={{ marginBottom: 4 }}>
                      <Badge
                        status={
                          (ESTADO_COLOR[cita.estado] as any) || "processing"
                        }
                        text={
                          <span style={{ fontSize: 11 }}>
                            <b>{cita.horaInicio}</b> {cita.clienteNombre} [
                            {cita.estado}]
                          </span>
                        }
                      />
                    </li>
                  ))}
                </ul>
              );
            }}
          />
        </Card>
      )}

      {/* Modal para Reprogramar Fecha/Hora cuando se selecciona el estado "Reprogramado" (HU 10) */}
      <Modal
        title={`Reprogramar Servicio — ${citaAReprogramar?.clienteNombre || ""}`}
        open={!!citaAReprogramar}
        onOk={confirmarReprogramacion}
        onCancel={() => setCitaAReprogramar(null)}
        okText="Guardar Reprogramación"
        cancelText="Mantener horario actual"
      >
        {citaAReprogramar && (
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Text type="secondary">
              Has cambiado el estado de <b>{citaAReprogramar.id}</b> a{" "}
              <Tag color="orange">Reprogramado</Tag>. Selecciona la nueva fecha
              y hora acordada con el cliente:
            </Text>
            <div>
              <Text strong style={{ display: "block", marginBottom: 4 }}>
                Nueva Fecha:
              </Text>
              <DatePicker
                value={nuevaFechaReprog}
                onChange={(val) => val && setNuevaFechaReprog(val)}
                format="YYYY-MM-DD"
                style={{ width: "100%" }}
                allowClear={false}
              />
            </div>
            <div>
              <Text strong style={{ display: "block", marginBottom: 4 }}>
                Nueva Hora de Inicio:
              </Text>
              <TimePicker
                value={nuevaHoraReprog}
                onChange={(val) => val && setNuevaHoraReprog(val)}
                format="HH:mm"
                minuteStep={15}
                style={{ width: "100%" }}
                allowClear={false}
              />
            </div>
          </Space>
        )}
      </Modal>

      {/* Modal Programación Inteligente */}
      <ModalProgramacionInteligente
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onSave={handleGuardarCita}
        clientes={clientes}
        serviciosDisponibles={serviciosDisponibles}
        citasExistentes={citas}
      />

      {/* Panel Lateral de Sugerencias IA */}
      <Drawer
        title="Sugerencias de Optimización IA"
        placement="right"
        width={420}
        onClose={() => setDrawerIAVisible(false)}
        open={drawerIAVisible}
        styles={{ body: { padding: 0 } }}
      >
        <PanelSugerenciasIA citas={citas} onCitasChange={setCitas} />
      </Drawer>
    </div>
  );
};
