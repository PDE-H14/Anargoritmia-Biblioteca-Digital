import React from "react";
import { Table, Image, Icon, Button } from "semantic-ui-react";
import { map } from "lodash";

import "./CategoriesTable.scss";

import imagenNotFound from "../../../../assets/images/Imagen_No_Encontrada.png";

export function CategoriesTable(props) {
  const { categories } = props;

  return (
    <Table className="categories-table-admin">
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell textAlign="center">Portada</Table.HeaderCell>
          <Table.HeaderCell>Título</Table.HeaderCell>
          <Table.HeaderCell>Ficha</Table.HeaderCell>
          <Table.HeaderCell className="description-cell">
            Descripción
          </Table.HeaderCell>
          <Table.HeaderCell>Padres</Table.HeaderCell>
          <Table.HeaderCell textAlign="center">Acciones</Table.HeaderCell>
        </Table.Row>
      </Table.Header>

      <Table.Body>
        {map(categories, (category) => (
          <Table.Row key={category.id_categoria}>
            <Table.Cell textAlign="center">
              <Image src={category.imagen_portada || imagenNotFound} centered />
            </Table.Cell>
            <Table.Cell>{category.nombre}</Table.Cell>
            <Table.Cell>{category.ficha}</Table.Cell>
            <Table.Cell className="description-cell">
              {category.descripcion}
            </Table.Cell>
            <Table.Cell>
              {category.padres ? category.padres : "Raíz"}
            </Table.Cell>

            <Actions
              category={category}
              updateUser={() => console.log("actualizar")}
              onDeleteUser={() => console.log("eliminar")}
            />
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}

function Actions(props) {
  const { category, updateUser, onDeleteUser } = props;
  return (
    <Table.Cell textAlign="center">
      <Button className="edit" icon onClick={() => updateUser(category)}>
        <Icon name="pencil" />
      </Button>
      <Button className="delete" icon onClick={() => onDeleteUser(category)}>
        <Icon name="trash alternate" />
      </Button>
    </Table.Cell>
  );
}
