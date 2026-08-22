package testutil

import (
	"context"

	"sight-reading/services"
)

// MockGoogleTokenVerifier is a test mock for GoogleTokenVerifier.
// Set the fields to control behavior in tests.
type MockGoogleTokenVerifier struct {
	ExchangeCodeFn  func(ctx context.Context, code, redirectURI string) (string, error)
	VerifyIDTokenFn func(ctx context.Context, idToken string) (*services.GoogleClaims, error)
}

func (m *MockGoogleTokenVerifier) ExchangeCode(ctx context.Context, code, redirectURI string) (string, error) {
	return m.ExchangeCodeFn(ctx, code, redirectURI)
}

func (m *MockGoogleTokenVerifier) VerifyIDToken(ctx context.Context, idToken string) (*services.GoogleClaims, error) {
	return m.VerifyIDTokenFn(ctx, idToken)
}

// NewMockGoogleVerifier creates a mock that returns the given claims for any input.
func NewMockGoogleVerifier(claims *services.GoogleClaims) *MockGoogleTokenVerifier {
	return &MockGoogleTokenVerifier{
		ExchangeCodeFn: func(ctx context.Context, code, redirectURI string) (string, error) {
			return "mock-id-token", nil
		},
		VerifyIDTokenFn: func(ctx context.Context, idToken string) (*services.GoogleClaims, error) {
			return claims, nil
		},
	}
}
