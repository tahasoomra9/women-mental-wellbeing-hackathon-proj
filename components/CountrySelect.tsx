"use client";

import { COUNTRIES, DEFAULT_COUNTRY } from "@/lib/safety";

export default function CountrySelect({
  value,
  onChange,
  className = "",
  id,
}: {
  value?: string;
  onChange: (code: string) => void;
  className?: string;
  id?: string;
}) {
  return (
    <select
      id={id}
      value={value ?? DEFAULT_COUNTRY}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-xl border border-line bg-bg px-3 py-2 text-ink outline-none focus:border-primary ${className}`}
    >
      {COUNTRIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
