// Auth queries
export { useLogin, useRegister, useLogout, authKeys } from "./useAuthQuery";

// User queries
export {
	useUserProfile,
	useUserStats,
	useSaveGameResult,
	useNoteGameSettings,
	useSaveNoteGameSettings,
	userKeys,
} from "./useUserQuery";

// Music queries
export {
	useGenerateMary,
	useGenerateRandom,
	useGenerateNoteGame,
} from "./useMusicQuery";

// Friends queries
export {
	useFriends,
	useSearchUsers,
	useAddFriend,
	friendsKeys,
} from "./useFriendsQuery";
