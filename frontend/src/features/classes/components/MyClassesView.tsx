import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useTeacherClasses } from "@/shared/hooks/queries";
import { ClassCard } from "./ClassCard";
import { CreateClassDialog } from "./CreateClassDialog";

export function MyClassesView() {
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const { data: classes = [], isLoading, isError, error } = useTeacherClasses();

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="font-display text-3xl font-bold">My Classes</h1>
					<p className="text-muted-foreground">
						Create a class and share the join code with your students.
					</p>
				</div>
				<Button variant="brass" onClick={() => setIsCreateOpen(true)}>
					<Plus className="mr-2 h-4 w-4" />
					New class
				</Button>
			</div>

			{isLoading ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{Array.from({ length: 3 }, (_, i) => (
						<Card key={i}>
							<CardContent className="p-4 space-y-4">
								<Skeleton className="h-6 w-2/3" />
								<Skeleton className="h-16 w-full" />
							</CardContent>
						</Card>
					))}
				</div>
			) : isError ? (
				<div className="flex items-center justify-center h-32">
					<p className="text-sm text-destructive">
						{error?.message ?? "Failed to load classes"}
					</p>
				</div>
			) : classes.length > 0 ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{classes.map((classItem) => (
						<ClassCard key={classItem.id} classItem={classItem} />
					))}
				</div>
			) : (
				<div className="flex flex-col items-center justify-center h-40 gap-1 text-center">
					<p className="text-sm font-medium text-muted-foreground">
						No classes yet — create one to get started.
					</p>
				</div>
			)}

			<CreateClassDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
		</div>
	);
}
