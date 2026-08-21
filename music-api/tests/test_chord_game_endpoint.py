import xml.etree.ElementTree as ET

from fastapi import status

ENDPOINT = "/music/chord-game"

TRIADS = ["major", "minor", "augmented", "diminished"]
SEVENTHS = [
    "dominant7",
    "major7",
    "minor7",
    "half_diminished7",
    "diminished7",
]
NINTHS = ["dominant9", "major9", "minor9"]


class TestChordGameHappyPath:
    """Test /chord-game endpoint with valid inputs"""

    def test_defaults_return_200(self, client):
        """Empty payload should use defaults and return 200"""
        response = client.post(ENDPOINT, json={})
        assert response.status_code == status.HTTP_200_OK

    def test_response_structure(self, client):
        """Response should have required fields with correct types"""
        data = client.post(ENDPOINT, json={}).json()
        assert set(data.keys()) == {
            "generatedXml",
            "root",
            "quality",
            "inversion",
            "clef",
        }
        assert isinstance(data["generatedXml"], str)
        assert isinstance(data["root"], str)
        assert isinstance(data["quality"], str)
        assert isinstance(data["inversion"], int)
        assert isinstance(data["clef"], str)

    def test_triads_have_three_notes(self, client):
        """Triad qualities should render 3 stacked notes"""
        for quality in TRIADS:
            data = client.post(
                ENDPOINT, json={"rootPool": ["C"], "qualities": [quality]}
            ).json()
            root = ET.fromstring(data["generatedXml"])
            notes = root.findall(".//note")
            assert len(notes) == 3, f"{quality}: expected 3 notes"
            # subsequent notes carry <chord/> markers
            chords = root.findall(".//note/chord")
            assert len(chords) == 2, f"{quality}: expected 2 chord marks"

    def test_sevenths_have_four_notes(self, client):
        """Seventh qualities should render 4 stacked notes"""
        for quality in SEVENTHS:
            data = client.post(
                ENDPOINT, json={"rootPool": ["C"], "qualities": [quality]}
            ).json()
            root = ET.fromstring(data["generatedXml"])
            notes = root.findall(".//note")
            assert len(notes) == 4, f"{quality}: expected 4 notes"

    def test_ninths_have_five_notes(self, client):
        """Ninth qualities should render 5 stacked notes"""
        for quality in NINTHS:
            data = client.post(
                ENDPOINT, json={"rootPool": ["C"], "qualities": [quality]}
            ).json()
            root = ET.fromstring(data["generatedXml"])
            notes = root.findall(".//note")
            assert len(notes) == 5, f"{quality}: expected 5 notes"
            assert data["quality"] == quality

    def test_inversion_zero_when_inversions_off(self, client):
        """Without inversions the chord is always in root position"""
        for _ in range(10):
            data = client.post(ENDPOINT, json={}).json()
            assert data["inversion"] == 0

    def test_inversions_stay_in_range(self, client):
        """Triad inversions are 0-2; the root position stays allowed"""
        seen = set()
        for _ in range(30):
            data = client.post(
                ENDPOINT,
                json={
                    "rootPool": ["C"],
                    "qualities": ["major"],
                    "inversions": True,
                },
            ).json()
            assert 0 <= data["inversion"] <= 2
            seen.add(data["inversion"])
        assert len(seen) > 1, "inversions should vary over 30 runs"

    def test_seventh_inversions_up_to_third(self, client):
        """Seventh chords allow inversions 0-3"""
        for _ in range(30):
            data = client.post(
                ENDPOINT,
                json={
                    "rootPool": ["C"],
                    "qualities": ["dominant7"],
                    "inversions": True,
                },
            ).json()
            assert 0 <= data["inversion"] <= 3

    def test_inverted_chord_changes_bass_note(self, client):
        """A first-inversion C major chord should not start on C"""
        found_inverted = False
        for _ in range(30):
            data = client.post(
                ENDPOINT,
                json={
                    "rootPool": ["C"],
                    "qualities": ["major"],
                    "inversions": True,
                },
            ).json()
            if data["inversion"] == 0:
                continue
            found_inverted = True
            root = ET.fromstring(data["generatedXml"])
            first_step = root.find(".//note/pitch/step")
            assert first_step.text != "C"
        assert found_inverted, "no inversion generated in 30 runs"

    def test_root_note_matches_answer(self, client):
        """The lowest rendered note should be the returned root"""
        data = client.post(
            ENDPOINT, json={"rootPool": ["G"], "qualities": ["major"]}
        ).json()
        root = ET.fromstring(data["generatedXml"])
        first_step = root.find(".//note/pitch/step")
        assert first_step is not None
        assert first_step.text == "G"

    def test_answer_pools_respected(self, client):
        """root and quality come from the requested pools"""
        pool = ["C", "F"]
        qualities = ["major", "minor7"]
        for _ in range(15):
            data = client.post(
                ENDPOINT, json={"rootPool": pool, "qualities": qualities}
            ).json()
            assert data["root"] in pool
            assert data["quality"] in qualities

    def test_flat_roots_render(self, client):
        """music21-style flat roots (B-, E-, A-) should work"""
        for tonic in ["B-", "E-", "A-"]:
            response = client.post(
                ENDPOINT,
                json={"rootPool": [tonic], "qualities": ["diminished7"]},
            )
            assert response.status_code == 200, f"Failed for {tonic}"

    def test_generates_variety(self, client):
        """Repeated requests should vary root or quality"""
        results = set()
        for _ in range(20):
            data = client.post(ENDPOINT, json={}).json()
            results.add((data["root"], data["quality"]))
        assert len(results) > 1


class TestChordGameValidation:
    """Test /chord-game validation and error handling"""

    def test_invalid_quality_returns_422(self, client):
        response = client.post(ENDPOINT, json={"qualities": ["sus4"]})
        assert response.status_code == 422

    def test_empty_pools_return_422(self, client):
        assert client.post(ENDPOINT, json={"rootPool": []}).status_code == 422
        assert client.post(ENDPOINT, json={"qualities": []}).status_code == 422

    def test_invalid_root_returns_400(self, client):
        response = client.post(ENDPOINT, json={"rootPool": ["H"]})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_clef_returns_422(self, client):
        response = client.post(ENDPOINT, json={"clefs": ["percussion"]})
        assert response.status_code == 422

    def test_empty_clefs_returns_422(self, client):
        response = client.post(ENDPOINT, json={"clefs": []})
        assert response.status_code == 422

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

    def test_bass_clef_defaults_to_octave_3(self, client):
        """With no octave, bass clef chords should root in octave 3"""
        data = client.post(
            ENDPOINT,
            json={
                "rootPool": ["C"],
                "qualities": ["major"],
                "clefs": ["bass"],
            },
        ).json()
        root = ET.fromstring(data["generatedXml"])
        first_octave = root.find(".//note/pitch/octave")
        assert first_octave is not None
        assert first_octave.text == "3"
