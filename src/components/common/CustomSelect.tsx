import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { cn } from "../ui/utils";

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
  hasError?: boolean;
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
  hasError = false,
}: CustomSelectProps) {
  const handleChange = (val: string) => {
    if (onValueChange) {
      onValueChange(val);
    }
    if (onChange) {
      onChange({ target: { value: val } });
    }
  };

  // Garante que se o valor for vazio string ou se pertencer a uma escola anterior (não existente nas opções),
  // o Radix Select trata como undefined para mostrar o placeholder limpo
  const isValueInOptions =
    value === undefined ||
    value === "" ||
    options.some((opt) => opt.value === value);

  const safeValue =
    value === "" || !isValueInOptions ? undefined : value;

  return (
    <div className={className}>
      <Select
        value={safeValue}
        defaultValue={defaultValue}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger
          size={triggerClassName?.includes("h-auto") ? undefined : size}
          className={cn(
            triggerClassName,
            hasError && "!border-destructive focus:!ring-destructive focus:!border-destructive"
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent
          className={cn(
            "w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)]",
            contentClassName
          )}
        >
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

