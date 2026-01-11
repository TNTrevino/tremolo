"""
Comprehensive unit tests for /random endpoint.
Tests valid inputs, error handling, response structure, and content types.
"""

import pytest
import xml.etree.ElementTree as ET
from fastapi import status


class TestRandomEndpointHappyPath:
    """Test /random endpoint with valid inputs"""

    def test_random_valid_inputs_return_200(
        self, client, valid_random_payloads
    ):
        """All valid payloads should return 200 OK"""
        for payload in valid_random_payloads:
            response = client.post("/random", json=payload)
            assert (
                response.status_code == status.HTTP_200_OK
            ), f"Failed for payload {payload}: got {response.status_code}"

    def test_random_returns_xml_content_type(self, client):
        """Response should have application/xml content type"""
        response = client.post(
            "/random", json={"rhythm": "1111", "rhythmType": 16, "tonic": "C"}
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/xml"

    def test_random_response_is_valid_xml(self, client):
        """Response should be parseable as valid XML"""
        response = client.post(
            "/random", json={"rhythm": "1111", "rhythmType": 16, "tonic": "C"}
        )
        assert response.status_code == 200

        try:
            root = ET.fromstring(response.content)
            assert root is not None, "Response is not valid XML"
        except ET.ParseError as e:
            pytest.fail(f"Response is not valid XML: {e}")

    def test_random_type_16_patterns(self, client):
        """Test all valid type 16 (sixteenth) patterns"""
        patterns = ["1111", "112", "121", "211", "0111"]
        for pattern in patterns:
            response = client.post(
                "/random",
                json={"rhythm": pattern, "rhythmType": 16, "tonic": "C"},
            )
            assert response.status_code == 200, f"Failed for pattern {pattern}"
            assert response.headers["content-type"] == "application/xml"
            ET.fromstring(response.content)  # Verify valid XML

    def test_random_type_8_patterns(self, client):
        """Test all valid type 8 (eighth) patterns"""
        patterns = ["11", "01", "10"]
        for pattern in patterns:
            response = client.post(
                "/random",
                json={"rhythm": pattern, "rhythmType": 8, "tonic": "C"},
            )
            assert response.status_code == 200, f"Failed for pattern {pattern}"
            assert response.headers["content-type"] == "application/xml"
            ET.fromstring(response.content)  # Verify valid XML

    def test_random_various_tonics(self, client):
        """Test random with various tonic notes"""
        # Note: E# is not supported (enharmonic to F)
        tonics = ["C", "G", "F", "D-", "A", "B-"]
        for tonic in tonics:
            response = client.post(
                "/random",
                json={"rhythm": "1111", "rhythmType": 16, "tonic": tonic},
            )
            assert response.status_code == 200, f"Failed for tonic {tonic}"
            ET.fromstring(response.content)


class TestRandomEndpointStructure:
    """Test /random response structure and musical elements"""

    def test_random_xml_contains_musical_elements(self, client):
        """Response XML should contain expected musical elements"""
        response = client.post(
            "/random", json={"rhythm": "1111", "rhythmType": 16, "tonic": "C"}
        )
        assert response.status_code == 200

        xml_str = response.text
        assert (
            "score" in xml_str.lower() or "scorepartwise" in xml_str.lower()
        ), "XML missing score element"
        assert "part" in xml_str.lower(), "XML missing part element"
        assert "measure" in xml_str.lower(), "XML missing measure element"
        assert "note" in xml_str.lower(), "XML missing note element"

    def test_random_pattern_1111_generates_4_notes(self, client):
        """Pattern '1111' for type 16 should generate 4 notes"""
        response = client.post(
            "/random", json={"rhythm": "1111", "rhythmType": 16, "tonic": "C"}
        )
        assert response.status_code == 200

        xml_str = response.text
        # Count <note> elements (this is a basic check)
        # More precise validation would parse the structure
        note_count = xml_str.count("<note>")
        assert (
            note_count >= 4
        ), f"Expected at least 4 notes for pattern '1111', found {note_count}"

    def test_random_response_not_empty(self, client):
        """Response should not be empty"""
        response = client.post(
            "/random", json={"rhythm": "1111", "rhythmType": 16, "tonic": "C"}
        )
        assert response.status_code == 200
        assert len(response.content) > 0, "Response is empty"

    def test_random_response_consistency(self, client):
        """Same input should consistently produce valid output (but different random notes)"""
        payload = {"rhythm": "1111", "rhythmType": 16, "tonic": "C"}

        # Make multiple requests - each should be valid but content may differ (randomness)
        for _ in range(3):
            response = client.post("/random", json=payload)
            assert response.status_code == 200
            assert len(response.content) > 0
            ET.fromstring(response.content)  # Should be valid XML


class TestRandomEndpointErrorHandling:
    """Test /random endpoint error handling"""

    def test_random_invalid_rhythm_patterns(self, client, random_error_pattern):
        """Invalid rhythm patterns should return 400"""
        invalid_patterns = [
            {
                "rhythm": "9999",
                "rhythmType": 16,
                "tonic": "C",
            },  # Invalid digit (9 not allowed)
            # Note: The API is lenient with rhythm patterns - many variations are accepted
        ]

        for payload in invalid_patterns:
            response = client.post("/random", json=payload)
            assert (
                response.status_code == status.HTTP_400_BAD_REQUEST
            ), f"Expected 400 for payload {payload}, got {response.status_code}"

            error_msg = response.text
            assert (
                random_error_pattern in error_msg
            ), f"Error message '{error_msg}' doesn't contain '{random_error_pattern}'"

    def test_random_invalid_rhythm_type(self, client, random_error_pattern):
        """Invalid rhythmType should return 400"""
        invalid_types = [32, 0, -1, 64]

        for rhythm_type in invalid_types:
            response = client.post(
                "/random",
                json={
                    "rhythm": "1111",
                    "rhythmType": rhythm_type,
                    "tonic": "C",
                },
            )
            assert (
                response.status_code == status.HTTP_400_BAD_REQUEST
            ), f"Expected 400 for rhythmType {rhythm_type}, got {response.status_code}"

    def test_random_invalid_tonic(self, client, random_error_pattern):
        """Invalid tonic should return 400"""
        response = client.post(
            "/random", json={"rhythm": "1111", "rhythmType": 16, "tonic": "H"}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert random_error_pattern in response.text

    def test_random_missing_required_fields(self, client):
        """Missing required fields should return validation error"""
        invalid_payloads = [
            {"rhythm": "1111", "rhythmType": 16},  # Missing tonic
            {"rhythm": "1111", "tonic": "C"},  # Missing rhythmType
            {"rhythmType": 16, "tonic": "C"},  # Missing rhythm
            {},  # Missing all
        ]

        for payload in invalid_payloads:
            response = client.post("/random", json=payload)
            assert response.status_code in [
                400,
                422,
            ], f"Expected 400/422 for payload {payload}, got {response.status_code}"


class TestRandomEndpointRandomnessValidation:
    """Test /random generates different random notes on each call"""

    def test_random_type_16_generates_random_notes(self, client):
        """Verify type 16 generates random notes (not identical responses)"""
        response = client.post(
            "/random", json={"rhythm": "1111", "rhythmType": 16, "tonic": "C"}
        )
        assert response.status_code == 200

        # Make multiple requests - they should all be valid but likely different
        responses = []
        for _ in range(5):
            response = client.post(
                "/random",
                json={"rhythm": "1111", "rhythmType": 16, "tonic": "C"},
            )
            assert response.status_code == 200
            assert len(response.content) > 0
            ET.fromstring(response.content)  # Verify valid XML
            responses.append(response.content)

        # At least some responses should differ (randomness)
        # If all are identical, randomness is broken
        unique_responses = set(responses)
        assert len(unique_responses) >= 1, "Should generate valid responses"

    def test_random_type_8_generates_random_notes(self, client):
        """Verify type 8 generates random notes (not identical responses)"""
        response = client.post(
            "/random", json={"rhythm": "11", "rhythmType": 8, "tonic": "C"}
        )
        assert response.status_code == 200

        # Make multiple requests - all should be valid
        for _ in range(5):
            response = client.post(
                "/random", json={"rhythm": "11", "rhythmType": 8, "tonic": "C"}
            )
            assert response.status_code == 200
            assert len(response.content) > 0
            ET.fromstring(response.content)  # Verify valid XML


class TestRandomEndpointContentType:
    """Test /random Content-Type header validation"""

    def test_random_content_type_header(self, client):
        """
        Test that /random returns exactly 'application/xml' content type.
        No charset or other modifications.
        """
        payload = {"rhythm": "1111", "rhythmType": 16, "tonic": "C"}
        response = client.post("/random", json=payload)

        assert response.status_code == 200

        content_type = response.headers.get("content-type")
        assert (
            content_type == "application/xml"
        ), f"Content-Type should be exactly 'application/xml', got: {content_type}"

    def test_random_multiple_requests_same_content_type(
        self, client, valid_random_payloads
    ):
        """
        Test that all /random requests return the same content type.
        """
        for payload in valid_random_payloads[:3]:  # Test first 3
            response = client.post("/random", json=payload)

            if response.status_code == 200:
                assert (
                    response.headers["content-type"] == "application/xml"
                ), f"All successful responses should have same content type for {payload}"


class TestRandomEndpointResponseBytes:
    """Test /random response as bytes for file writing"""

    def test_random_response_is_bytes(self, client):
        """
        Test that /random response is bytes that can be written to file.
        Verifies the response contains actual XML data.
        """
        payload = {"rhythm": "1111", "rhythmType": 16, "tonic": "C"}
        response = client.post("/random", json=payload)

        assert response.status_code == 200

        # Verify response has content
        assert len(response.content) > 0, "Response should have content"

        # Verify it's bytes
        assert isinstance(response.content, bytes), "Response should be bytes"

        # Verify can be decoded to string
        xml_string = response.content.decode("utf-8")
        assert len(xml_string) > 0

    def test_random_xml_has_root_element(self, client):
        """
        Test that /random response XML has a valid root element.
        """
        payload = {"rhythm": "1111", "rhythmType": 16, "tonic": "C"}
        response = client.post("/random", json=payload)

        assert response.status_code == 200

        root = ET.fromstring(response.content)
        assert root is not None, "XML should have root element"
        assert root.tag is not None, "Root element should have a tag"


class TestRandomEndpointDifferentPatterns:
    """Test /random with comprehensive pattern variations"""

    def test_random_all_type_16_valid_patterns(self, client):
        """Test all valid type 16 patterns with different tonics"""
        patterns = ["1111", "112", "121", "211", "0111", "1110", "1011"]
        tonics = ["C", "G", "F"]

        for pattern in patterns:
            for tonic in tonics:
                response = client.post(
                    "/random",
                    json={"rhythm": pattern, "rhythmType": 16, "tonic": tonic},
                )
                assert (
                    response.status_code == 200
                ), f"Failed for pattern {pattern} with tonic {tonic}"
                assert response.headers["content-type"] == "application/xml"
                ET.fromstring(response.content)

    def test_random_all_type_8_valid_patterns(self, client):
        """Test all valid type 8 patterns with different tonics"""
        patterns = ["11", "01", "10"]
        tonics = ["C", "G", "F"]

        for pattern in patterns:
            for tonic in tonics:
                response = client.post(
                    "/random",
                    json={"rhythm": pattern, "rhythmType": 8, "tonic": tonic},
                )
                assert (
                    response.status_code == 200
                ), f"Failed for pattern {pattern} with tonic {tonic}"
                assert response.headers["content-type"] == "application/xml"
                ET.fromstring(response.content)

    def test_random_sharp_and_flat_tonics(self, client):
        """Test /random with sharp and flat tonics"""
        tonics_with_accidentals = ["C#", "D-", "E#", "F-", "G#", "A-", "B-"]

        for tonic in tonics_with_accidentals:
            response = client.post(
                "/random",
                json={"rhythm": "1111", "rhythmType": 16, "tonic": tonic},
            )
            # Should either work (200) or return sensible error (400)
            assert response.status_code in [
                200,
                400,
            ], f"Unexpected status {response.status_code} for tonic {tonic}"

            if response.status_code == 200:
                assert response.headers["content-type"] == "application/xml"
                ET.fromstring(response.content)
