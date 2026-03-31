import React from "react";
export default function Panel({ className = "", ...rest }) {
  return <div className={("card " + className).trim()} {...rest} />;
}
