package services

import (
	"context"
	"crypto/rand"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	dtos "sight-reading/DTOs"
	"sight-reading/database/generated"
	"sight-reading/logger"
)

const teacherInviteMaxAttempts = 5

// generateTeacherInviteCode draws from joinCodeAlphabet (class_service.go)
// for the same reason a class join code does: a teacher reads this off an
// email, a slide, or a whiteboard, and 0/O and 1/I/L are where that goes
// wrong.
func generateTeacherInviteCode() (string, error) {
	buf := make([]byte, dtos.TeacherInviteCodeLength)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	for i, b := range buf {
		buf[i] = joinCodeAlphabet[int(b)%len(joinCodeAlphabet)]
	}
	return string(buf), nil
}

// CreateTeacherInvite mints an invite code and records adminID as the
// minter. Restricting this to ADMINs is the controller's job (adminOnly),
// not this function's -- the same split CreateUser uses.
//
// A collision on the generated code is retried rather than reported: the
// unique index is the arbiter, so two admins minting at once cannot
// produce the same code.
func CreateTeacherInvite(ctx context.Context, q generated.Querier, adminID int, req *dtos.CreateTeacherInviteRequest) (*dtos.TeacherInviteResponse, error) {
	maxUses := req.MaxUses
	if maxUses == 0 {
		maxUses = 1
	}

	expiresAt := sql.NullTime{}
	if req.ExpiresInDays > 0 {
		expiresAt = sql.NullTime{
			Time:  time.Now().Add(time.Duration(req.ExpiresInDays*24) * time.Hour),
			Valid: true,
		}
	}

	for range teacherInviteMaxAttempts {
		code, err := generateTeacherInviteCode()
		if err != nil {
			return nil, err
		}

		invite, err := q.CreateTeacherInviteCode(ctx, generated.CreateTeacherInviteCodeParams{
			Code:      code,
			Note:      strings.TrimSpace(req.Note),
			MaxUses:   int32(maxUses),
			ExpiresAt: expiresAt,
			CreatedBy: sql.NullInt32{Int32: int32(adminID), Valid: true},
		})
		if err != nil {
			if isUniqueViolation(err) {
				continue
			}
			logger.Error("Failed to create teacher invite code",
				"error", err.Error(),
				"admin_id", adminID)
			return nil, err
		}

		logger.Info("Teacher invite code created",
			"invite_id", invite.ID,
			"admin_id", adminID,
			"max_uses", invite.MaxUses)

		response := teacherInviteResponse(invite)
		return &response, nil
	}

	return nil, errors.New("could not generate a unique teacher invite code")
}

// ListTeacherInvites returns every minted code, newest first, so an admin
// can see which are spent. Restricted to ADMINs by the controller.
func ListTeacherInvites(ctx context.Context, q generated.Querier) ([]dtos.TeacherInviteResponse, error) {
	rows, err := q.ListTeacherInviteCodes(ctx)
	if err != nil {
		logger.Error("Failed to list teacher invite codes", "error", err.Error())
		return nil, err
	}

	invites := make([]dtos.TeacherInviteResponse, 0, len(rows))
	for _, row := range rows {
		invites = append(invites, teacherInviteResponse(row))
	}
	return invites, nil
}

// redeemTeacherInvite spends one use of a code and returns the row id, so
// the caller can hand that use back if the signup it gates then fails.
//
// The whole check is the WHERE clause of one UPDATE: the code exists, has
// not expired, and has uses left. Two people racing the last use of a code
// therefore cannot both win -- Postgres serializes the two writers on the
// row, and the loser's WHERE no longer matches, so it updates nothing.
// A select-then-update would let both readers see the same use_count.
//
// A code that does not exist, one that expired, and one that is spent are
// deliberately indistinguishable: all three are ErrInvalidInviteCode, so
// the response cannot be used to probe which codes are real.
func redeemTeacherInvite(ctx context.Context, q generated.Querier, rawCode string) (int32, error) {
	codeID, err := q.RedeemTeacherInviteCode(ctx, normalizeJoinCode(rawCode))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, ErrInvalidInviteCode
		}
		logger.Error("Failed to redeem teacher invite code", "error", err.Error())
		return 0, fmt.Errorf("redeem teacher invite code: %w", err)
	}
	return codeID, nil
}

// releaseTeacherInvite hands back a use that redeemTeacherInvite spent on
// a signup that then failed.
//
// Best-effort on purpose: the caller is already returning the real
// failure, and losing one use of a code is a smaller problem than
// replacing that failure with this one.
func releaseTeacherInvite(ctx context.Context, q generated.Querier, codeID int32) {
	if err := q.ReleaseTeacherInviteCode(ctx, codeID); err != nil {
		logger.Error("Failed to release teacher invite code",
			"error", err.Error(),
			"invite_id", codeID)
	}
}

// teacherInviteResponse converts a row to its wire shape here rather than
// in the DTO: DTOs may not import database/generated (see .golangci.yml).
func teacherInviteResponse(row generated.TremoloTeacherInviteCode) dtos.TeacherInviteResponse {
	return dtos.TeacherInviteResponse{
		Code:      row.Code,
		Note:      row.Note,
		MaxUses:   int(row.MaxUses),
		UseCount:  int(row.UseCount),
		ExpiresAt: ptrFromNullTime(row.ExpiresAt),
		CreatedAt: row.CreatedAt,
	}
}
