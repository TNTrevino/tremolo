package dtos

import "fmt"

type FriendDTO struct {
	ID         int32  `json:"id"`
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	Role       string `json:"role"`
	Instrument string `json:"instrument"`
	AvatarUrl  string `json:"avatar_url"`
	School     string `json:"school"`
}

func GenerateAvatarURL(userID int32) string {
	return fmt.Sprintf("https://api.dicebear.com/7.x/initials/svg?seed=%d", userID)
}
