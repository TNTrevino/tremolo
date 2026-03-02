/**
 * Teacher Dashboard Component
 *
 * Displays teacher-specific information and features:
 * - Teacher name
 * - Number of students (placeholder for future implementation)
 * - Student management features (coming soon)
 */

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import type { GeneralUserInfo } from "@/services/api/types";

interface TeacherDashboardProps {
	user: GeneralUserInfo;
	studentCount?: number;
}

export function TeacherDashboard({
	user,
	studentCount,
}: TeacherDashboardProps) {
	return (
		<Card className="shadow-lg">
			<CardHeader>
				<CardTitle className="text-2xl">Teacher Dashboard</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<p className="text-sm text-muted-foreground mb-1">Name</p>
						<p className="font-medium">
							{user.first_name} {user.last_name}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground mb-1">
							Number of Students
						</p>
						<p className="font-medium text-primary">
							{studentCount !== undefined ? studentCount : "Coming soon"}
						</p>
					</div>
				</div>
				<p className="text-sm text-muted-foreground">
					Student management features will be available in a future update.
					You&apos;ll be able to view student progress, assign exercises, and
					track class performance.
				</p>
			</CardContent>
		</Card>
	);
}
