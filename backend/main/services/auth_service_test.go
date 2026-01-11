package services

import (
	"testing"

	"golang.org/x/crypto/bcrypt"
)

func TestHashPassword(t *testing.T) {
	password := "testPassword123"

	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword failed: %v", err)
	}

	if hash == "" {
		t.Error("HashPassword returned empty string")
	}

	if hash == password {
		t.Error("HashPassword did not hash the password")
	}

	// Verify the hash is valid
	err = bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	if err != nil {
		t.Error("Generated hash does not match original password")
	}
}

func TestHashPasswordDifferentInputs(t *testing.T) {
	password1 := "password123"
	password2 := "differentPassword"

	hash1, err := HashPassword(password1)
	if err != nil {
		t.Fatalf("HashPassword failed for password1: %v", err)
	}

	hash2, err := HashPassword(password2)
	if err != nil {
		t.Fatalf("HashPassword failed for password2: %v", err)
	}

	if hash1 == hash2 {
		t.Error("Different passwords produced the same hash")
	}
}

func TestHashPasswordSameInputDifferentHashes(t *testing.T) {
	password := "samePassword123"

	hash1, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword failed for first hash: %v", err)
	}

	hash2, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword failed for second hash: %v", err)
	}

	// bcrypt generates different salts, so hashes should be different
	if hash1 == hash2 {
		t.Error("Same password produced identical hashes (salt should vary)")
	}

	// But both should verify correctly
	err = bcrypt.CompareHashAndPassword([]byte(hash1), []byte(password))
	if err != nil {
		t.Error("First hash does not verify correctly")
	}

	err = bcrypt.CompareHashAndPassword([]byte(hash2), []byte(password))
	if err != nil {
		t.Error("Second hash does not verify correctly")
	}
}

func TestHashPasswordEmptyString(t *testing.T) {
	password := ""

	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword failed for empty string: %v", err)
	}

	// bcrypt should still be able to hash an empty string
	if hash == "" {
		t.Error("HashPassword returned empty string for empty password")
	}

	// Verify it
	err = bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	if err != nil {
		t.Error("Empty password hash verification failed")
	}
}
