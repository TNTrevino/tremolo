import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";
import { classesService } from "@/services/api";
import type { CreateAssignmentRequest } from "@/services/api/types";
import type {
	Class,
	StudentClass,
	RosterEntry,
	Assignment,
	StudentAssignment,
	AssignmentResult,
} from "@/features/classes/types";

export const classesKeys = {
	all: ["classes"] as const,
	teacherList: () => [...classesKeys.all, "teacher-list"] as const,
	studentList: () => [...classesKeys.all, "student-list"] as const,
	roster: (classId: number) => [...classesKeys.all, classId, "roster"] as const,
	assignments: (classId: number) =>
		[...classesKeys.all, classId, "assignments"] as const,
	studentAssignments: () =>
		[...classesKeys.all, "student-assignments"] as const,
	assignmentResults: (assignmentId: number) =>
		[...classesKeys.all, "assignment", assignmentId, "results"] as const,
};

/**
 * Fetch the current teacher's classes.
 * Only runs when the user is authenticated.
 */
export function useTeacherClasses() {
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

	return useQuery<Class[]>({
		queryKey: classesKeys.teacherList(),
		meta: { errorTitle: "Failed to load classes" },
		queryFn: () => classesService.getTeacherClasses(),
		enabled: isAuthenticated,
	});
}

/**
 * Fetch the current student's joined classes.
 * Only runs when the user is authenticated.
 */
export function useStudentClasses() {
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

	return useQuery<StudentClass[]>({
		queryKey: classesKeys.studentList(),
		meta: { errorTitle: "Failed to load classes" },
		queryFn: () => classesService.getStudentClasses(),
		enabled: isAuthenticated,
	});
}

/**
 * Fetch the roster for a class.
 * Only runs when the user is authenticated.
 */
export function useClassRoster(classId: number) {
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

	return useQuery<RosterEntry[]>({
		queryKey: classesKeys.roster(classId),
		meta: { errorTitle: "Failed to load roster" },
		queryFn: () => classesService.getClassRoster(classId),
		enabled: isAuthenticated,
	});
}

/**
 * Fetch assignments for a class (teacher view).
 * Only runs when the user is authenticated.
 */
export function useClassAssignments(classId: number) {
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

	return useQuery<Assignment[]>({
		queryKey: classesKeys.assignments(classId),
		meta: { errorTitle: "Failed to load assignments" },
		queryFn: () => classesService.getClassAssignments(classId),
		enabled: isAuthenticated,
	});
}

/**
 * Fetch the current student's assignments (with progress).
 * Only runs when the user is authenticated.
 */
export function useStudentAssignments() {
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

	return useQuery<StudentAssignment[]>({
		queryKey: classesKeys.studentAssignments(),
		meta: { errorTitle: "Failed to load assignments" },
		queryFn: () => classesService.getStudentAssignments(),
		enabled: isAuthenticated,
	});
}

/**
 * Fetch the results grid for an assignment (teacher view).
 * Only runs when the user is authenticated.
 */
export function useAssignmentResults(assignmentId: number) {
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

	return useQuery<AssignmentResult[]>({
		queryKey: classesKeys.assignmentResults(assignmentId),
		meta: { errorTitle: "Failed to load results" },
		queryFn: () => classesService.getAssignmentResults(assignmentId),
		enabled: isAuthenticated,
	});
}

/**
 * Mutation to create a class.
 * Invalidates the teacher's class list on success.
 */
export function useCreateClass() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (name: string) => classesService.createClass(name),
		meta: { errorTitle: "Failed to create class" },
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: classesKeys.teacherList() });
		},
	});
}

/**
 * Mutation to join a class by code.
 * Errors are suppressed globally — the join form shows a 404 inline.
 * Invalidates the student's class list on success.
 */
export function useJoinClass() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (joinCode: string) => classesService.joinClass(joinCode),
		meta: { suppressErrorToast: true },
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: classesKeys.studentList() });
		},
	});
}

/**
 * Mutation to archive a class.
 * Invalidates the teacher's class list on success.
 */
export function useArchiveClass() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (classId: number) => classesService.archiveClass(classId),
		meta: { errorTitle: "Failed to archive class" },
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: classesKeys.teacherList() });
		},
	});
}

/**
 * Mutation to remove a student from a class.
 * Invalidates that class's roster on success.
 */
export function useRemoveStudent() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			classId,
			studentId,
		}: {
			classId: number;
			studentId: number;
		}) => classesService.removeStudent(classId, studentId),
		meta: { errorTitle: "Failed to remove student" },
		onSuccess: (_data, { classId }) => {
			queryClient.invalidateQueries({
				queryKey: classesKeys.roster(classId),
			});
			queryClient.invalidateQueries({
				queryKey: classesKeys.teacherList(),
			});
		},
	});
}

/**
 * Mutation to create an assignment for a class.
 * Invalidates that class's assignments list on success.
 */
export function useCreateAssignment() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			classId,
			request,
		}: {
			classId: number;
			request: CreateAssignmentRequest;
		}) => classesService.createAssignment(classId, request),
		meta: { errorTitle: "Failed to create assignment" },
		onSuccess: (_data, { classId }) => {
			queryClient.invalidateQueries({
				queryKey: classesKeys.assignments(classId),
			});
		},
	});
}

/**
 * Mutation to delete an assignment.
 * Invalidates that class's assignments list on success.
 */
export function useDeleteAssignment() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ assignmentId }: { assignmentId: number; classId: number }) =>
			classesService.deleteAssignment(assignmentId),
		meta: { errorTitle: "Failed to delete assignment" },
		onSuccess: (_data, { classId }) => {
			queryClient.invalidateQueries({
				queryKey: classesKeys.assignments(classId),
			});
		},
	});
}
