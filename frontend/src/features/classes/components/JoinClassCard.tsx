import { useState } from "react";
import { useForm } from "react-hook-form";
import { Check } from "lucide-react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import { FormField } from "@/shared/components/forms/FormField";
import { FormInput } from "@/shared/components/forms/FormInput";
import { useJoinClass, useStudentClasses } from "@/shared/hooks/queries";
import { getErrorMessage } from "@/shared/utils/error.utils";
import type { StudentClass } from "@/features/classes/types";

interface JoinClassFormData {
	joinCode: string;
}

export function JoinClassCard() {
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<JoinClassFormData>({ defaultValues: { joinCode: "" } });
	const joinClass = useJoinClass();
	const {
		data: classes = [],
		isLoading: isClassesLoading,
		isError: isClassesError,
	} = useStudentClasses();
	const [joined, setJoined] = useState<StudentClass | null>(null);

	function onSubmit(data: JoinClassFormData) {
		setJoined(null);
		joinClass.mutate(data.joinCode.trim(), {
			onSuccess: (studentClass) => {
				setJoined(studentClass);
				reset();
			},
		});
	}

	const joinError = errors.joinCode?.message
		? errors.joinCode.message
		: joinClass.isError
			? getErrorMessage(joinClass.error)
			: undefined;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-display text-2xl">Join a class</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<form
					onSubmit={handleSubmit(onSubmit)}
					className="flex items-start gap-2"
					noValidate
				>
					<FormField
						label="Class code"
						htmlFor="join-code"
						error={joinError}
						className="flex-1"
					>
						<FormInput
							id="join-code"
							placeholder="7NZJN3"
							maxLength={6}
							autoComplete="off"
							registration={register("joinCode", {
								required: "Enter a class code",
							})}
							error={joinError}
						/>
					</FormField>
					<Button
						type="submit"
						variant="brass"
						loading={joinClass.isPending}
						className="mt-6"
					>
						Join
					</Button>
				</form>

				{joined && (
					<div className="flex items-center gap-2 rounded-md border-2 border-correct/40 bg-correct/10 p-3 text-sm">
						<Check className="h-4 w-4 shrink-0 text-correct" />
						<span>
							Joined <span className="font-medium">{joined.name}</span> —{" "}
							{joined.teacherName}
						</span>
					</div>
				)}

				<div>
					<h3 className="mb-2 text-sm font-medium text-muted-foreground">
						Your classes
					</h3>
					{isClassesLoading ? (
						<div className="space-y-2">
							<Skeleton className="h-9 w-full" />
							<Skeleton className="h-9 w-full" />
						</div>
					) : isClassesError ? (
						<p className="text-sm text-destructive">
							Failed to load your classes.
						</p>
					) : classes.length > 0 ? (
						<ul className="space-y-1">
							{classes.map((studentClass) => (
								<li
									key={studentClass.id}
									className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-accent/50"
								>
									<span className="truncate text-sm font-medium">
										{studentClass.name}
									</span>
									<span className="shrink-0 text-xs text-muted-foreground">
										{studentClass.teacherName}
									</span>
								</li>
							))}
						</ul>
					) : (
						<p className="text-sm text-muted-foreground">
							You haven&apos;t joined any classes yet.
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
