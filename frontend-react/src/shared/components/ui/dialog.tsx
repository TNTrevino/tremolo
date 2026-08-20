import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface DialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	children: React.ReactNode;
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
	React.useEffect(() => {
		if (open) {
			document.body.classList.add("overflow-hidden");
		} else {
			document.body.classList.remove("overflow-hidden");
		}
		return () => {
			document.body.classList.remove("overflow-hidden");
		};
	}, [open]);

	if (!open) return null;

	return createPortal(
		<DialogOverlay onClose={() => onOpenChange(false)}>
			{children}
		</DialogOverlay>,
		document.body,
	);
}
Dialog.displayName = "Dialog";

interface DialogOverlayProps {
	onClose: () => void;
	children: React.ReactNode;
}

function DialogOverlay({ onClose, children }: DialogOverlayProps) {
	return (
		<div
			role="button"
			tabIndex={-1}
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
		>
			{children}
		</div>
	);
}
DialogOverlay.displayName = "DialogOverlay";

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
	onOpenChange?: (open: boolean) => void;
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
	({ className, onOpenChange, children, ...props }, ref) => {
		React.useEffect(() => {
			if (!onOpenChange) return;

			function handleKeyDown(e: KeyboardEvent) {
				if (e.key === "Escape") {
					onOpenChange!(false);
				}
			}

			document.addEventListener("keydown", handleKeyDown);
			return () => document.removeEventListener("keydown", handleKeyDown);
		}, [onOpenChange]);

		return (
			<div
				ref={ref}
				role="dialog"
				aria-modal="true"
				className={cn(
					"max-w-2xl w-full mx-4 rounded-lg border border-border bg-background text-foreground shadow-lg",
					className,
				)}
				{...props}
			>
				{children}
			</div>
		);
	},
);
DialogContent.displayName = "DialogContent";

const DialogHeader = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn(
			"flex flex-col space-y-1.5 border-b border-border p-6",
			className,
		)}
		{...props}
	/>
));
DialogHeader.displayName = "DialogHeader";

const DialogTitle = React.forwardRef<
	HTMLHeadingElement,
	React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
	<h2
		ref={ref}
		className={cn(
			"text-lg font-semibold leading-none tracking-tight",
			className,
		)}
		{...props}
	>
		{children}
	</h2>
));
DialogTitle.displayName = "DialogTitle";

const DialogFooter = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn(
			"flex items-center justify-end gap-2 border-t border-border p-6",
			className,
		)}
		{...props}
	/>
));
DialogFooter.displayName = "DialogFooter";

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter };
