/**
 * Teacher Dashboard Component
 *
 * Displays teacher-specific information and features:
 * - Teacher name
 * - Number of students (placeholder for future implementation)
 * - Entry point to classes & assignments
 */

import { Link } from "react-router-dom";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import type { UserProfile } from "@/services/api/types";

interface TeacherDashboardProps {
	user: UserProfile;
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
							{user.firstName} {user.lastName}
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
				<div className="flex items-center justify-between gap-4">
					<p className="text-sm text-muted-foreground">
						Create classes, hand out join codes, assign exercises, and track
						results per assignment.
					</p>
					<Button asChild variant="brass">
						<Link to="/classes">My Classes</Link>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
