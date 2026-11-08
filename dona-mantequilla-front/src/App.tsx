import { useState, useEffect } from "react";
import { MainLayout } from "./components/layout/MainLayout";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { ClientesPage } from "./pages/clientes/ClientesPage";
import ServiciosPage from "./pages/servicios/ServiciosPage";
import { GestionCitas } from "./components/GestionCitas";
import { RutasPage } from "./pages/rutas/RutasPage";
import PanelSugerenciasIA from "./components/PanelSugerenciasIA";
import { Cita } from "./types/cita";
import { Cliente } from "./types/cliente";
import { MOCK_CITAS_EXTENDIDO, MOCK_CLIENTES } from "./data/mockClientes";
import { SERVICIOS_BASE } from "./utils/serviciosData";
import { API_BASE_URL } from "./config/apiConfig";

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<string>("/agenda");
  const [citas] = useState<Cita[]>(MOCK_CITAS_EXTENDIDO);
  const [clientes, setClientes] = useState<Cliente[]>(MOCK_CLIENTES);

  // Sincroniza clientes reales desde MySQL al cargar o al entrar a /agenda
  useEffect(() => {
    const fetchClientesBD = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/clientes`);
        const data = await response.json();
        if (response.ok && Array.isArray(data) && data.length > 0) {
          const clientesBD: Cliente[] = data.map((item: any) => ({
            id: item.id.toString(),
            nombreCompleto: item.nombre,
            rut: item.rut,
            telefono: item.telefono || "",
            email: item.email || "",
            direccion: item.direccion,
            comuna: item.comuna,
            region: item.region,
            direccionValidada: true,
            latitud: item.latitud ? Number(item.latitud) : undefined,
            longitud: item.longitud ? Number(item.longitud) : undefined,
            createdAt: "2026-11-07",
            distanciaKm: item.distancia_km ? Number(item.distancia_km) : 5,
            tiempoTrasladoMinutos: item.tiempo_traslado_min
              ? Number(item.tiempo_traslado_min)
              : 15,
          }));
          setClientes(clientesBD);
        }
      } catch {
        // Si el backend no está encendido, se mantiene MOCK_CLIENTES
      }
    };
    fetchClientesBD();
  }, [currentRoute]);

  const renderContent = () => {
    switch (currentRoute) {
      case "/":
        return <DashboardPage />;

      case "/clientes":
        return <ClientesPage />;

      case "/servicios":
        return <ServiciosPage />;

      case "/agenda":
        return (
          <GestionCitas
            clientes={clientes}
            serviciosDisponibles={SERVICIOS_BASE}
          />
        );

      case "/rutas":
        return <RutasPage citas={citas} />;

      case "/mantenciones":
        return (
          <div style={{ padding: 16 }}>
            <h2>Mantenciones</h2>
            <p>Gestión de mantenimiento programado.</p>
          </div>
        );

      case "/sugerencias":
        return <PanelSugerenciasIA citas={citas} />;

      default:
        return <ClientesPage />;
    }
  };

  return (
    <MainLayout
      activeKey={currentRoute}
      onSelectMenu={(key) => setCurrentRoute(key)}
    >
      {renderContent()}
    </MainLayout>
  );
}
