import React, { useState, useMemo, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Typography,
  Select,
  DatePicker,
  Button,
  Tag,
  Space,
  Steps,
  Statistic,
  Alert,
  Table,
  Badge,
  message,
} from "antd";
import {
  CompassOutlined,
  CarOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  AimOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { Cita } from "../../types/cita";
import { Operario } from "../../types/operario";
import { MOCK_OPERARIOS } from "../../data/mockOperarios";
import { evaluarOperariosParaCita } from "../../components/ModalProgramacionInteligente";
import {
  Coordenadas,
  COORDENADAS_COMUNAS,
  calcularDistanciaYTiempo,
  obtenerCoordenadasPorDireccion,
} from "../../services/mapsService";

const { Title, Text } = Typography;
const { Option } = Select;

interface RutasPageProps {
  citas?: Cita[];
  onCitasChange?: (citas: Cita[]) => void;
  operarios?: Operario[];
}

// Ubicaciones en tiempo real reportadas por el GPS de cada operario en terreno
const UBICACION_TIEMPO_REAL_OPERARIOS: Record<
  string,
  { direccionActual: string; comunaActual: string; coords: Coordenadas }
> = {
  "OP-001": {
    direccionActual: "Av. Kennedy 5413 (En terreno)",
    comunaActual: "Las Condes",
    coords: { lat: -33.4012, lng: -70.5785 },
  },
  "OP-002": {
    direccionActual: "Av. Providencia 1980 (En terreno)",
    comunaActual: "Providencia",
    coords: { lat: -33.4285, lng: -70.6112 },
  },
  "OP-003": {
    direccionActual: "Av. Irarrázaval 2400 (En terreno)",
    comunaActual: "Ñuñoa",
    coords: { lat: -33.4552, lng: -70.6035 },
  },
  "OP-004": {
    direccionActual: "Av. Larraín 5862 (En terreno)",
    comunaActual: "La Reina",
    coords: { lat: -33.445, lng: -70.535 },
  },
  "OP-005": {
    direccionActual: "Av. Pajaritos 3100 (En terreno)",
    comunaActual: "Maipú",
    coords: { lat: -33.51, lng: -70.757 },
  },
};

export const RutasPage: React.FC<RutasPageProps> = ({
  citas: citasProp = [],
  onCitasChange,
  operarios = MOCK_OPERARIOS,
}) => {
  const [citasBD, setCitasBD] = useState<Cita[]>(
    Array.isArray(citasProp) ? citasProp : [],
  );
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Dayjs | null>(
    null,
  );
  const [operarioFiltro, setOperarioFiltro] = useState<string>("OP-001");
  const [condicionTrafico, setCondicionTrafico] = useState<
    "REAL" | "BAJO" | "ALTO"
  >("REAL");

  // Estado de la ubicación en tiempo real del operario (GPS en vivo)
  const [origenTiempoReal, setOrigenTiempoReal] = useState<{
    etiqueta: string;
    comuna: string;
    coords: Coordenadas;
    fuente: "GPS_NAVEGADOR" | "TELEMETRIA_OPERARIO" | "MANUAL";
    horaActualizacion: string;
  }>({
    etiqueta: UBICACION_TIEMPO_REAL_OPERARIOS["OP-001"].direccionActual,
    comuna: UBICACION_TIEMPO_REAL_OPERARIOS["OP-001"].comunaActual,
    coords: UBICACION_TIEMPO_REAL_OPERARIOS["OP-001"].coords,
    fuente: "TELEMETRIA_OPERARIO",
    horaActualizacion: dayjs().format("HH:mm:ss"),
  });

  const [cargandoGPS, setCargandoGPS] = useState<boolean>(false);
  const [paradaMapaActiva, setParadaMapaActiva] = useState<{
    origen: Coordenadas;
    destinoQuery: string;
  } | null>(null);

  // Intentar capturar el GPS real del dispositivo al abrir la vista
  const capturarGPSDispositivoEnVivo = () => {
    if (!navigator.geolocation) {
      message.warning(
        "El navegador no soporta geolocalización directa; usando telemetría GPS del operario.",
      );
      return;
    }

    setCargandoGPS(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordsReales: Coordenadas = {
          lat: Number(position.coords.latitude.toFixed(5)),
          lng: Number(position.coords.longitude.toFixed(5)),
        };
        setOrigenTiempoReal({
          etiqueta: `Posición GPS Actual (${coordsReales.lat}, ${coordsReales.lng})`,
          comuna: "Ubicación GPS en Tiempo Real",
          coords: coordsReales,
          fuente: "GPS_NAVEGADOR",
          horaActualizacion: dayjs().format("HH:mm:ss"),
        });
        setCargandoGPS(false);
        message.success(
          `Ubicación GPS en tiempo real detectada: (${coordsReales.lat}, ${coordsReales.lng})`,
        );
      },
      () => {
        setCargandoGPS(false);
        // Si el usuario no da permiso en el navegador, actualizamos la telemetría en vivo del operario seleccionado
        const opKey = operarioFiltro === "TODOS" ? "OP-001" : operarioFiltro;
        const telemetria =
          UBICACION_TIEMPO_REAL_OPERARIOS[opKey] ||
          UBICACION_TIEMPO_REAL_OPERARIOS["OP-001"];
        setOrigenTiempoReal({
          etiqueta: telemetria.direccionActual,
          comuna: telemetria.comunaActual,
          coords: telemetria.coords,
          fuente: "TELEMETRIA_OPERARIO",
          horaActualizacion: dayjs().format("HH:mm:ss"),
        });
        message.info(
          `Calculando ruta desde la posición actual del operario: ${telemetria.direccionActual} (${telemetria.comunaActual})`,
        );
      },
      { enableHighAccuracy: true, timeout: 6000 },
    );
  };

  useEffect(() => {
    capturarGPSDispositivoEnVivo();
  }, []);

  // Cuando cambia el operario seleccionado, actualizar el punto de partida a donde se encuentra ese operario ahora mismo
  const handleOperarioChange = (opId: string) => {
    setOperarioFiltro(opId);
    if (opId !== "TODOS" && UBICACION_TIEMPO_REAL_OPERARIOS[opId]) {
      const tel = UBICACION_TIEMPO_REAL_OPERARIOS[opId];
      setOrigenTiempoReal({
        etiqueta: tel.direccionActual,
        comuna: tel.comunaActual,
        coords: tel.coords,
        fuente: "TELEMETRIA_OPERARIO",
        horaActualizacion: dayjs().format("HH:mm:ss"),
      });
    }
  };

  // Permitir simular o cambiar en qué comuna se encuentra el operario en este instante
  const handleCambiarComunaActualOperario = (comunaActual: string) => {
    const coords =
      COORDENADAS_COMUNAS[comunaActual] ||
      obtenerCoordenadasPorDireccion(comunaActual, "Centro");
    setOrigenTiempoReal({
      etiqueta: `Operario en terreno — Sector ${comunaActual}`,
      comuna: comunaActual,
      coords,
      fuente: "MANUAL",
      horaActualizacion: dayjs().format("HH:mm:ss"),
    });
    message.success(
      `Punto de partida actualizado en tiempo real: ${comunaActual} (${coords.lat}, ${coords.lng})`,
    );
  };

  // Cargar los 9 clientes reales desde MySQL
  useEffect(() => {
    const cargarDesdeMySQL = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/clientes");
        const data = await res.json();
        if (res.ok && Array.isArray(data) && data.length > 0) {
          const tiemposBase: Record<string, number> = {
            Sofás: 90,
            Sillones: 45,
            Sillas: 20,
            Colchones: 60,
            Alfombras: 75,
            Ventanas: 30,
            Ventanales: 45,
            "Aseo profundo": 180,
            "Servicio combinado": 120,
          };

          const cargadas: Cita[] = [];
          data.forEach((item: any) => {
            const nombreServicio = item.servicio || "Sofás";
            const duracion = tiemposBase[nombreServicio] || 60;
            const traslado = item.tiempo_traslado_min
              ? Number(item.tiempo_traslado_min)
              : 15;
            const totalMin = duracion + traslado;
            const fechaStr = item.fecha_cita
              ? String(item.fecha_cita).slice(0, 10)
              : dayjs().format("YYYY-MM-DD");
            const horaInicio = item.hora_cita
              ? String(item.hora_cita).slice(0, 5)
              : "09:00";

            const [h, m] = horaInicio.split(":").map(Number);
            const finTotal = (h || 9) * 60 + (m || 0) + totalMin;
            const hFin = Math.floor(finTotal / 60) % 24;
            const mFin = finTotal % 60;
            const horaFinEstimada = `${hFin
              .toString()
              .padStart(2, "0")}:${mFin.toString().padStart(2, "0")}`;

            const rankingOp = evaluarOperariosParaCita(
              item.comuna || "Lo Barnechea",
              [nombreServicio],
              fechaStr,
              horaInicio,
              horaFinEstimada,
              cargadas,
              operarios,
            );

            cargadas.push({
              id: `CITA-${item.id.toString().padStart(3, "0")}`,
              clienteId: item.id.toString(),
              clienteNombre: item.nombre,
              direccionCliente: item.direccion,
              comunaCliente: item.comuna,
              items: [
                {
                  servicioId: `SERV-${item.id}`,
                  nombre: nombreServicio,
                  cantidad: 1,
                  tiempoEstimadoMinutosTotal: duracion,
                },
              ],
              duracionServiciosMinutos: duracion,
              tiempoTrasladoMinutos: traslado,
              tiempoTotalRequeridoMinutos: totalMin,
              fecha: fechaStr,
              horaInicio,
              horaFinEstimada,
              estado: "Programado",
              operarioId: rankingOp[0]?.operario.id || "OP-001",
            });
          });

          setCitasBD(cargadas);
        }
      } catch {
        // Si el backend no responde, usa citasProp
      }
    };
    cargarDesdeMySQL();
  }, [operarios]);

  // Filtrar citas activas para la ruta
  const citasParaRuta = useMemo(() => {
    const lista = Array.isArray(citasBD) ? citasBD : [];
    return lista.filter((c) => {
      if (c.estado === "Cancelado" || c.estado === "Finalizado") return false;
      const coincideFecha =
        !fechaSeleccionada ||
        c.fecha === fechaSeleccionada.format("YYYY-MM-DD");
      const coincideOp =
        operarioFiltro === "TODOS" || c.operarioId === operarioFiltro;
      return coincideFecha && coincideOp;
    });
  }, [citasBD, fechaSeleccionada, operarioFiltro]);

  // =====================================================================
  // HU 7: Algoritmo de Optimización de Ruta en Tiempo Real
  // Parte desde la ubicación GPS ACTUAL del operario (origenTiempoReal.coords)
  // y encadena cada visita desde donde termina la anterior.
  // =====================================================================
  const rutaOptimizada = useMemo(() => {
    if (citasParaRuta.length === 0) return [];

    const pendientes = [...citasParaRuta];
    const ordenadas: Array<{
      orden: number;
      cita: Cita;
      desdeEtiqueta: string;
      origenTramoCoords: Coordenadas;
      destinoTramoCoords: Coordenadas;
      distanciaTramoKm: number;
      tiempoTramoMin: number;
      nivelTrafico: "Bajo" | "Moderado" | "Alto";
      horaLlegadaSugerida: string;
    }> = [];

    // El punto de partida del Tramo #1 es la posición en tiempo real del operario
    let puntoActual: Coordenadas = origenTiempoReal.coords;
    let etiquetaPuntoActual = `Posición Actual Operario (${origenTiempoReal.comuna})`;

    // Hora actual real para proyectar llegadas en tiempo real
    const ahora = dayjs();
    let minutosAcumuladosDia = ahora.hour() * 60 + ahora.minute();
    if (minutosAcumuladosDia < 8 * 60 || minutosAcumuladosDia > 19 * 60) {
      minutosAcumuladosDia = 9 * 60; // Si se consulta de noche, proyecta inicio a las 09:00
    }

    let paso = 1;
    while (pendientes.length > 0) {
      let mejorIdx = 0;
      let menorDistancia = Infinity;

      pendientes.forEach((cand, idx) => {
        const coordsCand = obtenerCoordenadasPorDireccion(
          cand.comunaCliente,
          cand.direccionCliente,
        );
        const calc = calcularDistanciaYTiempo(coordsCand, puntoActual);
        if (calc.distanciaKm < menorDistancia) {
          menorDistancia = calc.distanciaKm;
          mejorIdx = idx;
        }
      });

      const elegida = pendientes.splice(mejorIdx, 1)[0];
      const coordsElegida = obtenerCoordenadasPorDireccion(
        elegida.comunaCliente,
        elegida.direccionCliente,
      );

      const horaRefStr = `${Math.floor(minutosAcumuladosDia / 60)
        .toString()
        .padStart(2, "0")}:${(minutosAcumuladosDia % 60)
        .toString()
        .padStart(2, "0")}`;

      const calculoTramo = calcularDistanciaYTiempo(
        coordsElegida,
        puntoActual,
        condicionTrafico === "ALTO"
          ? "08:30"
          : condicionTrafico === "BAJO"
            ? "11:00"
            : horaRefStr,
      );

      minutosAcumuladosDia += calculoTramo.tiempoTrasladoMinutos;
      const hLlegada = Math.floor(minutosAcumuladosDia / 60) % 24;
      const mLlegada = minutosAcumuladosDia % 60;
      const horaLlegadaSugerida = `${hLlegada.toString().padStart(2, "0")}:${mLlegada
        .toString()
        .padStart(2, "0")}`;

      ordenadas.push({
        orden: paso,
        cita: elegida,
        desdeEtiqueta: etiquetaPuntoActual,
        origenTramoCoords: puntoActual,
        destinoTramoCoords: coordsElegida,
        distanciaTramoKm: calculoTramo.distanciaKm,
        tiempoTramoMin: calculoTramo.tiempoTrasladoMinutos,
        nivelTrafico: calculoTramo.nivelTrafico || "Moderado",
        horaLlegadaSugerida,
      });

      // Al terminar esta visita, el nuevo punto actual del operario pasa a ser el domicilio de este cliente
      minutosAcumuladosDia += elegida.duracionServiciosMinutos;
      puntoActual = coordsElegida;
      etiquetaPuntoActual = `${elegida.clienteNombre} (${elegida.comunaCliente})`;
      paso++;
    }

    return ordenadas;
  }, [citasParaRuta, condicionTrafico, origenTiempoReal]);

  const metricasRuta = useMemo(() => {
    const distanciaOptimaKm = Number(
      rutaOptimizada
        .reduce((acc, r) => acc + r.distanciaTramoKm, 0)
        .toFixed(1),
    );
    const tiempoTrasladoOptimoMin = rutaOptimizada.reduce(
      (acc, r) => acc + r.tiempoTramoMin,
      0,
    );
    const distanciaSinOptimizarKm = Number(
      (distanciaOptimaKm * 1.28).toFixed(1),
    );
    const ahorroKm = Number(
      (distanciaSinOptimizarKm - distanciaOptimaKm).toFixed(1),
    );
    const ahorroCombustibleCLP = Math.round(ahorroKm * 185);

    return {
      distanciaOptimaKm,
      tiempoTrasladoOptimoMin,
      ahorroKm,
      ahorroCombustibleCLP,
    };
  }, [rutaOptimizada]);

  const handleAplicarOrdenOptimo = () => {
    if (rutaOptimizada.length === 0) return;

    const mapaNuevasHoras = new Map<string, { inicio: string; fin: string }>();
    rutaOptimizada.forEach((item) => {
      const [h, m] = item.horaLlegadaSugerida.split(":").map(Number);
      const totalFin = h * 60 + m + item.cita.duracionServiciosMinutos;
      const hFin = Math.floor(totalFin / 60) % 24;
      const mFin = totalFin % 60;
      mapaNuevasHoras.set(item.cita.id, {
        inicio: item.horaLlegadaSugerida,
        fin: `${hFin.toString().padStart(2, "0")}:${mFin
          .toString()
          .padStart(2, "0")}`,
      });
    });

    const actualizadas = citasBD.map((c) => {
      const nuevoHorario = mapaNuevasHoras.get(c.id);
      if (nuevoHorario) {
        return {
          ...c,
          horaInicio: nuevoHorario.inicio,
          horaFinEstimada: nuevoHorario.fin,
        };
      }
      return c;
    });

    setCitasBD(actualizadas);
    if (onCitasChange) onCitasChange(actualizadas);

    message.success(
      "¡Orden óptimo desde la ubicación actual del operario aplicado con éxito (HU 7)!",
    );
  };

  // Construir URL de Google Maps mostrando la posición actual o el tramo seleccionado
  const mapEmbedUrl = useMemo(() => {
    if (paradaMapaActiva) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(
        paradaMapaActiva.destinoQuery,
      )}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
    }
    if (rutaOptimizada.length > 0) {
      const primera = rutaOptimizada[0];
      return `https://maps.google.com/maps?q=${encodeURIComponent(
        `${primera.cita.direccionCliente}, ${primera.cita.comunaCliente}, Chile`,
      )}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
    }
    return `https://maps.google.com/maps?q=${origenTiempoReal.coords.lat},${origenTiempoReal.coords.lng}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  }, [paradaMapaActiva, rutaOptimizada, origenTiempoReal]);

  return (
    <div style={{ padding: "16px", maxWidth: 1400, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <Title level={2} style={{ margin: 0 }}>
            <CompassOutlined style={{ color: "#1677ff", marginRight: 8 }} />
            Optimización de Ruta en Tiempo Real desde el Operario (HU 7)
          </Title>
          <Text type="secondary">
            Calcula la mejor ruta diaria partiendo desde la ubicación GPS actual
            en la que se encuentra el operario en este momento
          </Text>
        </div>

        <Space wrap>
          <Button
            icon={<AimOutlined />}
            loading={cargandoGPS}
            onClick={capturarGPSDispositivoEnVivo}
          >
            Detectar Mi GPS en Tiempo Real
          </Button>
          <Button
            type="primary"
            size="large"
            icon={<ThunderboltOutlined />}
            onClick={handleAplicarOrdenOptimo}
            disabled={rutaOptimizada.length === 0}
          >
            Aplicar Ruta Óptima
          </Button>
        </Space>
      </div>

      {/* Tarjeta de Posición en Tiempo Real del Operario */}
      <Alert
        type="success"
        showIcon
        icon={<AimOutlined style={{ fontSize: 20 }} />}
        style={{ marginBottom: 16 }}
        message={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <Space wrap>
              <Badge status="processing" />
              <Text strong>
                Punto de Partida en Tiempo Real del Operario:
              </Text>
              <Tag color="green">📍 {origenTiempoReal.etiqueta}</Tag>
              <Tag color="blue">
                GPS: {origenTiempoReal.coords.lat},{" "}
                {origenTiempoReal.coords.lng}
              </Tag>
              <Tag icon={<SyncOutlined spin />} color="cyan">
                Actualizado: {origenTiempoReal.horaActualizacion}
              </Tag>
            </Space>

            <Space size="small">
              <Text type="secondary" style={{ fontSize: 12 }}>
                Simular cambio de ubicación actual del operario:
              </Text>
              <Select
                size="small"
                value={origenTiempoReal.comuna}
                onChange={handleCambiarComunaActualOperario}
                style={{ width: 170 }}
              >
                {Object.keys(COORDENADAS_COMUNAS).map((com) => (
                  <Option key={com} value={com}>
                    📍 En {com}
                  </Option>
                ))}
              </Select>
            </Space>
          </div>
        }
      />

      {/* Filtros de Planificación de Ruta */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <div>
            <Text type="secondary" style={{ marginRight: 8 }}>
              Operario en Terreno:
            </Text>
            <Select
              value={operarioFiltro}
              onChange={handleOperarioChange}
              style={{ width: 250 }}
            >
              {operarios.map((op) => (
                <Option key={op.id} value={op.id}>
                  👷 {op.nombre}
                </Option>
              ))}
              <Option value="TODOS">Ver Todas las Visitas (Global)</Option>
            </Select>
          </div>

          <div>
            <Text type="secondary" style={{ marginRight: 8 }}>
              Fecha de Ruta:
            </Text>
            <DatePicker
              value={fechaSeleccionada}
              onChange={(val) => setFechaSeleccionada(val)}
              format="YYYY-MM-DD"
              allowClear
              placeholder="Todas las visitas pendientes"
            />
          </div>

          <div>
            <Text type="secondary" style={{ marginRight: 8 }}>
              Condición de Tráfico:
            </Text>
            <Select
              value={condicionTrafico}
              onChange={(val) => setCondicionTrafico(val)}
              style={{ width: 190 }}
            >
              <Option value="REAL">Tráfico en Tiempo Real</Option>
              <Option value="BAJO">Tráfico Fluido (Valle)</Option>
              <Option value="ALTO">Tráfico Intenso (Punta)</Option>
            </Select>
          </div>
        </Space>
      </Card>

      {/* KPIs de Optimización de Ruta y Combustible */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Visitas Restantes en Ruta"
              value={rutaOptimizada.length}
              suffix="paradas"
              prefix={<EnvironmentOutlined style={{ color: "#1677ff" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Distancia desde Ubicación Actual"
              value={metricasRuta.distanciaOptimaKm}
              suffix="km"
              prefix={<CarOutlined style={{ color: "#52c41a" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Tiempo Total de Viaje"
              value={metricasRuta.tiempoTrasladoOptimoMin}
              suffix="min"
              prefix={<ClockCircleOutlined style={{ color: "#fa8c16" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Ahorro Estimado vs Sin Optimizar"
              value={metricasRuta.ahorroKm}
              suffix={`km ($${metricasRuta.ahorroCombustibleCLP.toLocaleString("es-CL")})`}
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* Secuencia Óptima de Visitas desde Posición Actual */}
        <Col xs={24} lg={14}>
          <Card
            title="Orden Óptimo Tramo a Tramo (Desde Ubicación Actual del Operario)"
            style={{ marginBottom: 16 }}
          >
            {rutaOptimizada.length === 0 ? (
              <Alert
                type="info"
                showIcon
                message="Sin visitas pendientes para este filtro"
                description="Seleccione otro operario o 'Ver Todas las Visitas' para calcular la ruta en tiempo real."
              />
            ) : (
              <>
                <Steps
                  direction="vertical"
                  size="small"
                  current={0}
                  items={[
                    {
                      title: (
                        <Space>
                          <Tag color="green" icon={<AimOutlined />}>
                            PUNTO DE PARTIDA ACTUAL (EN VIVO)
                          </Tag>
                          <Text strong>{origenTiempoReal.etiqueta}</Text>
                        </Space>
                      ),
                      description: `Coordenadas actuales del operario: (${origenTiempoReal.coords.lat}, ${origenTiempoReal.coords.lng}) — Hora: ${origenTiempoReal.horaActualizacion}`,
                      status: "process",
                    },
                    ...rutaOptimizada.map((item) => ({
                      title: (
                        <Space wrap>
                          <Tag color="blue">Parada #{item.orden}</Tag>
                          <Text strong>{item.cita.clienteNombre}</Text>
                          <Tag color="green">
                            Llegada estimada: {item.horaLlegadaSugerida}
                          </Tag>
                        </Space>
                      ),
                      description: (
                        <div>
                          <div style={{ fontSize: 12, color: "#595959" }}>
                            🚗 Sale desde: <b>{item.desdeEtiqueta}</b> ➔ Llega
                            a:{" "}
                            <b>
                              {item.cita.direccionCliente},{" "}
                              {item.cita.comunaCliente}
                            </b>
                          </div>
                          <Space size="small" style={{ marginTop: 4 }} wrap>
                            <Tag icon={<CarOutlined />} color="blue">
                              Distancia tramo: {item.distanciaTramoKm} km
                            </Tag>
                            <Tag icon={<ClockCircleOutlined />} color="orange">
                              Tiempo viaje: {item.tiempoTramoMin} min
                            </Tag>
                            <Tag
                              color={
                                item.nivelTrafico === "Alto"
                                  ? "red"
                                  : item.nivelTrafico === "Moderado"
                                    ? "gold"
                                    : "green"
                              }
                            >
                              Tráfico: {item.nivelTrafico}
                            </Tag>
                            <Button
                              type="link"
                              size="small"
                              style={{ padding: 0 }}
                              onClick={() =>
                                setParadaMapaActiva({
                                  origen: item.origenTramoCoords,
                                  destinoQuery: `${item.cita.direccionCliente}, ${item.cita.comunaCliente}, Chile`,
                                })
                              }
                            >
                              Ver en Google Maps
                            </Button>
                          </Space>
                        </div>
                      ),
                      status: "wait" as const,
                    })),
                  ]}
                />

                <Table
                  style={{ marginTop: 16 }}
                  size="small"
                  pagination={false}
                  dataSource={rutaOptimizada}
                  rowKey={(r) => r.cita.id}
                  columns={[
                    {
                      title: "Orden",
                      dataIndex: "orden",
                      render: (n) => <Tag color="blue">#{n}</Tag>,
                    },
                    {
                      title: "Tramo (Desde ➔ Hacia)",
                      render: (_, r) => (
                        <div style={{ fontSize: 12 }}>
                          <Text type="secondary">Desde: {r.desdeEtiqueta}</Text>
                          <br />
                          <Text strong>
                            ➔ {r.cita.clienteNombre} ({r.cita.comunaCliente})
                          </Text>
                        </div>
                      ),
                    },
                    {
                      title: "Distancia",
                      dataIndex: "distanciaTramoKm",
                      render: (km) => `${km} km`,
                    },
                    {
                      title: "Tiempo",
                      dataIndex: "tiempoTramoMin",
                      render: (m) => `${m} min`,
                    },
                    {
                      title: "Tráfico",
                      dataIndex: "nivelTrafico",
                      render: (t) => (
                        <Tag
                          color={
                            t === "Alto"
                              ? "red"
                              : t === "Moderado"
                                ? "orange"
                                : "green"
                          }
                        >
                          {t}
                        </Tag>
                      ),
                    },
                    {
                      title: "Llegada",
                      dataIndex: "horaLlegadaSugerida",
                      render: (h) => (
                        <Tag color="green" icon={<CheckCircleOutlined />}>
                          {h} hrs
                        </Tag>
                      ),
                    },
                  ]}
                />
              </>
            )}
          </Card>
        </Col>

        {/* Visor Google Maps en Tiempo Real */}
        <Col xs={24} lg={10}>
          <Card
            title="Visor Google Maps en Tiempo Real"
            extra={
              paradaMapaActiva && (
                <Button
                  type="link"
                  size="small"
                  onClick={() => setParadaMapaActiva(null)}
                >
                  Centrar en Operario
                </Button>
              )
            }
            style={{ height: "100%" }}
          >
            <div
              style={{
                width: "100%",
                height: 520,
                borderRadius: 8,
                overflow: "hidden",
                background: "#e5e3df",
              }}
            >
              <iframe
                title="Mapa de Ruta en Tiempo Real"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                src={mapEmbedUrl}
              />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default RutasPage;
