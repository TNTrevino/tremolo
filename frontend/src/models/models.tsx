export interface rhythmMusicProps {
	scale: string;
	octave: string;
	rhythmType: number;
	rhythm: string;
}

export interface generatedMusicProps {
	scale: string;
	octave: string;
}

export interface noteGameProps {
	noteName: string;
	octave: string;
	fullNoteName: string;
}

export interface NoteGameDTO {
	generatedXml: string;
	noteName: string;
	noteOctave: string;
}

// Authentication types
// NOTE: should we make this an enum?
export type UserRole = "student" | "teacher" | "parent";

export interface User {
	id: number;
	email: string;
	first_name: string;
	last_name: string;
	role: UserRole;
}

export interface LoginRequest {
	email: string;
	password: string;
}

export interface LoginResponse {
	user: User;
	access_token: string;
	refresh_token: string;
}

export interface AuthError {
	error: string;
}

export interface RegisterRequest {
	email: string;
	password: string;
	first_name: string;
	last_name: string;
	role: UserRole;
}

export interface RegisterResponse {
	message: string;
	user: User;
}
