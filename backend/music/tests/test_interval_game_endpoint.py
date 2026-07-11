import xml.etree.ElementTree as ET

from fastapi import status

ENDPOINT = "/music/interval-game"

ALL_INTERVALS = [
    "m2",
    "M2",
    "m3",
    "M3",
    "P4",
    "A4",
    "d5",
    "P5",
    "m6",
    "M6",
    "m7",
    "M7",
    "P8",
]


class TestIntervalGameHappyPath:
    """Test /interval-game endpoint with valid inputs"""

    def test_defaults_return_200(self, client):
        """Empty payload should use defaults and return 200"""
        response = client.post(ENDPOINT, json={})
        assert response.status_code == status.HTTP_200_OK

    def test_response_structure(self, client):
        """Response should have required fields with correct types"""
        data = client.post(ENDPOINT, json={}).json()
        assert set(data.keys()) == {
            "generatedXml",
            "interval",
            "number",
            "quality",
            "clef",
        }
        assert isinstance(data["generatedXml"], str)
        assert isinstance(data["interval"], str)
        assert isinstance(data["number"], int)
        assert isinstance(data["quality"], str)
        assert isinstance(data["clef"], str)

    def test_answer_fields_are_consistent(self, client):
        """quality + number should reassemble into the interval name"""
        data = client.post(ENDPOINT, json={"intervals": ["M3"]}).json()
        assert data["interval"] == "M3"
        assert data["number"] == 3
        assert data["quality"] == "M"

    def test_interval_pool_respected(self, client):
        """interval should always come from the requested pool"""
        pool = ["m2", "P5"]
        for _ in range(15):
            data = client.post(ENDPOINT, json={"intervals": pool}).json()
            assert data["interval"] in pool

    def test_all_default_intervals_render(self, client):
        """Every interval in the default pool should generate"""
        for name in ALL_INTERVALS:
            response = client.post(ENDPOINT, json={"intervals": [name]})
            assert response.status_code == 200, f"Failed for {name}"
            assert response.json()["interval"] == name

    def test_full_quality_grid_renders(self, client):
        """Diminished/augmented grid intervals should also parse"""
        grid = ["d2", "d8", "A1", "A8", "d3", "A6"]
        for name in grid:
            response = client.post(ENDPOINT, json={"intervals": [name]})
            assert response.status_code == 200, f"Failed for {name}"

    def test_harmonic_renders_one_stacked_chord(self, client):
        """Harmonic mode = 2 notes stacked as a single chord"""
        data = client.post(ENDPOINT, json={"displayMode": "harmonic"}).json()
        root = ET.fromstring(data["generatedXml"])
        notes = root.findall(".//note")
        assert len(notes) == 2
        chords = root.findall(".//note/chord")
        assert len(chords) == 1, "second note should carry a chord mark"

    def test_melodic_renders_two_notes_in_one_measure(self, client):
        """Melodic mode = 2 sequential notes sharing one measure"""
        data = client.post(ENDPOINT, json={"displayMode": "melodic"}).json()
        root = ET.fromstring(data["generatedXml"])
        notes = root.findall(".//note")
        assert len(notes) == 2
        chords = root.findall(".//note/chord")
        assert chords == [], "melodic notes must not stack"
        measures = root.findall(".//measure")
        assert len(measures) == 1, "interval should render as one measure"

    def test_melodic_time_signature_is_hidden(self, client):
        """The 2/1 time signature exists but must not print"""
        data = client.post(ENDPOINT, json={"displayMode": "melodic"}).json()
        root = ET.fromstring(data["generatedXml"])
        time = root.find(".//time")
        assert time is not None
        assert time.get("print-object") == "no"

    def test_root_note_is_natural(self, client):
        """The first rendered note should have no accidental"""
        for _ in range(10):
            data = client.post(ENDPOINT, json={"displayMode": "melodic"}).json()
            root = ET.fromstring(data["generatedXml"])
            first_note = root.find(".//note")
            alter = first_note.find("./pitch/alter")
            assert alter is None or alter.text == "0"

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

    def test_bass_clef_roots_stay_in_comfortable_range(self, client):
        """Bass roots default to naturals E2..E3"""
        for _ in range(15):
            data = client.post(
                ENDPOINT,
                json={"clefs": ["bass"], "displayMode": "melodic"},
            ).json()
            root = ET.fromstring(data["generatedXml"])
            step = root.find(".//note/pitch/step").text
            octave = int(root.find(".//note/pitch/octave").text)
            assert 2 <= octave <= 3
            if octave == 2:
                assert step in "EFGAB"
            else:
                assert step in "CDE"

    def test_treble_roots_stay_in_comfortable_range(self, client):
        """Treble roots default to naturals C4..C5"""
        for _ in range(15):
            data = client.post(ENDPOINT, json={"displayMode": "melodic"}).json()
            root = ET.fromstring(data["generatedXml"])
            octave = int(root.find(".//note/pitch/octave").text)
            step = root.find(".//note/pitch/step").text
            assert octave == 4 or (octave == 5 and step == "C")

    def test_explicit_octave_respected(self, client):
        """An explicit octave pins the root's octave"""
        data = client.post(
            ENDPOINT, json={"octave": 5, "displayMode": "melodic"}
        ).json()
        root = ET.fromstring(data["generatedXml"])
        octave = root.find(".//note/pitch/octave")
        assert octave.text == "5"

    def test_generates_variety(self, client):
        """Repeated requests should vary the interval"""
        results = {
            client.post(ENDPOINT, json={}).json()["interval"] for _ in range(20)
        }
        assert len(results) > 1


class TestIntervalGameValidation:
    """Test /interval-game validation and error handling"""

    def test_invalid_interval_name_returns_400(self, client):
        response = client.post(ENDPOINT, json={"intervals": ["X3"]})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_empty_intervals_returns_422(self, client):
        response = client.post(ENDPOINT, json={"intervals": []})
        assert response.status_code == 422

    def test_empty_clefs_returns_422(self, client):
        response = client.post(ENDPOINT, json={"clefs": []})
        assert response.status_code == 422

    def test_invalid_clef_returns_422(self, client):
        response = client.post(ENDPOINT, json={"clefs": ["percussion"]})
        assert response.status_code == 422

    def test_invalid_display_mode_returns_422(self, client):
        response = client.post(ENDPOINT, json={"displayMode": "both"})
        assert response.status_code == 422

    def test_out_of_range_octave_returns_422(self, client):
        for bad in [0, 8]:
            response = client.post(ENDPOINT, json={"octave": bad})
            assert response.status_code == 422, f"Expected 422 for {bad}"
