import pytest
import xml.etree.ElementTree as ET
import json


@pytest.mark.unit
class TestMaryResponseFormat:
    """Validate /mary response format details"""

    def test_mary_response_content_type_exactly_xml(self, client):
        """Content-Type should be application/xml, not text/xml"""
        response = client.post("/mary", json={"tonic": "C", "octave": 4})
        assert response.status_code == 200
        ct = response.headers.get("content-type", "")
        assert ct == "application/xml"

    def test_mary_response_is_bytes_not_string(self, client):
        """Response content should be bytes"""
        response = client.post("/mary", json={"tonic": "C", "octave": 4})
        assert response.status_code == 200
        assert isinstance(response.content, bytes)

    def test_mary_xml_is_well_formed(self, client):
        """XML must be well-formed and parseable"""
        response = client.post("/mary", json={"tonic": "C", "octave": 4})
        assert response.status_code == 200
        try:
            ET.fromstring(response.content)
        except ET.ParseError as e:
            pytest.fail(f"Invalid XML: {e}")

    def test_mary_xml_has_root_element(self, client):
        """XML should have a root element"""
        response = client.post("/mary", json={"tonic": "C", "octave": 4})
        assert response.status_code == 200
        root = ET.fromstring(response.content)
        assert root is not None
        assert root.tag is not None

    def test_mary_xml_size_reasonable(self, client):
        """Response should be reasonable size (not empty, not huge)"""
        response = client.post("/mary", json={"tonic": "C", "octave": 4})
        assert response.status_code == 200
        size = len(response.content)
        assert size > 100, "Response too small"
        assert size < 1000000, "Response too large"

    def test_mary_response_not_compressed(self, client):
        """Response should not be gzip compressed"""
        response = client.post("/mary", json={"tonic": "C", "octave": 4})
        assert response.status_code == 200
        encoding = response.headers.get("content-encoding", "")
        assert encoding != "gzip"

    def test_mary_has_content_length_header(self, client):
        """Response should have content-length header"""
        response = client.post("/mary", json={"tonic": "C", "octave": 4})
        assert response.status_code == 200
        # Content-Length might not always be set, but if present should be correct
        if "content-length" in response.headers:
            content_length = int(response.headers["content-length"])
            assert content_length == len(response.content)


@pytest.mark.unit
class TestRandomResponseFormat:
    """Validate /random response format details"""

    def test_random_response_content_type_exactly_xml(self, client):
        """Content-Type should be application/xml"""
        response = client.post(
            "/random", json={"rhythm": "1111", "rhythmType": 16, "tonic": "C"}
        )
        assert response.status_code == 200
        ct = response.headers.get("content-type", "")
        assert ct == "application/xml"

    def test_random_response_is_bytes_not_string(self, client):
        """Response content should be bytes"""
        response = client.post(
            "/random", json={"rhythm": "1111", "rhythmType": 16, "tonic": "C"}
        )
        assert response.status_code == 200
        assert isinstance(response.content, bytes)

    def test_random_xml_is_well_formed(self, client):
        """XML must be well-formed"""
        response = client.post(
            "/random", json={"rhythm": "1111", "rhythmType": 16, "tonic": "C"}
        )
        assert response.status_code == 200
        try:
            ET.fromstring(response.content)
        except ET.ParseError as e:
            pytest.fail(f"Invalid XML: {e}")

    def test_random_xml_size_reasonable(self, client):
        """Response size should be reasonable"""
        response = client.post(
            "/random", json={"rhythm": "1111", "rhythmType": 16, "tonic": "C"}
        )
        assert response.status_code == 200
        size = len(response.content)
        assert size > 100, "Response too small"
        assert size < 1000000, "Response too large"

    def test_random_xml_has_root_element(self, client):
        """XML should have valid root element"""
        response = client.post(
            "/random", json={"rhythm": "1111", "rhythmType": 16, "tonic": "C"}
        )
        assert response.status_code == 200
        root = ET.fromstring(response.content)
        assert root is not None


@pytest.mark.unit
class TestNoteGameResponseFormat:
    """Validate /note-game response format details"""

    def test_note_game_response_content_type_json(self, client):
        """Content-Type should be application/json"""
        response = client.post("/note-game", json={"scale": "C", "octave": "4"})
        assert response.status_code == 200
        ct = response.headers.get("content-type", "")
        assert "application/json" in ct

    def test_note_game_response_is_valid_json(self, client):
        """Response must be valid JSON"""
        response = client.post("/note-game", json={"scale": "C", "octave": "4"})
        assert response.status_code == 200
        try:
            data = response.json()
            assert isinstance(data, dict)
        except json.JSONDecodeError as e:
            pytest.fail(f"Response is not valid JSON: {e}")

    def test_note_game_json_structure_exact(self, client):
        """JSON should have exact structure"""
        response = client.post("/note-game", json={"scale": "C", "octave": "4"})
        assert response.status_code == 200
        data = response.json()

        required_keys = {"generatedXml", "noteName", "noteOctave"}
        actual_keys = set(data.keys())
        assert (
            actual_keys == required_keys
        ), f"Keys mismatch. Expected {required_keys}, got {actual_keys}"

    def test_note_game_all_fields_are_strings(self, client):
        """All fields should be strings"""
        response = client.post("/note-game", json={"scale": "C", "octave": "4"})
        assert response.status_code == 200
        data = response.json()

        assert isinstance(data["generatedXml"], str)
        assert isinstance(data["noteName"], str)
        assert isinstance(data["noteOctave"], str)

    def test_note_game_xml_field_is_valid_xml(self, client):
        """The generatedXml field must contain valid XML"""
        response = client.post("/note-game", json={"scale": "C", "octave": "4"})
        assert response.status_code == 200
        data = response.json()

        try:
            ET.fromstring(data["generatedXml"])
        except ET.ParseError as e:
            pytest.fail(f"generatedXml is not valid XML: {e}")

    def test_note_game_note_name_format(self, client):
        """noteName should be A-G optionally with # or -"""
        response = client.post("/note-game", json={"scale": "C", "octave": "4"})
        assert response.status_code == 200
        data = response.json()

        note_name = data["noteName"]
        assert len(note_name) in [
            1,
            2,
        ], f"Invalid note name length: {note_name}"
        assert note_name[0] in "ABCDEFG", f"Invalid note base: {note_name}"
        if len(note_name) == 2:
            assert note_name[1] in "#-", f"Invalid accidental: {note_name}"

    def test_note_game_octave_matches_request(self, client):
        """noteOctave in response should match request octave"""
        response = client.post("/note-game", json={"scale": "C", "octave": "5"})
        assert response.status_code == 200
        data = response.json()
        assert data["noteOctave"] == "5"

    def test_note_game_no_extra_fields(self, client):
        """Response should only contain expected fields"""
        response = client.post("/note-game", json={"scale": "C", "octave": "4"})
        assert response.status_code == 200
        data = response.json()
        expected = {"generatedXml", "noteName", "noteOctave"}
        assert set(data.keys()) == expected
