import React from "react";
import { Button, Icon } from "semantic-ui-react";

import "./DeleteZone.scss";

export function DeleteZone(props) {
  const { openDeleteModal } = props;
  return (
    <div className="danger-zone">
      <h3>Zona de peligro de la cuenta</h3>
      <p>
        Al presionar este botón iniciarás el proceso de borrado de tu cuenta.
        Tus aportes teóricos se conservarán bajo la autoría de la comunidad,
        pero tu registro personal será destruido.
      </p>
      <Button className="danger-zone__btn" onClick={openDeleteModal} negative>
        <Icon name="trash alternate" /> Eliminar mi cuenta de forma permanente
      </Button>
    </div>
  );
}
