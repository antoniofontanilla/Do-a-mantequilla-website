import React, { useState, useMemo } from "react";
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
} from "antd";
import {
  ClockCircleOutlined,
  CarOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { Cliente } from "../types/cliente";
import { ServicioCatalogo, ItemServicioSeleccionado } from "../types/servicio";
import { Cita } from "../types/cita";

const { Option } = Select;
const { Text, Title } = Typography;

interface ModalProgramacionInteligenteProps {
  visible: boolean;
  onCancel: () => void;
  onSave: (nuevaCita: Partial<Cita>) => void;
  clientes: Cliente[];
  serviciosDisponibles: ServicioCatalogo[];
}

export const ModalProgramacionInteligente: React.FC<
  ModalProgramacionInteligenteProps
> = ({ visible, onCancel, onSave, clientes, serviciosDisponibles }) => {
  const [form] = Form.useForm();

  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<Cliente | null>(null);
  const [itemsAgregados, setItemsAgregados] = useState<
    ItemServicioSeleccionado[]
  >([]);
  const [servicioActualId, setServicioActualId] = useState<string | null>(null);
  const [cantidadActual, setCantidadActual] = useState<number>(1);
  const [fechaHoraInicio, setFechaHoraInicio] = useState<Dayjs | null>(
    dayjs().add(1, "day").hour(9).minute(0),
  );

  // 1. Manejo del cambio de cliente
  const handleClienteChange = (clienteId: string) => {
    const cliente = clientes.find((c) => c.id === clienteId) || null;
    setClienteSeleccionado(cliente);
  };

  // 2. Agregar servicio a la lista de la cita
  const handleAgregarServicio = () => {
    if (!servicioActualId) return;
    const servicioObj = serviciosDisponibles.find(
      (s) => s.id === servicioActualId,
    );
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
  const tiempoTrasladoMinutos = clienteSeleccionado?.tiempoTrasladoMinutos ?? 0;
  const distanciaKm = clienteSeleccionado?.distanciaKm ?? 0;

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
        observacionesGenerales: values.observacionesGenerales,
      };

      onSave(nuevaCita);
      form.resetFields();
      setClienteSeleccionado(null);
      setItemsAgregados([]);
    });
  };

  return (
    <Modal
      title={
        <Space>
          <ClockCircleOutlined style={{ color: "#1890ff" }} />
          <span>Programación Inteligente de Cita</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleFinalizar}
      okText="Confirmar y Agendar"
      cancelText="Cancelar"
      width={800}
      okButtonProps={{
        disabled: !clienteSeleccionado || itemsAgregados.length === 0,
      }}
    >
      <Form form={form} layout="vertical">
        {/* Paso 1: Selección de Cliente */}
        <Card
          size="small"
          title="1. Selección de Cliente"
          style={{ marginBottom: 16 }}
        >
          <Form.Item
            name="clienteId"
            label="Cliente"
            rules={[{ required: true, message: "Seleccione un cliente" }]}
          >
            <Select
              showSearch
              placeholder="Buscar cliente por nombre o comuna..."
              optionFilterProp="children"
              onChange={handleClienteChange}
            >
              {clientes.map((c) => (
                <Option key={c.id} value={c.id}>
                  {c.nombreCompleto} — {c.comuna} ({c.direccion})
                </Option>
              ))}
            </Select>
          </Form.Item>

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
              {serviciosDisponibles
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

        {/* Paso 3: Resumen Inteligente de Tiempos y Agendamiento */}
        <Card size="small" title="3. Bloque Horario y Cálculo Inteligente">
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <div style={{ display: "flex", gap: 12 }}>
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
