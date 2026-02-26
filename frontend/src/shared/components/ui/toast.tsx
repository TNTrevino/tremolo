import * as React from "react";
import {
	X,
	CheckCircle2,
	AlertCircle,
	Info,
	AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
	id: string;
	type: ToastType;
	title?: string;
	message: string;
	duration?: number;
}

interface ToastItemProps {
	toast: Toast;
	onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
	const [isExiting, setIsExiting] = React.useState(false);

	React.useEffect(() => {
		const duration = toast.duration ?? 5000;

		if (duration > 0) {
			const exitTimer = setTimeout(() => {
				setIsExiting(true);
			}, duration - 300);

			const closeTimer = setTimeout(() => {
				onClose(toast.id);
			}, duration);

			return () => {
				clearTimeout(exitTimer);
				clearTimeout(closeTimer);
			};
		}
		return undefined;
	}, [toast.id, toast.duration, onClose]);

	const handleClose = () => {
		setIsExiting(true);
		setTimeout(() => onClose(toast.id), 300);
	};

	const getIcon = () => {
		switch (toast.type) {
			case "success":
				return <CheckCircle2 className="h-5 w-5 text-green-500" />;
			case "error":
				return <AlertCircle className="h-5 w-5 text-red-500" />;
			case "warning":
				return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
			case "info":
				return <Info className="h-5 w-5 text-blue-500" />;
			default:
				return null;
		}
	};

	const getVariantClasses = () => {
		switch (toast.type) {
			case "success":
				return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
			case "error":
				return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
			case "warning":
				return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
			case "info":
				return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
			default:
				return "bg-background border-border";
		}
	};

	return (
		<div
			className={cn(
				"pointer-events-auto flex w-full max-w-md gap-3 rounded-lg border-2 p-4 shadow-lg transition-all duration-300",
				getVariantClasses(),
				isExiting
					? "translate-x-full opacity-0"
					: "translate-x-0 opacity-100 animate-in slide-in-from-right",
			)}
			role="alert"
		>
			<div className="flex-shrink-0">{getIcon()}</div>
			<div className="flex-1 space-y-1">
				{toast.title && (
					<p className="text-sm font-semibold text-foreground">{toast.title}</p>
				)}
				<p className="text-sm text-muted-foreground">{toast.message}</p>
			</div>
			<button
				onClick={handleClose}
				className="flex-shrink-0 rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
				aria-label="Close notification"
			>
				<X className="h-4 w-4" />
			</button>
		</div>
	);
};

export const ToastContainer: React.FC<{
	toasts: Toast[];
	onClose: (id: string) => void;
}> = ({ toasts, onClose }) => {
	if (toasts.length === 0) return null;

	return (
		<div
			className="pointer-events-none fixed top-0 right-0 z-50 flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:top-4 sm:right-4 sm:w-auto sm:max-w-md"
			aria-live="polite"
			aria-atomic="true"
		>
			{toasts.map((toast) => (
				<ToastItem key={toast.id} toast={toast} onClose={onClose} />
			))}
		</div>
	);
};
