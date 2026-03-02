/**
 * User Profile Card Component
 *
 * Displays user information including avatar, name, role, join date,
 * and quick statistics (total sessions and time reading).
 */

import { Card, CardContent } from "@/components/ui/card";
import type { GeneralUserInfo } from "@/services/api/types";
import { logger } from "@/lib/logger";

interface QuickStats {
	totalSessions: number;
	timeReading: string;
}

interface UserProfileCardProps {
	user: GeneralUserInfo;
	quickStats: QuickStats;
}

export function UserProfileCard({ user, quickStats }: UserProfileCardProps) {
	const joinDate = new Date(user.created_at).toLocaleDateString("en-US", {
		month: "long",
		year: "numeric",
	});

	let roleDisplay = "User";
	if (user.role) {
		roleDisplay = user.role.charAt(0) + user.role.slice(1).toLowerCase();
	} else {
		logger.warn("Missing user.role for user", { userId: user.id });
	}

	return (
		<Card className="shadow-lg">
			<CardContent className="p-6">
				<div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
					{/* Avatar */}
					<div className="flex-shrink-0">
						<div className="w-24 h-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-bold">
							{user.first_name[0]}
							{user.last_name[0]}
						</div>
					</div>

					{/* User Info */}
					<div className="flex-1 text-center md:text-left space-y-2">
						<h1 className="text-3xl font-bold">
							{user.first_name} {user.last_name}
						</h1>
						<div className="flex flex-wrap gap-2 justify-center md:justify-start items-center">
							<span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
								{roleDisplay}
							</span>
							<span className="text-muted-foreground text-sm">
								Joined {joinDate}
							</span>
						</div>
					</div>

					{/* Quick Stats */}
					<div className="grid grid-cols-2 gap-4">
						<div className="text-center">
							<div className="text-3xl font-bold text-primary">
								{quickStats.totalSessions}
							</div>
							<div className="text-xs text-muted-foreground">
								total sessions
							</div>
						</div>
						<div className="text-center">
							<div className="text-3xl font-bold text-accent">
								{quickStats.timeReading}
							</div>
							<div className="text-xs text-muted-foreground">time reading</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
