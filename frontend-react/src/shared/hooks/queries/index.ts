// Auth queries
export { useLogin, useRegister, useLogout, authKeys } from "./useAuthQuery";

// User queries
export {
	useUserProfile,
	useUserStats,
	useRecentGameEntries,
	useActivityHeatmap,
	useSaveGameResult,
	useGameSettings,
	useSaveGameSettings,
	useNoteGameSettings,
	useSaveNoteGameSettings,
	useKeyboardBindings,
	useSaveKeyboardBindings,
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

// Classes queries
export {
	useTeacherClasses,
	useStudentClasses,
	useClassRoster,
	useClassAssignments,
	useStudentAssignments,
	useAssignmentResults,
	useAssignmentAttempts,
	useCreateClass,
	useJoinClass,
	useArchiveClass,
	useRemoveStudent,
	useCreateAssignment,
	useDeleteAssignment,
	classesKeys,
} from "./useClassesQuery";
