import xml.etree.ElementTree as ET

from fastapi import status

ENDPOINT = "/music/note-game"


class TestNoteGameRangeMode:
    """Test /note-game with lowNote/highNote range parameters"""

    def test_range_mode_returns_200(self, client):
        payload = {
            "scale": "C",
            "octave": "4",
            "lowNote": "F3",
            "highNote": "C6",
        }
        response = client.post(ENDPOINT, json=payload)
        assert response.status_code == status.HTTP_200_OK

    def test_note_stays_within_range(self, client):
        """Every generated note should be inside [lowNote, highNote]"""
        payload = {
            "scale": "C",
            "octave": "4",
            "lowNote": "E4",
            "highNote": "G5",
        }
        for _ in range(20):
            data = client.post(ENDPOINT, json=payload).json()
            octave = int(data["noteOctave"])
            letter = data["noteName"][0]
            # E4..G5 in C major: octave 4 from E up, octave 5 up to G
            assert octave in (4, 5)
            if octave == 4:
                assert letter in "EFGAB"
            else:
                assert letter in "CDEFG"

    def test_octave_reflects_chosen_note(self, client):
        """noteOctave should come from the chosen pitch, not the request"""
        payload = {
            "scale": "C",
            "octave": "4",
            "lowNote": "C5",
            "highNote": "B5",
        }
        data = client.post(ENDPOINT, json=payload).json()
        assert data["noteOctave"] == "5"

    def test_notes_are_diatonic_to_scale(self, client):
        """Range mode should still respect the requested scale"""
        g_major = {"G", "A", "B", "C", "D", "E", "F#"}
        payload = {
            "scale": "G",
            "octave": "4",
            "lowNote": "G3",
            "highNote": "G5",
        }
        for _ in range(20):
            data = client.post(ENDPOINT, json=payload).json()
            assert data["noteName"] in g_major

    def test_bass_clef_renders(self, client):
        payload = {
            "scale": "C",
            "octave": "3",
            "lowNote": "E2",
            "highNote": "C4",
            "clef": "bass",
        }
        response = client.post(ENDPOINT, json=payload)
        assert response.status_code == 200
        root = ET.fromstring(response.json()["generatedXml"])
        sign = root.find(".//clef/sign")
        assert sign is not None
        assert sign.text == "F"

    def test_legacy_payload_still_works(self, client):
        """Old payloads without range fields keep the octave behavior"""
        data = client.post(ENDPOINT, json={"scale": "C", "octave": "4"}).json()
        assert set(data.keys()) == {"generatedXml", "noteName", "noteOctave"}
        assert data["noteOctave"] == "4"

    def test_inverted_range_returns_400(self, client):
        """low above high yields no candidates -> 400"""
        payload = {
            "scale": "C",
            "octave": "4",
            "lowNote": "C6",
            "highNote": "C4",
        }
        response = client.post(ENDPOINT, json=payload)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_range_note_returns_400(self, client):
        payload = {
            "scale": "C",
            "octave": "4",
            "lowNote": "H3",
            "highNote": "C6",
        }
        response = client.post(ENDPOINT, json=payload)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_clef_returns_422(self, client):
        payload = {"scale": "C", "octave": "4", "clef": "percussion"}
        response = client.post(ENDPOINT, json=payload)
        assert response.status_code == 422
