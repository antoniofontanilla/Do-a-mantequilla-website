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
  Tag,
  Alert,
  AutoComplete,
} from "antd";
import {
  PlusOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

interface Cliente {
  id: string;
  nombre: string;
  rut: string;
  direccion: string;
  lat?: number;
  lng?: number;
}

export const ClientesPage: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [form] = Form.useForm();

  // Estado para la validación de dirección
  const [direccionValidada, setDireccionValidada] = useState<boolean | null>(
    null,
  );
  const [coordenadas, setCoordenadas] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Opciones simuladas para Autocomplete
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
    if (!direccionValidada) return;

    const nuevoCliente: Cliente = {
      id: Date.now().toString(),
      nombre: values.nombre,
      rut: values.rut,
      direccion: values.direccion,
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
      title: "Nombre",
      dataIndex: "nombre",
      key: "nombre",
    },
    {
      title: "RUT",
      dataIndex: "rut",
      key: "rut",
    },
    {
      title: "Dirección Validada",
      dataIndex: "direccion",
      key: "direccion",
      render: (text: string, record: Cliente) => (
        <Space direction="vertical" size="small">
          <Text>{text}</Text>
          {record.lat && record.lng && (
            <Tag color="green" icon={<CheckCircleOutlined />}>
              GPS: {record.lat}, {record.lng}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Acciones",
      key: "acciones",
      render: (_: any, record: Cliente) => (
        <Button
          icon={<EnvironmentOutlined />}
          type="primary"
          ghost
          onClick={() => verMapa(record)}
        >
          Ver en Mapa
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <Card
        title={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <Title level={2} style={{ margin: 0 }}>
              Gestión de Clientes
            </Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsModalOpen(true)}
              size="large"
            >
              Nuevo Cliente
            </Button>
          </div>
        }
      >
        {/* TABLA CON SCROLL HORIZONTAL SOLO SI ES NECESARIO */}
        <div style={{ width: "100%", overflowX: "auto" }}>
          <Table
            columns={columns}
            dataSource={clientes}
            rowKey="id"
            scroll={{ x: "max-content" }}
            pagination={{ pageSize: 5 }}
          />
        </div>
      </Card>

      {/* MODAL CREAR CLIENTE */}
      <Modal
        title="Agregar Nuevo Cliente"
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setDireccionValidada(null);
        }}
        footer={null}
        width="90%"
        style={{ maxWidth: "600px" }}
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
            rules={[{ required: true, message: "Ingrese el nombre" }]}
          >
            <Input placeholder="Ej: Juan Pérez" size="large" />
          </Form.Item>

          <Form.Item
            name="rut"
            label="RUT"
            rules={[{ required: true, message: "Ingrese el RUT" }]}
          >
            <Input placeholder="Ej: 12.345.678-9" size="large" />
          </Form.Item>

          <Form.Item
            name="direccion"
            label="Dirección"
            rules={[{ required: true, message: "Ingrese la dirección" }]}
          >
            <AutoComplete
              options={options}
              onSearch={handleSearchDireccion}
              onSelect={handleSelectDireccion}
              onBlur={handleBlurDireccion}
              placeholder="Escribe la dirección..."
              size="large"
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

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "8px",
              marginTop: "24px",
            }}
          >
            <Button onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button
              type="primary"
              htmlType="submit"
              disabled={!direccionValidada}
            >
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
