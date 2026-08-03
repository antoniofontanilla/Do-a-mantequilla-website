import { MainLayout } from "./components/layout/MainLayout";
import { ClientesPage } from "./pages/clientes/ClientesPage";

export default function App() {
  return (
    <MainLayout>
      <ClientesPage />
    </MainLayout>
  );
}
