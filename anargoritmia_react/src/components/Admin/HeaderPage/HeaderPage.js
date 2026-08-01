import React from "react";
import { Button } from "semantic-ui-react";

import "./HeaderPage.scss";

export function HeaderPage(props) {
  const { title, button1, action1, button2, action2 } = props;
  return (
    <div className="header-page-admin">
      <div>
        <h2>{title}</h2>
      </div>
      <div>
        {button1 && (
          <Button
            positive
            className={button1.replace(" ", "-")}
            onClick={action1}
          >
            {button1}
          </Button>
        )}
        {button2 && <Button negative>{button2}</Button>}
      </div>
    </div>
  );
}
