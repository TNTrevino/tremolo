from pydantic import BaseModel


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


class NoteGameResponse(BaseModel):
    generatedXml: str
    noteName: str
    noteOctave: str
