import { Link } from "react-router-dom";
import { Copy, Check, Users } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { useCopyToClipboard } from "@/shared/hooks";
import type { Class } from "@/features/classes/types";

interface ClassCardProps {
	classItem: Class;
}

export function ClassCard({ classItem }: ClassCardProps) {
	const { copied, copy } = useCopyToClipboard();

	function handleCopy(e: React.MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		void copy(classItem.joinCode);
	}

	return (
		<Link to={`/classes/${classItem.id}`} className="block">
			<Card className="h-full transition-colors hover:bg-accent/50">
				<CardContent className="p-4 space-y-4">
					<div className="flex items-start justify-between gap-2">
						<h3 className="font-display text-lg font-semibold truncate">
							{classItem.name}
						</h3>
						<span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
							<Users className="h-3.5 w-3.5" />
							<span className="tabular-nums">{classItem.studentCount}</span>
						</span>
					</div>

					<div className="flex items-center justify-between gap-2 rounded-md border-2 border-border bg-secondary px-3 py-2">
						<div>
							<p className="text-[10px] uppercase tracking-wide text-muted-foreground">
								Join code
							</p>
							<p className="font-display text-xl font-semibold tracking-widest">
								{classItem.joinCode}
							</p>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={handleCopy}
							aria-label="Copy join code"
						>
							{copied ? (
								<Check className="h-4 w-4 text-correct" />
							) : (
								<Copy className="h-4 w-4" />
							)}
						</Button>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
