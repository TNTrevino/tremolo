package services

import (
	"testing"
)

func TestGetIntervalStrategy(t *testing.T) {
	tests := []struct {
		name           string
		interval       string
		expectStrategy bool
		strategyType   string
	}{
		{
			name:           "all interval returns AllTimeStrategy",
			interval:       "all",
			expectStrategy: true,
			strategyType:   "*services.AllTimeStrategy",
		},
		{
			name:           "day interval returns RangeBasedStrategy",
			interval:       "day",
			expectStrategy: true,
			strategyType:   "*services.RangeBasedStrategy",
		},
		{
			name:           "week interval returns RangeBasedStrategy",
			interval:       "week",
			expectStrategy: true,
			strategyType:   "*services.RangeBasedStrategy",
		},
		{
			name:           "month interval returns RangeBasedStrategy",
			interval:       "month",
			expectStrategy: true,
			strategyType:   "*services.RangeBasedStrategy",
		},
		{
			name:           "year interval returns RangeBasedStrategy",
			interval:       "year",
			expectStrategy: true,
			strategyType:   "*services.RangeBasedStrategy",
		},
		{
			name:           "invalid interval returns false",
			interval:       "invalid",
			expectStrategy: false,
		},
		{
			name:           "empty string returns false",
			interval:       "",
			expectStrategy: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			strategy, exists := GetIntervalStrategy(tt.interval)

			if exists != tt.expectStrategy {
				t.Errorf("GetIntervalStrategy(%q) exists = %v, want %v", tt.interval, exists, tt.expectStrategy)
			}

			if tt.expectStrategy {
				if strategy == nil {
					t.Errorf("GetIntervalStrategy(%q) returned nil strategy when expecting strategy", tt.interval)
				}
			} else {
				if strategy != nil {
					t.Errorf("GetIntervalStrategy(%q) returned non-nil strategy when expecting nil", tt.interval)
				}
			}
		})
	}
}

func TestIntervalStrategyRegistry(t *testing.T) {
	expectedIntervals := []string{"all", "day", "week", "month", "year"}

	for _, interval := range expectedIntervals {
		if _, exists := intervalStrategyRegistry[interval]; !exists {
			t.Errorf("Expected interval %q to be registered in intervalStrategyRegistry", interval)
		}
	}

	// Verify that the registry doesn't have unexpected entries
	if len(intervalStrategyRegistry) != len(expectedIntervals) {
		t.Errorf("intervalStrategyRegistry has %d entries, expected %d", len(intervalStrategyRegistry), len(expectedIntervals))
	}
}

func TestAllTimeStrategyImplementsInterface(t *testing.T) {
	var _ IntervalStrategy = &AllTimeStrategy{}
}

func TestRangeBasedStrategyImplementsInterface(t *testing.T) {
	var _ IntervalStrategy = &RangeBasedStrategy{}
}
