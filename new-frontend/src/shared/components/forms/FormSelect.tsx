import * as React from 'react';
import type { SelectProps } from '@/shared/components/ui/select';
import { Select } from '@/shared/components/ui/select';
import type { UseFormRegisterReturn } from 'react-hook-form';

export interface FormSelectProps extends Omit<SelectProps, 'error'> {
  registration?: Partial<UseFormRegisterReturn>;
  error?: string;
}

const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ registration, error, children, ...props }, ref) => {
    return (
      <Select ref={ref} error={error} {...registration} {...props}>
        {children}
      </Select>
    );
  }
);
FormSelect.displayName = 'FormSelect';

export { FormSelect };
