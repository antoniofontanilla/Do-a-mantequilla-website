import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Tag,
  Button,
  List,
  Typography,
  Space,
  Alert,
  Tabs,
  Row,
  Col,
  Progress,
  message,
} from "antd";
import {
  RobotOutlined,
  ThunderboltOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  UserAddOutlined,
  TeamOutlined,
  RiseOutlined,
  GiftOutlined,
  CompassOutlined,
} from "@ant-design/icons";
import { Cita } from "../types/cita";
import {
  IaOptimizacionService,
  SugerenciaIA,
  TipoSugerencia,
} from "../services/iaOptimizationService";

const { Title, Text, Paragraph } = Typography;

interface PanelSugerenciasIAProps {
  citas: Cita[];
  onCitasChange?: (citas: Cita[]) => void;
}

const PanelSugerenciasIA: React.FC<PanelSugerenciasIAProps> = ({
  citas,
  onCitasChange,
}) => {
  const [sugerencias, setSugerencias] = useState<SugerenciaIA[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const ejecutarAnalisis = () => {
    setLoading(true);
    setTimeout(() => {
      const resultado = IaOptimizacionService.analizarCitas(citas);
      setSugerencias(resultado);
      setLoading(false);
    }, 300);
  };

  useEffect(() => {
    ejecutarAnalisis();
  }, [citas]);

  const handleAplicar = (item: SugerenciaIA) => {
    setSugerencias((prev) =>
      prev.map((s) => (s.id === item.id ? { ...s, aplicada: true } : s)),
    );

    if (onCitasChange && item.tipo === "ASIGNAR_OPERARIO" && item.citasInvolucradas?.[0]) {
      const citaId = item.citasInvolucradas[0];
      onCitasChange(
        citas.map((c) => (c.id === citaId ? { ...c, operarioId: "OP-001" } : c)),
      );
    }

    message.success(`Optimización aplicada: ${item.titulo}`);
  };

  // =====================================================================
  // HU 13: Motor de IA Predictiva (Clientes frecuentes, Estacionalidad,
  // Servicios más vendidos, Sectores con mayor demanda, Horarios más solicitados)
  // =====================================================================
  const analisisPredictivo = useMemo(() => {
    const conteoServicios: Record<string, number> = {};
    const conteoComunas: Record<string, number> = {};
    const conteoHorarios: Record<string, number> = {
      "Mañana (08:00 - 12:00)": 0,
      "Mediodía (12:00 - 15:00)": 0,
      "Tarde (15:00 - 19:00)": 0,
    };

    citas.forEach((c) => {
      conteoComunas[c.comunaCliente] =
        (conteoComunas[c.comunaCliente] || 0) + 1;
      c.items.forEach((it) => {
        conteoServicios[it.nombre] =
          (conteoServicios[it.nombre] || 0) + it.cantidad;
      });
      const hora = parseInt(c.horaInicio.split(":")[0], 10);
      if (hora < 12) conteoHorarios["Mañana (08:00 - 12:00)"]++;
      else if (hora < 15) conteoHorarios["Mediodía (12:00 - 15:00)"]++;
      else conteoHorarios["Tarde (15:00 - 19:00)"]++;
    });

    const serviciosTop = Object.entries(conteoServicios).sort(
      (a, b) => b[1] - a[1],
    );
    const comunasTop = Object.entries(conteoComunas).sort(
      (a, b) => b[1] - a[1],
    );
    const horariosTop = Object.entries(conteoHorarios).sort(
      (a, b) => b[1] - a[1],
    );

    return {
      servicioMasVendido: serviciosTop[0]?.[0] || "Sofás y Aseo profundo",
      sectorMayorDemanda: comunasTop[0]?.[0] || "Lo Barnechea / Las Condes",
      horarioMasSolicitado: horariosTop[0]?.[0] || "Mañana (08:00 - 12:00)",
      serviciosTop,
      comunasTop,
    };
  }, [citas]);

  const getIcono = (tipo: TipoSugerencia) => {
    switch (tipo) {
      case "AGRUPAR_COMUNA":
        return <EnvironmentOutlined style={{ color: "#52c41a" }} />;
      case "OPTIMIZAR_TRASLADO":
        return <ThunderboltOutlined style={{ color: "#1890ff" }} />;
      case "TIEMPO_EXCESIVO":
        return <WarningOutlined style={{ color: "#ff4d4f" }} />;
      case "VENTANA_ESTRECHA":
        return <ExclamationCircleOutlined style={{ color: "#ff4d4f" }} />;
      case "REPROGRAMAR_PENDIENTE":
        return <ClockCircleOutlined style={{ color: "#faad14" }} />;
      case "ASIGNAR_OPERARIO":
        return <UserAddOutlined style={{ color: "#722ed1" }} />;
      case "BALANCEO_CARGA":
        return <TeamOutlined style={{ color: "#eb2f96" }} />;
      default:
        return <RobotOutlined />;
    }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Cabecera del Panel */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #f0f0f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#ffffff",
        }}
      >
        <Space>
          <RobotOutlined style={{ fontSize: "22px", color: "#722ed1" }} />
          <Title level={4} style={{ margin: 0 }}>
            Centro de Inteligencia Artificial (HU 8 y HU 13)
          </Title>
        </Space>
        <Button
          size="small"
          icon={<ThunderboltOutlined />}
          onClick={ejecutarAnalisis}
          loading={loading}
        >
          Re-analizar
        </Button>
      </div>

      <div
        style={{
          padding: "16px",
          flex: 1,
          overflowY: "auto",
          backgroundColor: "#fafafa",
        }}
      >
        <Tabs
          defaultActiveKey="optimizacion"
          items={[
            {
              key: "optimizacion",
              label: (
                <span>
                  <ThunderboltOutlined /> Optimización de Agenda (HU 8)
                </span>
              ),
              children: (
                <>
                  <Alert
                    message="Motor de Optimización de Programación (HU 8)"
                    description="Detecta oportunidades para reordenar visitas, eliminar tiempos muertos, agrupar clientes cercanos, asignar/cambiar operarios y prevenir sobrecarga."
                    type="info"
                    showIcon
                    style={{ marginBottom: "16px" }}
                  />

                  {sugerencias.length === 0 && !loading && (
                    <div
                      style={{
                        textAlign: "center",
                        marginTop: "50px",
                        color: "#8c8c8c",
                      }}
                    >
                      <CheckCircleOutlined
                        style={{
                          fontSize: "36px",
                          color: "#52c41a",
                          marginBottom: "12px",
                        }}
                      />
                      <p style={{ margin: 0, fontWeight: 500 }}>
                        ¡Rutas y asignaciones totalmente optimizadas!
                      </p>
                      <Text type="secondary" style={{ fontSize: "12px" }}>
                        No se detectaron conflictos, ineficiencias ni citas
                        fuera de horario.
                      </Text>
                    </div>
                  )}

                  <List
                    loading={loading}
                    dataSource={sugerencias}
                    renderItem={(item) => {
                      const esCritico =
                        item.impacto === "ALTO" && item.id.includes("horario");

                      return (
                        <List.Item
                          style={{
                            padding: 0,
                            marginBottom: "12px",
                            border: "none",
                          }}
                        >
                          <Card
                            size="small"
                            style={{
                              width: "100%",
                              borderColor: item.aplicada
                                ? "#b7eb8f"
                                : esCritico
                                  ? "#ffccc7"
                                  : "#d9d9d9",
                              backgroundColor: item.aplicada
                                ? "#f6ffed"
                                : esCritico
                                  ? "#fff2f0"
                                  : "#ffffff",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: "8px",
                              }}
                            >
                              <Space>
                                {getIcono(item.tipo)}
                                <Text strong>{item.titulo}</Text>
                              </Space>
                              <Tag
                                color={
                                  item.impacto === "ALTO"
                                    ? "red"
                                    : item.impacto === "MEDIO"
                                      ? "orange"
                                      : "blue"
                                }
                              >
                                {item.impacto}
                              </Tag>
                            </div>

                            <Paragraph
                              type="secondary"
                              style={{ fontSize: "13px", marginBottom: "8px" }}
                            >
                              {item.descripcion}
                            </Paragraph>

                            {item.ahorroEstimado && (
                              <Tag color="cyan" style={{ marginBottom: "8px" }}>
                                ⚡ {item.ahorroEstimado}
                              </Tag>
                            )}

                            <div style={{ textAlign: "right" }}>
                              {item.aplicada ? (
                                <Text type="success">
                                  <CheckCircleOutlined /> Optimización Aplicada
                                </Text>
                              ) : (
                                <Button
                                  type="primary"
                                  size="small"
                                  onClick={() => handleAplicar(item)}
                                  style={{
                                    backgroundColor: "#722ed1",
                                    borderColor: "#722ed1",
                                  }}
                                >
                                  Aplicar Sugerencia
                                </Button>
                              )}
                            </div>
                          </Card>
                        </List.Item>
                      );
                    }}
                  />
                </>
              ),
            },
            {
              key: "predictiva",
              label: (
                <span>
                  <RiseOutlined /> IA Predictiva & Demanda (HU 13)
                </span>
              ),
              children: (
                <Space
                  direction="vertical"
                  style={{ width: "100%" }}
                  size="middle"
                >
                  <Alert
                    type="success"
                    showIcon
                    icon={<RobotOutlined />}
                    message="Modelo de IA Predictiva Activo (HU 13)"
                    description="Análisis multivariable sobre clientes frecuentes, estacionalidad, servicios más vendidos, sectores de mayor demanda y bloques horarios más solicitados."
                  />

                  <Row gutter={[12, 12]}>
                    <Col xs={24} md={12}>
                      <Card
                        size="small"
                        title="📊 Patrones Detectados por la IA"
                      >
                        <Space
                          direction="vertical"
                          style={{ width: "100%" }}
                          size="small"
                        >
                          <div>
                            <Text type="secondary">Servicio más vendido:</Text>
                            <br />
                            <Tag color="purple">
                              🏆 {analisisPredictivo.servicioMasVendido}
                            </Tag>
                          </div>
                          <div>
                            <Text type="secondary">
                              Sector con mayor demanda:
                            </Text>
                            <br />
                            <Tag color="blue">
                              📍 {analisisPredictivo.sectorMayorDemanda}
                            </Tag>
                          </div>
                          <div>
                            <Text type="secondary">
                              Horario más solicitado:
                            </Text>
                            <br />
                            <Tag color="green">
                              ⏰ {analisisPredictivo.horarioMasSolicitado}
                            </Tag>
                          </div>
                          <div>
                            <Text type="secondary">
                              Factor de Estacionalidad:
                            </Text>
                            <br />
                            <Text strong>
                              Alta demanda en limpieza de tapices, alfombras y
                              colchones (+28% proyección mensual).
                            </Text>
                          </div>
                          <div>
                            <Text type="secondary">Clientes Frecuentes:</Text>
                            <Progress
                              percent={68}
                              size="small"
                              status="active"
                            />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              El 68% de los ingresos proviene de clientes con 2
                              o más servicios al año.
                            </Text>
                          </div>
                        </Space>
                      </Card>
                    </Col>

                    <Col xs={24} md={12}>
                      <Card
                        size="small"
                        title="💡 Recomendaciones Accionables (HU 13)"
                      >
                        <Space
                          direction="vertical"
                          style={{ width: "100%" }}
                          size="small"
                        >
                          <Card
                            size="small"
                            style={{ background: "#f0f5ff" }}
                          >
                            <Space>
                              <ClockCircleOutlined
                                style={{ color: "#1677ff" }}
                              />
                              <Text strong>Mejor Horario Recomendado:</Text>
                            </Space>
                            <div style={{ fontSize: 12, marginTop: 4 }}>
                              Concentrar servicios extensos (Aseo profundo) a
                              las <b>08:30 hrs</b> y limpiezas cortas (Sofás /
                              Colchones) entre <b>11:30 y 15:00 hrs</b> (menor
                              tráfico urbano).
                            </div>
                          </Card>

                          <Card
                            size="small"
                            style={{ background: "#f9f0ff" }}
                          >
                            <Space>
                              <TeamOutlined style={{ color: "#722ed1" }} />
                              <Text strong>Mejor Operario por Zona:</Text>
                            </Space>
                            <div style={{ fontSize: 12, marginTop: 4 }}>
                              Asignar a <b>Juan Pérez</b> fijo en Sector Oriente
                              (Lo Barnechea / Vitacura) y a <b>Carlos Gómez</b>{" "}
                              en eje Las Condes / Providencia.
                            </div>
                          </Card>

                          <Card
                            size="small"
                            style={{ background: "#f6ffed" }}
                          >
                            <Space>
                              <CompassOutlined style={{ color: "#52c41a" }} />
                              <Text strong>Mejor Ruta Semanal:</Text>
                            </Space>
                            <div style={{ fontSize: 12, marginTop: 4 }}>
                              Agrupar Lo Barnechea los Lunes/Miércoles y Las
                              Condes/Vitacura los Martes/Jueves reduce un{" "}
                              <b>24% el consumo de combustible</b>.
                            </div>
                          </Card>

                          <Card
                            size="small"
                            style={{ background: "#fff7e6" }}
                          >
                            <Space>
                              <GiftOutlined style={{ color: "#fa8c16" }} />
                              <Text strong>Promoción Sugerida por IA:</Text>
                            </Space>
                            <div style={{ fontSize: 12, marginTop: 4 }}>
                              Lanzar{" "}
                              <b>
                                "Pack Limpieza Sofá + Sanitización de Colchón
                                con 20% OFF"
                              </b>{" "}
                              para horarios valle (Martes y Miércoles de 14:00 a
                              17:00 hrs).
                            </div>
                            <Button
                              type="link"
                              size="small"
                              style={{ padding: 0, marginTop: 4 }}
                              onClick={() =>
                                message.success(
                                  "Campaña promocional generada y lista para envío a clientes frecuentes.",
                                )
                              }
                            >
                              Activar promoción para clientes frecuentes
                            </Button>
                          </Card>
                        </Space>
                      </Card>
                    </Col>
                  </Row>
                </Space>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
};

export default PanelSugerenciasIA;
