package dtos

// ValidGameTypes is the single source of truth for identification game
// identifiers. The Go service, entry validation, and settings validation
// all derive from this map; the TS GameType union mirrors it.
var ValidGameTypes = map[string]bool{
	"note":          true,
	"key_signature": true,
	"scale":         true,
	"chord":         true,
	"interval":      true,
}

// ValidSettingsGameTypes are the games that store settings in the
// generic game_settings table — every game except the note game, which
// keeps its dedicated note_game_settings table.
var ValidSettingsGameTypes = derivedSettingsGameTypes()

func derivedSettingsGameTypes() map[string]bool {
	m := make(map[string]bool, len(ValidGameTypes))
	for gt := range ValidGameTypes {
		if gt != "note" {
			m[gt] = true
		}
	}
	return m
}
