import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface CustomSelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onChange?: (e: { target: { value: string } } | string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  size?: "sm" | "default";
  disabled?: boolean;
}

export default function CustomSelect({
  value,
  defaultValue,
  onValueChange,
  onChange,
  options,
  placeholder = "Selecionar...",
  className,
  triggerClassName,
  contentClassName,
  size = "default",
  disabled = false,
}: CustomSelectProps) {
  const handleChange = (val: string) => {
    if (onValueChange) {
      onValueChange(val);
    }
    if (onChange) {
      onChange({ target: { value: val } });
    }
  };

  // Garante que se o valor for vazio string, o Radix Select trata como undefined para mostrar o placeholder
  const safeValue = value === "" ? undefined : value;

  return (
    <div className={className}>
      <Select
        value={safeValue}
        defaultValue={defaultValue}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger size={size} className={triggerClassName}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className={contentClassName}>
          {options.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

