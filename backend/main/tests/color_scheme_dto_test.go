package tests

import (
	"strings"
	"testing"

	dtos "sight-reading/DTOs"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// validColors returns a ColorSchemeColors with all fields set to valid HSL values.
func validColors() dtos.ColorSchemeColors {
	return dtos.ColorSchemeColors{
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
}

func validCreateRequest() *dtos.CreateColorSchemeRequest {
	return &dtos.CreateColorSchemeRequest{
		Name:   "Test Theme",
		IsDark: false,
		Colors: validColors(),
	}
}

// --- HSL regex: valid values ---

func TestHSLValidation_AcceptsWholeNumbers(t *testing.T) {
	t.Parallel()
	req := validCreateRequest()
	req.Colors.Background = "262 83% 58%"
	require.NoError(t, req.Validate())
}

func TestHSLValidation_AcceptsDecimals(t *testing.T) {
	t.Parallel()
	req := validCreateRequest()
	req.Colors.Background = "240 4.8% 95.9%"
	require.NoError(t, req.Validate())
}

func TestHSLValidation_AcceptsZeroValues(t *testing.T) {
	t.Parallel()
	req := validCreateRequest()
	req.Colors.Background = "0 0% 0%"
	require.NoError(t, req.Validate())
}

func TestHSLValidation_AcceptsMaxValues(t *testing.T) {
	t.Parallel()
	req := validCreateRequest()
	req.Colors.Background = "360 100% 100%"
	require.NoError(t, req.Validate())
}

func TestHSLValidation_AcceptsDecimalHue(t *testing.T) {
	t.Parallel()
	req := validCreateRequest()
	req.Colors.Background = "259.5 83% 58%"
	require.NoError(t, req.Validate())
}

// --- HSL regex: invalid values ---

func TestHSLValidation_RejectsEmptyString(t *testing.T) {
	t.Parallel()
	req := validCreateRequest()
	req.Colors.Background = ""
	err := req.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "Background")
}

func TestHSLValidation_RejectsArbitraryText(t *testing.T) {
	t.Parallel()
	req := validCreateRequest()
	req.Colors.Background = "not a color"
	err := req.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "Background")
	assert.Contains(t, err.Error(), "valid HSL value")
}

func TestHSLValidation_RejectsCSSInjection(t *testing.T) {
	t.Parallel()
	req := validCreateRequest()
	req.Colors.Background = "; } body { display:none"
	err := req.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "Background")
}

func TestHSLValidation_RejectsHexColor(t *testing.T) {
	t.Parallel()
	req := validCreateRequest()
	req.Colors.Background = "#7c3aed"
	err := req.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "valid HSL value")
}

func TestHSLValidation_RejectsMissingPercentSigns(t *testing.T) {
	t.Parallel()
	req := validCreateRequest()
	req.Colors.Background = "262 83 58"
	err := req.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "valid HSL value")
}

func TestHSLValidation_RejectsCSSHSLFunction(t *testing.T) {
	t.Parallel()
	req := validCreateRequest()
	req.Colors.Background = "hsl(262, 83%, 58%)"
	err := req.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "valid HSL value")
}

func TestHSLValidation_RejectsCommaDelimited(t *testing.T) {
	t.Parallel()
	req := validCreateRequest()
	req.Colors.Background = "262, 83%, 58%"
	err := req.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "valid HSL value")
}

func TestHSLValidation_RejectsNegativeHue(t *testing.T) {
	t.Parallel()
	req := validCreateRequest()
	req.Colors.Background = "-10 50% 50%"
	err := req.Validate()
	require.Error(t, err)
}

func TestHSLValidation_RejectsLeadingSpace(t *testing.T) {
	t.Parallel()
	req := validCreateRequest()
	req.Colors.Background = " 262 83% 58%"
	err := req.Validate()
	require.Error(t, err)
}

func TestHSLValidation_RejectsTrailingSpace(t *testing.T) {
	t.Parallel()
	req := validCreateRequest()
	req.Colors.Background = "262 83% 58% "
	err := req.Validate()
	require.Error(t, err)
}

// --- Name validation ---

func TestColorSchemeValidation_ValidRequestPasses(t *testing.T) {
	t.Parallel()
	req := validCreateRequest()
	require.NoError(t, req.Validate())
}

func TestColorSchemeValidation_EmptyNameFails(t *testing.T) {
	t.Parallel()
	req := validCreateRequest()
	req.Name = ""
	err := req.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "Name")
	assert.Contains(t, err.Error(), "is required")
}

func TestColorSchemeValidation_NameExceeds100CharsFails(t *testing.T) {
	t.Parallel()
	req := validCreateRequest()
	req.Name = strings.Repeat("a", 101)
	err := req.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "Name")
	assert.Contains(t, err.Error(), "at most 100")
}

func TestColorSchemeValidation_NameAt100CharsIsValid(t *testing.T) {
	t.Parallel()
	req := validCreateRequest()
	req.Name = strings.Repeat("a", 100)
	require.NoError(t, req.Validate())
}

// --- Update uses same validation ---

func TestUpdateColorSchemeValidation_ValidRequestPasses(t *testing.T) {
	t.Parallel()
	req := &dtos.UpdateColorSchemeRequest{
		Name:   "Updated Theme",
		IsDark: true,
		Colors: validColors(),
	}
	require.NoError(t, req.Validate())
}

func TestUpdateColorSchemeValidation_InvalidHSLFails(t *testing.T) {
	t.Parallel()
	colors := validColors()
	colors.Ring = "garbage"
	req := &dtos.UpdateColorSchemeRequest{
		Name:   "Updated Theme",
		IsDark: true,
		Colors: colors,
	}
	err := req.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "Ring")
	assert.Contains(t, err.Error(), "valid HSL value")
}

// --- Multiple errors reported ---

func TestColorSchemeValidation_ReportsMultipleErrors(t *testing.T) {
	t.Parallel()
	req := validCreateRequest()
	req.Name = ""
	req.Colors.Background = "invalid"
	req.Colors.Ring = "also invalid"

	err := req.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "Name")
	assert.Contains(t, err.Error(), "Background")
	assert.Contains(t, err.Error(), "Ring")
}
