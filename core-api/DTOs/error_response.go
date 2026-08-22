package dtos

// ErrorResponse documents the shape every handler already produces via
// httpx.M{"error": "..."}. It is not used anywhere at runtime -- httpx.M
// serializes to the same JSON -- it exists only so swag @Failure
// annotations have a concrete type to point at.
type ErrorResponse struct {
	Error string `json:"error"`
}
