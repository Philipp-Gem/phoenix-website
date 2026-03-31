import React from "react";
export default function Button({ as: As = "button", className = "", ...rest }) {
  return <As className={("btn " + className).trim()} {...rest} />;
}
