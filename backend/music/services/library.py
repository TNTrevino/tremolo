from typing import Tuple, Any
from music21 import key, note, duration
import random

from music21.stream.base import Stream

from .dynamic_mary import DiatonicInformation

from .utilities import CircleOfFourths, get_xml_file, remove_part_name

sixteenth_variants = ["1111", "112", "121", "211", "0111"]
sixteenth_durations = {
    "0": 0.25,
    "1": 0.25,
    "2": 0.5,
}

eight_variants = ["11", "01", "10"]
eight_durations = {
    "0": 0.5,
    "1": 0.5,
}


# TODO: figure out a way to make it only take in elements in
# 16th variants like you can in ts. maybe not possible since it is python :I
# an enum???
def get_sixteenth(varient: str, tone: str) -> Stream:
    s = Stream()

    remove_part_name(s)

    for _ in range(4):
        for note_length in varient:
            dur = sixteenth_durations[note_length]
            if note_length == "0":
                r = note.Rest(duration=duration.Duration(dur))
                s.append(r)
            else:
                n = note.Note(tone, duration=duration.Duration(dur))
                s.append(n)

    return s


def get_eight(variant: str, tone: str) -> Stream:
    s = Stream()

    remove_part_name(s)

    for _ in range(4):
        for note_length in variant:
            dur = eight_durations[note_length]

            if note_length == "0":
                r = note.Rest(duration=duration.Duration(dur))
                s.append(r)
                print("is this a rest?: ", r.isRest)
                print(r.duration)
            else:
                n = note.Note(tone, duration=duration.Duration(dur))
                s.append(n)
                print(n.duration)

    return s


# Todo: make this an enumeration
def get_notes(note_type: int, variant: str, tone: str) -> bytes:
    if note_type == 16:
        return get_xml_file(get_sixteenth(variant, tone))
    elif note_type == 8:
        return get_xml_file(get_eight(variant, tone))
    else:
        raise Exception("this rhythm is not supported")


# an int from 1-8, and take the scale and octave as the parameters
def note_game(scale: str, octave: str) -> Tuple[str, Any]:
    s = Stream()

    remove_part_name(s)

    s.keySignature = key.KeySignature(CircleOfFourths[scale])
    notes = DiatonicInformation(scale, int(octave)).getScale()
    note = random.choice(notes)
    s.append(note)

    return get_xml_file(s).decode("utf-8"), note.name
