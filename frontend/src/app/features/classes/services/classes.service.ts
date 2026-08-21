import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map, type Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import {
	mapAssignmentResponse,
	mapAssignmentResultRow,
	mapAttemptResponse,
	mapClassResponse,
	mapRosterEntryResponse,
	mapStudentAssignmentResponse,
	mapStudentClassResponse,
} from "../models/classes.mappers";
import type {
	Assignment,
	AssignmentResponse,
	AssignmentResult,
	AssignmentResultRow,
	Attempt,
	AttemptResponse,
	Class,
	ClassResponse,
	CreateAssignmentRequest,
	CreateClassRequest,
	JoinClassRequest,
	MessageResponse,
	RosterEntry,
	RosterEntryResponse,
	StudentAssignment,
	StudentAssignmentResponse,
	StudentClass,
	StudentClassResponse,
} from "../models/classes.models";

/**
 * Classes & assignments HTTP. Port of
 * frontend-react/src/services/api/classes.service.ts.
 *
 * Observables in, Observables out (D5), with the snake_case -> camelCase
 * conversion pinned to this boundary: nothing above this file sees a wire
 * shape, and nothing below it sees a domain shape. The React service did
 * the same thing with private methods; the mappers moved to
 * `../models/classes.mappers` so they can be tested without the service.
 *
 * There is **no caching layer here and there must not be one** (D6). The
 * pages hold `rxResource`s and call `.reload()` when a mutation lands;
 * two pages reading the same endpoint firing two requests is the policy,
 * not a bug.
 *
 * Endpoint asymmetry worth knowing: classes are nested
 * (`/api/classes/:id/...`) but assignments are addressed at the top level
 * once they exist (`/api/assignments/:id/...`), and there is **no
 * GET-by-id for an assignment** -- `AssignmentPlayPageComponent` finds it
 * in the student's list, exactly as React did.
 */
@Injectable({ providedIn: "root" })
export class ClassesService {
	private readonly http = inject(HttpClient);
	private readonly classesBase = `${environment.mainApi}/api/classes`;
	private readonly assignmentsBase = `${environment.mainApi}/api/assignments`;

	createClass(name: string): Observable<Class> {
		const request: CreateClassRequest = { name };
		return this.http
			.post<ClassResponse>(this.classesBase, request)
			.pipe(map(mapClassResponse));
	}

	getTeacherClasses(): Observable<Class[]> {
		return this.http
			.get<ClassResponse[]>(this.classesBase)
			.pipe(map((rows) => rows.map(mapClassResponse)));
	}

	getStudentClasses(): Observable<StudentClass[]> {
		return this.http
			.get<StudentClassResponse[]>(`${this.classesBase}/joined`)
			.pipe(map((rows) => rows.map(mapStudentClassResponse)));
	}

	joinClass(joinCode: string): Observable<StudentClass> {
		const request: JoinClassRequest = { join_code: joinCode };
		return this.http
			.post<StudentClassResponse>(`${this.classesBase}/join`, request)
			.pipe(map(mapStudentClassResponse));
	}

	getClassRoster(classId: number): Observable<RosterEntry[]> {
		return this.http
			.get<RosterEntryResponse[]>(`${this.classesBase}/${classId}/roster`)
			.pipe(map((rows) => rows.map(mapRosterEntryResponse)));
	}

	archiveClass(classId: number): Observable<MessageResponse> {
		return this.http.delete<MessageResponse>(`${this.classesBase}/${classId}`);
	}

	removeStudent(
		classId: number,
		studentId: number,
	): Observable<MessageResponse> {
		return this.http.delete<MessageResponse>(
			`${this.classesBase}/${classId}/students/${studentId}`,
		);
	}

	createAssignment(
		classId: number,
		request: CreateAssignmentRequest,
	): Observable<Assignment> {
		return this.http
			.post<AssignmentResponse>(
				`${this.classesBase}/${classId}/assignments`,
				request,
			)
			.pipe(map(mapAssignmentResponse));
	}

	getClassAssignments(classId: number): Observable<Assignment[]> {
		return this.http
			.get<AssignmentResponse[]>(`${this.classesBase}/${classId}/assignments`)
			.pipe(map((rows) => rows.map(mapAssignmentResponse)));
	}

	getStudentAssignments(): Observable<StudentAssignment[]> {
		return this.http
			.get<StudentAssignmentResponse[]>(this.assignmentsBase)
			.pipe(map((rows) => rows.map(mapStudentAssignmentResponse)));
	}

	getAssignmentResults(assignmentId: number): Observable<AssignmentResult[]> {
		return this.http
			.get<AssignmentResultRow[]>(
				`${this.assignmentsBase}/${assignmentId}/results`,
			)
			.pipe(map((rows) => rows.map(mapAssignmentResultRow)));
	}

	deleteAssignment(assignmentId: number): Observable<MessageResponse> {
		return this.http.delete<MessageResponse>(
			`${this.assignmentsBase}/${assignmentId}`,
		);
	}

	getAssignmentAttempts(
		assignmentId: number,
		studentId: number,
	): Observable<Attempt[]> {
		return this.http
			.get<AttemptResponse[]>(
				`${this.assignmentsBase}/${assignmentId}/attempts/${studentId}`,
			)
			.pipe(map((rows) => rows.map(mapAttemptResponse)));
	}
}
