from music21 import interval, key, note, chord
from music21.stream.base import Stream
from music21.note import Note
from music21.interval import Interval

from .utilities import CircleOfFourths, get_xml_file, remove_part_name


class DiatonicInformation:
    def __init__(self, tonic: str, octave: int):
        self._tonic = note.Note(tonic)
        self._tonic.octave = octave

        # diatonic chords
        self.I = [self.tonic, self.third, self.fifth]
        self.ii = [self.second, self.fourth, self.sixth]
        self.iii = [self.third, self.fifth, self.seventh]
        self.IV = [self.fourth, self.sixth, self.tonic]
        self.V = [self.fifth, self.seventh, self.second]
        self.vi = [self.sixth, self.tonic, self.third]
        self.vii = [self.seventh, self.second, self.fourth]

        self.notes = Stream()
        remove_part_name(self.notes)

        self.notes.keySignature = key.KeySignature(CircleOfFourths[tonic])

    @property
    def tonic(self):
        return self._tonic

    @property
    def second(self):
        return self.transpose(self.tonic, interval.Interval("M2"))

    @property
    def third(self):
        return self.transpose(self.tonic, interval.Interval("M3"))

    @property
    def fourth(self):
        return self.transpose(self.tonic, interval.Interval("P4"))

    @property
    def fifth(self):
        return self.transpose(self.tonic, interval.Interval("P5"))

    @property
    def sixth(self):
        return self.transpose(self.tonic, interval.Interval("M6"))

    @property
    def seventh(self):
        return self.transpose(self.tonic, interval.Interval("M7"))

    # TODO: add a way to increase the range of this?
    def getScale(self):
        return [
            self.tonic,
            self.second,
            self.third,
            self.fourth,
            self.fifth,
            self.sixth,
            self.seventh,
        ]

    def transpose(self, starting_note: Note, interval: Interval) -> Note:
        transposed_note = starting_note.transpose(interval)
        if transposed_note:
            return transposed_note
        else:
            raise Exception("this note is not real")

    def get_mary_had(self) -> bytes:
        """
        Returns the sheet music for mary had a little lamb
        in an xml format.
        """
        mary_notes = [
            self.third,
            self.second,
            self.tonic,
            self.second,
            self.third,
            self.third,
            self.third,
            chord.Chord(self.I),
        ]

        for element in mary_notes:
            self.notes.append(element)

        return get_xml_file(self.notes)


# for future use?
scaleTones = {
    "C": ["C", "D", "E", "F", "G", "A", "B"],
    "Csharp": ["C#", "D#", "E#", "F#", "G#", "A#", "B#"],
    "D": ["D", "E", "F#", "G", "A", "B", "C#"],
    "Eb": ["E-", "F", "G", "A-", "B-", "C", "D"],
    "E": ["E", "F#", "G#", "A", "B", "C#", "D#"],
    "F": ["F", "G", "A", "B-", "C", "D", "E"],
    "Fsharp": ["F#", "G#", "A#", "B", "C#", "D#", "E#"],
    "G": ["G", "A", "B", "C", "D", "E", "F#"],
    "Ab": ["A-", "B-", "C", "D-", "E-", "F", "G"],
    "A": ["A", "B", "C#", "D", "E", "F#", "G#"],
    "Bb": ["B-", "C", "D", "E-", "F", "G", "A"],
    "B": ["B", "C#", "D#", "E", "F#", "G#", "A#"],
}
