// Auth queries
export {
	useCurrentUser,
	useLogin,
	useRegister,
	useLogout,
	authKeys,
} from "./useAuthQuery";

// User queries
export {
	useUserProfile,
	useUserStats,
	useSaveGameResult,
	userKeys,
} from "./useUserQuery";

// Music queries
export {
	useGenerateMary,
	useGenerateRandom,
	useGenerateNoteGame,
	musicKeys,
} from "./useMusicQuery";

// Friends queries
export {
	useFriends,
	useSearchUsers,
	useAddFriend,
	friendsKeys,
} from "./useFriendsQuery";
