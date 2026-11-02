import React, { useState, useEffect } from "react";
import {
  Card,
  Tag,
  Button,
  List,
  Typography,
  Space,
  Alert,
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
}

const PanelSugerenciasIA: React.FC<PanelSugerenciasIAProps> = ({ citas }) => {
  const [sugerencias, setSugerencias] = useState<SugerenciaIA[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const ejecutarAnalisis = () => {
    setLoading(true);
    setTimeout(() => {
      const resultado = IaOptimizacionService.analizarCitas(citas);
      setSugerencias(resultado);
      setLoading(false);
    }, 400);
  };

  useEffect(() => {
    ejecutarAnalisis();
  }, [citas]);

  const handleAplicar = (id: string, titulo: string) => {
    setSugerencias((prev) =>
      prev.map((s) => (s.id === id ? { ...s, aplicada: true } : s)),
    );
    message.success(`Acción procesada: ${titulo}`);
  };

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
            Sugerencias IA
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

      {/* Contenido / Lista de Sugerencias */}
      <div
        style={{
          padding: "16px",
          flex: 1,
          overflowY: "auto",
          backgroundColor: "#fafafa",
        }}
      >
        <Alert
          message="Optimización Inteligente de Rutas y Operarios"
          description="Análisis automático basado en comunas, tiempos de traslado, balance de carga, asignación de personal y validación de horarios."
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
              No se detectaron conflictos, ineficiencias ni citas fuera de
              horario.
            </Text>
          </div>
        )}

        <List
          loading={loading}
          dataSource={sugerencias}
          renderItem={(item) => {
            // Estilos dinámicos extra si es de impacto ALTO (como citas fuera de horario)
            const esCritico =
              item.impacto === "ALTO" && item.id.includes("horario");

            return (
              <List.Item
                style={{ padding: 0, marginBottom: "12px", border: "none" }}
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
                    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
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
                        <CheckCircleOutlined /> Resuelto
                      </Text>
                    ) : (
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => handleAplicar(item.id, item.titulo)}
                        style={{
                          backgroundColor: "#722ed1",
                          borderColor: "#722ed1",
                        }}
                      >
                        Resolver
                      </Button>
                    )}
                  </div>
                </Card>
              </List.Item>
            );
          }}
        />
      </div>
    </div>
  );
};

export default PanelSugerenciasIA;
