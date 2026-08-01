import React from "react";
import { Modal } from "semantic-ui-react";

import "./BasicModal.scss";

export function BasicModal(props) {
  const { show, size, title, children, onClose } = props;
  return (
    <Modal className="basic-modal" open={show} onClose={onClose} size={size}>
      {title && <Modal.Header>{title}</Modal.Header>}
      <Modal.Content>{children}</Modal.Content>
    </Modal>
  );
}
BasicModal.defaultProps = {
  size: "tiny",
};
