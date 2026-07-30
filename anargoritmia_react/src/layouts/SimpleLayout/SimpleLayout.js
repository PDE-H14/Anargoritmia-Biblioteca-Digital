import React from "react"

import "./SimpleLayout.scss"

export function SimpleLayout(props){
  const { children } = props;
  return (
    <div className="simple">
      {children}
    </div>
  );
}