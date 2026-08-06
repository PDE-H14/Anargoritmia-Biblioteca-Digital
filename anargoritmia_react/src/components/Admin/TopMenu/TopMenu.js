import React from "react";
import { Icon, Menu } from "semantic-ui-react";
import logo from "../../../assets/images/logoAnargoritmia.png";
import { useAuth } from "../../../hooks";
import "./TopMenu.scss";

export function TopMenu(props) {
  const { toggleSidebar, isSidebarCollapsed } = props;
  const { auth, logout } = useAuth();

  const renderName = () => {
    if (auth.me?.first_name && auth.me?.last_name) {
      return `${auth.me.first_name} ${auth.me.last_name}`;
    } else if (auth.me?.username) {
      return `${auth.me.username}`;
    }
    return auth.me?.email;
  };

  return (
    <Menu borderless className="top-menu-admin">
      <Menu.Item
        className={`top-menu-admin__logo ${isSidebarCollapsed ? "collapsed" : ""}`}
      >
        <img src={logo} className="logo" alt="Anargoritmia" />
        {!isSidebarCollapsed && <h1>Anargoritmia</h1>}
      </Menu.Item>

      <Menu.Item className="top-menu-admin__toggle" onClick={toggleSidebar}>
        <Icon name={isSidebarCollapsed ? "indent" : "outdent"} />
      </Menu.Item>
      <Menu.Menu position="right">
        <Menu.Item className="top-menu-admin__saludo">
          Hola, {renderName()}
        </Menu.Item>
        <Menu.Item className="top-menu-admin__logout" onClick={logout}>
          <Icon name="sign-out" />
        </Menu.Item>
      </Menu.Menu>
    </Menu>
  );
}
