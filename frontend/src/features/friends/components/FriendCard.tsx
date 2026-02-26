import type { Friend } from "@/features/friends/types";
import { cn } from "@/lib/utils";

interface FriendCardProps {
	friend: Friend;
	className?: string;
}

export function FriendCard({ friend, className }: FriendCardProps) {
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
				<span className="text-sm font-medium truncate">
					{friend.firstName} {friend.lastName}
				</span>
				<p className="text-xs text-muted-foreground truncate">
					{friend.instrument}
				</p>
			</div>
		</div>
	);
}
