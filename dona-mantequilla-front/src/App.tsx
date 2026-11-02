import { useState } from "react";
import { MainLayout } from "./components/layout/MainLayout";
import { ClientesPage } from "./pages/clientes/ClientesPage";
import ServiciosPage from "./pages/servicios/ServiciosPage";
import { GestionCitas } from "./components/GestionCitas";
import PanelSugerenciasIA from "./components/PanelSugerenciasIA";
import { Cita } from "./types/cita";
import { MOCK_CITAS_EXTENDIDO } from "./data/mockClientes";

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<string>("/sugerencias");
  const [citas] = useState<Cita[]>(MOCK_CITAS_EXTENDIDO);

  const renderContent = () => {
    switch (currentRoute) {
      case "/":
        return (
          <div style={{ padding: 16 }}>
            <h2>Dashboard</h2>
            <p>Resumen general del sistema.</p>
          </div>
        );

      case "/clientes":
        return <ClientesPage />;

      case "/servicios":
        return <ServiciosPage />;

      case "/agenda":
        return <GestionCitas clientes={[]} serviciosDisponibles={[]} />;

      case "/rutas":
        return (
          <div style={{ padding: 16 }}>
            <h2>Rutas e IA</h2>
            <p>Monitoreo de georreferenciación y rutas activas.</p>
          </div>
        );

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
