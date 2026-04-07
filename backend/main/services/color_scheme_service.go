package services

import (
	"context"
	"database/sql"
	"fmt"

	dtos "sight-reading/DTOs"
	"sight-reading/database/generated"
	"sight-reading/logger"
)

var DefaultLightColors = dtos.ColorSchemeColors{
	Background:            "0 0% 100%",
	Foreground:            "240 10% 3.9%",
	Card:                  "0 0% 100%",
	CardForeground:        "240 10% 3.9%",
	Popover:               "0 0% 100%",
	PopoverForeground:     "240 10% 3.9%",
	PrimaryColor:          "262 83% 58%",
	PrimaryForeground:     "0 0% 98%",
	SecondaryColor:        "240 4.8% 95.9%",
	SecondaryForeground:   "240 5.9% 10%",
	Muted:                 "240 4.8% 95.9%",
	MutedForeground:       "240 3.8% 46.1%",
	Accent:                "45 93% 47%",
	AccentForeground:      "240 5.9% 10%",
	Destructive:           "0 84.2% 60.2%",
	DestructiveForeground: "0 0% 98%",
	BorderColor:           "240 5.9% 90%",
	InputColor:            "240 5.9% 90%",
	Ring:                  "262 83% 58%",
}

var DefaultDarkColors = dtos.ColorSchemeColors{
	Background:            "240 10% 3.9%",
	Foreground:            "0 0% 98%",
	Card:                  "240 10% 8%",
	CardForeground:        "0 0% 98%",
	Popover:               "240 10% 8%",
	PopoverForeground:     "0 0% 98%",
	PrimaryColor:          "262 83% 58%",
	PrimaryForeground:     "0 0% 98%",
	SecondaryColor:        "240 3.7% 15.9%",
	SecondaryForeground:   "0 0% 98%",
	Muted:                 "240 3.7% 15.9%",
	MutedForeground:       "240 5% 64.9%",
	Accent:                "45 93% 47%",
	AccentForeground:      "0 0% 98%",
	Destructive:           "0 62.8% 30.6%",
	DestructiveForeground: "0 0% 98%",
	BorderColor:           "240 3.7% 15.9%",
	InputColor:            "240 3.7% 15.9%",
	Ring:                  "262 83% 58%",
}

// CreateDefaultColorSchemes seeds a new user with the Default Light and Default Dark
// preset color schemes and sets the active scheme to Dark.
func CreateDefaultColorSchemes(ctx context.Context, q generated.Querier, userID int) error {
	lightParams := generated.CreateColorSchemeParams{
		UserID:   int32(userID),
		Name:     "Default Light",
		IsPreset: true,
		IsDark:   false,
	}
	applyColorsToCreateParams(&lightParams, DefaultLightColors)

	lightScheme, err := q.CreateColorScheme(ctx, lightParams)
	if err != nil {
		logger.Error("Failed to create default light color scheme",
			"error", err.Error(),
			"user_id", userID)
		return err
	}

	darkParams := generated.CreateColorSchemeParams{
		UserID:   int32(userID),
		Name:     "Default Dark",
		IsPreset: true,
		IsDark:   true,
	}
	applyColorsToCreateParams(&darkParams, DefaultDarkColors)

	darkScheme, err := q.CreateColorScheme(ctx, darkParams)
	if err != nil {
		logger.Error("Failed to create default dark color scheme",
			"error", err.Error(),
			"user_id", userID)
		return err
	}

	err = q.SetActiveColorScheme(ctx, generated.SetActiveColorSchemeParams{
		ID:                  int32(userID),
		ActiveColorSchemeID: sql.NullInt32{Int32: darkScheme.ID, Valid: true},
	})
	if err != nil {
		logger.Error("Failed to set active color scheme",
			"error", err.Error(),
			"user_id", userID)
		return err
	}

	err = q.SetPreferredSchemes(ctx, generated.SetPreferredSchemesParams{
		ID:                     int32(userID),
		PreferredLightSchemeID: sql.NullInt32{Int32: lightScheme.ID, Valid: true},
		PreferredDarkSchemeID:  sql.NullInt32{Int32: darkScheme.ID, Valid: true},
	})
	if err != nil {
		logger.Error("Failed to set preferred color schemes",
			"error", err.Error(),
			"user_id", userID)
		return err
	}

	logger.Info("Default color schemes created successfully",
		"user_id", userID)
	return nil
}

func GetColorSchemes(ctx context.Context, q generated.Querier, userID int) ([]dtos.ColorSchemeResponse, error) {
	rows, err := q.GetColorSchemesByUserID(ctx, int32(userID))
	if err != nil {
		logger.Error("Failed to fetch color schemes",
			"error", err.Error(),
			"user_id", userID)
		return nil, err
	}

	schemes := make([]dtos.ColorSchemeResponse, len(rows))
	for i, row := range rows {
		schemes[i] = convertColorSchemeRowToDTO(row)
	}
	return schemes, nil
}

func GetActiveColorScheme(ctx context.Context, q generated.Querier, userID int) (*dtos.ColorSchemeResponse, error) {
	row, err := q.GetActiveColorScheme(ctx, int32(userID))
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		logger.Error("Failed to fetch active color scheme",
			"error", err.Error(),
			"user_id", userID)
		return nil, err
	}

	resp := convertColorSchemeRowToDTO(row)
	return &resp, nil
}

func CreateColorScheme(ctx context.Context, q generated.Querier, userID int, req *dtos.CreateColorSchemeRequest) (*dtos.ColorSchemeResponse, error) {
	if err := req.Validate(); err != nil {
		logger.Error("Color scheme validation failed",
			"error", err.Error(),
			"user_id", userID)
		return nil, &ValidationError{Err: err}
	}

	params := generated.CreateColorSchemeParams{
		UserID:   int32(userID),
		Name:     req.Name,
		IsPreset: false,
		IsDark:   req.IsDark,
	}
	applyColorsToCreateParams(&params, req.Colors)

	row, err := q.CreateColorScheme(ctx, params)
	if err != nil {
		logger.Error("Failed to create color scheme",
			"error", err.Error(),
			"user_id", userID)
		return nil, err
	}

	logger.Info("Color scheme created successfully",
		"user_id", userID,
		"scheme_id", row.ID)

	resp := convertColorSchemeRowToDTO(row)
	return &resp, nil
}

func UpdateColorScheme(ctx context.Context, q generated.Querier, userID, schemeID int, req *dtos.UpdateColorSchemeRequest) (*dtos.ColorSchemeResponse, error) {
	if err := req.Validate(); err != nil {
		logger.Error("Color scheme validation failed",
			"error", err.Error(),
			"user_id", userID)
		return nil, &ValidationError{Err: err}
	}

	existing, err := q.GetColorSchemeByID(ctx, generated.GetColorSchemeByIDParams{
		ID:     int32(schemeID),
		UserID: int32(userID),
	})
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, &ValidationError{Err: fmt.Errorf("color scheme not found")}
		}
		logger.Error("Failed to fetch color scheme for update",
			"error", err.Error(),
			"user_id", userID,
			"scheme_id", schemeID)
		return nil, err
	}

	if existing.IsPreset {
		return nil, &ValidationError{Err: fmt.Errorf("preset color schemes cannot be modified")}
	}

	params := generated.UpdateColorSchemeParams{
		ID:                    int32(schemeID),
		UserID:                int32(userID),
		Name:                  req.Name,
		IsDark:                req.IsDark,
		Background:            req.Colors.Background,
		Foreground:            req.Colors.Foreground,
		Card:                  req.Colors.Card,
		CardForeground:        req.Colors.CardForeground,
		Popover:               req.Colors.Popover,
		PopoverForeground:     req.Colors.PopoverForeground,
		PrimaryColor:          req.Colors.PrimaryColor,
		PrimaryForeground:     req.Colors.PrimaryForeground,
		SecondaryColor:        req.Colors.SecondaryColor,
		SecondaryForeground:   req.Colors.SecondaryForeground,
		Muted:                 req.Colors.Muted,
		MutedForeground:       req.Colors.MutedForeground,
		Accent:                req.Colors.Accent,
		AccentForeground:      req.Colors.AccentForeground,
		Destructive:           req.Colors.Destructive,
		DestructiveForeground: req.Colors.DestructiveForeground,
		BorderColor:           req.Colors.BorderColor,
		InputColor:            req.Colors.InputColor,
		Ring:                  req.Colors.Ring,
	}

	row, err := q.UpdateColorScheme(ctx, params)
	if err != nil {
		logger.Error("Failed to update color scheme",
			"error", err.Error(),
			"user_id", userID,
			"scheme_id", schemeID)
		return nil, err
	}

	logger.Info("Color scheme updated successfully",
		"user_id", userID,
		"scheme_id", schemeID)

	resp := convertColorSchemeRowToDTO(row)
	return &resp, nil
}

func DeleteColorScheme(ctx context.Context, q generated.Querier, userID, schemeID int) error {
	existing, err := q.GetColorSchemeByID(ctx, generated.GetColorSchemeByIDParams{
		ID:     int32(schemeID),
		UserID: int32(userID),
	})
	if err != nil {
		if err == sql.ErrNoRows {
			return &ValidationError{Err: fmt.Errorf("color scheme not found")}
		}
		logger.Error("Failed to fetch color scheme for deletion",
			"error", err.Error(),
			"user_id", userID,
			"scheme_id", schemeID)
		return err
	}

	if existing.IsPreset {
		return &ValidationError{Err: fmt.Errorf("preset color schemes cannot be deleted")}
	}

	prefs, err := q.GetPreferredSchemeIDs(ctx, int32(userID))
	if err != nil {
		logger.Error("Failed to fetch user preferences for deletion check",
			"error", err.Error(),
			"user_id", userID)
		return err
	}

	sid := int32(schemeID)
	if prefs.ActiveColorSchemeID.Valid && prefs.ActiveColorSchemeID.Int32 == sid {
		return &ValidationError{Err: fmt.Errorf("cannot delete your active color scheme; please switch to another scheme first")}
	}
	if prefs.PreferredLightSchemeID.Valid && prefs.PreferredLightSchemeID.Int32 == sid {
		return &ValidationError{Err: fmt.Errorf("cannot delete a scheme set as your preferred light scheme")}
	}
	if prefs.PreferredDarkSchemeID.Valid && prefs.PreferredDarkSchemeID.Int32 == sid {
		return &ValidationError{Err: fmt.Errorf("cannot delete a scheme set as your preferred dark scheme")}
	}

	err = q.DeleteColorScheme(ctx, generated.DeleteColorSchemeParams{
		ID:     int32(schemeID),
		UserID: int32(userID),
	})
	if err != nil {
		logger.Error("Failed to delete color scheme",
			"error", err.Error(),
			"user_id", userID,
			"scheme_id", schemeID)
		return err
	}

	logger.Info("Color scheme deleted successfully",
		"user_id", userID,
		"scheme_id", schemeID)
	return nil
}

func SetActiveScheme(ctx context.Context, q generated.Querier, userID int, req *dtos.SetActiveSchemeRequest) error {
	_, err := q.GetColorSchemeByID(ctx, generated.GetColorSchemeByIDParams{
		ID:     int32(req.SchemeID),
		UserID: int32(userID),
	})
	if err != nil {
		if err == sql.ErrNoRows {
			return &ValidationError{Err: fmt.Errorf("color scheme not found")}
		}
		logger.Error("Failed to verify color scheme for activation",
			"error", err.Error(),
			"user_id", userID,
			"scheme_id", req.SchemeID)
		return err
	}

	err = q.SetActiveColorScheme(ctx, generated.SetActiveColorSchemeParams{
		ID:                  int32(userID),
		ActiveColorSchemeID: sql.NullInt32{Int32: int32(req.SchemeID), Valid: true},
	})
	if err != nil {
		logger.Error("Failed to set active color scheme",
			"error", err.Error(),
			"user_id", userID,
			"scheme_id", req.SchemeID)
		return err
	}

	logger.Info("Active color scheme set successfully",
		"user_id", userID,
		"scheme_id", req.SchemeID)
	return nil
}

func ToggleScheme(ctx context.Context, q generated.Querier, userID int) (*dtos.ColorSchemeResponse, error) {
	prefs, err := q.GetPreferredSchemeIDs(ctx, int32(userID))
	if err != nil {
		logger.Error("Failed to fetch preferred scheme IDs",
			"error", err.Error(),
			"user_id", userID)
		return nil, err
	}

	if !prefs.PreferredLightSchemeID.Valid || !prefs.PreferredDarkSchemeID.Valid {
		return nil, &ValidationError{Err: fmt.Errorf("preferred light and dark schemes must be set before toggling")}
	}

	var newActiveID int32
	if prefs.ActiveColorSchemeID.Valid && prefs.ActiveColorSchemeID.Int32 == prefs.PreferredLightSchemeID.Int32 {
		newActiveID = prefs.PreferredDarkSchemeID.Int32
	} else {
		newActiveID = prefs.PreferredLightSchemeID.Int32
	}

	err = q.SetActiveColorScheme(ctx, generated.SetActiveColorSchemeParams{
		ID:                  int32(userID),
		ActiveColorSchemeID: sql.NullInt32{Int32: newActiveID, Valid: true},
	})
	if err != nil {
		logger.Error("Failed to toggle active color scheme",
			"error", err.Error(),
			"user_id", userID)
		return nil, err
	}

	scheme, err := q.GetColorSchemeByID(ctx, generated.GetColorSchemeByIDParams{
		ID:     newActiveID,
		UserID: int32(userID),
	})
	if err != nil {
		logger.Error("Failed to fetch new active color scheme after toggle",
			"error", err.Error(),
			"user_id", userID)
		return nil, err
	}

	logger.Info("Color scheme toggled successfully",
		"user_id", userID,
		"new_scheme_id", newActiveID)

	resp := convertColorSchemeRowToDTO(scheme)
	return &resp, nil
}

func SetPreferredSchemes(ctx context.Context, q generated.Querier, userID int, req *dtos.SetPreferredSchemesRequest) error {
	lightScheme, err := q.GetColorSchemeByID(ctx, generated.GetColorSchemeByIDParams{
		ID:     int32(req.LightSchemeID),
		UserID: int32(userID),
	})
	if err != nil {
		if err == sql.ErrNoRows {
			return &ValidationError{Err: fmt.Errorf("light color scheme not found")}
		}
		logger.Error("Failed to verify light color scheme",
			"error", err.Error(),
			"user_id", userID,
			"scheme_id", req.LightSchemeID)
		return err
	}
	if lightScheme.IsDark {
		return &ValidationError{Err: fmt.Errorf("light scheme must not be a dark scheme")}
	}

	darkScheme, err := q.GetColorSchemeByID(ctx, generated.GetColorSchemeByIDParams{
		ID:     int32(req.DarkSchemeID),
		UserID: int32(userID),
	})
	if err != nil {
		if err == sql.ErrNoRows {
			return &ValidationError{Err: fmt.Errorf("dark color scheme not found")}
		}
		logger.Error("Failed to verify dark color scheme",
			"error", err.Error(),
			"user_id", userID,
			"scheme_id", req.DarkSchemeID)
		return err
	}
	if !darkScheme.IsDark {
		return &ValidationError{Err: fmt.Errorf("dark scheme must be a dark scheme")}
	}

	err = q.SetPreferredSchemes(ctx, generated.SetPreferredSchemesParams{
		ID:                     int32(userID),
		PreferredLightSchemeID: sql.NullInt32{Int32: int32(req.LightSchemeID), Valid: true},
		PreferredDarkSchemeID:  sql.NullInt32{Int32: int32(req.DarkSchemeID), Valid: true},
	})
	if err != nil {
		logger.Error("Failed to set preferred color schemes",
			"error", err.Error(),
			"user_id", userID)
		return err
	}

	logger.Info("Preferred color schemes set successfully",
		"user_id", userID,
		"light_scheme_id", req.LightSchemeID,
		"dark_scheme_id", req.DarkSchemeID)
	return nil
}

func convertColorSchemeRowToDTO(row generated.TremoloColorScheme) dtos.ColorSchemeResponse {
	return dtos.ColorSchemeResponse{
		ID:       int(row.ID),
		UserID:   int(row.UserID),
		Name:     row.Name,
		IsPreset: row.IsPreset,
		IsDark:   row.IsDark,
		Colors: dtos.ColorSchemeColors{
			Background:            row.Background,
			Foreground:            row.Foreground,
			Card:                  row.Card,
			CardForeground:        row.CardForeground,
			Popover:               row.Popover,
			PopoverForeground:     row.PopoverForeground,
			PrimaryColor:          row.PrimaryColor,
			PrimaryForeground:     row.PrimaryForeground,
			SecondaryColor:        row.SecondaryColor,
			SecondaryForeground:   row.SecondaryForeground,
			Muted:                 row.Muted,
			MutedForeground:       row.MutedForeground,
			Accent:                row.Accent,
			AccentForeground:      row.AccentForeground,
			Destructive:           row.Destructive,
			DestructiveForeground: row.DestructiveForeground,
			BorderColor:           row.BorderColor,
			InputColor:            row.InputColor,
			Ring:                  row.Ring,
		},
	}
}

func applyColorsToCreateParams(params *generated.CreateColorSchemeParams, colors dtos.ColorSchemeColors) {
	params.Background = colors.Background
	params.Foreground = colors.Foreground
	params.Card = colors.Card
	params.CardForeground = colors.CardForeground
	params.Popover = colors.Popover
	params.PopoverForeground = colors.PopoverForeground
	params.PrimaryColor = colors.PrimaryColor
	params.PrimaryForeground = colors.PrimaryForeground
	params.SecondaryColor = colors.SecondaryColor
	params.SecondaryForeground = colors.SecondaryForeground
	params.Muted = colors.Muted
	params.MutedForeground = colors.MutedForeground
	params.Accent = colors.Accent
	params.AccentForeground = colors.AccentForeground
	params.Destructive = colors.Destructive
	params.DestructiveForeground = colors.DestructiveForeground
	params.BorderColor = colors.BorderColor
	params.InputColor = colors.InputColor
	params.Ring = colors.Ring
}
