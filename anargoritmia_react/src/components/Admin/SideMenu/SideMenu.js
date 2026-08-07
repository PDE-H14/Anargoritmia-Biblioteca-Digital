import React from "react";
import { Icon, Menu } from "semantic-ui-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../../hooks";
import "./SideMenu.scss";

export function SideMenu(props) {
  const { children, isCollapsed } = props;
  const { pathname } = useLocation();

  return (
    <div className={`side-menu-layout ${isCollapsed ? "collapsed" : ""}`}>
      <div className="side-menu-admin">
        <MenuLeft pathname={pathname} isCollapsed={isCollapsed} />
      </div>
      <div className="content-frame">{children}</div>
    </div>
  );
}

function MenuLeft(props) {
  const { pathname } = props;
  const { auth } = useAuth();

  return (
    <Menu borderless className="side" vertical>
      <Menu.Item as={Link} to={"/admin"} active={pathname === "/admin"}>
        <Icon name="home" />
        <span>Recientes</span>
      </Menu.Item>

      <Menu.Item
        as={Link}
        to={"/admin/my-notes"}
        active={pathname === "/admin/my-notes"}
      >
        <Icon name="book" />
        <span>Mis notas</span>
      </Menu.Item>

      {auth.me?.is_staff && (
        <Menu.Item
          as={Link}
          to={"/admin/categories"}
          active={pathname === "/admin/categories"}
        >
          <Icon name="folder" />
          <span>Categorías</span>
        </Menu.Item>
      )}

      <Menu.Item
        as={Link}
        to={"/admin/create"}
        active={pathname === "/admin/create"}
      >
        <Icon name="edit outline" />
        <span>Creación</span>
      </Menu.Item>

      {auth.me?.is_staff && (
        <Menu.Item
          as={Link}
          to={"/admin/users"}
          active={pathname === "/admin/users"}
        >
          <Icon name="users" />
          <span>Usuarios</span>
        </Menu.Item>
      )}

      <Menu.Item as={Link} to={"/admin/me"} active={pathname === "/admin/me"}>
        <Icon name="address card" />
        <span>Mis datos</span>
      </Menu.Item>
    </Menu>
  );
}
