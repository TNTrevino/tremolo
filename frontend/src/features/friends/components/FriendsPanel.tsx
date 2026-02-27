import { useEffect, useState } from "react";
import { X, Search, Loader2, UserPlus } from "lucide-react";
import { useFriendsStore } from "@/stores/friends.store";
import { FriendCard } from "./FriendCard";
import { AddFriendView } from "./AddFriendView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function FriendsPanel() {
	const [isAddMode, setIsAddMode] = useState(false);
	const isPanelOpen = useFriendsStore((state) => state.isPanelOpen);
	const searchQuery = useFriendsStore((state) => state.searchQuery);
	const togglePanel = useFriendsStore((state) => state.togglePanel);
	const setSearchQuery = useFriendsStore((state) => state.setSearchQuery);
	const filteredFriends = useFriendsStore((state) => state.filteredFriends);
	const allFriends = useFriendsStore((state) => state.friends);
	const fetchFriends = useFriendsStore((state) => state.fetchFriends);
	const isLoading = useFriendsStore((state) => state.isLoading);
	const error = useFriendsStore((state) => state.error);

	useEffect(() => {
		if (isPanelOpen && allFriends.length === 0 && !isLoading && !error) {
			fetchFriends();
		}
	}, [isPanelOpen, allFriends.length, isLoading, error, fetchFriends]);

	const friends = filteredFriends();

	return (
		<>
			{isPanelOpen && (
				<div
					className="fixed inset-0 top-16 z-40 bg-black/50 md:hidden"
					onClick={togglePanel}
					onKeyDown={(e) =>
						(e.key === "Enter" || e.key === " ") && togglePanel()
					}
					role="button"
					tabIndex={0}
					aria-label="Close friends panel"
				/>
			)}

			<aside
				className={cn(
					"fixed top-16 right-0 bottom-0 z-40 w-[85vw] md:w-80 flex flex-col",
					"bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
					"border-l-2 border-border shadow-lg",
					"transition-transform duration-300 ease-in-out",
					isPanelOpen ? "translate-x-0" : "translate-x-full",
				)}
			>
				{isAddMode ? (
					<AddFriendView onBack={() => setIsAddMode(false)} />
				) : (
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
									onClick={() => setIsAddMode(true)}
									className="rounded-full h-8 w-8"
								>
									<UserPlus className="h-4 w-4" />
								</Button>
							</div>
							<Button
								variant="ghost"
								size="icon"
								onClick={togglePanel}
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
								friends.map((friend) => (
									<FriendCard key={friend.id} friend={friend} />
								))
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
				)}
			</aside>
		</>
	);
}
