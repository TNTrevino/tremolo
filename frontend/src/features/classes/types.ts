import type { GameType } from "@/services/api/types";

export interface Class {
	id: number;
	name: string;
	joinCode: string;
	studentCount: number;
	createdAt: string;
}

export interface StudentClass {
	id: number;
	name: string;
	teacherName: string;
}

export interface RosterEntry {
	studentId: number;
	firstName: string;
	lastName: string;
	joinedAt: string;
}

export interface Assignment {
	id: number;
	classId: number;
	title: string;
	gameType: GameType;
	config: Record<string, unknown>;
	dueAt: string | null;
	targetQuestions: number | null;
	targetAccuracy: number | null;
	createdAt: string;
}

export interface StudentAssignment extends Assignment {
	className: string;
	attemptCount: number;
	bestCorrect: number;
	bestAccuracy: number;
}

export interface AssignmentResult {
	studentId: number;
	firstName: string;
	lastName: string;
	attemptCount: number;
	bestCorrect: number;
	mostQuestions: number;
	bestAccuracy: number;
	lastAttemptDate: string;
}
