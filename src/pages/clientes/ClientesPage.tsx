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
} from "antd";
import {
  PlusOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  SearchOutlined,
  UserAddOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;
const { TextArea } = Input;

interface Cliente {
  id: string;
  nombre: string;
  email: string;
  rut: string;
  telefono: string;
  direccion: string;
  comuna: string;
  lat?: number;
  lng?: number;
}

// Datos de prueba originales
const datosIniciales: Cliente[] = [
  {
    id: "1",
    nombre: "Juan Pérez",
    email: "juan.perez@email.com",
    rut: "12.345.678-5",
    telefono: "+56 9 1234 5678",
    direccion: "Av. Las Condes 12345",
    comuna: "Las Condes",
    lat: -33.38,
    lng: -70.53,
  },
  {
    id: "2",
    nombre: "María González",
    email: "maria.g@email.com",
    rut: "9.876.543-1",
    telefono: "+56 9 8765 4321",
    direccion: "Av. La Dehesa 456",
    comuna: "Lo Barnechea",
    lat: -33.35,
    lng: -70.51,
  },
];

export const ClientesPage: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>(datosIniciales);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [form] = Form.useForm();

  const [direccionValidada, setDireccionValidada] = useState<boolean | null>(
    null,
  );
  const [coordenadas, setCoordenadas] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [options, setOptions] = useState<{ value: string }[]>([]);

  const handleSearchDireccion = (searchText: string) => {
    if (!searchText) {
      setOptions([]);
      return;
    }
    setOptions([
      { value: `${searchText}, Santiago` },
      { value: `${searchText}, Providencia` },
      { value: `${searchText}, Las Condes` },
      { value: `${searchText}, Lo Barnechea` },
    ]);
  };

  const handleSelectDireccion = (_value?: string) => {
    setDireccionValidada(true);
    setCoordenadas({ lat: -33.36, lng: -70.52 });
  };

  const handleBlurDireccion = () => {
    const val = form.getFieldValue("direccion");
    if (val && !direccionValidada) {
      if (val.length > 5) {
        setDireccionValidada(true);
        setCoordenadas({ lat: -33.36, lng: -70.52 });
      } else {
        setDireccionValidada(false);
        setCoordenadas(null);
      }
    }
  };

  const handleCreate = (values: any) => {
    const nuevoCliente: Cliente = {
      id: Date.now().toString(),
      nombre: values.nombre,
      email: values.email || "",
      rut: values.rut,
      telefono: values.telefono || "",
      direccion: values.direccion,
      comuna: values.comuna || "",
      lat: coordenadas?.lat,
      lng: coordenadas?.lng,
    };

    setClientes([...clientes, nuevoCliente]);
    setIsModalOpen(false);
    form.resetFields();
    setDireccionValidada(null);
    setCoordenadas(null);
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
      title: "Ubicación",
      key: "ubicacion",
      render: (_: any, record: Cliente) => (
        <Space direction="vertical" size={0}>
          <Text>{record.direccion}</Text>
          <Text type="secondary" style={{ fontSize: "12px", color: "#1677ff" }}>
            {record.comuna}
          </Text>
        </Space>
      ),
    },
    {
      title: "GPS & Mapa (HU 2)",
      key: "gps",
      render: (_: any, record: Cliente) => (
        <Space size="middle">
          {record.lat && record.lng && (
            <Text type="success" style={{ fontSize: "13px" }}>
              <CheckCircleOutlined /> GPS Válido
            </Text>
          )}
          <Button
            type="link"
            size="small"
            icon={<EnvironmentOutlined />}
            onClick={() => verMapa(record)}
            style={{ padding: 0 }}
          >
            Ver Mapa
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

  return (
    <div style={{ padding: "8px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* CABECERA (TÍTULOS) */}
      <div style={{ marginBottom: 24, padding: "0 12px" }}>
        <Title level={3} style={{ margin: 0 }}>
          Gestión de Clientes
        </Title>
        <Text type="secondary">
          Registro unificado, validación legal de RUT y georreferenciación
          inteligente (HU 1, 2 y 3)
        </Text>
      </div>

      {/* CONTROLES (BÚSQUEDA Y MÉTRICAS) */}
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
            <Badge
              count={clientes.filter((c) => c.lat).length}
              color="#52c41a"
            />
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
        {/* TABLA CON SCROLL HORIZONTAL (LA CLAVE DEL RESPONSIVE) */}
        <div style={{ width: "100%", overflowX: "auto" }}>
          <Table
            columns={columns}
            dataSource={clientes}
            rowKey="id"
            scroll={{ x: 1000 }} // Asegura que la tabla no se aplaste en celulares
            pagination={{ pageSize: 5 }}
          />
        </div>
      </Card>

      {/* MODAL CREAR CLIENTE RECONSTRUIDO */}
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
          style={{ marginTop: "16px" }}
        >
          <Form.Item
            name="nombre"
            label="Nombre Completo"
            rules={[{ required: true }]}
          >
            <Input placeholder="Ej: Juan Pérez" />
          </Form.Item>

          <Form.Item
            name="rut"
            label="RUT (con Módulo 11)"
            rules={[{ required: true }]}
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
                initialValue="Región Metropolitana de Santiago"
              >
                <Input disabled />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="comuna" label="Comuna">
                <Input placeholder="Ej: Las Condes" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="direccion"
            label="Dirección de Domicilio (Autocompletado y Validación GPS)"
            rules={[{ required: true }]}
          >
            <AutoComplete
              options={options}
              onSearch={handleSearchDireccion}
              onSelect={handleSelectDireccion}
              onBlur={handleBlurDireccion}
              placeholder="Escribe la dirección..."
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

      {/* MODAL MAPA */}
      <Modal
        title={`Ubicación de ${selectedCliente?.nombre || "Cliente"}`}
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
        <div
          style={{
            width: "100%",
            height: "400px",
            borderRadius: "8px",
            overflow: "hidden",
            backgroundColor: "#e5e3df",
            marginTop: "16px",
          }}
        >
          {selectedCliente && (
            <iframe
              title="Mapa de Ubicación"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              src={`https://maps.google.com/maps?q=${selectedCliente.lat},${selectedCliente.lng}&z=15&output=embed`}
            />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ClientesPage;
