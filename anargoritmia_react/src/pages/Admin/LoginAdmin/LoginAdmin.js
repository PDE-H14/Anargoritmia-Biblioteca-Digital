import React from "react";
import "./LoginAdmin.scss";
import { LoginForm } from "../../../components/Admin";
import logo from "../../../assets/images/logoAnargoritmia.png";

export function LoginAdmin() {
  return (
    <div className="login-admin">
      <div className="login-admin__content">
        <img src={logo} className="login-admin__logo" />
        <h1>INICIAR SESIÓN</h1>
        <LoginForm />
      </div>
    </div>
  );
}
