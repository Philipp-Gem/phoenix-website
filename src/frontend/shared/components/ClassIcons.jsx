// src/frontend/shared/components/Icon.jsx
import React from "react";

export default function Icon({ src, alt = "", size = 16, title, className = "" }) {
  if (!src) return null;
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={alt}
      title={title || alt}
      loading="lazy"
      className={`inline-block align-text-bottom ${className}`}
      style={{ objectFit: "contain" }}
    />
  );
}
