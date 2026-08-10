import React from "react";
import { Table, Image, Icon, Button, Label } from "semantic-ui-react";
import { map } from "lodash";

import "./CategoriesTable.scss";

import imagenNotFound from "../../../../assets/images/Imagen_No_Encontrada.png";

export function CategoriesTable(props) {
  const { categories, onUpdateCategory, onDeleteCategory } = props;

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
          <Table.HeaderCell textAlign="center">Padres</Table.HeaderCell>
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
            <Table.Cell
              className="parents-cell"
              textAlign={
                category.padres && category.padres.length > 0
                  ? "left"
                  : "center"
              }
            >
              {category.padres && category.padres.length > 0
                ? map(category.padres, (padre, index) => (
                    <Label
                      key={index}
                      color="grey"
                      size="small"
                      style={{ margin: "2px" }}
                    >
                      {padre}
                    </Label>
                  ))
                : "Raíz"}
            </Table.Cell>

            <Actions
              category={category}
              onUpdateCategory={onUpdateCategory}
              onDeleteCategory={onDeleteCategory}
            />
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}

function Actions(props) {
  const { category, onUpdateCategory, onDeleteCategory } = props;
  return (
    <Table.Cell textAlign="center">
      <Button className="edit" icon onClick={() => onUpdateCategory(category)}>
        <Icon name="pencil" />
      </Button>
      <Button
        className="delete"
        icon
        onClick={() => onDeleteCategory(category)}
      >
        <Icon name="trash alternate" />
      </Button>
    </Table.Cell>
  );
}
