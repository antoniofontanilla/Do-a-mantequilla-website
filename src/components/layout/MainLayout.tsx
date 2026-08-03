import React, { useState } from "react";
import { Layout, Menu, Typography, Avatar, Space } from "antd";
import {
  UserOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  ToolOutlined,
  RobotOutlined,
  DashboardOutlined,
  BellOutlined,
} from "@ant-design/icons";

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { key: "1", icon: <DashboardOutlined />, label: "Dashboard" },
    { key: "2", icon: <UserOutlined />, label: "Gestión de Clientes" },
    { key: "3", icon: <CalendarOutlined />, label: "Agenda & Servicios" },
    { key: "4", icon: <EnvironmentOutlined />, label: "Rutas e IA" },
    { key: "5", icon: <ToolOutlined />, label: "Mantenciones" },
    { key: "6", icon: <RobotOutlined />, label: "IA Sugerencias" },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Menú Lateral */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        theme="dark"
        width={240}
      >
        <div
          style={{
            padding: "16px",
            textAlign: "center",
            background: "#001529",
          }}
        >
          <Title level={4} style={{ color: "#fff", margin: 0 }}>
            {collapsed ? "DM" : "Doña Mantequilla"}
          </Title>
          {!collapsed && (
            <Text style={{ color: "#8c8c8c", fontSize: "12px" }}>
              Gestión Inteligente
            </Text>
          )}
        </div>
        <Menu
          theme="dark"
          defaultSelectedKeys={["2"]}
          mode="inline"
          items={menuItems}
        />
      </Sider>

      {/* Estructura Principal */}
      <Layout>
        {/* Cabecera */}
        <Header
          style={{
            padding: "0 24px",
            background: "#fff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Title level={4} style={{ margin: 0 }}>
            Sistema de Gestión Operativa
          </Title>
          <Space size="large">
            <BellOutlined style={{ fontSize: "18px", cursor: "pointer" }} />
            <Space>
              <Avatar
                icon={<UserOutlined />}
                style={{ backgroundColor: "#1890ff" }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  lineHeight: "1.2",
                }}
              >
                <Text strong>Ejecutivo Comercial</Text>
                <Text style={{ fontSize: "12px", color: "#8c8c8c" }}>
                  Doña Mantequilla
                </Text>
              </div>
            </Space>
          </Space>
        </Header>

        {/* Contenido Dinámico */}
        <Content
          style={{
            margin: "24px 16px",
            padding: 24,
            background: "#fff",
            minHeight: 280,
            borderRadius: "8px",
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};
