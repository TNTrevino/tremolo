import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
	error?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
	({ className, error, children, ...props }, ref) => {
		return (
			<div className="w-full relative">
				<select
					className={cn(
						"flex h-10 w-full appearance-none rounded-md border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
						error && "border-destructive focus-visible:ring-destructive",
						className,
					)}
					ref={ref}
					{...props}
				>
					{children}
				</select>
				<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
			</div>
		);
	},
);
Select.displayName = "Select";

export { Select };
