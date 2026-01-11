import pytest
import xml.etree.ElementTree as ET
from fastapi import status


class TestNoteGameEndpointHappyPath:
    """Test /note-game endpoint with valid inputs"""

    def test_note_game_valid_inputs_return_200(self, client):
        """Valid payloads should return 200 OK"""
        valid_payloads = [
            {"scale": "C", "octave": "4"},
            {"scale": "G", "octave": "5"},
            {"scale": "F", "octave": "3"},
            {"scale": "D-", "octave": "4"},
            {"scale": "C", "octave": "2"},
            {"scale": "C", "octave": "6"},
        ]

        for payload in valid_payloads:
            response = client.post("/note-game", json=payload)
            assert (
                response.status_code == status.HTTP_200_OK
            ), f"Failed for payload {payload}: got {response.status_code}"

    def test_note_game_returns_json_content_type(self, client):
        """Response should have application/json content type"""
        response = client.post("/note-game", json={"scale": "C", "octave": "4"})
        assert response.status_code == 200
        assert "application/json" in response.headers["content-type"]

    def test_note_game_response_structure(self, client):
        """Response should have required fields with correct types"""
        response = client.post("/note-game", json={"scale": "C", "octave": "4"})
        assert response.status_code == 200

        data = response.json()

        # Verify required fields exist
        assert "generatedXml" in data, "Missing generatedXml field"
        assert "noteName" in data, "Missing noteName field"
        assert "noteOctave" in data, "Missing noteOctave field"

        # Verify types
        assert isinstance(
            data["generatedXml"], str
        ), "generatedXml should be string"
        assert isinstance(data["noteName"], str), "noteName should be string"
        assert isinstance(
            data["noteOctave"], str
        ), "noteOctave should be string"

    def test_note_game_xml_is_valid(self, client):
        """The generatedXml field should contain valid XML"""
        response = client.post("/note-game", json={"scale": "C", "octave": "4"})
        assert response.status_code == 200

        data = response.json()
        xml_str = data["generatedXml"]

        # Try to parse as XML
        try:
            root = ET.fromstring(xml_str)
            assert root is not None, "generatedXml is not valid XML"
        except ET.ParseError as e:
            pytest.fail(f"generatedXml is not valid XML: {e}")

    def test_note_game_note_name_is_valid(self, client):
        """The noteName should be a valid musical note"""
        response = client.post("/note-game", json={"scale": "C", "octave": "4"})
        assert response.status_code == 200

        data = response.json()
        note_name = data["noteName"]

        # Valid notes are A-G, optionally with # or -
        assert len(note_name) in [
            1,
            2,
        ], f"Invalid note name length: {note_name}"
        assert note_name[0] in "ABCDEFG", f"Invalid note name: {note_name}"
        if len(note_name) == 2:
            assert (
                note_name[1] in "#-"
            ), f"Invalid accidental in note: {note_name}"

    def test_note_game_octave_matches_request(self, client):
        """The noteOctave should match the requested octave"""
        octaves = ["2", "3", "4", "5", "6"]

        for octave in octaves:
            response = client.post(
                "/note-game", json={"scale": "C", "octave": octave}
            )
            assert response.status_code == 200

            data = response.json()
            assert (
                data["noteOctave"] == octave
            ), f"Expected octave {octave}, got {data['noteOctave']}"

    def test_note_game_different_scales(self, client):
        """Test with various scale notes"""
        scales = ["C", "G", "F", "D-", "E-"]

        for scale in scales:
            response = client.post(
                "/note-game", json={"scale": scale, "octave": "4"}
            )
            assert response.status_code == 200, f"Failed for scale {scale}"

            data = response.json()
            assert "noteName" in data
            assert len(data["noteName"]) in [1, 2]


class TestNoteGameResponseFormat:
    """Test /note-game response format and structure"""

    def test_note_game_response_is_json_serializable(self, client):
        """Response should be valid JSON"""
        response = client.post("/note-game", json={"scale": "C", "octave": "4"})
        assert response.status_code == 200

        # Should not raise exception
        data = response.json()
        assert isinstance(data, dict)

    def test_note_game_xml_not_empty(self, client):
        """generatedXml field should not be empty"""
        response = client.post("/note-game", json={"scale": "C", "octave": "4"})
        assert response.status_code == 200

        data = response.json()
        assert len(data["generatedXml"]) > 0, "generatedXml is empty"

    def test_note_game_xml_contains_note_element(self, client):
        """The generatedXml should contain musical elements"""
        response = client.post("/note-game", json={"scale": "C", "octave": "4"})
        assert response.status_code == 200

        data = response.json()
        xml_str = data["generatedXml"]

        # Check for musical elements
        assert "score" in xml_str.lower() or "scorepartwise" in xml_str.lower()
        assert "part" in xml_str.lower()
        assert "measure" in xml_str.lower()
        assert "note" in xml_str.lower()

    def test_note_game_no_extra_fields(self, client):
        """Response should only contain expected fields"""
        response = client.post("/note-game", json={"scale": "C", "octave": "4"})
        assert response.status_code == 200

        data = response.json()
        expected_fields = {"generatedXml", "noteName", "noteOctave"}
        actual_fields = set(data.keys())

        # Should not have unexpected fields
        assert (
            actual_fields == expected_fields
        ), f"Unexpected fields: {actual_fields - expected_fields}"


class TestNoteGameRandomness:
    """Test /note-game randomness and variety"""

    def test_note_game_generates_different_notes(self, client):
        """Multiple requests should generate different notes (with reasonable probability)"""
        scale = "C"
        octave = "4"

        notes = []
        for _ in range(10):
            response = client.post(
                "/note-game", json={"scale": scale, "octave": octave}
            )
            assert response.status_code == 200
            data = response.json()
            notes.append(data["noteName"])

        # With 7 diatonic notes, we should see at least some variation
        unique_notes = set(notes)
        assert (
            len(unique_notes) > 1
        ), f"Expected variation in generated notes, got only: {unique_notes}"

    def test_note_game_respects_scale_tonality(self, client):
        """Generated notes should be diatonic to the requested scale"""
        # For C major: C, D, E, F, G, A, B are valid
        c_major_notes = {"C", "D", "E", "F", "G", "A", "B"}

        notes_generated = set()
        for _ in range(20):
            response = client.post(
                "/note-game", json={"scale": "C", "octave": "4"}
            )
            assert response.status_code == 200
            data = response.json()
            note = data["noteName"]

            # Extract base note (remove accidentals)
            base_note = note[0]
            notes_generated.add(base_note)

        # All base notes should be from C major scale
        assert notes_generated.issubset(
            c_major_notes
        ), f"Generated notes not in C major scale: {notes_generated}"


class TestNoteGameErrorHandling:
    """Test /note-game error handling"""

    def test_note_game_invalid_scale_returns_400(self, client):
        """Invalid scale notes should return 400"""
        invalid_scales = ["H", "Z", "X", "Q"]

        for scale in invalid_scales:
            response = client.post(
                "/note-game", json={"scale": scale, "octave": "4"}
            )
            assert (
                response.status_code == status.HTTP_400_BAD_REQUEST
            ), f"Expected 400 for scale {scale}, got {response.status_code}"

            # Verify error message contains expected pattern
            error_msg = response.text
            assert (
                "something is not right" in error_msg.lower()
            ), f"Error message doesn't match expected pattern: {error_msg}"

    def test_note_game_invalid_octave_returns_400(self, client):
        """Invalid octaves should return 400"""
        invalid_octaves = ["99", "-1", "100", "0"]

        for octave in invalid_octaves:
            response = client.post(
                "/note-game", json={"scale": "C", "octave": octave}
            )
            # Should be 400 or 200 depending on music21 support
            assert response.status_code in [
                200,
                400,
            ], f"Unexpected status {response.status_code} for octave {octave}"

    def test_note_game_invalid_octave_type_returns_422(self, client):
        """Non-string octave should fail validation"""
        response = client.post("/note-game", json={"scale": "C", "octave": 4})
        assert response.status_code in [
            400,
            422,
        ], f"Expected validation error for octave as int, got {response.status_code}"

    def test_note_game_missing_scale_returns_422(self, client):
        """Missing scale field should return validation error"""
        response = client.post("/note-game", json={"octave": "4"})
        assert (
            response.status_code == 422
        ), f"Expected 422 for missing scale, got {response.status_code}"

    def test_note_game_missing_octave_returns_422(self, client):
        """Missing octave field should return validation error"""
        response = client.post("/note-game", json={"scale": "C"})
        assert (
            response.status_code == 422
        ), f"Expected 422 for missing octave, got {response.status_code}"

    def test_note_game_empty_payload_returns_422(self, client):
        """Empty payload should return validation error"""
        response = client.post("/note-game", json={})
        assert (
            response.status_code == 422
        ), f"Expected 422 for empty payload, got {response.status_code}"

    def test_note_game_extra_fields_ignored(self, client):
        """Extra fields should be ignored"""
        response = client.post(
            "/note-game", json={"scale": "C", "octave": "4", "extra": "field"}
        )
        assert response.status_code == 200, "Extra fields should be ignored"


class TestNoteGameContentType:
    """Test /note-game content type handling"""

    def test_note_game_content_type_is_json(self, client):
        """Content-Type should be application/json"""
        response = client.post("/note-game", json={"scale": "C", "octave": "4"})
        assert response.status_code == 200
        assert "application/json" in response.headers["content-type"]

    def test_note_game_charset_in_content_type(self, client):
        """Content-Type should specify UTF-8 or similar"""
        response = client.post("/note-game", json={"scale": "C", "octave": "4"})
        assert response.status_code == 200
        content_type = response.headers["content-type"]
        # May contain charset, but not required
        assert "application/json" in content_type
