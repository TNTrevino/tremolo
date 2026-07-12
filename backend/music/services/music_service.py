from __future__ import annotations

import random
from typing import Tuple

from music21 import (
    chord,
    clef,
    duration,
    instrument,
    interval,
    key,
    metadata,
    meter,
    note,
    pitch,
    scale,
)
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

    SCALE_CLASSES = {
        "major": scale.MajorScale,
        "natural_minor": scale.MinorScale,
        "harmonic_minor": scale.HarmonicMinorScale,
        "melodic_minor": scale.MelodicMinorScale,
    }

    CHORD_INTERVALS = {
        "major": ["P1", "M3", "P5"],
        "minor": ["P1", "m3", "P5"],
        "augmented": ["P1", "M3", "A5"],
        "diminished": ["P1", "m3", "d5"],
        "dominant7": ["P1", "M3", "P5", "m7"],
        "major7": ["P1", "M3", "P5", "M7"],
        "minor7": ["P1", "m3", "P5", "m7"],
        "half_diminished7": ["P1", "m3", "d5", "m7"],
        "diminished7": ["P1", "m3", "d5", "d7"],
        "dominant9": ["P1", "M3", "P5", "m7", "M9"],
        "major9": ["P1", "M3", "P5", "M7", "M9"],
        "minor9": ["P1", "m3", "P5", "m7", "M9"],
    }

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

    CLEFS = {
        "treble": clef.TrebleClef,
        "bass": clef.BassClef,
        "alto": clef.AltoClef,
        "tenor": clef.TenorClef,
        "soprano": clef.SopranoClef,
        "mezzo_soprano": clef.MezzoSopranoClef,
        "baritone": clef.FBaritoneClef,
    }

    # Comfortable staff ranges for interval-game roots when no octave
    # is requested: natural notes spanning roughly the middle of each
    # staff.
    INTERVAL_ROOT_RANGES = {
        "treble": ("C4", "C5"),
        "bass": ("E2", "E3"),
        "alto": ("F3", "F4"),
        "tenor": ("D3", "D4"),
        "soprano": ("C4", "C5"),
        "mezzo_soprano": ("A3", "A4"),
        "baritone": ("B2", "B3"),
    }

    NATURAL_LETTERS = "CDEFGAB"

    DEFAULT_OCTAVES = {
        "treble": 4,
        "soprano": 4,
        "mezzo_soprano": 4,
        "alto": 4,
        "bass": 3,
        "tenor": 3,
        "baritone": 3,
    }

    def _resolve_octave(self, octave: int | None, clef_name: str) -> int:
        if octave is not None:
            return octave
        return self.DEFAULT_OCTAVES.get(clef_name, 4)

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

    def get_note_game(
        self,
        tonic: str,
        octave: str,
        low_note: str | None = None,
        high_note: str | None = None,
        clef_name: str = "treble",
    ) -> Tuple[str, str, str]:
        if low_note and high_note:
            if pitch.Pitch(low_note) > pitch.Pitch(high_note):
                raise ValueError(
                    f"lowNote {low_note} is above highNote {high_note}"
                )
            sc = scale.MajorScale(tonic)
            candidates = list(sc.getPitches(low_note, high_note))
            if not candidates:
                raise ValueError(
                    f"no {tonic} major notes between "
                    f"{low_note} and {high_note}"
                )
            chosen = note.Note(random.choice(candidates))
        else:
            root = note.Note(tonic)
            root.octave = int(octave)
            scale_notes = [
                root.transpose(interval.Interval(i))
                for i in self.SCALE_INTERVALS
            ]
            chosen = random.choice(scale_notes)

        s = self._new_stream(tonic, clef_name=clef_name)
        s.append(chosen)

        xml_str = self.stream_to_xml_bytes(s).decode("utf-8")
        return xml_str, chosen.name, str(chosen.octave)

    def get_key_signature_game(
        self, clefs: list[str], key_signatures: list[int]
    ) -> Tuple[str, str, str, int, str]:
        clef_name = random.choice(clefs)
        sharps = random.choice(key_signatures)
        ks = key.KeySignature(sharps)

        s = self._new_stream(clef_name=clef_name)
        s.append(ks)
        # Invisible whole rest so the measure is well-formed but renders
        # as an empty measure with only the clef and key signature.
        r = note.Rest(duration=duration.Duration(4.0))
        r.style.hideObjectOnPrint = True
        s.append(r)

        tonic = ks.asKey("major").tonic.name
        minor_tonic = ks.asKey("minor").tonic.name
        xml_str = self.stream_to_xml_bytes(s).decode("utf-8")
        return xml_str, tonic, minor_tonic, sharps, clef_name

    def get_scale_game(
        self,
        tonic_pool: list[str],
        scale_types: list[str],
        octave: int | None,
        clefs: list[str],
        question_mode: str = "accidentals",
    ) -> Tuple[str, str, str, str]:
        clef_name = random.choice(clefs)
        octave = self._resolve_octave(octave, clef_name)
        tonic = random.choice(tonic_pool)
        scale_type = random.choice(scale_types)
        sc = self.SCALE_CLASSES[scale_type](tonic)

        # Ascending octave run. In "accidentals" mode there is no key
        # signature so every accidental is printed inline next to its
        # note; in "key_signature" mode the scale's key signature is
        # printed instead (raised harmonic/melodic minor degrees still
        # print inline, which is correct).
        pitches = sc.getPitches(f"{tonic}{octave}", f"{tonic}{octave + 1}")

        s = self._new_stream(clef_name=clef_name)
        if question_mode == "key_signature":
            if scale_type == "major":
                k = key.Key(tonic)
            else:
                # Lowercase tonic = minor key in music21.
                k = key.Key(tonic.lower())
            s.keySignature = key.KeySignature(k.sharps)
        # All eight whole notes share one measure instead of rendering
        # as eight full-width measures.
        s.append(self._hidden_time_signature("8/1"))
        for p in pitches:
            s.append(note.Note(p, duration=duration.Duration(4.0)))

        xml_str = self.stream_to_xml_bytes(s).decode("utf-8")
        return xml_str, tonic, scale_type, clef_name

    def get_chord_game(
        self,
        root_pool: list[str],
        qualities: list[str],
        octave: int | None,
        clefs: list[str],
        inversions: bool = False,
    ) -> Tuple[str, str, str, int, str]:
        clef_name = random.choice(clefs)
        octave = self._resolve_octave(octave, clef_name)
        root_name = random.choice(root_pool)
        quality = random.choice(qualities)

        root = note.Note(root_name)
        root.octave = octave

        # Fresh Note per interval (music21 requires unique objects)
        c = chord.Chord(
            [
                root.transpose(interval.Interval(ivl))
                for ivl in self.CHORD_INTERVALS[quality]
            ],
            duration=duration.Duration(4.0),
        )

        inversion = 0
        if inversions:
            inversion = random.randint(0, min(3, len(c.pitches) - 1))
            c.inversion(inversion)

        s = self._new_stream(clef_name=clef_name)
        s.append(c)

        xml_str = self.stream_to_xml_bytes(s).decode("utf-8")
        return xml_str, root_name, quality, inversion, clef_name

    def get_interval_game(
        self,
        clefs: list[str],
        octave: int | None,
        display_mode: str,
        intervals: list[str],
    ) -> Tuple[str, str, int, str, str]:
        clef_name = random.choice(clefs)
        name = random.choice(intervals)

        try:
            iv = interval.Interval(name)
        except Exception:
            raise ValueError(f"unsupported interval: {name}")

        # Pick a natural root note. With no explicit octave, roots come
        # from a comfortable staff range for the clef; otherwise any
        # natural letter in the requested octave.
        if octave is None:
            candidates = self.INTERVAL_ROOT_CANDIDATES[clef_name]
        else:
            candidates = [
                f"{letter}{octave}" for letter in self.NATURAL_LETTERS
            ]

        root = note.Note(
            random.choice(candidates), duration=duration.Duration(4.0)
        )
        second = root.transpose(interval.Interval(name))
        second.duration = duration.Duration(4.0)

        s = self._new_stream(clef_name=clef_name)
        if display_mode == "melodic":
            # Both whole notes share one measure (same trick as the
            # scale game's 8/1).
            s.append(self._hidden_time_signature("2/1"))
            s.append(root)
            s.append(second)
        else:
            s.append(
                chord.Chord([root, second], duration=duration.Duration(4.0))
            )

        number = iv.generic.value
        quality = "".join(ch for ch in name if not ch.isdigit())

        xml_str = self.stream_to_xml_bytes(s).decode("utf-8")
        return xml_str, name, number, quality, clef_name

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

    def _hidden_time_signature(self, ratio: str) -> meter.TimeSignature:
        """Time signature that groups notes into one measure without
        printing (OSMD honors print-object="no")."""
        ts = meter.TimeSignature(ratio)
        ts.style.hideObjectOnPrint = True
        return ts

    def _new_stream(
        self, tonic: str | None = None, clef_name: str | None = None
    ) -> Stream:
        s = Stream()
        instr = instrument.Piano()
        instr.partName = " "
        s.append(instr)
        if clef_name:
            try:
                s.append(self.CLEFS[clef_name]())
            except KeyError:
                raise ValueError(f"unsupported clef: {clef_name}")
        if tonic and tonic in self.CIRCLE_OF_FOURTHS:
            s.keySignature = key.KeySignature(self.CIRCLE_OF_FOURTHS[tonic])
        return s

    def _clean_stream(self, s: Stream) -> Stream:
        s.metadata = metadata.Metadata()
        s.metadata.title = ""
        s.metadata.composer = ""
        return s


# Interval-game root candidates are fixed per clef; walk the scale once
# at import instead of per request.
MusicService.INTERVAL_ROOT_CANDIDATES = {
    clef_name: [
        p.nameWithOctave for p in scale.MajorScale("C").getPitches(low, high)
    ]
    for clef_name, (low, high) in MusicService.INTERVAL_ROOT_RANGES.items()
}
