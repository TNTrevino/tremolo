import { useEffect } from "react";
import { X, Search, Loader2, UserPlus } from "lucide-react";
import { useFriendsStore } from "@/stores/friends.store";
import { FriendCard } from "./FriendCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MyFriendsViewProps {
	onAddFriend: () => void;
	onClose: () => void;
}

export function MyFriendsView({ onAddFriend, onClose }: MyFriendsViewProps) {
	const searchQuery = useFriendsStore((state) => state.searchQuery);
	const setSearchQuery = useFriendsStore((state) => state.setSearchQuery);
	const filteredFriends = useFriendsStore((state) => state.filteredFriends);
	const allFriends = useFriendsStore((state) => state.friends);
	const fetchFriends = useFriendsStore((state) => state.fetchFriends);
	const isLoading = useFriendsStore((state) => state.isLoading);
	const error = useFriendsStore((state) => state.error);

	useEffect(() => {
		if (allFriends.length === 0 && !isLoading) {
			fetchFriends();
		}
	}, [allFriends.length, isLoading, fetchFriends]);

	const friends = filteredFriends();

	return (
		<>
			<div className="p-4 border-b-2 border-border flex items-center justify-between">
				<div className="flex items-center gap-2">
					<h2 className="text-lg font-bold">Friends</h2>
					<span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
						{allFriends.length}
					</span>
					<Button
						variant="ghost"
						size="icon"
						onClick={onAddFriend}
						className="rounded-full h-8 w-8"
					>
						<UserPlus className="h-4 w-4" />
					</Button>
				</div>
				<Button
					variant="ghost"
					size="icon"
					onClick={onClose}
					className="rounded-full h-8 w-8"
				>
					<X className="h-4 w-4" />
				</Button>
			</div>

			<div className="p-4 border-b-2 border-border">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search friends..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9"
					/>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto p-2">
				{isLoading ? (
					<div className="flex items-center justify-center h-32">
						<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
					</div>
				) : error ? (
					<div className="flex items-center justify-center h-32">
						<p className="text-sm text-destructive">{error}</p>
					</div>
				) : friends.length > 0 ? (
					friends.map((friend) => <FriendCard key={friend.id} user={friend} />)
				) : (
					<div className="flex flex-col items-center justify-center h-32 gap-1">
						<p className="text-sm font-medium text-muted-foreground">
							{searchQuery.trim()
								? "No friends found"
								: "Looks lonely in here. Add some friends!"}
						</p>
					</div>
				)}
			</div>
		</>
	);
}
