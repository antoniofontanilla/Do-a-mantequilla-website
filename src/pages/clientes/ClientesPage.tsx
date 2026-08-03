import React, { useState } from "react";
import {
  Table,
  Button,
  Space,
  Tag,
  Input,
  Card,
  Modal,
  Form,
  message,
  Badge,
  Tooltip,
  Alert,
  Select,
  AutoComplete,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  UserAddOutlined,
  EnvironmentOutlined,
  CompassOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { Cliente } from "../../types/cliente";
import { validarRutChileno, formatearRut } from "../../utils/validators";

const { Option } = Select;

const REGIONES_CHILE = [
  "Región de Arica y Parinacota",
  "Región de Tarapacá",
  "Región de Antofagasta",
  "Región de Atacama",
  "Región de Coquimbo",
  "Región de Valparaíso",
  "Región Metropolitana de Santiago",
  "Región del Libertador General Bernardo O'Higgins",
  "Región del Maule",
  "Región de Ñuble",
  "Región del Biobío",
  "Región de La Araucanía",
  "Región de Los Ríos",
  "Región de Los Lagos",
  "Región Aysén del General Carlos Ibáñez del Campo",
  "Región de Magallanes y de la Antártica Chilena",
];

const COMUNAS_CHILE = [
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
  "Colina",
  "Lampa",
];

export const ClientesPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<Cliente | null>(null);
  const [searchText, setSearchText] = useState("");
  const [validandoDireccion, setValidandoDireccion] = useState(false);
  const [opcionesSugerencias, setOpcionesSugerencias] = useState<
    { value: string; lat: number; lng: number }[]
  >([]);

  const [direccionEstado, setDireccionEstado] = useState<{
    validada: boolean;
    lat?: number;
    lng?: number;
    mensaje?: string;
  }>({ validada: false });

  const [form] = Form.useForm();

  const [clientes, setClientes] = useState<Cliente[]>([
    {
      id: "1",
      nombreCompleto: "Juan Pérez",
      rut: "12.345.678-5",
      telefono: "+56 9 1234 5678",
      email: "juan.perez@email.com",
      direccion: "Av. Las Condes 12345",
      comuna: "Las Condes",
      region: "Región Metropolitana de Santiago",
      direccionValidada: true,
      latitud: -33.3721,
      longitud: -70.5152,
      createdAt: "2026-08-01",
    },
    {
      id: "2",
      nombreCompleto: "María González",
      rut: "9.876.543-1",
      telefono: "+56 9 8765 4321",
      email: "maria.g@email.com",
      direccion: "Av. La Dehesa 456",
      comuna: "Lo Barnechea",
      region: "Región Metropolitana de Santiago",
      direccionValidada: true,
      latitud: -33.3512,
      longitud: -70.521,
      createdAt: "2026-08-02",
    },
  ]);

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatearRut(rawValue);
    form.setFieldsValue({ rut: formatted });
  };

  // HU 2: Búsqueda y Validación Automática al escribir / autocompletar
  const handleBuscarDireccionAuto = async (texto: string) => {
    const comuna = form.getFieldValue("comuna") || "";
    if (texto.length < 4) return;

    setValidandoDireccion(true);
    try {
      const query = `${texto}, ${comuna}, Chile`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`,
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const opciones = data.slice(0, 5).map((item: any) => ({
          value: item.display_name.split(",")[0], // Calle y número abreviado
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        }));
        setOpcionesSugerencias(opciones);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setValidandoDireccion(false);
    }
  };

  // Selección automática desde las sugerencias (HU 2)
  const handleSelectSugerencia = (_value: string, option: any) => {
    if (option && option.lat && option.lng) {
      setDireccionEstado({
        validada: true,
        lat: Number(option.lat.toFixed(6)),
        lng: Number(option.lng.toFixed(6)),
        mensaje: "Dirección seleccionada y validada automáticamente con GPS.",
      });
      message.success("Dirección validada correctamente.");
    }
  };

  // Validar de forma automática al salir de la casilla (onBlur)
  const handleBlurValidacion = async () => {
    const direccion = form.getFieldValue("direccion");
    const comuna = form.getFieldValue("comuna") || "";

    if (!direccion || direccion.length < 4) return;
    if (direccionEstado.validada) return; // Si ya fue validada con autocompletar, ignorar

    setValidandoDireccion(true);
    try {
      const query = `${direccion}, ${comuna}, Chile`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`,
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);

        setDireccionEstado({
          validada: true,
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
          mensaje: "Dirección existente y georreferenciada automáticamente.",
        });
      } else {
        setDireccionEstado({
          validada: false,
          mensaje:
            "Alerta HU 2: La dirección ingresada no existe o no pudo ser geolocalizada.",
        });
      }
    } catch (error) {
      setDireccionEstado({
        validada: false,
        mensaje: "No se pudo conectar con el servicio de mapas para validar.",
      });
    } finally {
      setValidandoDireccion(false);
    }
  };

  const handleGuardarCliente = (values: any) => {
    if (!validarRutChileno(values.rut)) {
      message.error("El RUT ingresado no es válido según el Módulo 11.");
      return;
    }

    const rutLimpioIngresado = values.rut.replace(/\./g, "").toLowerCase();
    const rutExiste = clientes.some(
      (c) => c.rut.replace(/\./g, "").toLowerCase() === rutLimpioIngresado,
    );

    if (rutExiste) {
      message.warning("Ya existe un cliente registrado con este RUT.");
      return;
    }

    // En caso de que se intente guardar sin validación exitosa
    if (!direccionEstado.validada) {
      message.error(
        "Verifique que la dirección sea válida y exista en el mapa.",
      );
      return;
    }

    const nuevoCliente: Cliente = {
      id: String(Date.now()),
      nombreCompleto: values.nombreCompleto,
      rut: values.rut,
      telefono: values.telefono,
      email: values.email,
      direccion: values.direccion,
      comuna: values.comuna,
      region: values.region || "Región Metropolitana de Santiago",
      observaciones: values.observaciones || "",
      direccionValidada: true,
      latitud: direccionEstado.lat,
      longitud: direccionEstado.lng,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setClientes([nuevoCliente, ...clientes]);
    message.success("Cliente guardado y georreferenciado con éxito.");
    setIsModalOpen(false);
    form.resetFields();
    setDireccionEstado({ validada: false });
  };

  const verEnMapa = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setIsMapModalOpen(true);
  };

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nombreCompleto.toLowerCase().includes(searchText.toLowerCase()) ||
      c.rut.toLowerCase().includes(searchText.toLowerCase()) ||
      c.comuna.toLowerCase().includes(searchText.toLowerCase()) ||
      c.direccion.toLowerCase().includes(searchText.toLowerCase()),
  );

  const columns = [
    {
      title: "Cliente",
      dataIndex: "nombreCompleto",
      key: "nombreCompleto",
      render: (text: string, record: Cliente) => (
        <div>
          <span style={{ fontWeight: 600 }}>{text}</span>
          <br />
          <span style={{ fontSize: "12px", color: "#8c8c8c" }}>
            {record.email}
          </span>
        </div>
      ),
    },
    { title: "RUT", dataIndex: "rut", key: "rut" },
    { title: "Teléfono", dataIndex: "telefono", key: "telefono" },
    {
      title: "Ubicación",
      key: "ubicacion",
      render: (_: any, record: Cliente) => (
        <div>
          <span>{record.direccion}</span>
          <br />
          <Tag color="blue">{record.comuna}</Tag>
        </div>
      ),
    },
    {
      title: "GPS & Mapa (HU 2)",
      key: "direccionValidada",
      render: (_: any, record: Cliente) => (
        <Space>
          <Tooltip title={`Lat: ${record.latitud}, Lng: ${record.longitud}`}>
            <Tag
              color={record.direccionValidada ? "green" : "volcano"}
              icon={
                record.direccionValidada ? (
                  <CheckCircleOutlined />
                ) : (
                  <CloseCircleOutlined />
                )
              }
            >
              {record.direccionValidada ? "GPS Válido" : "Sin Coordenadas"}
            </Tag>
          </Tooltip>
          {record.direccionValidada && (
            <Button
              type="dashed"
              size="small"
              icon={<CompassOutlined />}
              onClick={() => verEnMapa(record)}
            >
              Ver Mapa
            </Button>
          )}
        </Space>
      ),
    },
    {
      title: "Acciones",
      key: "acciones",
      render: (_: any, record: Cliente) => (
        <Space size="middle">
          <Button type="link" size="small">
            Editar
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={() =>
              setClientes(clientes.filter((c) => c.id !== record.id))
            }
          >
            Eliminar
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Gestión de Clientes</h2>
          <p style={{ color: "#8c8c8c", margin: 0 }}>
            Registro unificado, validación legal de RUT y georreferenciación
            inteligente (HU 1, 2 y 3)
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => setIsModalOpen(true)}
        >
          Nuevo Cliente
        </Button>
      </div>

      <Card size="small">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Input
            placeholder="Buscar por Nombre, RUT, Dirección o Comuna..."
            prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
            style={{ width: 400 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <Space size="large">
            <span>
              Total Clientes:{" "}
              <Badge
                count={clientes.length}
                overflowCount={999}
                showZero
                style={{ backgroundColor: "#108ee9" }}
              />
            </span>
            <span>
              Georreferenciados (GPS):{" "}
              <Badge
                count={clientes.filter((c) => c.direccionValidada).length}
                style={{ backgroundColor: "#52c41a" }}
              />
            </span>
          </Space>
        </div>
      </Card>

      <Table
        columns={columns}
        dataSource={clientesFiltrados}
        rowKey="id"
        pagination={{ pageSize: 6 }}
      />

      {/* Modal Registrar Cliente */}
      <Modal
        title={
          <Space>
            <UserAddOutlined /> Registrar Nuevo Cliente
          </Space>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        okText="Guardar Cliente"
        cancelText="Cancelar"
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleGuardarCliente}>
          <Form.Item
            name="nombreCompleto"
            label="Nombre Completo"
            rules={[{ required: true, message: "El nombre es obligatorio" }]}
          >
            <Input placeholder="Ej: Juan Pérez" />
          </Form.Item>

          <Form.Item
            name="rut"
            label="RUT (con Módulo 11)"
            rules={[{ required: true, message: "El RUT is obligatorio" }]}
          >
            <Input
              placeholder="Ej: 12.345.678-9"
              onChange={handleRutChange}
              maxLength={12}
            />
          </Form.Item>

          <div style={{ display: "flex", gap: "12px" }}>
            <Form.Item
              name="telefono"
              label="Teléfono"
              style={{ flex: 1 }}
              rules={[{ required: true, message: "Ingrese teléfono" }]}
            >
              <Input placeholder="Ej: +56 9 1234 5678" />
            </Form.Item>

            <Form.Item
              name="email"
              label="Correo Electrónico"
              style={{ flex: 1 }}
              rules={[
                { required: true, type: "email", message: "Email válido" },
              ]}
            >
              <Input placeholder="Ej: contacto@ejemplo.cl" />
            </Form.Item>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <Form.Item
              name="region"
              label="Región"
              style={{ flex: 1 }}
              initialValue="Región Metropolitana de Santiago"
              rules={[{ required: true, message: "Seleccione una región" }]}
            >
              <Select showSearch placeholder="Seleccione región">
                {REGIONES_CHILE.map((reg) => (
                  <Option key={reg} value={reg}>
                    {reg}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="comuna"
              label="Comuna"
              style={{ flex: 1 }}
              rules={[{ required: true, message: "Seleccione una comuna" }]}
            >
              <Select showSearch placeholder="Seleccione comuna">
                {COMUNAS_CHILE.map((com) => (
                  <Option key={com} value={com}>
                    {com}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          {/* HU 2: Campo con Autocompletado y Validación Automática */}
          <Form.Item
            name="direccion"
            label="Dirección de Domicilio (Autocompletado y Validación GPS)"
            rules={[{ required: true, message: "La dirección es obligatoria" }]}
          >
            <AutoComplete
              options={opcionesSugerencias}
              onSearch={handleBuscarDireccionAuto}
              onSelect={handleSelectSugerencia}
              onBlur={handleBlurValidacion}
              onChange={() => {
                setDireccionEstado({ validada: false });
              }}
            >
              <Input
                placeholder="Escriba la dirección (ej: Av. Las Condes 12345)"
                suffix={
                  validandoDireccion ? (
                    <EnvironmentOutlined spin />
                  ) : (
                    <EnvironmentOutlined />
                  )
                }
              />
            </AutoComplete>
          </Form.Item>

          {/* Alert de la HU 2 */}
          {direccionEstado.mensaje && (
            <Alert
              style={{ marginBottom: 16 }}
              type={direccionEstado.validada ? "success" : "error"}
              message={
                direccionEstado.validada
                  ? `Dirección Válida (GPS: ${direccionEstado.lat}, ${direccionEstado.lng})`
                  : "Alerta HU 2: Dirección Inválida o No Encontrada"
              }
              description={direccionEstado.mensaje}
              showIcon
            />
          )}

          <Form.Item name="observaciones" label="Observaciones">
            <Input.TextArea rows={2} placeholder="Ej: Llamar antes de llegar" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Visor de Mapa */}
      <Modal
        title={
          <Space>
            <EnvironmentOutlined style={{ color: "#1890ff" }} /> Mapa de
            Ubicación Georreferenciada
          </Space>
        }
        open={isMapModalOpen}
        onCancel={() => setIsMapModalOpen(false)}
        footer={[
          <Button
            key="cerrar"
            type="primary"
            onClick={() => setIsMapModalOpen(false)}
          >
            Cerrar Mapa
          </Button>,
        ]}
        width={700}
      >
        {clienteSeleccionado && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h4>{clienteSeleccionado.nombreCompleto}</h4>
              <p style={{ margin: 0, color: "#595959" }}>
                <strong>Dirección Exacta:</strong>{" "}
                {clienteSeleccionado.direccion}, {clienteSeleccionado.comuna},{" "}
                {clienteSeleccionado.region}
              </p>
              <p style={{ margin: 0, color: "#8c8c8c", fontSize: 12 }}>
                <strong>Coordenadas GPS:</strong> Lat{" "}
                {clienteSeleccionado.latitud}, Lng{" "}
                {clienteSeleccionado.longitud}
              </p>
            </div>

            <div
              style={{
                height: 380,
                width: "100%",
                borderRadius: 8,
                overflow: "hidden",
                border: "1px solid #d9d9d9",
              }}
            >
              <iframe
                title="Mapa de Dirección Exacta"
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                src={`https://maps.google.com/maps?q=${clienteSeleccionado.latitud},${clienteSeleccionado.longitud}&z=16&output=embed`}
              />
            </div>
          </div>
        )}
      </Modal>
    </Space>
  );
};
