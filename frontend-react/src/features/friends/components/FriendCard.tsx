import type { Friend } from "@/features/friends/types";
import { cn } from "@/lib/utils";

interface FriendCardProps {
	user: Friend;
	action?: React.ReactNode;
	className?: string;
}

export function FriendCard({ user, action, className }: FriendCardProps) {
	return (
		<div
			className={cn(
				"flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-accent/50",
				className,
			)}
		>
			<img
				src={user.avatarUrl}
				alt={`${user.firstName} ${user.lastName}`}
				className="h-10 w-10 rounded-full"
			/>
			<div className="flex-1 min-w-0">
				<span className="text-sm font-medium truncate block">
					{user.firstName} {user.lastName}
				</span>
				{user.instrument && (
					<p className="text-xs text-muted-foreground truncate">
						{user.instrument}
					</p>
				)}
				{user.school && (
					<p className="text-xs text-muted-foreground truncate">
						{user.school}
					</p>
				)}
			</div>
			{action}
		</div>
	);
}
