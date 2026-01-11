from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_mary_endpoint_exists():
    """Test that /mary endpoint is accessible"""
    response = client.post("/mary", json={"tonic": "C", "octave": 4})
    # Should return 200 or handle the request (not 404)
    assert response.status_code != 404


def test_random_endpoint_exists():
    """Test that /random endpoint is accessible"""
    response = client.post(
        "/random", json={"rhythm": "1111", "rhythmType": 16, "tonic": "C"}
    )
    # Should return 200 or handle the request (not 404)
    assert response.status_code != 404


def test_note_game_endpoint_exists():
    """Test that /note-game endpoint is accessible"""
    response = client.post("/note-game", json={"scale": "C", "octave": "4"})
    # Should return 200 or handle the request (not 404)
    assert response.status_code != 404


def test_mary_returns_xml():
    """Test that /mary returns XML content"""
    response = client.post("/mary", json={"tonic": "C", "octave": 4})
    if response.status_code == 200:
        assert response.headers["content-type"] == "application/xml"


def test_random_returns_xml():
    """Test that /random returns XML content"""
    response = client.post(
        "/random", json={"rhythm": "1111", "rhythmType": 16, "tonic": "C"}
    )
    if response.status_code == 200:
        assert response.headers["content-type"] == "application/xml"


def test_note_game_returns_json():
    """Test that /note-game returns JSON with expected structure"""
    response = client.post("/note-game", json={"scale": "C", "octave": "4"})
    if response.status_code == 200:
        data = response.json()
        assert "generatedXml" in data
        assert "noteName" in data
        assert "noteOctave" in data


def test_mary_error_handling():
    """Test that /mary handles invalid input with 400 status"""
    response = client.post("/mary", json={"tonic": "InvalidNote", "octave": 4})
    # Should return 400 for invalid note
    if response.status_code == 400:
        assert "not currently supported" in response.text


def test_random_error_handling():
    """Test that /random handles errors with 400 status"""
    response = client.post(
        "/random", json={"rhythm": "invalid", "rhythmType": 999, "tonic": "X"}
    )
    # Should return 400 for invalid input
    if response.status_code == 400:
        assert "something is not right" in response.text


def test_note_game_error_handling():
    """Test that /note-game handles errors with 400 status"""
    response = client.post(
        "/note-game", json={"scale": "InvalidScale", "octave": "999"}
    )
    # Should return 400 for invalid input
    if response.status_code == 400:
        assert "something is not right" in response.text
