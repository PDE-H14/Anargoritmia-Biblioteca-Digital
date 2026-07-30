import React from "react";
import "./AdminLayout.scss";
import { LoginAdmin } from "../../pages/Admin";
import { TopMenu, SideMenu } from "../../components/Admin";
import { useAuth } from "../../hooks/";

export function AdminLayout(props) {
  const { children } = props;
  const { auth } = useAuth();
  if (!auth) return <LoginAdmin />;
  return (
    <div className="admin-layout">
      <div className="admin-layout__top-menu">
        <TopMenu />
      </div>
      <div className="admin-layout__main-content">
        <SideMenu>{children}</SideMenu>
      </div>
    </div>
  );
}
