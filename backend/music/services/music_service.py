from __future__ import annotations

import random
from typing import Tuple, Any

from music21 import chord, duration, instrument, interval, key, metadata, note
from music21.musicxml.m21ToXml import GeneralObjectExporter
from music21.stream.base import Stream


class MusicService:

    CIRCLE_OF_FOURTHS = {
        "B": 5,
        "E": 4,
        "A": 3,
        "D": 2,
        "G": 1,
        "C": 0,
        "F": -1,
        "B-": -2,
        "E-": -3,
        "A-": -4,
        "D-": -5,
        "G-": -6,
    }

    SIXTEENTH_DURATIONS = {"0": 0.25, "1": 0.25, "2": 0.5}
    EIGHTH_DURATIONS = {"0": 0.5, "1": 0.5}

    SCALE_INTERVALS = ["P1", "M2", "M3", "P4", "P5", "M6", "M7"]

    def stream_to_xml_bytes(self, stream: Stream) -> bytes:
        stream = self._clean_stream(stream)
        exporter = GeneralObjectExporter(stream)
        return exporter.parse()

    def get_mary_had(self, tonic: str, octave: int) -> bytes:
        root = note.Note(tonic)
        root.octave = octave

        def t(ivl: str):
            return root.transpose(interval.Interval(ivl))

        # E D C D | E E E | I chord
        # Each call to t() creates a fresh Note object (music21 requires unique objects per stream)
        mary_notes = [
            t("M3"),
            t("M2"),
            t("P1"),
            t("M2"),
            t("M3"),
            t("M3"),
            t("M3"),
            chord.Chord([t("P1"), t("M3"), t("P5")]),
        ]

        s = self._new_stream(tonic)
        for element in mary_notes:
            s.append(element)

        return self.stream_to_xml_bytes(s)

    def get_random_notes(
        self, note_type: int, variant: str, tone: str
    ) -> bytes:
        if note_type == 16:
            stream = self._build_rhythm(variant, tone, self.SIXTEENTH_DURATIONS)
        elif note_type == 8:
            stream = self._build_rhythm(variant, tone, self.EIGHTH_DURATIONS)
        else:
            raise ValueError("this rhythm is not supported")

        return self.stream_to_xml_bytes(stream)

    def get_note_game(self, scale: str, octave: str) -> Tuple[str, Any]:
        root = note.Note(scale)
        root.octave = int(octave)

        scale_notes = [
            root.transpose(interval.Interval(i)) for i in self.SCALE_INTERVALS
        ]
        chosen = random.choice(scale_notes)

        s = self._new_stream(scale)
        s.append(chosen)

        xml_str = self.stream_to_xml_bytes(s).decode("utf-8")
        return xml_str, chosen.name

    def _build_rhythm(
        self, variant: str, tone: str, durations: dict[str, float]
    ) -> Stream:
        s = self._new_stream()

        for _ in range(4):
            for char in variant:
                dur = durations[char]
                if char == "0":
                    r = note.Rest(duration=duration.Duration(dur))
                    s.append(r)
                else:
                    n = note.Note(tone, duration=duration.Duration(dur))
                    s.append(n)

        return s

    def _new_stream(self, tonic: str | None = None) -> Stream:
        s = Stream()
        instr = instrument.Piano()
        instr.partName = " "
        s.append(instr)
        if tonic and tonic in self.CIRCLE_OF_FOURTHS:
            s.keySignature = key.KeySignature(self.CIRCLE_OF_FOURTHS[tonic])
        return s

    def _clean_stream(self, s: Stream) -> Stream:
        s.metadata = metadata.Metadata()
        s.metadata.title = ""
        s.metadata.composer = ""
        return s
