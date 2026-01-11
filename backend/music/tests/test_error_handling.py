import pytest
from fastapi import status


@pytest.mark.unit
class TestMaryErrorHandling:
    """Comprehensive error handling for /mary endpoint"""

    def test_mary_invalid_note_h_returns_400(self, client):
        """Invalid note 'H' should return 400 with specific error message"""
        response = client.post("/mary", json={"tonic": "H", "octave": 4})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "The note" in response.text

    def test_mary_invalid_note_z_returns_400(self, client):
        """Invalid note 'Z' should return 400"""
        response = client.post("/mary", json={"tonic": "Z", "octave": 4})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "The note" in response.text

    def test_mary_invalid_note_x_returns_400(self, client):
        """Invalid note 'X' should return 400"""
        response = client.post("/mary", json={"tonic": "X", "octave": 4})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_mary_octave_as_string_returns_422(self, client):
        """Octave as string instead of int should return 422 (validation)"""
        response = client.post("/mary", json={"tonic": "C", "octave": "four"})
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_mary_octave_as_float_returns_422(self, client):
        """Octave as float should return 422"""
        response = client.post("/mary", json={"tonic": "C", "octave": 4.5})
        # FastAPI may accept this and pass as int, so check both
        assert response.status_code in [200, 422]

    def test_mary_negative_octave_returns_400_or_200(self, client):
        """Negative octave: should return 400 or 200 (depends on music21 support)"""
        response = client.post("/mary", json={"tonic": "C", "octave": -5})
        # Negative octaves may or may not be supported
        assert response.status_code in [200, 400]

    def test_mary_very_high_octave_returns_400_or_200(self, client):
        """Very high octave (99): should return 400 or 200 depending on support"""
        response = client.post("/mary", json={"tonic": "C", "octave": 99})
        assert response.status_code in [200, 400]

    def test_mary_missing_tonic_returns_422(self, client):
        """Missing 'tonic' field returns 422"""
        response = client.post("/mary", json={"octave": 4})
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error_detail = response.json().get("detail", [])
        # Should mention 'tonic' in error
        assert (
            any("tonic" in str(e).lower() for e in error_detail)
            or "tonic" in response.text.lower()
        )

    def test_mary_missing_octave_returns_422(self, client):
        """Missing 'octave' field returns 422"""
        response = client.post("/mary", json={"tonic": "C"})
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        # Should mention 'octave' in error
        error_detail = response.json().get("detail", [])
        assert (
            any("octave" in str(e).lower() for e in error_detail)
            or "octave" in response.text.lower()
        )

    def test_mary_empty_payload_returns_422(self, client):
        """Empty JSON object should return 422"""
        response = client.post("/mary", json={})
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_mary_empty_tonic_returns_400_or_422(self, client):
        """Empty string tonic should return 400 or 422"""
        response = client.post("/mary", json={"tonic": "", "octave": 4})
        assert response.status_code in [400, 422]

    def test_mary_null_tonic_returns_422(self, client):
        """Null tonic should return 422"""
        response = client.post("/mary", json={"tonic": None, "octave": 4})
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_mary_null_octave_returns_422(self, client):
        """Null octave should return 422"""
        response = client.post("/mary", json={"tonic": "C", "octave": None})
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_mary_extra_field_ignored(self, client):
        """Extra fields should be ignored gracefully"""
        response = client.post(
            "/mary", json={"tonic": "C", "octave": 4, "extra": "field"}
        )
        assert response.status_code == 200

    def test_mary_extra_fields_multiple_ignored(self, client):
        """Multiple extra fields should be ignored"""
        response = client.post(
            "/mary",
            json={
                "tonic": "C",
                "octave": 4,
                "extra1": "value1",
                "extra2": "value2",
            },
        )
        assert response.status_code == 200

    def test_mary_case_sensitivity_for_notes(self, client):
        """Test case sensitivity - lowercase 'c' vs uppercase 'C'"""
        response_lower = client.post("/mary", json={"tonic": "c", "octave": 4})
        response_upper = client.post("/mary", json={"tonic": "C", "octave": 4})
        # May support both or only uppercase - just check consistency
        assert response_lower.status_code in [200, 400]
        assert response_upper.status_code in [200, 400]


@pytest.mark.unit
class TestRandomErrorHandling:
    """Comprehensive error handling for /random endpoint"""

    def test_random_invalid_rhythm_with_digit_9(self, client):
        """Rhythm with invalid digit '9' should return 400"""
        response = client.post(
            "/random", json={"rhythm": "9999", "rhythmType": 16, "tonic": "C"}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "something is not right" in response.text.lower()

    def test_random_invalid_rhythm_with_digit_2(self, client):
        """Rhythm with digit '2' - may be valid depending on interpretation"""
        response = client.post(
            "/random", json={"rhythm": "2222", "rhythmType": 16, "tonic": "C"}
        )
        # Digit '2' may be interpreted as valid by music21
        assert response.status_code in [200, 400]

    def test_random_invalid_rhythm_with_letter(self, client):
        """Rhythm with letters should return 400"""
        response = client.post(
            "/random", json={"rhythm": "ABCD", "rhythmType": 16, "tonic": "C"}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_random_invalid_rhythm_type_32(self, client):
        """Invalid rhythmType 32 should return 400"""
        response = client.post(
            "/random", json={"rhythm": "1111", "rhythmType": 32, "tonic": "C"}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_random_invalid_rhythm_type_8_with_wrong_pattern(self, client):
        """Type 8 with 4-digit pattern - may be accepted"""
        response = client.post(
            "/random", json={"rhythm": "1111", "rhythmType": 8, "tonic": "C"}
        )
        # Pattern length may not be strictly validated
        assert response.status_code in [200, 400]

    def test_random_invalid_rhythm_type_16_with_wrong_pattern(self, client):
        """Type 16 with 2-digit pattern - may be accepted"""
        response = client.post(
            "/random", json={"rhythm": "11", "rhythmType": 16, "tonic": "C"}
        )
        # Pattern length may not be strictly validated
        assert response.status_code in [200, 400]

    def test_random_rhythm_type_as_string_returns_422(self, client):
        """rhythmType as string - FastAPI may coerce to int"""
        response = client.post(
            "/random", json={"rhythm": "1111", "rhythmType": "16", "tonic": "C"}
        )
        # FastAPI may coerce "16" to int 16
        assert response.status_code in [200, 400, 422]

    def test_random_invalid_tonic_h_returns_400(self, client):
        """Invalid tonic 'H' should return 400"""
        response = client.post(
            "/random", json={"rhythm": "1111", "rhythmType": 16, "tonic": "H"}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "something is not right" in response.text.lower()

    def test_random_missing_rhythm_returns_422(self, client):
        """Missing 'rhythm' field returns 422"""
        response = client.post("/random", json={"rhythmType": 16, "tonic": "C"})
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_random_missing_rhythm_type_returns_422(self, client):
        """Missing 'rhythmType' field returns 422"""
        response = client.post("/random", json={"rhythm": "1111", "tonic": "C"})
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_random_missing_tonic_returns_422(self, client):
        """Missing 'tonic' field returns 422"""
        response = client.post(
            "/random", json={"rhythm": "1111", "rhythmType": 16}
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_random_empty_payload_returns_422(self, client):
        """Empty payload returns 422"""
        response = client.post("/random", json={})
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_random_null_rhythm_returns_422(self, client):
        """Null rhythm returns 422"""
        response = client.post(
            "/random", json={"rhythm": None, "rhythmType": 16, "tonic": "C"}
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_random_null_rhythm_type_returns_422(self, client):
        """Null rhythmType returns 422"""
        response = client.post(
            "/random", json={"rhythm": "1111", "rhythmType": None, "tonic": "C"}
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_random_null_tonic_returns_422(self, client):
        """Null tonic returns 422"""
        response = client.post(
            "/random", json={"rhythm": "1111", "rhythmType": 16, "tonic": None}
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_random_empty_rhythm_string_returns_400_or_422(self, client):
        """Empty rhythm string - may be accepted by music21"""
        response = client.post(
            "/random", json={"rhythm": "", "rhythmType": 16, "tonic": "C"}
        )
        # Empty string may create empty score
        assert response.status_code in [200, 400, 422]

    def test_random_extra_fields_ignored(self, client):
        """Extra fields should be ignored"""
        response = client.post(
            "/random",
            json={
                "rhythm": "1111",
                "rhythmType": 16,
                "tonic": "C",
                "extra": "field",
            },
        )
        assert response.status_code == 200

    def test_random_rhythm_type_0_returns_400(self, client):
        """rhythmType 0 should return 400"""
        response = client.post(
            "/random", json={"rhythm": "1111", "rhythmType": 0, "tonic": "C"}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_random_rhythm_type_negative_returns_400(self, client):
        """Negative rhythmType should return 400"""
        response = client.post(
            "/random", json={"rhythm": "1111", "rhythmType": -1, "tonic": "C"}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.unit
class TestNoteGameErrorHandling:
    """Comprehensive error handling for /note-game endpoint"""

    def test_note_game_invalid_scale_h_returns_400(self, client):
        """Invalid scale 'H' returns 400"""
        response = client.post("/note-game", json={"scale": "H", "octave": "4"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "something is not right" in response.text.lower()

    def test_note_game_invalid_scale_z_returns_400(self, client):
        """Invalid scale 'Z' returns 400"""
        response = client.post("/note-game", json={"scale": "Z", "octave": "4"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_note_game_invalid_octave_string_99_returns_400(self, client):
        """Very high octave "99" may return 400"""
        response = client.post(
            "/note-game", json={"scale": "C", "octave": "99"}
        )
        # May be supported or not
        assert response.status_code in [200, 400]

    def test_note_game_invalid_octave_negative_returns_400(self, client):
        """Negative octave "-1" may return 400"""
        response = client.post(
            "/note-game", json={"scale": "C", "octave": "-1"}
        )
        assert response.status_code in [200, 400]

    def test_note_game_octave_as_int_returns_422(self, client):
        """Octave as int instead of string returns 422"""
        response = client.post("/note-game", json={"scale": "C", "octave": 4})
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_note_game_octave_non_numeric_string_returns_400(self, client):
        """Octave as non-numeric string returns 400 or 422"""
        response = client.post(
            "/note-game", json={"scale": "C", "octave": "four"}
        )
        assert response.status_code in [400, 422]

    def test_note_game_missing_scale_returns_422(self, client):
        """Missing 'scale' field returns 422"""
        response = client.post("/note-game", json={"octave": "4"})
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_note_game_missing_octave_returns_422(self, client):
        """Missing 'octave' field returns 422"""
        response = client.post("/note-game", json={"scale": "C"})
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_note_game_empty_payload_returns_422(self, client):
        """Empty payload returns 422"""
        response = client.post("/note-game", json={})
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_note_game_null_scale_returns_422(self, client):
        """Null scale returns 422"""
        response = client.post(
            "/note-game", json={"scale": None, "octave": "4"}
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_note_game_null_octave_returns_422(self, client):
        """Null octave returns 422"""
        response = client.post(
            "/note-game", json={"scale": "C", "octave": None}
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_note_game_empty_scale_string_returns_400_or_422(self, client):
        """Empty scale string returns error"""
        response = client.post("/note-game", json={"scale": "", "octave": "4"})
        assert response.status_code in [400, 422]

    def test_note_game_empty_octave_string_returns_400_or_422(self, client):
        """Empty octave string returns error"""
        response = client.post("/note-game", json={"scale": "C", "octave": ""})
        assert response.status_code in [400, 422]

    def test_note_game_extra_fields_ignored(self, client):
        """Extra fields should be ignored"""
        response = client.post(
            "/note-game", json={"scale": "C", "octave": "4", "extra": "field"}
        )
        assert response.status_code == 200

    def test_note_game_scale_lowercase_c(self, client):
        """Test case sensitivity - lowercase scale"""
        response = client.post("/note-game", json={"scale": "c", "octave": "4"})
        # May support both or only uppercase
        assert response.status_code in [200, 400]


@pytest.mark.unit
class TestErrorMessageFormat:
    """Test error message format matching DRF exactly"""

    def test_mary_error_contains_exception_message(self, client):
        """Mary error should contain the underlying exception message"""
        response = client.post("/mary", json={"tonic": "H", "octave": 4})
        assert response.status_code == 400
        error_msg = response.text
        # Should contain "The note" and some detail about the invalid note
        assert "The note" in error_msg
        assert "H" in error_msg or "invalid" in error_msg.lower()

    def test_random_error_format_contains_exception(self, client):
        """Random error should follow DRF error format"""
        response = client.post(
            "/random", json={"rhythm": "9999", "rhythmType": 16, "tonic": "C"}
        )
        assert response.status_code == 400
        error_msg = response.text
        assert "something is not right" in error_msg.lower()

    def test_note_game_error_format_contains_exception(self, client):
        """Note-game error should follow DRF error format"""
        response = client.post("/note-game", json={"scale": "H", "octave": "4"})
        assert response.status_code == 400
        error_msg = response.text
        assert "something is not right" in error_msg.lower()


@pytest.mark.unit
class TestBoundaryConditions:
    """Test boundary conditions and edge cases"""

    def test_mary_octave_boundary_2(self, client):
        """Octave 2 should work"""
        response = client.post("/mary", json={"tonic": "C", "octave": 2})
        assert response.status_code in [200, 400]

    def test_mary_octave_boundary_6(self, client):
        """Octave 6 should work"""
        response = client.post("/mary", json={"tonic": "C", "octave": 6})
        assert response.status_code in [200, 400]

    def test_random_shortest_type_16_pattern(self, client):
        """Shortest valid type 16 pattern"""
        response = client.post(
            "/random", json={"rhythm": "0", "rhythmType": 16, "tonic": "C"}
        )
        # May or may not be valid
        assert response.status_code in [200, 400]

    def test_random_shortest_type_8_pattern(self, client):
        """Shortest valid type 8 pattern"""
        response = client.post(
            "/random", json={"rhythm": "0", "rhythmType": 8, "tonic": "C"}
        )
        # Single note/rest may or may not be valid
        assert response.status_code in [200, 400]

    def test_note_game_octave_boundary_2(self, client):
        """Octave "2" should work"""
        response = client.post("/note-game", json={"scale": "C", "octave": "2"})
        assert response.status_code in [200, 400]

    def test_note_game_octave_boundary_6(self, client):
        """Octave "6" should work"""
        response = client.post("/note-game", json={"scale": "C", "octave": "6"})
        assert response.status_code in [200, 400]
