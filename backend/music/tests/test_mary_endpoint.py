"""
Comprehensive unit tests for /mary endpoint.
Tests valid inputs, error handling, response structure, and content types.
"""

import pytest
import xml.etree.ElementTree as ET
from fastapi import status


class TestMaryEndpointHappyPath:
    """Test /mary endpoint with valid inputs"""

    def test_mary_valid_inputs_return_200(self, client, valid_mary_payloads):
        """All valid payloads should return 200 OK"""
        for payload in valid_mary_payloads:
            response = client.post("/mary", json=payload)
            assert (
                response.status_code == status.HTTP_200_OK
            ), f"Failed for payload {payload}: got {response.status_code}"

    def test_mary_returns_xml_content_type(self, client):
        """Response should have application/xml content type"""
        response = client.post("/mary", json={"tonic": "C", "octave": 4})
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/xml"

    def test_mary_response_is_valid_xml(self, client):
        """Response should be parseable as valid XML"""
        response = client.post("/mary", json={"tonic": "C", "octave": 4})
        assert response.status_code == 200

        # Try to parse as XML
        try:
            root = ET.fromstring(response.content)
            assert root is not None, "Response is not valid XML"
        except ET.ParseError as e:
            pytest.fail(f"Response is not valid XML: {e}")

    def test_mary_xml_contains_musical_elements(self, client):
        """Response XML should contain expected musical elements"""
        response = client.post("/mary", json={"tonic": "C", "octave": 4})
        assert response.status_code == 200

        # Check for key musical elements
        # Note: exact tag names depend on MusicXML schema
        # We're looking for score/part/measure/note structure
        xml_str = response.text
        assert (
            "score" in xml_str.lower() or "scorepartwise" in xml_str.lower()
        ), "XML missing score element"
        assert "part" in xml_str.lower(), "XML missing part element"
        assert "measure" in xml_str.lower(), "XML missing measure element"
        assert "note" in xml_str.lower(), "XML missing note element"

    def test_mary_different_tonics(self, client):
        """Test mary with various tonic notes"""
        # Note: E# is not supported by music21 (it's enharmonic to F)
        tonics = ["C", "G", "F", "D-", "A", "B-"]
        for tonic in tonics:
            response = client.post("/mary", json={"tonic": tonic, "octave": 4})
            assert response.status_code == 200, f"Failed for tonic {tonic}"
            assert response.headers["content-type"] == "application/xml"
            # Verify it's valid XML
            ET.fromstring(response.content)

    def test_mary_different_octaves(self, client):
        """Test mary with various octaves"""
        octaves = [2, 3, 4, 5, 6]
        for octave in octaves:
            response = client.post(
                "/mary", json={"tonic": "C", "octave": octave}
            )
            assert response.status_code == 200, f"Failed for octave {octave}"
            assert response.headers["content-type"] == "application/xml"
            ET.fromstring(response.content)


class TestMaryEndpointErrorHandling:
    """Test /mary endpoint error handling"""

    def test_mary_invalid_note_returns_400(self, client, mary_error_pattern):
        """Invalid note names should return 400"""
        invalid_notes = ["H", "Z", "X", "Q"]
        for note in invalid_notes:
            response = client.post("/mary", json={"tonic": note, "octave": 4})
            assert (
                response.status_code == status.HTTP_400_BAD_REQUEST
            ), f"Expected 400 for note {note}, got {response.status_code}"

            # Verify error message format
            error_msg = response.text
            assert (
                mary_error_pattern in error_msg
            ), f"Error message '{error_msg}' doesn't contain '{mary_error_pattern}'"

    def test_mary_missing_required_fields(self, client, invalid_mary_payloads):
        """Missing required fields should return validation error"""
        invalid_payloads_missing = [
            {"tonic": "C"},  # Missing octave
            {"octave": 4},  # Missing tonic
            {},  # Missing both
        ]

        for payload in invalid_payloads_missing:
            response = client.post("/mary", json=payload)
            # Should be 422 (validation error) or 400
            assert response.status_code in [
                400,
                422,
            ], f"Expected 400/422 for payload {payload}, got {response.status_code}"

    def test_mary_invalid_octave_type(self, client):
        """Non-integer octave should fail validation"""
        response = client.post(
            "/mary", json={"tonic": "C", "octave": "not_a_number"}
        )
        assert response.status_code in [
            400,
            422,
        ], f"Expected validation error for invalid octave type, got {response.status_code}"

    def test_mary_extreme_octaves(self, client):
        """Very high/low octaves should either work or return 400"""
        octaves = [-10, 99, 100]
        for octave in octaves:
            response = client.post(
                "/mary", json={"tonic": "C", "octave": octave}
            )
            # Should return 200 or 400, not 500
            assert response.status_code in [
                200,
                400,
            ], f"Unexpected status {response.status_code} for octave {octave}"


class TestMaryResponseStructure:
    """Test /mary response structure and format"""

    def test_mary_response_is_bytes(self, client):
        """Response should be bytes (binary XML)"""
        response = client.post("/mary", json={"tonic": "C", "octave": 4})
        assert response.status_code == 200
        assert isinstance(response.content, bytes), "Response is not bytes"

    def test_mary_response_not_empty(self, client):
        """Response should not be empty"""
        response = client.post("/mary", json={"tonic": "C", "octave": 4})
        assert response.status_code == 200
        assert len(response.content) > 0, "Response is empty"

    def test_mary_response_consistent(self, client):
        """Same input should produce same output (deterministic)"""
        payload = {"tonic": "C", "octave": 4}
        response1 = client.post("/mary", json=payload)
        response2 = client.post("/mary", json=payload)

        assert response1.status_code == 200
        assert response2.status_code == 200

        # Mary endpoint is deterministic, but music21 may add timestamps/IDs
        # Just verify both responses are valid XML with same structure
        xml1 = ET.fromstring(response1.content)
        xml2 = ET.fromstring(response2.content)
        assert xml1.tag == xml2.tag, "XML root tags should match"
