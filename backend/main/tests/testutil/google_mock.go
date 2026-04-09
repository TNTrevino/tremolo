package testutil

import "sight-reading/services"

// MockGoogleTokenVerifier is a test mock for GoogleTokenVerifier.
// Set the fields to control behavior in tests.
type MockGoogleTokenVerifier struct {
	ExchangeCodeFn  func(code, redirectURI string) (string, error)
	VerifyIDTokenFn func(idToken string) (*services.GoogleClaims, error)
}

func (m *MockGoogleTokenVerifier) ExchangeCode(code, redirectURI string) (string, error) {
	return m.ExchangeCodeFn(code, redirectURI)
}

func (m *MockGoogleTokenVerifier) VerifyIDToken(idToken string) (*services.GoogleClaims, error) {
	return m.VerifyIDTokenFn(idToken)
}

// NewMockGoogleVerifier creates a mock that returns the given claims for any input.
func NewMockGoogleVerifier(claims *services.GoogleClaims) *MockGoogleTokenVerifier {
	return &MockGoogleTokenVerifier{
		ExchangeCodeFn: func(code, redirectURI string) (string, error) {
			return "mock-id-token", nil
		},
		VerifyIDTokenFn: func(idToken string) (*services.GoogleClaims, error) {
			return claims, nil
		},
	}
}
