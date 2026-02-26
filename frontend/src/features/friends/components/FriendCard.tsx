import type { Friend } from "@/features/friends/types";
import { cn } from "@/lib/utils";

interface FriendCardProps {
	friend: Friend;
	className?: string;
}

export function FriendCard({ friend, className }: FriendCardProps) {
	const displayRole =
		friend.role.charAt(0).toUpperCase() + friend.role.slice(1);

	return (
		<div
			className={cn(
				"flex items-center gap-3 p-3 rounded-lg cursor-default transition-colors hover:bg-accent/50",
				className,
			)}
		>
			<img
				src={friend.avatarUrl}
				alt={`${friend.firstName} ${friend.lastName}`}
				className="h-10 w-10 rounded-full"
			/>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium truncate">
						{friend.firstName} {friend.lastName}
					</span>
					<span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
						{displayRole}
					</span>
				</div>
				<p className="text-xs text-muted-foreground truncate">
					{friend.instrument}
				</p>
			</div>
		</div>
	);
}
