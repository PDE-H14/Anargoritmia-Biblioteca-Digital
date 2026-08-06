import React from "react";
import { Button, Icon } from "semantic-ui-react";
import { map } from "lodash";
import "./HeaderPage.scss";

export function HeaderPage(props) {
  const { title, btnActions, className } = props;

  return (
    <div className={`header-page-admin ${className || ""}`}>
      <h2>{title}</h2>

      <div className="header-page-admin__actions">
        {map(btnActions, (btn, index) => {
          if (!btn) return null;
          return (
            <Button
              key={index}
              onClick={btn.action}
              className={`header-page-admin__btn header-page-admin__btn--${btn.variant || "primary"}`}
              icon={!!btn.icon}
              labelPosition={btn.icon ? "left" : undefined}
            >
              {btn.icon && <Icon name={btn.icon} />}
              {btn.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
