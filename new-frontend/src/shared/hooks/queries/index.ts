// Auth queries
export {
	useCurrentUser,
	useLogin,
	useRegister,
	useLogout,
	authKeys,
} from "./useAuthQuery";

// User queries
export { useGeneralUserInfo, useUserStats, userKeys } from "./useUserQuery";

// Music queries
export {
	useGenerateMary,
	useGenerateRhythm,
	useGenerateNoteGame,
	useRenderSheetMusic,
	musicKeys,
} from "./useMusicQuery";
