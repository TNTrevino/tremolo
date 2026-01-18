import * as React from "react";
import { Input, InputProps } from "@/shared/components/ui/input";
import { UseFormRegisterReturn } from "react-hook-form";

export interface FormInputProps extends Omit<InputProps, 'error'> {
  registration?: Partial<UseFormRegisterReturn>;
  error?: string;
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ registration, error, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        error={error}
        {...registration}
        {...props}
      />
    );
  }
);
FormInput.displayName = "FormInput";

export { FormInput };
