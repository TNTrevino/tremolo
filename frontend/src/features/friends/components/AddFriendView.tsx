import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Search, UserPlus, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSearchUsers, useAddFriend } from "@/shared/hooks/queries";
import { logger } from "@/lib/logger";
import { FriendCard } from "./FriendCard";

const DEBOUNCE_MS = 120;

interface AddFriendViewProps {
	onBack: () => void;
}

export function AddFriendView({ onBack }: AddFriendViewProps) {
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
	const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const { data: results = [], isLoading: isSearching } =
		useSearchUsers(debouncedQuery);

	const addFriend = useAddFriend();

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const handleQueryChange = (value: string) => {
		setQuery(value);

		if (debounceTimer.current) {
			clearTimeout(debounceTimer.current);
		}

		debounceTimer.current = setTimeout(() => {
			setDebouncedQuery(value);
		}, DEBOUNCE_MS);
	};

	useEffect(() => {
		return () => {
			if (debounceTimer.current) {
				clearTimeout(debounceTimer.current);
			}
		};
	}, []);

	const handleAdd = (friendId: number) => {
		addFriend.mutate(friendId, {
			onSuccess: () => {
				setAddedIds((prev) => new Set(prev).add(friendId));
			},
			onError: (err) => {
				logger.error("Failed to add friend", err);
			},
		});
	};

	return (
		<div className="flex flex-col h-full">
			<div className="p-4 border-b-2 border-border flex items-center gap-2">
				<Button
					variant="ghost"
					size="icon"
					onClick={onBack}
					className="rounded-full h-8 w-8"
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<h2 className="text-lg font-bold">Add Friend</h2>
			</div>

			<div className="p-4 border-b-2 border-border">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						ref={inputRef}
						placeholder="Search by name..."
						value={query}
						onChange={(e) => handleQueryChange(e.target.value)}
						className="pl-9 pr-9"
					/>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto p-2">
				{results.length > 0 ? (
					results.map((user) => (
						<FriendCard
							key={user.id}
							user={user}
							action={
								<AddFriendButton
									isAdded={addedIds.has(user.id)}
									isAdding={
										addFriend.isPending && addFriend.variables === user.id
									}
									onAdd={() => handleAdd(user.id)}
								/>
							}
						/>
					))
				) : isSearching ? (
					<div className="flex items-center justify-center h-32">
						<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
					</div>
				) : query.trim() ? (
					<div className="flex flex-col items-center justify-center h-32 gap-1">
						<p className="text-sm font-medium text-muted-foreground">
							No users found
						</p>
					</div>
				) : (
					<div className="flex flex-col items-center justify-center h-32 gap-1">
						<p className="text-sm font-medium text-muted-foreground">
							Search for someone by name
						</p>
					</div>
				)}
			</div>
		</div>
	);
}

interface AddFriendButtonProps {
	isAdded: boolean;
	isAdding: boolean;
	onAdd: () => void;
}

function AddFriendButton({ isAdded, isAdding, onAdd }: AddFriendButtonProps) {
	return (
		<Button
			variant={isAdded ? "ghost" : "outline"}
			size="icon"
			className="rounded-full h-8 w-8 shrink-0"
			onClick={onAdd}
			disabled={isAdded || isAdding}
		>
			{isAdding ? (
				<Loader2 className="h-4 w-4 animate-spin" />
			) : isAdded ? (
				<Check className="h-4 w-4 text-primary" />
			) : (
				<UserPlus className="h-4 w-4" />
			)}
		</Button>
	);
}
