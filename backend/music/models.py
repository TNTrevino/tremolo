from typing import List, Literal, Optional, get_args

from pydantic import BaseModel, Field, field_validator

DEFAULT_TONIC_POOL = ["C", "G", "D", "A", "E", "F", "B-", "E-", "A-"]

Clef = Literal[
    "treble",
    "bass",
    "alto",
    "tenor",
    "soprano",
    "mezzo_soprano",
    "baritone",
]

ScaleType = Literal[
    "major",
    "natural_minor",
    "harmonic_minor",
    "melodic_minor",
]

ChordQuality = Literal[
    "major",
    "minor",
    "augmented",
    "diminished",
    "dominant7",
    "major7",
    "minor7",
    "half_diminished7",
    "diminished7",
    "dominant9",
    "major9",
    "minor9",
]

# Kept in sync with MusicService.ALL_INTERVALS; duplicated here to
# avoid a models -> services import.
DEFAULT_INTERVALS = [
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


class MaryInput(BaseModel):
    tonic: str
    octave: int


class RandomInput(BaseModel):
    rhythm: str
    rhythmType: int
    tonic: str


class NoteGameInput(BaseModel):
    scale: str
    octave: str
    # Range mode: when both are set, a note is chosen from the scale
    # within [lowNote, highNote] instead of a single fixed octave.
    lowNote: Optional[str] = None
    highNote: Optional[str] = None
    clef: Clef = "treble"


class NoteGameResponse(BaseModel):
    generatedXml: str
    noteName: str
    noteOctave: str


class KeySignatureGameInput(BaseModel):
    clefs: List[Clef] = Field(default=["treble"], min_length=1)
    keySignatures: List[int] = Field(default=list(range(-7, 8)), min_length=1)

    @field_validator("keySignatures")
    @classmethod
    def validate_key_signatures(cls, v: List[int]) -> List[int]:
        for fifths in v:
            if not -7 <= fifths <= 7:
                raise ValueError(f"key signature {fifths} out of range [-7, 7]")
        return v


class KeySignatureGameResponse(BaseModel):
    generatedXml: str
    tonic: str
    minorTonic: str
    sharps: int
    clef: str


class ScaleGameInput(BaseModel):
    tonicPool: List[str] = Field(
        default=DEFAULT_TONIC_POOL,
        min_length=1,
    )
    scaleTypes: List[ScaleType] = Field(
        default=list(get_args(ScaleType)),
        min_length=1,
    )
    questionMode: Literal["accidentals", "key_signature"] = "accidentals"
    octave: Optional[int] = Field(default=None, ge=1, le=7)
    clefs: List[Clef] = Field(default=["treble"], min_length=1)


class ScaleGameResponse(BaseModel):
    generatedXml: str
    tonic: str
    scaleType: str
    clef: str


class ChordGameInput(BaseModel):
    rootPool: List[str] = Field(
        default=DEFAULT_TONIC_POOL,
        min_length=1,
    )
    qualities: List[ChordQuality] = Field(
        default=[
            "major",
            "minor",
            "augmented",
            "diminished",
            "dominant7",
            "major7",
            "minor7",
            "half_diminished7",
            "diminished7",
        ],
        min_length=1,
    )
    inversions: bool = False
    octave: Optional[int] = Field(default=None, ge=1, le=7)
    clefs: List[Clef] = Field(default=["treble"], min_length=1)


class ChordGameResponse(BaseModel):
    generatedXml: str
    root: str
    quality: str
    inversion: int
    clef: str


class IntervalGameInput(BaseModel):
    clefs: List[Clef] = Field(default=["treble"], min_length=1)
    octave: Optional[int] = Field(default=None, ge=1, le=7)
    displayMode: Literal["harmonic", "melodic"] = "harmonic"
    intervals: List[str] = Field(default=DEFAULT_INTERVALS, min_length=1)


class IntervalGameResponse(BaseModel):
    generatedXml: str
    interval: str
    number: int
    quality: str
    clef: str
