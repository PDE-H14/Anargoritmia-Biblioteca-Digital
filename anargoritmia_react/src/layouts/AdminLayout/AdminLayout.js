import React, { useState } from "react";
import "./AdminLayout.scss";
import { LoginAdmin } from "../../pages/Admin";
import { TopMenu, SideMenu } from "../../components/Admin";
import { useAuth } from "../../hooks";

export function AdminLayout(props) {
  const { children } = props;
  const { auth } = useAuth();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  if (!auth) return <LoginAdmin />;

  //if (!auth.me?.is_staff) return <Navigate to="/admin" replace />;

  return (
    <div
      className={`admin-layout ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}
    >
      <div className="admin-layout__top-menu">
        <TopMenu
          toggleSidebar={toggleSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
        />
      </div>
      <div className="admin-layout__main-container">
        <SideMenu isCollapsed={isSidebarCollapsed}>{children}</SideMenu>
      </div>
    </div>
  );
}
