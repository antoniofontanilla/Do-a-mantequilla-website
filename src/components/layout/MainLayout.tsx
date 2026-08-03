import React, { useState } from "react";
import { Layout, Menu, Button, theme } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  UserOutlined,
  CalendarOutlined,
  CompassOutlined,
  ToolOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";

const { Header, Sider, Content } = Layout;

export const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  return (
    <Layout style={{ minHeight: "100vh", width: "100vw", overflowX: "hidden" }}>
      {/* SIDEBAR RESPONSIVO */}
      <Sider
        breakpoint="lg" // En pantallas menores a 'lg' (tablets/celulares) se colapsa solo
        collapsedWidth="0" // Ancho 0 cuando está colapsado en móvil
        trigger={null}
        collapsible
        collapsed={collapsed}
        onBreakpoint={(broken) => {
          // Se colapsa automáticamente si la pantalla es de celular
          if (broken) setCollapsed(true);
        }}
        style={{
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 1000, // Queda por encima del contenido en celular al abrirse
        }}
      >
        <div style={{ padding: "16px", textAlign: "center", color: "#fff" }}>
          <h3 style={{ color: "#fff", margin: 0, fontSize: "1.1rem" }}>
            Doña Mantequilla
          </h3>
          <p style={{ color: "#8c8c8c", margin: 0, fontSize: "0.75rem" }}>
            Gestión Inteligente
          </p>
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={({ key }) => {
            navigate(key);
            // Si está en celular, se cierra el menú al hacer clic en un elemento
            if (window.innerWidth < 992) {
              setCollapsed(true);
            }
          }}
          items={[
            { key: "/", icon: <DashboardOutlined />, label: "Dashboard" },
            {
              key: "/clientes",
              icon: <UserOutlined />,
              label: "Gestión de Clientes",
            },
            {
              key: "/agenda",
              icon: <CalendarOutlined />,
              label: "Agenda & Servicios",
            },
            { key: "/rutas", icon: <CompassOutlined />, label: "Rutas e IA" },
            {
              key: "/mantenciones",
              icon: <ToolOutlined />,
              label: "Mantenciones",
            },
            {
              key: "/sugerencias",
              icon: <RobotOutlined />,
              label: "IA Sugerencias",
            },
          ]}
        />
      </Sider>

      {/* CONTENEDOR PRINCIPAL */}
      <Layout
        style={{
          // Margen dinámico: Si el menú está abierto en PC corre el contenido, en móvil no.
          marginLeft: collapsed ? 0 : window.innerWidth < 992 ? 0 : 200,
          transition: "all 0.2s",
          minHeight: "100vh",
          width: "100%",
          overflowX: "hidden",
        }}
      >
        <Header
          style={{
            padding: "0 16px",
            background: colorBgContainer,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 999,
            boxShadow: "0 1px 4px rgba(0,21,41,0.08)",
          }}
        >
          {/* BOTÓN PARA ABRIR/CERRAR MENÚ */}
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: "18px", width: 40, height: 40 }}
          />

          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
            Sistema de Gestión
          </span>
        </Header>

        {/* ÁREA DE CONTENIDO (PÁGINAS) */}
        <Content
          style={{
            margin: "12px 8px",
            padding: "12px",
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflowX: "auto", // Asegura que la tabla no rompa el ancho total
          }}
        >
          <Outlet /> {/* Aquí carga ClientesPage, Dashboard, etc. */}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
