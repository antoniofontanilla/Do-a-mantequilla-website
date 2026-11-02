import React, { useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Tag,
  message,
} from "antd";
import { EditOutlined } from "@ant-design/icons";
import { ServicioCatalogo } from "../../types/servicio";
import { SERVICIOS_BASE } from "../../utils/serviciosData";

const ServiciosPage: React.FC = () => {
  // Cargamos los datos simulados en el estado inicial
  const [servicios, setServicios] =
    useState<ServicioCatalogo[]>(SERVICIOS_BASE);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingServicio, setEditingServicio] =
    useState<ServicioCatalogo | null>(null);
  const [form] = Form.useForm();

  // Función para abrir el modal y cargar los datos del servicio a editar
  const handleEdit = (record: ServicioCatalogo) => {
    setEditingServicio(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  // Función para cerrar el modal y limpiar el formulario
  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingServicio(null);
    form.resetFields();
  };

  // Función para guardar los cambios en el catálogo
  const handleSave = () => {
    form.validateFields().then((values) => {
      const updatedServicios = servicios.map((s) =>
        s.id === editingServicio?.id ? { ...s, ...values } : s,
      );
      setServicios(updatedServicios);
      message.success("Servicio actualizado correctamente");
      handleCancel();
    });
  };

  // Definición de las columnas de la tabla de Ant Design
  const columns = [
    {
      title: "Nombre del Servicio",
      dataIndex: "nombre",
      key: "nombre",
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Descripción",
      dataIndex: "descripcion",
      key: "descripcion",
    },
    {
      title: "Tiempo Estimado (min)",
      dataIndex: "tiempoEstimadoMinutos",
      key: "tiempoEstimadoMinutos",
      render: (minutos: number) => `${minutos} min`,
    },
    {
      title: "Estado",
      dataIndex: "activo",
      key: "activo",
      render: (activo: boolean) => (
        <Tag color={activo ? "green" : "red"}>
          {activo ? "Activo" : "Inactivo"}
        </Tag>
      ),
    },
    {
      title: "Acciones",
      key: "acciones",
      render: (_: any, record: ServicioCatalogo) => (
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
          size="small"
        >
          Editar
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px", background: "#fff", borderRadius: "8px" }}>
      <h2 style={{ marginBottom: "16px" }}>Catálogo de Servicios</h2>
      <Table
        columns={columns}
        dataSource={servicios}
        rowKey="id"
        pagination={false}
        bordered
      />

      <Modal
        title="Editar Servicio"
        open={isModalVisible}
        onOk={handleSave}
        onCancel={handleCancel}
        okText="Guardar Cambios"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="nombre" label="Nombre del Servicio">
            <Input disabled />{" "}
            {/* El nombre es fijo según el requerimiento, no se edita */}
          </Form.Item>

          <Form.Item
            name="descripcion"
            label="Descripción"
            rules={[
              { required: true, message: "La descripción es obligatoria" },
            ]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="tiempoEstimadoMinutos"
            label="Tiempo Estimado (minutos)"
            rules={[{ required: true, message: "El tiempo es obligatorio" }]}
          >
            <InputNumber min={5} max={480} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="activo"
            label="Estado del Servicio"
            valuePropName="checked"
          >
            <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ServiciosPage;
