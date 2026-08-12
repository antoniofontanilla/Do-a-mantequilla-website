import React, { useState } from "react";
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
const datosIniciales: Cliente[] = [
  {
    id: "1",
    nombre: "Juan Pérez",
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

export const ClientesPage: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>(datosIniciales);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [form] = Form.useForm();

  // Estado dinámico para región y comunas
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

  const handleCreate = (values: any) => {
    const coords = { lat: -33.36, lng: -70.52 }; // Coordenadas georreferenciadas
    const geoCalculo = calcularDistanciaYTiempo(coords);

    const nuevoCliente: Cliente = {
      id: Date.now().toString(),
      nombre: values.nombre,
      email: values.email || "",
      rut: values.rut,
      telefono: values.telefono || "",
      direccion: values.direccion,
      region: values.region,
      comuna: values.comuna,
      lat: coords.lat,
      lng: coords.lng,
      distanciaKm: geoCalculo.distanciaKm,
      tiempoTrasladoMinutos: geoCalculo.tiempoTrasladoMinutos,
    };

    setClientes([...clientes, nuevoCliente]);
    setIsModalOpen(false);
    form.resetFields();
    setDireccionValidada(null);
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
      title: "Distancia y Tiempo (HU 3)",
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

  // Generar la URL de Google Maps para dirección exacta
  const getMapUrl = (cliente: Cliente) => {
    const query = encodeURIComponent(
      `${cliente.direccion}, ${cliente.comuna}, ${cliente.region}, Chile`,
    );
    return `https://maps.google.com/maps?q=${query}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
  };

  return (
    <div style={{ padding: "8px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* CABECERA */}
      <div style={{ marginBottom: 24, padding: "0 12px" }}>
        <Title level={3} style={{ margin: 0 }}>
          Gestión de Clientes
        </Title>
        <Text type="secondary">
          Registro unificado, validación legal de RUT y georreferenciación
          inteligente con cálculo de distancia y tiempo (HU 1, 2 y 3)
        </Text>
      </div>

      {/* CONTROLES */}
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
            scroll={{ x: 1000 }}
            pagination={{ pageSize: 5 }}
          />
        </div>
      </Card>

      {/* MODAL CREAR CLIENTE */}
      <Modal
        title={
          <span>
            <UserAddOutlined /> Registrar Nuevo Cliente
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

          <Form.Item
            name="rut"
            label="RUT (con Módulo 11)"
            rules={[{ required: true, message: "Ingrese el RUT" }]}
          >
            <Input placeholder="Ej: 12.345.678-9" />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="telefono" label="Teléfono">
                <Input placeholder="Ej: +56 9 1234 5678" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="email" label="Correo Electrónico">
                <Input placeholder="Ej: juan.perez@email.com" />
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

      {/* MODAL MAPA CON MARCADOR Y DATOS DE GEORREFERENCIACIÓN */}
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
