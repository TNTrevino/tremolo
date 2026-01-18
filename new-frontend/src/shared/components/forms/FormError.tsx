import * as React from "react";
import { cn } from "@/lib/utils";

export interface FormErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children?: React.ReactNode;
}

const FormError = React.forwardRef<HTMLParagraphElement, FormErrorProps>(
  ({ className, children, ...props }, ref) => {
    if (!children) return null;

    return (
      <p
        ref={ref}
        className={cn("mt-1 text-sm text-destructive font-medium", className)}
        {...props}
      >
        {children}
      </p>
    );
  }
);
FormError.displayName = "FormError";

export { FormError };
