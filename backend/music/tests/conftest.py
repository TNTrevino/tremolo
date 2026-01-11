"""
Pytest fixtures for FastAPI music microservice testing.
Provides test client, valid/invalid payloads, and snapshot storage.
"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """
    FastAPI TestClient instance for making HTTP requests to the app.
    Creates a fresh client for each test to ensure isolation.
    """
    from main import app

    return TestClient(app)


@pytest.fixture
def valid_payloads():
    """
    Dictionary of valid test inputs for all endpoints.
    These payloads should return 200 status codes.
    """
    return {
        "mary": [
            {"tonic": "C", "octave": 4},
            {"tonic": "G", "octave": 5},
            {"tonic": "F", "octave": 3},
            {"tonic": "D-", "octave": 4},  # Flat note
            {"tonic": "E#", "octave": 4},  # Sharp note
            {"tonic": "A", "octave": 2},
            {"tonic": "B-", "octave": 6},
            {"tonic": "E", "octave": 4},
        ],
        "random": [
            {"rhythm": "1111", "rhythmType": 16, "tonic": "C"},
            {"rhythm": "112", "rhythmType": 16, "tonic": "G"},
            {"rhythm": "121", "rhythmType": 16, "tonic": "F"},
            {"rhythm": "211", "rhythmType": 16, "tonic": "D-"},
            {"rhythm": "0111", "rhythmType": 16, "tonic": "E"},
            {"rhythm": "11", "rhythmType": 8, "tonic": "C"},
            {"rhythm": "01", "rhythmType": 8, "tonic": "G"},
            {"rhythm": "10", "rhythmType": 8, "tonic": "F"},
        ],
        "note_game": [
            {"scale": "C", "octave": "4"},
            {"scale": "G", "octave": "5"},
            {"scale": "F", "octave": "3"},
            {"scale": "D-", "octave": "4"},
            {"scale": "E#", "octave": "4"},
            {"scale": "A", "octave": "2"},
            {"scale": "B-", "octave": "6"},
        ],
    }


@pytest.fixture
def invalid_payloads():
    """
    Dictionary of invalid test inputs that should return 400 errors.
    Each endpoint has different validation rules and error messages.
    """
    return {
        "mary": [
            {"tonic": "H", "octave": 4},  # Invalid note
            {"tonic": "Z", "octave": 4},  # Invalid note
            {"tonic": "C", "octave": -1},  # Invalid octave (negative)
            {"tonic": "C", "octave": 10},  # Out of range octave
            {},  # Missing required fields
            {"tonic": "C"},  # Missing octave
            {"octave": 4},  # Missing tonic
        ],
        "random": [
            {
                "rhythm": "9999",
                "rhythmType": 16,
                "tonic": "C",
            },  # Invalid rhythm (9s)
            {
                "rhythm": "2222",
                "rhythmType": 16,
                "tonic": "C",
            },  # Invalid rhythm (2s)
            {
                "rhythm": "1111",
                "rhythmType": 32,
                "tonic": "C",
            },  # Invalid rhythmType
            {
                "rhythm": "111",
                "rhythmType": 16,
                "tonic": "C",
            },  # Wrong length for type 16
            {"rhythm": "1111", "rhythmType": 16},  # Missing tonic
            {},  # Missing all fields
            {
                "rhythm": "11",
                "rhythmType": 16,
                "tonic": "C",
            },  # Wrong length for type 16
        ],
        "note_game": [
            {"scale": "H", "octave": "4"},  # Invalid scale
            {"scale": "Z", "octave": "4"},  # Invalid scale
            {"scale": "C", "octave": "10"},  # Invalid octave
            {"scale": "C", "octave": "-1"},  # Invalid octave
            {"scale": "C"},  # Missing octave
            {},  # Missing fields
            {"octave": "4"},  # Missing scale
        ],
    }


@pytest.fixture
def expected_error_messages():
    """
    Dictionary of expected error message substrings for each endpoint.
    Used to validate that error responses contain the correct messages.
    """
    return {
        "mary": "The note",  # Error messages contain "The note"
        "random": "something is not right!",  # Error messages contain this
        "note_game": "something is not right",  # Error messages contain this
    }


@pytest.fixture
def valid_note_names():
    """
    Set of valid note names (natural, flat, sharp) for validation.
    """
    return {
        "C",
        "C#",
        "C-",
        "D",
        "D#",
        "D-",
        "E",
        "E#",
        "E-",
        "F",
        "F#",
        "F-",
        "G",
        "G#",
        "G-",
        "A",
        "A#",
        "A-",
        "B",
        "B#",
        "B-",
    }


@pytest.fixture
def diatonic_notes():
    """
    Dictionary mapping scale tonics to their diatonic note sets.
    Used for validating that generated notes are in the correct key.
    """
    return {
        "C": {"C", "D", "E", "F", "G", "A", "B"},
        "G": {"G", "A", "B", "C", "D", "E", "F#"},
        "F": {"F", "G", "A", "B-", "C", "D", "E"},
        "D": {"D", "E", "F#", "G", "A", "B", "C#"},
        "A": {"A", "B", "C#", "D", "E", "F#", "G#"},
        "E": {"E", "F#", "G#", "A", "B", "C#", "D#"},
        "B": {"B", "C#", "D#", "E", "F#", "G#", "A#"},
        "D-": {"D-", "E-", "F", "G-", "A-", "B-", "C"},
        "E-": {"E-", "F", "G", "A-", "B-", "C", "D"},
        "A-": {"A-", "B-", "C", "D-", "E-", "F", "G"},
        "B-": {"B-", "C", "D", "E-", "F", "G", "A"},
    }


@pytest.fixture
def valid_mary_payloads():
    """Valid payloads for /mary endpoint"""
    return [
        {"tonic": "C", "octave": 4},
        {"tonic": "G", "octave": 5},
        {"tonic": "F", "octave": 3},
        {"tonic": "D-", "octave": 4},
        # Note: E# is not supported by music21 (E# = F)
        {"tonic": "C", "octave": 2},
        {"tonic": "C", "octave": 6},
        {"tonic": "A", "octave": 4},
    ]


@pytest.fixture
def valid_random_payloads():
    """Valid payloads for /random endpoint"""
    return [
        # Type 16 (sixteenth notes)
        {"rhythm": "1111", "rhythmType": 16, "tonic": "C"},
        {"rhythm": "112", "rhythmType": 16, "tonic": "G"},
        {"rhythm": "121", "rhythmType": 16, "tonic": "F"},
        {"rhythm": "211", "rhythmType": 16, "tonic": "D-"},
        {"rhythm": "0111", "rhythmType": 16, "tonic": "A"},  # E# not supported
        # Type 8 (eighth notes)
        {"rhythm": "11", "rhythmType": 8, "tonic": "C"},
        {"rhythm": "01", "rhythmType": 8, "tonic": "G"},
        {"rhythm": "10", "rhythmType": 8, "tonic": "F"},
    ]


@pytest.fixture
def invalid_mary_payloads():
    """Invalid payloads for /mary endpoint that should return 400"""
    return [
        {"tonic": "H", "octave": 4},  # Invalid note name
        {"tonic": "Z", "octave": 4},  # Invalid note name
        {"tonic": "C", "octave": 99},  # Out of range octave
        {"tonic": "C"},  # Missing octave
        {"octave": 4},  # Missing tonic
        {},  # Missing all fields
    ]


@pytest.fixture
def invalid_random_payloads():
    """Invalid payloads for /random endpoint"""
    return [
        {
            "rhythm": "9999",
            "rhythmType": 16,
            "tonic": "C",
        },  # Invalid rhythm digits
        {
            "rhythm": "1111",
            "rhythmType": 32,
            "tonic": "C",
        },  # Invalid rhythmType
        {"rhythm": "1111", "rhythmType": 16},  # Missing tonic
        {"rhythm": "1111", "rhythmType": 16, "tonic": "H"},  # Invalid tonic
        {
            "rhythm": "111",
            "rhythmType": 16,
            "tonic": "C",
        },  # Wrong rhythm length for type 16
        {
            "rhythm": "111",
            "rhythmType": 8,
            "tonic": "C",
        },  # Wrong rhythm length for type 8
        {},  # Missing all fields
    ]


@pytest.fixture
def mary_error_pattern():
    """Expected error message pattern for /mary"""
    return "The note"


@pytest.fixture
def random_error_pattern():
    """Expected error message pattern for /random"""
    return "something is not right!"
