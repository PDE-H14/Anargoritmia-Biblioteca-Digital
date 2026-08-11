import React from "react";
import { Card, Icon, Image } from "semantic-ui-react";
import logoAnargoritmia from "../../../../assets/images/logoAnargoritmia.png";
import "./MyData.scss";

export function MyData(props) {
  const { userData } = props;

  return (
    <Card fluid className="me-card">
      <Card.Content className="me-card__content">
        <div className="me-card__info">
          <Card.Header>
            <Icon name="user circle" /> @{userData.username}
          </Card.Header>
          <Card.Meta>Identificador único: {userData.id}</Card.Meta>
          <Card.Description>
            <div className="me-detail">
              <strong>Nombre:</strong>
              {userData.first_name || "No proporcionado"}
            </div>
            <div className="me-detail">
              <strong>Apellidos:</strong>{" "}
              {userData.last_name || "No proporcionado"}
            </div>
            <div className="me-detail">
              <strong>Correo electrónico:</strong>
              <code>{userData.email}</code>
            </div>
          </Card.Description>
        </div>

        <div className="me-card__logo">
          <Image src={logoAnargoritmia} size="small" />
        </div>
      </Card.Content>
    </Card>
  );
}
