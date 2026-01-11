// Package repositories represents the data access layer
package repositories

import (
	"database/sql"
	dtos "sight-reading/DTOs"
	"sight-reading/database"

	"github.com/jmoiron/sqlx"
)

type NoteGameRepository struct {
	db *sqlx.DB
}

func NewNoteGameRepository() *NoteGameRepository {
	return &NoteGameRepository{db: database.DBClient}
}

// NoteGameEntry represents a note game entry
type NoteGameEntry struct {
	ID               int     `db:"id" json:"id"`
	UserID           int     `db:"user_id" json:"user_id"`
	TimeLength       string  `db:"time_length" json:"time_length"`
	TotalQuestions   int     `db:"total_questions" json:"total_questions"`
	CorrectQuestions int     `db:"correct_questions" json:"correct_questions"`
	NotesPerMinute   float64 `db:"notes_per_minute" json:"notes_per_minute"`
	CreatedDate      string  `db:"created_date" json:"created_date"`
}

// CreateNoteGameEntry inserts a new note game entry
func (r *NoteGameRepository) CreateNoteGameEntry(entry NoteGameEntry) (int64, error) {
	// language: sql
	query := `
		insert into note_game_entries (
			user_id,
			time_length,
			total_questions,
			correct_questions,
			notes_per_minute
		)
		values (
			:user_id,
			:time_length,
			:total_questions,
			:correct_questions,
			:notes_per_minute
		)
		returning id
	`

	rows, err := r.db.NamedQuery(query, entry)
	if err != nil {
		return 0, err
	}
	defer func() {
		if closeErr := rows.Close(); closeErr != nil {
			err = closeErr
		}
	}()

	var entryID int64
	if rows.Next() {
		err = rows.Scan(&entryID)
		if err != nil {
			return 0, err
		}
	}

	return entryID, nil
}

// GetEntriesByUserID retrieves all note game entries for a user
func (r *NoteGameRepository) GetEntriesByUserID(userID int) ([]NoteGameEntry, error) {
	query := `
		select *
		from note_game_entries
		where user_id = $1
		order by created_date desc
	`

	var entries []NoteGameEntry
	err := r.db.Select(&entries, query, userID)
	if err != nil {
		return nil, err
	}

	return entries, nil
}

// GetRecentEntriesByUserID retrieves the last 30 note game entries for a user
func (r *NoteGameRepository) GetRecentEntriesByUserID(userID int) ([]NoteGameEntry, error) {
	query := `
		select 
			id,
			user_id,
			time_length,
			total_questions,
			correct_questions,
			notes_per_minute,
			created_date
		from note_game_entries
		where user_id = $1
		order by created_date desc, id desc
		limit 30
	`

	var entries []NoteGameEntry
	err := r.db.Select(&entries, query, userID)
	if err != nil {
		return nil, err
	}

	return entries, nil
}

// FetchNPMData retrieves NPM (Notes Per Minute) data for chart visualization
func (r *NoteGameRepository) FetchNPMData(userID int, interval string, days int) ([]dtos.ChartDataPoint, error) {
	var query string
	var data []dtos.ChartDataPoint
	var err error

	if interval == "all" {
		query = `
			select
				created_date + created_time as timestamp,
				notes_per_minute::float as value
			from note_game_entries
			where user_id = $1
			order by created_date, created_time asc
		`
		err = r.db.Select(&data, query, userID)
	} else {
		query = `
			select
				created_date + created_time as timestamp,
				notes_per_minute::float as value
			from note_game_entries
			where user_id = $1
			  and created_date >= current_date - interval '1 day' * $2
			order by created_date, created_time asc
		`
		err = r.db.Select(&data, query, userID, days)
	}

	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	return data, nil
}

// FetchAccuracyData retrieves accuracy percentage data for chart visualization
func (r *NoteGameRepository) FetchAccuracyData(userID int, interval string, days int) ([]dtos.ChartDataPoint, error) {
	var query string
	var data []dtos.ChartDataPoint
	var err error

	if interval == "all" {
		query = `
			select
				created_date + created_time as timestamp,
				(correct_questions::float / nullif(total_questions::float, 0)) * 100 as value
			from note_game_entries
			where user_id = $1
			order by created_date, created_time asc
		`
		err = r.db.Select(&data, query, userID)
	} else {
		query = `
			select
				created_date + created_time as timestamp,
				(correct_questions::float / nullif(total_questions::float, 0)) * 100 as value
			from note_game_entries
			where user_id = $1
			  and created_date >= current_date - interval '1 day' * $2
			order by created_date, created_time asc
		`
		err = r.db.Select(&data, query, userID, days)
	}

	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	return data, nil
}

// FetchSessionCountData retrieves session count data for chart visualization
// Returns 1 for each individual game entry
func (r *NoteGameRepository) FetchSessionCountData(userID int, interval string, days int) ([]dtos.ChartDataPoint, error) {
	var query string
	var data []dtos.ChartDataPoint
	var err error

	if interval == "all" {
		query = `
			select
				created_date + created_time as timestamp,
				1::float as value
			from note_game_entries
			where user_id = $1
			order by created_date, created_time asc
		`
		err = r.db.Select(&data, query, userID)
	} else {
		query = `
			select
				created_date + created_time as timestamp,
				1::float as value
			from note_game_entries
			where user_id = $1
			  and created_date >= current_date - interval '1 day' * $2
			order by created_date, created_time asc
		`
		err = r.db.Select(&data, query, userID, days)
	}

	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	return data, nil
}

// FetchTotalQuestionsData retrieves total questions count for chart visualization
func (r *NoteGameRepository) FetchTotalQuestionsData(userID int, interval string, days int) ([]dtos.ChartDataPoint, error) {
	var query string
	var data []dtos.ChartDataPoint
	var err error

	if interval == "all" {
		query = `
			select
				created_date + created_time as timestamp,
				total_questions::float as value
			from note_game_entries
			where user_id = $1
			order by created_date, created_time asc
		`
		err = r.db.Select(&data, query, userID)
	} else {
		query = `
			select
				created_date + created_time as timestamp,
				total_questions::float as value
			from note_game_entries
			where user_id = $1
			  and created_date >= current_date - interval '1 day' * $2
			order by created_date, created_time asc
		`
		err = r.db.Select(&data, query, userID, days)
	}

	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	return data, nil
}

// FetchTeacherNPMData retrieves NPM data for all students of a teacher (individual games)
func (r *NoteGameRepository) FetchTeacherNPMData(teacherID int, interval string, days int) ([]dtos.ChartDataPoint, error) {
	var query string
	var data []dtos.ChartDataPoint
	var err error

	if interval == "all" {
		query = `
			select
				nge.created_date + nge.created_time as timestamp,
				nge.notes_per_minute::float as value
			from note_game_entries nge
			inner join teacher_student ts on nge.user_id = ts.student_id
			where ts.teacher_id = $1
			order by nge.created_date, nge.created_time asc
		`
		err = r.db.Select(&data, query, teacherID)
	} else {
		query = `
			select
				nge.created_date + nge.created_time as timestamp,
				nge.notes_per_minute::float as value
			from note_game_entries nge
			inner join teacher_student ts on nge.user_id = ts.student_id
			where ts.teacher_id = $1
			  and nge.created_date >= current_date - interval '1 day' * $2
			order by nge.created_date, nge.created_time asc
		`
		err = r.db.Select(&data, query, teacherID, days)
	}

	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	return data, nil
}

// FetchTeacherAccuracyData retrieves accuracy data for all students of a teacher (individual games)
func (r *NoteGameRepository) FetchTeacherAccuracyData(teacherID int, interval string, days int) ([]dtos.ChartDataPoint, error) {
	var query string
	var data []dtos.ChartDataPoint
	var err error

	if interval == "all" {
		query = `
			select
				nge.created_date + nge.created_time as timestamp,
				(nge.correct_questions::float / nullif(nge.total_questions::float, 0)) * 100 as value
			from note_game_entries nge
			inner join teacher_student ts on nge.user_id = ts.student_id
			where ts.teacher_id = $1
			order by nge.created_date, nge.created_time asc
		`
		err = r.db.Select(&data, query, teacherID)
	} else {
		query = `
			select
				nge.created_date + nge.created_time as timestamp,
				(nge.correct_questions::float / nullif(nge.total_questions::float, 0)) * 100 as value
			from note_game_entries nge
			inner join teacher_student ts on nge.user_id = ts.student_id
			where ts.teacher_id = $1
			  and nge.created_date >= current_date - interval '1 day' * $2
			order by nge.created_date, nge.created_time asc
		`
		err = r.db.Select(&data, query, teacherID, days)
	}

	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	return data, nil
}

// FetchTeacherSessionCountData retrieves session count for all students of a teacher (individual games)
// Returns 1 for each individual game entry
func (r *NoteGameRepository) FetchTeacherSessionCountData(teacherID int, interval string, days int) ([]dtos.ChartDataPoint, error) {
	var query string
	var data []dtos.ChartDataPoint
	var err error

	if interval == "all" {
		query = `
			select
				nge.created_date + nge.created_time as timestamp,
				1::float as value
			from note_game_entries nge
			inner join teacher_student ts on nge.user_id = ts.student_id
			where ts.teacher_id = $1
			order by nge.created_date, nge.created_time asc
		`
		err = r.db.Select(&data, query, teacherID)
	} else {
		query = `
			select
				nge.created_date + nge.created_time as timestamp,
				1::float as value
			from note_game_entries nge
			inner join teacher_student ts on nge.user_id = ts.student_id
			where ts.teacher_id = $1
			  and nge.created_date >= current_date - interval '1 day' * $2
			order by nge.created_date, nge.created_time asc
		`
		err = r.db.Select(&data, query, teacherID, days)
	}

	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	return data, nil
}

// FetchTeacherTotalQuestionsData retrieves total questions for all students of a teacher (individual games)
func (r *NoteGameRepository) FetchTeacherTotalQuestionsData(teacherID int, interval string, days int) ([]dtos.ChartDataPoint, error) {
	var query string
	var data []dtos.ChartDataPoint
	var err error

	if interval == "all" {
		query = `
			select
				nge.created_date + nge.created_time as timestamp,
				nge.total_questions::float as value
			from note_game_entries nge
			inner join teacher_student ts on nge.user_id = ts.student_id
			where ts.teacher_id = $1
			order by nge.created_date, nge.created_time asc
		`
		err = r.db.Select(&data, query, teacherID)
	} else {
		query = `
			select
				nge.created_date + nge.created_time as timestamp,
				nge.total_questions::float as value
			from note_game_entries nge
			inner join teacher_student ts on nge.user_id = ts.student_id
			where ts.teacher_id = $1
			  and nge.created_date >= current_date - interval '1 day' * $2
			order by nge.created_date, nge.created_time asc
		`
		err = r.db.Select(&data, query, teacherID, days)
	}

	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	return data, nil
}
