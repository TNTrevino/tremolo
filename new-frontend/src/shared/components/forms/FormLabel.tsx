import * as React from "react";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/lib/utils";

export interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <Label
        ref={ref}
        className={cn("block mb-1.5", className)}
        {...props}
      >
        {children}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
    );
  }
);
FormLabel.displayName = "FormLabel";

export { FormLabel };
