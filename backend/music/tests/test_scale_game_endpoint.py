import xml.etree.ElementTree as ET

from fastapi import status

ENDPOINT = "/music/scale-game"


class TestScaleGameHappyPath:
    """Test /scale-game endpoint with valid inputs"""

    def test_defaults_return_200(self, client):
        """Empty payload should use defaults and return 200"""
        response = client.post(ENDPOINT, json={})
        assert response.status_code == status.HTTP_200_OK

    def test_response_structure(self, client):
        """Response should have required fields with correct types"""
        data = client.post(ENDPOINT, json={}).json()
        assert set(data.keys()) == {
            "generatedXml",
            "tonic",
            "scaleType",
            "clef",
        }
        assert isinstance(data["generatedXml"], str)
        assert isinstance(data["tonic"], str)
        assert isinstance(data["scaleType"], str)
        assert isinstance(data["clef"], str)

    def test_xml_contains_eight_notes_in_one_measure(self, client):
        """One octave ascending = 8 notes sharing a single measure"""
        data = client.post(ENDPOINT, json={}).json()
        root = ET.fromstring(data["generatedXml"])
        notes = root.findall(".//note")
        assert len(notes) == 8
        measures = root.findall(".//measure")
        assert len(measures) == 1, "scale should render as one measure"

    def test_time_signature_is_hidden(self, client):
        """The 8/1 time signature exists but must not print"""
        data = client.post(ENDPOINT, json={}).json()
        root = ET.fromstring(data["generatedXml"])
        time = root.find(".//time")
        assert time is not None
        assert time.get("print-object") == "no"

    def test_no_key_signature(self, client):
        """Accidentals mode must print inline: fifths absent or zero"""
        data = client.post(
            ENDPOINT, json={"tonicPool": ["E"], "scaleTypes": ["major"]}
        ).json()
        root = ET.fromstring(data["generatedXml"])
        fifths = root.find(".//fifths")
        assert fifths is None or int(fifths.text) == 0

    def test_key_signature_mode_prints_fifths(self, client):
        """key_signature mode should encode the scale's key signature"""
        data = client.post(
            ENDPOINT,
            json={
                "tonicPool": ["E"],
                "scaleTypes": ["major"],
                "questionMode": "key_signature",
            },
        ).json()
        root = ET.fromstring(data["generatedXml"])
        fifths = root.find(".//fifths")
        assert fifths is not None, "XML missing <fifths> element"
        assert int(fifths.text) == 4, "E major has 4 sharps"

    def test_key_signature_mode_major_has_no_inline_accidentals(self, client):
        """With the key signature shown, a major scale needs no inline
        accidental elements"""
        data = client.post(
            ENDPOINT,
            json={
                "tonicPool": ["E"],
                "scaleTypes": ["major"],
                "questionMode": "key_signature",
            },
        ).json()
        root = ET.fromstring(data["generatedXml"])
        accidentals = root.findall(".//note/accidental")
        assert accidentals == []

    def test_key_signature_mode_minor_uses_minor_key(self, client):
        """Natural minor scales should use the minor key signature"""
        data = client.post(
            ENDPOINT,
            json={
                "tonicPool": ["A"],
                "scaleTypes": ["natural_minor"],
                "questionMode": "key_signature",
            },
        ).json()
        root = ET.fromstring(data["generatedXml"])
        fifths = root.find(".//fifths")
        assert fifths is not None
        assert int(fifths.text) == 0, "A minor has no accidentals"

    def test_key_signature_mode_harmonic_minor_raised_seventh(self, client):
        """Harmonic minor's raised 7th should print inline"""
        data = client.post(
            ENDPOINT,
            json={
                "tonicPool": ["A"],
                "scaleTypes": ["harmonic_minor"],
                "questionMode": "key_signature",
            },
        ).json()
        root = ET.fromstring(data["generatedXml"])
        accidentals = root.findall(".//note/accidental")
        assert len(accidentals) >= 1, "raised 7th should print inline"

    def test_first_note_is_tonic(self, client):
        """The rendered scale should start on the returned tonic"""
        data = client.post(
            ENDPOINT, json={"tonicPool": ["G"], "octave": 4}
        ).json()
        root = ET.fromstring(data["generatedXml"])
        first_step = root.find(".//note/pitch/step")
        assert first_step is not None
        assert first_step.text == "G"

    def test_answer_pools_respected(self, client):
        """tonic and scaleType come from the requested pools"""
        pool = ["C", "F"]
        types = ["major", "harmonic_minor"]
        for _ in range(15):
            data = client.post(
                ENDPOINT, json={"tonicPool": pool, "scaleTypes": types}
            ).json()
            assert data["tonic"] in pool
            assert data["scaleType"] in types

    def test_all_scale_types_render(self, client):
        """Every supported scale type should generate successfully"""
        for scale_type in [
            "major",
            "natural_minor",
            "harmonic_minor",
            "melodic_minor",
        ]:
            response = client.post(
                ENDPOINT,
                json={"tonicPool": ["A"], "scaleTypes": [scale_type]},
            )
            assert response.status_code == 200, f"Failed for {scale_type}"
            assert response.json()["scaleType"] == scale_type

    def test_clef_pool_respected(self, client):
        """clef in the response should come from the requested pool"""
        seen = set()
        for _ in range(20):
            data = client.post(
                ENDPOINT, json={"clefs": ["treble", "bass"]}
            ).json()
            assert data["clef"] in {"treble", "bass"}
            seen.add(data["clef"])
        assert seen == {"treble", "bass"}

    def test_bass_clef_renders_bass_sign(self, client):
        """clefs=[bass] should render an F clef"""
        data = client.post(ENDPOINT, json={"clefs": ["bass"]}).json()
        assert data["clef"] == "bass"
        root = ET.fromstring(data["generatedXml"])
        sign = root.find(".//clef/sign")
        assert sign is not None
        assert sign.text == "F"

    def test_bass_clef_defaults_to_octave_3(self, client):
        """With no octave, bass clef scales should start in octave 3"""
        data = client.post(
            ENDPOINT, json={"tonicPool": ["C"], "clefs": ["bass"]}
        ).json()
        root = ET.fromstring(data["generatedXml"])
        first_octave = root.find(".//note/pitch/octave")
        assert first_octave is not None
        assert first_octave.text == "3"

    def test_generates_variety(self, client):
        """Repeated requests should vary tonic or type"""
        results = set()
        for _ in range(20):
            data = client.post(ENDPOINT, json={}).json()
            results.add((data["tonic"], data["scaleType"]))
        assert len(results) > 1


class TestScaleGameValidation:
    """Test /scale-game validation and error handling"""

    def test_invalid_scale_type_returns_422(self, client):
        response = client.post(ENDPOINT, json={"scaleTypes": ["pentatonic"]})
        assert response.status_code == 422

    def test_empty_pools_return_422(self, client):
        assert client.post(ENDPOINT, json={"tonicPool": []}).status_code == 422
        assert client.post(ENDPOINT, json={"scaleTypes": []}).status_code == 422

    def test_invalid_tonic_returns_400(self, client):
        response = client.post(ENDPOINT, json={"tonicPool": ["H"]})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_out_of_range_octave_returns_422(self, client):
        for bad in [0, 8]:
            response = client.post(ENDPOINT, json={"octave": bad})
            assert response.status_code == 422, f"Expected 422 for {bad}"

    def test_invalid_question_mode_returns_422(self, client):
        response = client.post(ENDPOINT, json={"questionMode": "intervals"})
        assert response.status_code == 422

    def test_empty_clefs_returns_422(self, client):
        response = client.post(ENDPOINT, json={"clefs": []})
        assert response.status_code == 422

    def test_invalid_clef_returns_422(self, client):
        response = client.post(ENDPOINT, json={"clefs": ["percussion"]})
        assert response.status_code == 422
