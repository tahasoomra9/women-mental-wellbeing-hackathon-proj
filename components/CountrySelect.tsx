"use client";

import { Selector } from "@astryxdesign/core/Selector";
import { COUNTRIES, DEFAULT_COUNTRY } from "@/lib/safety";

const OPTIONS = COUNTRIES.map((c) => ({ value: c.code, label: c.name }));

export default function CountrySelect({
  value,
  onChange,
  size = "md",
  width,
}: {
  value?: string;
  onChange: (code: string) => void;
  size?: "sm" | "md" | "lg";
  width?: number | string;
}) {
  return (
    <Selector
      label="Country"
      isLabelHidden
      options={OPTIONS}
      value={value ?? DEFAULT_COUNTRY}
      onChange={onChange}
      size={size}
      width={width}
    />
  );
}
