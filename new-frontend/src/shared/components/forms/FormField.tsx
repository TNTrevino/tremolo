import * as React from "react";
import { FormLabel } from "./FormLabel";
import { FormError } from "./FormError";
import { cn } from "@/lib/utils";

export interface FormFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required,
  children,
  className,
  htmlFor,
}) => {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <FormLabel htmlFor={htmlFor} required={required}>
          {label}
        </FormLabel>
      )}
      {children}
      <FormError>{error}</FormError>
    </div>
  );
};
FormField.displayName = "FormField";

export { FormField };
