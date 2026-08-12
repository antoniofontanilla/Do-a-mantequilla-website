import React, { useState } from "react";
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
  Tooltip,
  Popconfirm,
  Badge,
  Row,
  Col,
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
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { Cita } from "../types/cita";
import { Cliente } from "../types/cliente";
import { ServicioCatalogo } from "../types/servicio";
import { ModalProgramacionInteligente } from "./ModalProgramacionInteligente";

const { Title, Text } = Typography;
const { Option } = Select;

// Colores según el estado de la cita
const ESTADO_COLOR: Record<string, string> = {
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

// Datos iniciales de prueba (Mocks corregidos con CategoriaServicio válida y campo 'nombre')
const CITAS_INICIALES: Cita[] = [
  {
    id: "CITA-001",
    clienteId: "CLI-001",
    clienteNombre: "Juan Pérez",
    direccionCliente: "Av. El Tranque 1234",
    comunaCliente: "Lo Barnechea",
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
    observacionesGenerales: "Casa de 2 pisos, portón blanco.",
  },
  {
    id: "CITA-002",
    clienteId: "CLI-002",
    clienteNombre: "María González",
    direccionCliente: "Avenida Las Condes 9876",
    comunaCliente: "Las Condes",
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

  // Filtros de búsqueda
  const [busquedaText, setBusquedaText] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [filtroFecha, setFiltroFecha] = useState<Dayjs | null>(null);

  // Guardar nueva cita generada desde el modal
  const handleGuardarCita = (nuevaCitaData: Partial<Cita>) => {
    const nuevaCita: Cita = {
      ...nuevaCitaData,
      id: `CITA-${(citas.length + 1).toString().padStart(3, "0")}`,
    } as Cita;

    setCitas([nuevaCita, ...citas]);
    setModalVisible(false);
  };

  // Cambio rápido de estado desde la tabla
  const handleCambiarEstado = (citaId: string, nuevoEstado: Cita["estado"]) => {
    setCitas(
      citas.map((c) => (c.id === citaId ? { ...c, estado: nuevoEstado } : c)),
    );
  };

  // Eliminar cita
  const handleEliminarCita = (citaId: string) => {
    setCitas(citas.filter((c) => c.id !== citaId));
  };

  // Filtrado dinámico
  const citasFiltradas = citas.filter((cita) => {
    const coincideTexto =
      cita.clienteNombre.toLowerCase().includes(busquedaText.toLowerCase()) ||
      cita.comunaCliente.toLowerCase().includes(busquedaText.toLowerCase()) ||
      cita.id.toLowerCase().includes(busquedaText.toLowerCase());

    const coincideEstado =
      filtroEstado === "TODOS" || cita.estado === filtroEstado;

    const coincideFecha =
      !filtroFecha || cita.fecha === filtroFecha.format("YYYY-MM-DD");

    return coincideTexto && coincideEstado && coincideFecha;
  });

  return (
    <div style={{ padding: "24px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Encabezado Principal */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Gestión de Citas y Agendamiento
          </Title>
          <Text type="secondary">
            Programación inteligente de servicios con cálculo dinámico de
            tiempos de traslado
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => setModalVisible(true)}
        >
          Nueva Cita Inteligente
        </Button>
      </div>

      {/* Métricas / Dashboard Resumen */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card size="small">
            <Text type="secondary">Total Citas</Text>
            <Title level={3} style={{ margin: 0 }}>
              {citas.length}
            </Title>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Text type="secondary">Programadas / Confirmadas</Text>
            <Title level={3} style={{ margin: 0, color: "#1890ff" }}>
              {
                citas.filter(
                  (c) => c.estado === "Programado" || c.estado === "Confirmado",
                ).length
              }
            </Title>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Text type="secondary">En Ruta / En Servicio</Text>
            <Title level={3} style={{ margin: 0, color: "#722ed1" }}>
              {
                citas.filter(
                  (c) => c.estado === "En Ruta" || c.estado === "En Servicio",
                ).length
              }
            </Title>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Text type="secondary">Finalizadas</Text>
            <Title level={3} style={{ margin: 0, color: "#52c41a" }}>
              {citas.filter((c) => c.estado === "Finalizado").length}
            </Title>
          </Card>
        </Col>
      </Row>

      {/* Barra de Filtros */}
      <Card size="small" style={{ marginBottom: 20 }}>
        <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
          <Space wrap align="center">
            <Input
              placeholder="Buscar por cliente, comuna o ID..."
              prefix={<SearchOutlined />}
              value={busquedaText}
              onChange={(e) => setBusquedaText(e.target.value)}
              style={{ width: 260 }}
              allowClear
            />

            <Select
              value={filtroEstado}
              onChange={(val) => setFiltroEstado(val)}
              style={{ width: 170 }}
            >
              <Option value="TODOS">Todos los Estados</Option>
              <Option value="Cotización">Cotización</Option>
              <Option value="Pendiente">Pendiente</Option>
              <Option value="Confirmado">Confirmado</Option>
              <Option value="Programado">Programado</Option>
              <Option value="En Ruta">En Ruta</Option>
              <Option value="En Servicio">En Servicio</Option>
              <Option value="Finalizado">Finalizado</Option>
              <Option value="Cancelado">Cancelado</Option>
            </Select>

            <DatePicker
              placeholder="Filtrar por Fecha"
              format="YYYY-MM-DD"
              value={filtroFecha}
              onChange={(val) => setFiltroFecha(val)}
              style={{ width: 160 }}
            />
          </Space>

          {(busquedaText || filtroEstado !== "TODOS" || filtroFecha) && (
            <Button
              type="link"
              onClick={() => {
                setBusquedaText("");
                setFiltroEstado("TODOS");
                setFiltroFecha(null);
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </Space>
      </Card>

      {/* Tabla Principal de Citas */}
      <Table
        dataSource={citasFiltradas}
        rowKey="id"
        pagination={{ pageSize: 8 }}
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
            title: "Estado",
            key: "estado",
            render: (_, r) => (
              <Select
                value={r.estado}
                size="small"
                style={{ width: 130 }}
                onChange={(val) =>
                  handleCambiarEstado(r.id, val as Cita["estado"])
                }
              >
                {Object.keys(ESTADO_COLOR).map((estadoKey) => (
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
            ),
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

      {/* Modal Programación Inteligente */}
      <ModalProgramacionInteligente
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onSave={handleGuardarCita}
        clientes={clientes}
        serviciosDisponibles={serviciosDisponibles}
      />
    </div>
  );
};
