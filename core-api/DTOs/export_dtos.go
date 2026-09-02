package dtos

import (
	"encoding/json"
	"time"
)

// UserExport is the payload for GET /api/users/{userId}/export (#243) --
// the data-portability export of everything this service holds about one
// user. Response-only: nothing decodes a UserExport, so it has no Valid
// method.
//
// Every slice field is initialized (never left nil) by the service that
// builds one of these, so an empty section marshals as `[]`, not `null`
// -- a parent opening the downloaded file sees "no items", not a field
// that looks missing.
type UserExport struct {
	ExportedAt string         `json:"exported_at"`
	Profile    ExportProfile  `json:"profile"`
	Settings   ExportSettings `json:"settings"`
	// The existing keyboard-bindings response shape, reused as-is: nil
	// (not an empty struct) when the user never saved bindings of their
	// own, the same "absence, not failure" rule GetKeyboardBindings
	// already applies everywhere else it's called.
	KeyboardBindings   *KeyboardBindingsResponse `json:"keyboard_bindings"`
	ScoreEntries       []ExportScoreEntry        `json:"score_entries"`
	Classes            ExportClasses             `json:"classes"`
	AssignmentAttempts []ExportAttempt           `json:"assignment_attempts"`
	// Friend connections are not on the ticket's list of sections, but
	// they are included anyway: the privacy policy enumerates friend
	// connections as data this service holds about a user, and an export
	// that silently dropped a category the policy promises would make
	// the policy false.
	Friends []ExportFriend `json:"friends"`
}

// ExportProfile is the account's own profile fields -- the columns
// GetUserByID's /me shape leaves out (email, instrument, school,
// whether the account is Google-linked) alongside the ones it shares.
type ExportProfile struct {
	ID          int    `json:"id"`
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	Email       string `json:"email"`
	Role        string `json:"role"`
	Instrument  string `json:"instrument"`
	School      string `json:"school"`
	HasGoogle   bool   `json:"has_google"`
	CreatedDate string `json:"created_date"`
	CreatedTime string `json:"created_time"`
}

// ExportSettings groups the two shapes settings come in: the note game's
// dedicated typed table, and everything else's generic JSONB blob.
type ExportSettings struct {
	// The existing note-game settings response shape, reused as-is: nil
	// when the user never saved any (same absence rule as
	// KeyboardBindings above).
	NoteGame *NoteGameSettingsResponse `json:"note_game"`
	Games    []ExportGameSettings      `json:"games"`
}

// ExportGameSettings is one game's saved JSONB config (key signature /
// scale / chord identification games). Config is passed through
// untouched -- this export does not interpret it, only carries it.
type ExportGameSettings struct {
	GameType string          `json:"game_type"`
	Config   json.RawMessage `json:"config"`
}

// ExportScoreEntry is one saved note_game_entries row. Distinct from
// NoteGameEntryResponse (the recent-entries list's shape): this export
// also carries GameType and AssignmentID, neither of which that response
// exposes.
type ExportScoreEntry struct {
	ID               int    `json:"id"`
	GameType         string `json:"game_type"`
	TotalQuestions   int    `json:"total_questions"`
	CorrectQuestions int    `json:"correct_questions"`
	NotesPerMinute   int    `json:"notes_per_minute"`
	TimeLength       string `json:"time_length"`
	// Nil when the entry was not an attempt at a class assignment.
	AssignmentID *int   `json:"assignment_id"`
	CreatedDate  string `json:"created_date"`
	CreatedTime  string `json:"created_time"`
}

// ExportClasses separates the two roles a user's classes can be in:
// classes joined as a student and classes owned as a teacher. Nothing
// stops one account from appearing in both (this export does not guess
// a "role" for the request -- it reports whatever the reused class
// queries actually return for this user id).
type ExportClasses struct {
	Joined []ExportJoinedClass `json:"joined"`
	Owned  []ExportOwnedClass  `json:"owned"`
}

// ExportJoinedClass is a class the user joined as a student. The join
// code is deliberately absent, same reasoning as StudentClassResponse:
// a student shouldn't redistribute their teacher's join code.
type ExportJoinedClass struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	TeacherName string `json:"teacher_name"`
}

// ExportOwnedClass is a class the user owns as a teacher.
type ExportOwnedClass struct {
	ID           int       `json:"id"`
	Name         string    `json:"name"`
	JoinCode     string    `json:"join_code"`
	StudentCount int       `json:"student_count"`
	CreatedAt    time.Time `json:"created_at"`
}

// ExportAttempt mirrors ListAssignmentAttemptsByUser: one score entry
// tagged with a class assignment, labelled with the assignment's title
// and class name so the export reads without joining anything.
type ExportAttempt struct {
	EntryID          int    `json:"entry_id"`
	AssignmentID     int    `json:"assignment_id"`
	AssignmentTitle  string `json:"assignment_title"`
	GameType         string `json:"game_type"`
	ClassName        string `json:"class_name"`
	CorrectQuestions int    `json:"correct_questions"`
	TotalQuestions   int    `json:"total_questions"`
	NotesPerMinute   int    `json:"notes_per_minute"`
	TimeLength       string `json:"time_length"`
	CreatedDate      string `json:"created_date"`
	CreatedTime      string `json:"created_time"`
}

// ExportFriend is one mutual friend connection, shaped from
// GetFriendsByUserID's row directly -- deliberately NOT FriendDTO, which
// also carries a generated AvatarUrl. An avatar link derived on the fly
// from the id is not data this service holds about the user; an export
// only reports what is actually stored.
type ExportFriend struct {
	ID         int    `json:"id"`
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	Role       string `json:"role"`
	Instrument string `json:"instrument"`
	School     string `json:"school"`
}
