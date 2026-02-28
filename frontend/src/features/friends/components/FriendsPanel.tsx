import { useState } from "react";
import { useFriendsStore } from "@/stores/friends.store";
import { MyFriendsView } from "./MyFriendsView";
import { cn } from "@/lib/utils";
import AddFriendView from "./AddFriendView";

const FriendsPanel = () => {
	const [isAddMode, setIsAddMode] = useState(false);
	const isPanelOpen = useFriendsStore((state) => state.isPanelOpen);
	const togglePanel = useFriendsStore((state) => state.togglePanel);

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
					<MyFriendsView
						onAddFriend={() => setIsAddMode(true)}
						onClose={togglePanel}
					/>
				)}
			</aside>
		</>
	);
};

export default FriendsPanel;
