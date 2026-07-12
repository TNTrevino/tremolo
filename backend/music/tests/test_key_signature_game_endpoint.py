import xml.etree.ElementTree as ET

from fastapi import status

ENDPOINT = "/music/key-signature-game"


class TestKeySignatureGameHappyPath:
    """Test /key-signature-game endpoint with valid inputs"""

    def test_defaults_return_200(self, client):
        """Empty payload should use defaults and return 200"""
        response = client.post(ENDPOINT, json={})
        assert response.status_code == status.HTTP_200_OK

    def test_response_structure(self, client):
        """Response should have required fields with correct types"""
        response = client.post(ENDPOINT, json={"keySignatures": [-2, 0, 3]})
        assert response.status_code == 200

        data = response.json()
        assert set(data.keys()) == {
            "generatedXml",
            "tonic",
            "minorTonic",
            "sharps",
            "clef",
        }
        assert isinstance(data["generatedXml"], str)
        assert isinstance(data["tonic"], str)
        assert isinstance(data["minorTonic"], str)
        assert isinstance(data["sharps"], int)
        assert isinstance(data["clef"], str)

    def test_xml_is_valid_and_contains_fifths(self, client):
        """generatedXml should parse and encode the returned key"""
        response = client.post(ENDPOINT, json={})
        data = response.json()

        root = ET.fromstring(data["generatedXml"])
        fifths = root.find(".//fifths")
        assert fifths is not None, "XML missing <fifths> element"
        assert int(fifths.text) == data["sharps"]

    def test_tonic_is_valid_note(self, client):
        """tonics should be a letter with an optional accidental"""
        for _ in range(10):
            data = client.post(ENDPOINT, json={}).json()
            assert data["tonic"][0] in "ABCDEFG"
            assert data["minorTonic"][0] in "ABCDEFG"

    def test_key_signature_pool_respected(self, client):
        """sharps should always come from the requested pool"""
        pool = [-2, 0, 3]
        for _ in range(20):
            data = client.post(ENDPOINT, json={"keySignatures": pool}).json()
            assert data["sharps"] in pool

    def test_minor_tonic_is_relative_minor(self, client):
        """E- major's relative minor is C minor"""
        data = client.post(ENDPOINT, json={"keySignatures": [-3]}).json()
        assert data["tonic"] == "E-"
        assert data["minorTonic"] == "C"

    def test_bass_clef_supported(self, client):
        """Bass clef requests should render a bass clef sign"""
        response = client.post(ENDPOINT, json={"clefs": ["bass"]})
        assert response.status_code == 200
        data = response.json()
        assert data["clef"] == "bass"
        root = ET.fromstring(data["generatedXml"])
        sign = root.find(".//clef/sign")
        assert sign is not None
        assert sign.text == "F"

    def test_clef_pool_respected(self, client):
        """clef in the response should come from the requested pool"""
        clefs = {"treble", "bass"}
        seen = set()
        for _ in range(20):
            data = client.post(
                ENDPOINT, json={"clefs": ["treble", "bass"]}
            ).json()
            assert data["clef"] in clefs
            seen.add(data["clef"])
        assert seen == clefs, "both clefs should appear over 20 runs"

    def test_generates_variety(self, client):
        """Repeated requests should produce different keys"""
        results = {
            client.post(ENDPOINT, json={}).json()["sharps"] for _ in range(20)
        }
        assert len(results) > 1

    def test_single_key_pool_is_deterministic(self, client):
        """keySignatures=[0] should always be C major / A minor"""
        for _ in range(5):
            data = client.post(ENDPOINT, json={"keySignatures": [0]}).json()
            assert data["sharps"] == 0
            assert data["tonic"] == "C"
            assert data["minorTonic"] == "A"


class TestKeySignatureGameValidation:
    """Test /key-signature-game validation errors"""

    def test_invalid_clef_returns_422(self, client):
        response = client.post(ENDPOINT, json={"clefs": ["percussion"]})
        assert response.status_code == 422

    def test_empty_clefs_returns_422(self, client):
        response = client.post(ENDPOINT, json={"clefs": []})
        assert response.status_code == 422

    def test_out_of_range_key_signature_returns_422(self, client):
        for bad in [-8, 8, 100]:
            response = client.post(ENDPOINT, json={"keySignatures": [bad]})
            assert response.status_code == 422, f"Expected 422 for {bad}"

    def test_empty_key_signatures_returns_422(self, client):
        response = client.post(ENDPOINT, json={"keySignatures": []})
        assert response.status_code == 422

    def test_non_integer_key_signature_returns_422(self, client):
        response = client.post(ENDPOINT, json={"keySignatures": ["sharps"]})
        assert response.status_code == 422
