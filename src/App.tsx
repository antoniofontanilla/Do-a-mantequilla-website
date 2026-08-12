import { useState } from "react";
import { MainLayout } from "./components/layout/MainLayout";
import { ClientesPage } from "./pages/clientes/ClientesPage";
import ServiciosPage from "./pages/servicios/ServiciosPage";
import { GestionCitas } from "./components/GestionCitas";

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<string>("/clientes");

  // Función para renderizar la pantalla según la opción seleccionada
  const renderContent = () => {
    switch (currentRoute) {
      case "/clientes":
        return <ClientesPage />;
      case "/servicios":
        return <ServiciosPage />;
      case "/agenda":
        return <GestionCitas clientes={[]} serviciosDisponibles={[]} />;
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
