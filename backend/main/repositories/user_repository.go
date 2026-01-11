package repositories

import (
	"database/sql"
	"sight-reading/database"
	"time"

	"github.com/jmoiron/sqlx"
)

type UserRepository struct {
	db *sqlx.DB
}

func NewUserRepository() *UserRepository {
	return &UserRepository{db: database.DBClient}
}

type User struct {
	ID                  int            `db:"id"`
	Email               string         `db:"email"`
	FirstName           string         `db:"first_name"`
	LastName            string         `db:"last_name"`
	Role                string         `db:"role"`
	PasswordHash        sql.NullString `db:"password"`
	SchoolID            sql.NullInt64  `db:"school_id"`
	FailedLoginAttempts int            `db:"failed_login_attempts"`
	LockedUntil         sql.NullTime   `db:"locked_until"`
	CreatedDate         string         `db:"created_date"`
}

// GetUserByEmail retrieves a user by their email address
func (r *UserRepository) GetUserByEmail(email string) (*User, error) {
	query := `
		select id, email, first_name, last_name, role, password
		from users
		where email = $1
	`

	var user User
	err := r.db.Get(&user, query, email)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

// GetUserByID retrieves a user by their ID
func (r *UserRepository) GetUserByID(id int) (*User, error) {
	query := `
		select id, email, first_name, last_name, role, school_id, created_date
		from users
		where id = $1
	`

	var user User
	err := r.db.Get(&user, query, id)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

// GetUserRole retrieves just the role for a user
func (r *UserRepository) GetUserRole(userID int) (string, error) {
	var role string
	query := `select role from users where id = $1`

	err := r.db.Get(&role, query, userID)
	if err != nil {
		return "", err
	}

	return role, nil
}

// GetUsersByRole retrieves all users with a specific role
func (r *UserRepository) GetUsersByRole(role string) ([]User, error) {
	query := `
		select first_name, last_name, role, school_id
		from users
		where role = $1
	`

	var users []User
	err := r.db.Select(&users, query, role)
	if err != nil {
		return nil, err
	}

	return users, nil
}

// GetUserByRoleAndID retrieves a user by role and ID
func (r *UserRepository) GetUserByRoleAndID(role string, id int) (*User, error) {
	query := `
		select first_name, last_name, role, school_id
		from users
		where role = $1 and id = $2
	`

	var user User
	err := r.db.Get(&user, query, role, id)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

// CheckAccountLocked checks if an account is currently locked
// Returns: isLocked, lockedUntil, error
func (r *UserRepository) CheckAccountLocked(email string) (bool, *time.Time, error) {
	var lockedUntil sql.NullTime

	query := `
		select locked_until
		from users
		where email = $1 and locked_until > now()
	`

	err := r.db.Get(&lockedUntil, query, email)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil, nil
		}
		return false, nil, err
	}

	if lockedUntil.Valid {
		return true, &lockedUntil.Time, nil
	}

	return false, nil, nil
}

// IncrementFailedAttempts increments the failed login attempts counter
func (r *UserRepository) IncrementFailedAttempts(email string) error {
	query := `
		update users
		set failed_login_attempts = failed_login_attempts + 1
		where email = $1
	`

	_, err := r.db.Exec(query, email)
	return err
}

// GetFailedAttempts retrieves the current failed login attempts
func (r *UserRepository) GetFailedAttempts(email string) (int, error) {
	var attempts int

	query := `
		select failed_login_attempts
		from users
		where email = $1
	`

	err := r.db.Get(&attempts, query, email)
	if err != nil {
		return 0, err
	}

	return attempts, nil
}

// LockAccount locks an account for a specified duration
func (r *UserRepository) LockAccount(email string, lockedUntil time.Time) error {
	query := `
		update users
		set locked_until = $1
		where email = $2
	`

	_, err := r.db.Exec(query, lockedUntil, email)
	return err
}

// ResetLockout resets failed login attempts and unlocks the account
func (r *UserRepository) ResetLockout(email string) error {
	query := `
		update users
		set failed_login_attempts = 0, locked_until = null
		where email = $1
	`

	_, err := r.db.Exec(query, email)
	return err
}

// CreateUser inserts a new user and returns the created user data
func (r *UserRepository) CreateUser(user User) (*User, error) {
	query := `
		insert into users (
			first_name,
			last_name,
			email,
			password,
			role,
			school_id
		)
		values (
			:first_name,
			:last_name,
			:email,
			:password,
			:role,
			:school_id
		)
		returning id, first_name, last_name, email, role, school_id, created_date
	`

	rows, err := r.db.NamedQuery(query, user)
	if err != nil {
		return nil, err
	}
	defer func() {
		if closeErr := rows.Close(); closeErr != nil {
			err = closeErr
		}
	}()

	var createdUser User
	if rows.Next() {
		err := rows.StructScan(&createdUser)
		if err != nil {
			return nil, err
		}
	}

	return &createdUser, nil
}

// GetUserGeneralInfo fetches basic user info and aggregate statistics
func (r *UserRepository) GetUserGeneralInfo(userID int) (*struct {
	FirstName     string `db:"first_name"`
	LastName      string `db:"last_name"`
	CreatedDate   string `db:"created_date"`
	TotalEntries  int    `db:"total_entries"`
	TotalDuration string `db:"total_duration"`
}, error,
) {
	// language: sql
	query := `
		select
			u.first_name,
			u.last_name,
			u.created_date::text as created_date,
			coalesce(count(nge.id), 0)::int as total_entries,
			coalesce(sum(nge.time_length)::text, '00:00:00') as total_duration
		from users u
		left join note_game_entries nge on u.id = nge.user_id
		where u.id = $1
		group by u.id, u.first_name, u.last_name, u.created_date
	`

	var userInfo struct {
		FirstName     string `db:"first_name"`
		LastName      string `db:"last_name"`
		CreatedDate   string `db:"created_date"`
		TotalEntries  int    `db:"total_entries"`
		TotalDuration string `db:"total_duration"`
	}

	err := r.db.Get(&userInfo, query, userID)
	if err != nil {
		return nil, err
	}

	return &userInfo, nil
}
