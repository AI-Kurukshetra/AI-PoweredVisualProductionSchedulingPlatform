"use client";

import type { InputHTMLAttributes } from "react";

type DateTimeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export default function DateTimeInput({ onChange, ...props }: DateTimeInputProps) {
  return (
    <input
      {...props}
      type="datetime-local"
      onChange={(event) => {
        onChange?.(event);
        event.currentTarget.blur();
      }}
    />
  );
}

