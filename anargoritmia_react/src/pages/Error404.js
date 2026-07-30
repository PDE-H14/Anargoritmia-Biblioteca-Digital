import React from "react";
import { Icon } from "semantic-ui-react";

import logo from "../assets/images/logoAnargoritmia.png";

export function Error404() {
  return (
    <div className="error404">
      <div className="error404__content">
        <img src={logo} className="login-admin__logo" alt="" />
        <h1>Esta página no existe.</h1>
        <h2>¡Te perdiste en un grafo dirigido! </h2>
        <Icon name="blind" />
      </div>
    </div>
  );
}
