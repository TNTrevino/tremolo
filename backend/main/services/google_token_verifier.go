package services

// GoogleClaims holds the verified claims from a Google ID token.
type GoogleClaims struct {
	Sub           string // Google's unique user identifier
	Email         string
	EmailVerified bool
	GivenName     string
	FamilyName    string
}

// GoogleTokenVerifier abstracts Google token operations for testability.
type GoogleTokenVerifier interface {
	ExchangeCode(code, redirectURI string) (string, error)
	VerifyIDToken(idToken string) (*GoogleClaims, error)
}
