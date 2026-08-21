package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"google.golang.org/api/idtoken"
)

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

// googleTokenVerifierImpl is the production implementation of GoogleTokenVerifier.
type googleTokenVerifierImpl struct{}

func (g *googleTokenVerifierImpl) ExchangeCode(code, redirectURI string) (string, error) {
	resp, err := http.PostForm("https://oauth2.googleapis.com/token", map[string][]string{
		"code":          {code},
		"client_id":     {googleClientID},
		"client_secret": {googleClientSecret},
		"redirect_uri":  {redirectURI},
		"grant_type":    {"authorization_code"},
	})
	if err != nil {
		return "", fmt.Errorf("failed to exchange code: %w", err)
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return "", fmt.Errorf("google token exchange failed with status %d: %s", resp.StatusCode, string(body))
	}

	var tokenResp struct {
		IDToken string `json:"id_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", fmt.Errorf("failed to decode token response: %w", err)
	}
	if tokenResp.IDToken == "" {
		return "", fmt.Errorf("no id_token in response")
	}
	return tokenResp.IDToken, nil
}

func (g *googleTokenVerifierImpl) VerifyIDToken(idTokenStr string) (*GoogleClaims, error) {
	payload, err := idtoken.Validate(context.Background(), idTokenStr, googleClientID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify id token: %w", err)
	}

	emailStr, ok := payload.Claims["email"].(string)
	if !ok || emailStr == "" {
		return nil, fmt.Errorf("email claim missing or invalid in ID token")
	}

	claims := &GoogleClaims{
		Sub:   payload.Subject,
		Email: emailStr,
	}

	switch v := payload.Claims["email_verified"].(type) {
	case bool:
		claims.EmailVerified = v
	case string:
		claims.EmailVerified = (v == "true")
	}
	if v, ok := payload.Claims["given_name"].(string); ok {
		claims.GivenName = v
	}
	if v, ok := payload.Claims["family_name"].(string); ok {
		claims.FamilyName = v
	}

	return claims, nil
}
