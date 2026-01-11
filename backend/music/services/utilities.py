from pathlib import Path
import os
import tempfile
from typing import Union

from music21 import instrument, metadata
from music21 import converter
from music21.stream.base import Stream


def get_xml_file(stream: Stream) -> bytes:
    """Takes in a stream, returns it as xml"""
    stream = clean_stream(stream)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".xml") as tmp_file:
        stream.write("xml", fp=tmp_file.name)
        tmp_file_path = tmp_file.name

    with open(tmp_file_path, "rb") as f:
        xml_bytes = f.read()

    os.remove(tmp_file_path)

    return xml_bytes


def midi_to_xml(file: Union[bytes, Path]):
    """
    Takes in a file path or string and convertes it into a Stream.Score.
    Then, made into an xml file which is returned.
    """
    score = converter.parse(file)

    return get_xml_file(score)


# NOTE: not used, xml is all we really need
def get_midi_file(stream: Stream) -> bytes:

    with tempfile.NamedTemporaryFile(delete=False, suffix=".mid") as tmp_file:
        stream.write("midi", fp=tmp_file.name)
        tmp_file_path = tmp_file.name

    with open(tmp_file_path, "rb") as f:
        midi_bytes = f.read()

    os.remove(tmp_file_path)

    return midi_bytes


def clean_stream(s: Stream):
    """
    Takes in a stream, removes its Title and Composer
    """
    # TODO: remove more things, and add an optional
    # parameter that can take in an instrument name, and set the instrument
    # to that

    s.metadata = metadata.Metadata()
    s.metadata.title = ""
    s.metadata.composer = ""
    return s


def remove_part_name(s: Stream):
    instr = instrument.Piano()
    instr.partName = " "
    s.append(instr)


CircleOfFourths = {
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
