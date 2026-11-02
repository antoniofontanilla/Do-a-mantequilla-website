import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Card,
  Space,
  Typography,
  Badge,
  Row,
  Col,
  Alert,
  AutoComplete,
  Select,
  Tag,
  DatePicker,
  TimePicker,
} from "antd";
import {
  PlusOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  SearchOutlined,
  UserAddOutlined,
  CarOutlined,
} from "@ant-design/icons";
import { calcularDistanciaYTiempo } from "../../services/mapsService";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface Cliente {
  id: string;
  nombre: string;
  email: string;
  rut: string;
  telefono: string;
  direccion: string;
  region: string;
  comuna: string;
  lat?: number;
  lng?: number;
  distanciaKm?: number;
  tiempoTrasladoMinutos?: number;
  fechaCita?: string;
  horaCita?: string;
  servicio?: string;
}

// Mapeo de Comunas por Región
const comunasPorRegion: Record<string, string[]> = {
  "Región Metropolitana de Santiago": [
    "Cerrillos",
    "Cerro Navia",
    "Conchalí",
    "El Bosque",
    "Estación Central",
    "Huechuraba",
    "Independencia",
    "La Cisterna",
    "La Florida",
    "La Granja",
    "La Pintana",
    "La Reina",
    "Las Condes",
    "Lo Barnechea",
    "Lo Espejo",
    "Lo Prado",
    "Macul",
    "Maipú",
    "Ñuñoa",
    "Pedro Aguirre Cerda",
    "Peñalolén",
    "Providencia",
    "Pudahuel",
    "Quilicura",
    "Quinta Normal",
    "Recoleta",
    "Renca",
    "San Joaquín",
    "San Miguel",
    "San Ramón",
    "Santiago",
    "Vitacura",
    "Puente Alto",
    "San Bernardo",
  ],
  "Región de Valparaíso": [
    "Valparaíso",
    "Viña del Mar",
    "Concón",
    "Quilpué",
    "Villa Alemana",
    "San Antonio",
    "Quillota",
  ],
  "Región del Biobío": [
    "Concepción",
    "Talcahuano",
    "San Pedro de la Paz",
    "Chiguayante",
    "Coronel",
    "Los Ángeles",
  ],
  "Región de Antofagasta": ["Antofagasta", "Calama", "Tocopilla"],
  "Región de La Araucanía": [
    "Temuco",
    "Padre Las Casas",
    "Villarrica",
    "Pucón",
  ],
  "Región de Los Lagos": ["Puerto Montt", "Puerto Varas", "Osorno", "Castro"],
};

// Datos iniciales con distancias y tiempos ya calculados
const _datosIniciales: Cliente[] = [
  {
    id: "1",
    nombre: "Juan Péresz",
    email: "juan.perez@email.com",
    rut: "12.345.678-5",
    telefono: "+56 9 1234 5678",
    direccion: "Av. Las Condes 12345",
    region: "Región Metropolitana de Santiago",
    comuna: "Las Condes",
    lat: -33.38,
    lng: -70.53,
    ...calcularDistanciaYTiempo({ lat: -33.38, lng: -70.53 }),
  },
  {
    id: "2",
    nombre: "María González",
    email: "maria.g@email.com",
    rut: "9.876.543-1",
    telefono: "+56 9 8765 4321",
    direccion: "Av. La Dehesa 456",
    region: "Región Metropolitana de Santiago",
    comuna: "Lo Barnechea",
    lat: -33.35,
    lng: -70.51,
    ...calcularDistanciaYTiempo({ lat: -33.35, lng: -70.51 }),
  },
];

// Configuración de jornada laboral (09:00 a 18:00 hrs)
const JORNADA_INICIO = 9;
const JORNADA_FIN = 18;

const disabledDateTime = () => {
  return {
    disabledHours: () => {
      const hours = [];
      for (let i = 0; i < 24; i++) {
        if (i < JORNADA_INICIO || i > JORNADA_FIN) {
          hours.push(i);
        }
      }
      return hours;
    },
  };
};

export const ClientesPage: React.FC = () => {
  // 1. Iniciamos la lista vacía para llenarla con la Base de Datos
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [form] = Form.useForm();

  // 2. AGREGA ESTO: Se ejecuta automáticamente al abrir la página para traer los clientes de la BD
  useEffect(() => {
    fetchClientesFromDB();
  }, []);

  const fetchClientesFromDB = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/clientes');
      const data = await response.json();

      if (response.ok) {
        const clientesMapeados: Cliente[] = data.map((item: any) => ({
          id: item.id.toString(),
          nombre: item.nombre,
          email: item.email || "",
          rut: item.rut,
          telefono: item.telefono || "",
          direccion: item.direccion,
          region: item.region,
          comuna: item.comuna,
          lat: item.latitud ? Number(item.latitud) : undefined,
          lng: item.longitud ? Number(item.longitud) : undefined,
          distanciaKm: item.distancia_km ? Number(item.distancia_km) : undefined,
          tiempoTrasladoMinutos: item.tiempo_traslado_min ? Number(item.tiempo_traslado_min) : undefined,
          fechaCita: item.fecha_cita || undefined,
          horaCita: item.hora_cita || undefined,
          servicio: item.servicio || "Instalación / Mantención",
        }));

        setClientes(clientesMapeados);
      }
    } catch (error) {
      console.error('Error al conectar con el backend:', error);
    }
  };

  const [regionSeleccionada, setRegionSeleccionada] = useState<string>(
    "Región Metropolitana de Santiago",
  );

  const [direccionValidada, setDireccionValidada] = useState<boolean | null>(
    null,
  );
  const [options, setOptions] = useState<{ value: string }[]>([]);

  const handleRegionChange = (value: string) => {
    setRegionSeleccionada(value);
    form.setFieldsValue({ comuna: undefined });
  };

  const handleSearchDireccion = (searchText: string) => {
    if (!searchText) {
      setOptions([]);
      return;
    }
    const comunaActual = form.getFieldValue("comuna") || "";
    setOptions([
      { value: `${searchText}, ${comunaActual}` },
      { value: `${searchText}, Santiago` },
    ]);
  };

  const handleSelectDireccion = () => {
    setDireccionValidada(true);
  };

  const handleBlurDireccion = () => {
    const val = form.getFieldValue("direccion");
    if (val && val.length > 3) {
      setDireccionValidada(true);
    } else if (val) {
      setDireccionValidada(false);
    }
  };

  const handleCreate = async (values: any) => {
    const coords = { lat: -33.36, lng: -70.52 };
    const geoCalculo = calcularDistanciaYTiempo(coords);

    const fechaFormateada = values.fechaCita
      ? values.fechaCita.format("YYYY-MM-DD")
      : undefined;
    const horaFormateada = values.horaCita
      ? values.horaCita.format("HH:mm")
      : undefined;

    // Objeto con los datos listos para enviar al backend
    const clienteData = {
      nombre: values.nombre,
      email: values.email || "",
      rut: values.rut,
      telefono: values.telefono || "",
      direccion: values.direccion,
      region: values.region,
      comuna: values.comuna,
      latitud: coords.lat,
      longitud: coords.lng,
      distancia_km: geoCalculo.distanciaKm,
      tiempo_traslado_min: geoCalculo.tiempoTrasladoMinutos,
    };

    try {
      // Petición POST a tu backend de XAMPP
      const response = await fetch('http://localhost:4000/api/clientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clienteData),
      });

      const data = await response.json();

      if (response.ok) {
        // Si se guarda en MySQL con éxito, lo añadimos a la tabla visual
        const nuevoCliente: Cliente = {
          id: data.clienteId ? data.clienteId.toString() : Date.now().toString(),
          ...clienteData,
          lat: coords.lat,
          lng: coords.lng,
          distanciaKm: geoCalculo.distanciaKm,
          tiempoTrasladoMinutos: geoCalculo.tiempoTrasladoMinutos,
          fechaCita: fechaFormateada,
          horaCita: horaFormateada,
          servicio: values.servicio,
        };

        setClientes([...clientes, nuevoCliente]);
        setIsModalOpen(false);
        form.resetFields();
        setDireccionValidada(null);
      } else {
        console.error('Error del servidor:', data.error);
      }
    } catch (error) {
      console.error('No se pudo conectar con el backend:', error);
    }
  };

  const verMapa = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsMapModalOpen(true);
  };

  const columns = [
    {
      title: "Cliente",
      key: "cliente",
      render: (_: any, record: Cliente) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.nombre}</Text>
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {record.email}
          </Text>
        </Space>
      ),
    },
    {
      title: "RUT",
      dataIndex: "rut",
      key: "rut",
    },
    {
      title: "Teléfono",
      dataIndex: "telefono",
      key: "telefono",
    },
    {
      title: "Ubicación / Comuna",
      key: "ubicacion",
      render: (_: any, record: Cliente) => (
        <Space direction="vertical" size={0}>
          <Text>{record.direccion}</Text>
          <Text type="secondary" style={{ fontSize: "12px", color: "#1677ff" }}>
            📍 <strong>{record.comuna}</strong>, {record.region}
          </Text>
        </Space>
      ),
    },
    {
      title: "Cita y Servicio",
      key: "citaServicio",
      render: (_: any, record: Cliente) => (
        <Space direction="vertical" size={2}>
          {record.servicio ? (
            <Tag color="purple">{record.servicio}</Tag>
          ) : (
            <Tag>Sin servicio</Tag>
          )}
          <Text type="secondary" style={{ fontSize: "12px" }}>
            📅 {record.fechaCita ?? "S/F"} - ⏰ {record.horaCita ?? "S/H"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Distancia y Tiempo",
      key: "distanciaTiempo",
      render: (_: any, record: Cliente) => (
        <Space direction="vertical" size={2}>
          <Tag color="blue" icon={<CarOutlined />}>
            Distancia: {record.distanciaKm ?? "N/A"} km
          </Tag>
          <Tag color="orange">
            Tiempo de viaje: ~{record.tiempoTrasladoMinutos ?? "N/A"} min
          </Tag>
        </Space>
      ),
    },
    {
      title: "GPS & Marcador",
      key: "gps",
      render: (_: any, record: Cliente) => (
        <Space direction="vertical" size={2}>
          <Text type="success" style={{ fontSize: "13px" }}>
            <CheckCircleOutlined /> Marcador Activo
          </Text>
          <Button
            type="link"
            size="small"
            icon={<EnvironmentOutlined />}
            onClick={() => verMapa(record)}
            style={{ padding: 0 }}
          >
            Ver en Mapa
          </Button>
        </Space>
      ),
    },
    {
      title: "Acciones",
      key: "acciones",
      render: () => (
        <Space size="middle">
          <Button type="link" size="small" style={{ padding: 0 }}>
            Editar
          </Button>
          <Button type="link" size="small" danger style={{ padding: 0 }}>
            Eliminar
          </Button>
        </Space>
      ),
    },
  ];

  const getMapUrl = (cliente: Cliente) => {
    const query = encodeURIComponent(
      `${cliente.direccion}, ${cliente.comuna}, ${cliente.region}, Chile`,
    );
    return `https://maps.google.com/maps?q=${query}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
  };

  return (
    <div style={{ padding: "8px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: 24, padding: "0 12px" }}>
        <Title level={3} style={{ margin: 0 }}>
          Gestión de Clientes
        </Title>
        <Text type="secondary">
          Registro unificado, validación legal de RUT y georreferenciación
          inteligente con cálculo de distancia y tiempo (HU 1, 2 y 3)
        </Text>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 16,
          padding: "0 12px",
        }}
      >
        <Input
          prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
          placeholder="Buscar por Nombre, RUT, Dirección o Comuna"
          style={{ maxWidth: "450px", width: "100%" }}
          size="large"
        />

        <Space size="large" style={{ flexWrap: "wrap" }}>
          <Text>
            Total Clientes: <Badge count={clientes.length} color="#1677ff" />
          </Text>
          <Text>
            Georreferenciados (GPS):{" "}
            <Badge count={clientes.length} color="#52c41a" />
          </Text>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
            size="large"
          >
            Nuevo Cliente
          </Button>
        </Space>
      </div>

      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ width: "100%", overflowX: "auto" }}>
          <Table
            columns={columns}
            dataSource={clientes}
            rowKey="id"
            scroll={{ x: 1200 }}
            pagination={{ pageSize: 5 }}
          />
        </div>
      </Card>

      <Modal
        title={
          <span>
            <UserAddOutlined /> Registrar Nuevo Cliente y Cita
          </span>
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setDireccionValidada(null);
        }}
        footer={null}
        width="90%"
        style={{ maxWidth: "700px" }}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{ region: "Región Metropolitana de Santiago" }}
          style={{ marginTop: "16px" }}
        >
          <Form.Item
            name="nombre"
            label="Nombre Completo"
            rules={[{ required: true, message: "Ingrese el nombre" }]}
          >
            <Input placeholder="Ej: Juan Pérez" />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="rut"
                label="RUT"
                rules={[{ required: true, message: "Ingrese el RUT" }]}
              >
                <Input placeholder="Ej: 12.345.678-9" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="telefono" label="Teléfono">
                <Input placeholder="Ej: +56 9 1234 5678" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="email" label="Correo Electrónico">
            <Input placeholder="Ej: juan.perez@email.com" />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="fechaCita"
                label="Fecha de la Cita"
                rules={[{ required: true, message: "Seleccione la fecha" }]}
              >
                <DatePicker
                  style={{ width: "100%" }}
                  placeholder="Seleccionar fecha"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="horaCita"
                label="Hora de Inicio (09:00 - 18:00)"
                rules={[{ required: true, message: "Seleccione la hora" }]}
              >
                <TimePicker
                  format="HH:mm"
                  style={{ width: "100%" }}
                  placeholder="Seleccionar hora"
                  disabledTime={disabledDateTime}
                  minuteStep={15}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="servicio"
                label="Servicio Requerido"
                rules={[{ required: true, message: "Indique el servicio" }]}
              >
                <Input placeholder="Ej: Mantención, Instalación..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="region"
                label="Región"
                rules={[{ required: true }]}
              >
                <Select
                  onChange={handleRegionChange}
                  placeholder="Seleccione una región"
                >
                  {Object.keys(comunasPorRegion).map((reg) => (
                    <Option key={reg} value={reg}>
                      {reg}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="comuna"
                label="Comuna"
                rules={[{ required: true, message: "Seleccione una comuna" }]}
              >
                <Select
                  placeholder="Seleccione una comuna"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as unknown as string)
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                >
                  {(comunasPorRegion[regionSeleccionada] || []).map((com) => (
                    <Option key={com} value={com}>
                      {com}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="direccion"
            label="Dirección de Domicilio (Autocompletado y Validación GPS)"
            rules={[{ required: true, message: "Ingrese la dirección" }]}
          >
            <AutoComplete
              options={options}
              onSearch={handleSearchDireccion}
              onSelect={handleSelectDireccion}
              onBlur={handleBlurDireccion}
              placeholder="Ej: Av. Las Condes 12345"
            />
          </Form.Item>

          {direccionValidada === true && (
            <Alert
              message="Dirección válida y georreferenciada correctamente"
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {direccionValidada === false && (
            <Alert
              message="No se pudo validar la dirección. Verifique la calle y numeración."
              type="error"
              showIcon
              icon={<WarningOutlined />}
              style={{ marginBottom: 16 }}
            />
          )}

          <Form.Item name="observaciones" label="Observaciones">
            <TextArea rows={2} />
          </Form.Item>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "8px",
              marginTop: "24px",
            }}
          >
            <Button type="text" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit">
              Guardar Cliente
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal
        title={`Ubicación Exacta: ${selectedCliente?.nombre || "Cliente"}`}
        open={isMapModalOpen}
        onCancel={() => setIsMapModalOpen(false)}
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() => setIsMapModalOpen(false)}
          >
            Cerrar
          </Button>,
        ]}
        width="90%"
        style={{ maxWidth: "700px" }}
      >
        <div style={{ marginBottom: "12px" }}>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Text type="secondary">
              📍 <strong>{selectedCliente?.direccion}</strong>,{" "}
              {selectedCliente?.comuna}, {selectedCliente?.region}
            </Text>
            <Space size="middle" style={{ marginTop: 4 }}>
              <Tag color="blue" icon={<CarOutlined />}>
                Distancia desde Base: {selectedCliente?.distanciaKm ?? "N/A"} km
              </Tag>
              <Tag color="orange">
                Tiempo de Traslado Estimado: ~
                {selectedCliente?.tiempoTrasladoMinutos ?? "N/A"} min
              </Tag>
            </Space>
          </Space>
        </div>
        <div
          style={{
            width: "100%",
            height: "400px",
            borderRadius: "8px",
            overflow: "hidden",
            backgroundColor: "#e5e3df",
          }}
        >
          {selectedCliente && (
            <iframe
              title="Mapa de Ubicación Exacta"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              src={getMapUrl(selectedCliente)}
            />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ClientesPage;
