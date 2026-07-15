import logging

from fastapi import APIRouter, Depends, status
from fastapi.responses import Response, JSONResponse
from music21 import note as m21note
from music21.exceptions21 import Music21Exception

from models import (
    ChordGameInput,
    IntervalGameInput,
    KeySignatureGameInput,
    MaryInput,
    NoteGameInput,
    RandomInput,
    ScaleGameInput,
)
from services.deps import get_music_service
from services.music_service import MusicService

logger = logging.getLogger(__name__)

router = APIRouter()


def run_game_endpoint(endpoint_name: str, build_response):
    """Shared error mapping for the identification game endpoints.

    music21 / value errors map to 400; anything else logs and maps to
    500. `build_response` runs the service call and returns the payload
    dict for the JSON response.
    """
    try:
        content = build_response()
    except (ValueError, KeyError, Music21Exception) as e:
        return JSONResponse(
            content=f"something is not right!{e}",
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    except Exception:
        logger.exception("Unexpected error in %s", endpoint_name)
        return JSONResponse(
            content="Internal server error",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return JSONResponse(content=content)


@router.get("/health", tags=["Health"])
async def health_check():
    checks = {}

    try:
        m21note.Note("C4")
        checks["music21"] = "operational"
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "checks": {"music21": str(e)},
            },
        )

    return {"status": "healthy", "checks": checks}


@router.post(
    "/mary",
    response_class=Response,
    responses={200: {"description": "MusicXML for Mary Had a Little Lamb"}},
    tags=["Music Generation"],
)
async def get_mary_had(
    payload: MaryInput,
    service: MusicService = Depends(get_music_service),
):
    """
    This endpoint generates sheet music for "Mary Had a Little Lamb",
    transposed to the specified tonic and octave.

    Example:
        POST /mary
        {
            "tonic": "C",
            "octave": 4
        }
        Returns: MusicXML
    """
    try:
        music = service.get_mary_had(payload.tonic, payload.octave)
    except (ValueError, KeyError, Music21Exception) as e:
        return Response(
            content=f"The note {e} is not currently supported, reconsider you root note",
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    except Exception:
        logger.exception("Unexpected error in /mary")
        return Response(
            content="Internal server error",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(content=music, media_type="application/xml")


@router.post(
    "/random",
    response_class=Response,
    responses={200: {"description": "MusicXML with random notes"}},
    tags=["Music Generation"],
)
async def get_random_notes(
    payload: RandomInput,
    service: MusicService = Depends(get_music_service),
):
    """
    Creates a measure of music with randomly selected notes from the specified
    scale/tonic, arranged with the specified rhythm pattern.

    Args:
        payload: Request body containing:
            NOTE: we really need to work on this
            - rhythm (str): Rhythm pattern as digit string
                - For type 16: "1111", "112", "121", "211", "0111"
                  (0=rest 0.25, 1=note 0.25, 2=note 0.5)
                - For type 8: "11", "01", "10"
                  (0=rest 0.5, 1=note 0.5)
            - rhythmType (int): Note duration type (8 for eighth, 16 for sixteenth)
            - tonic (str): Root note for scale (C, D, E, F, G, A, B, optionally with # or -)

    Returns:
        Response: MusicXML

    Example:
        POST /random
        {
            "rhythm": "1111",
            "rhythmType": 16,
            "tonic": "C"
        }
        Returns: MusicXML
    """
    try:
        music = service.get_random_notes(
            payload.rhythmType, payload.rhythm, payload.tonic
        )
    except (ValueError, KeyError, Music21Exception) as e:
        return Response(
            content=f"something is not right!{e}",
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    except Exception:
        logger.exception("Unexpected error in /random")
        return Response(
            content="Internal server error",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(content=music, media_type="application/xml")


@router.post(
    "/note-game",
    response_class=JSONResponse,
    responses={
        200: {"description": "Single random note for identification game"}
    },
    tags=["Music Generation"],
)
def get_note_game(
    payload: NoteGameInput,
    service: MusicService = Depends(get_music_service),
):
    """
    Creates a measure with one randomly selected diatonic note from the specified
    scale. Returns both the MusicXML and the note name/octave for validation.

    Returns:
        JSONResponse with:
            - generatedXml (str): MusicXML containing the single note
            - noteName (str): The name of the generated note (e.g., "C", "D#")
            - noteOctave (str): The octave of the generated note

    We use these values for validation in the games frontend portion, and the XML to display the
    note.

    Example:
        POST /note-game
        {
            "scale": "C",
            "octave": "4"
        }
        Returns:
        {
            "generatedXml": "<score-partwise>...</score-partwise>",
            "noteName": "G",
            "noteOctave": "4"
        }
    """

    def build():
        music, note_name, note_octave = service.get_note_game(
            payload.scale,
            payload.octave,
            low_note=payload.lowNote,
            high_note=payload.highNote,
            clef_name=payload.clef,
        )
        return {
            "generatedXml": music,
            "noteName": note_name,
            "noteOctave": note_octave,
        }

    return run_game_endpoint("/note-game", build)


@router.post(
    "/key-signature-game",
    response_class=JSONResponse,
    responses={200: {"description": "Key signature identification question"}},
    tags=["Music Generation"],
)
def get_key_signature_game(
    payload: KeySignatureGameInput,
    service: MusicService = Depends(get_music_service),
):
    """
    Renders an empty measure showing only a clef and a random key
    signature. Returns the XML plus the answer for frontend validation.

    Example:
        POST /key-signature-game
        {
            "clefs": ["treble", "bass"],
            "keySignatures": [-3, 0, 2]
        }
        Returns:
        {
            "generatedXml": "<score-partwise>...</score-partwise>",
            "tonic": "E-",
            "minorTonic": "C",
            "sharps": -3,
            "clef": "treble"
        }
    """

    def build():
        music, tonic, minor_tonic, sharps, clef_used = (
            service.get_key_signature_game(payload.clefs, payload.keySignatures)
        )
        return {
            "generatedXml": music,
            "tonic": tonic,
            "minorTonic": minor_tonic,
            "sharps": sharps,
            "clef": clef_used,
        }

    return run_game_endpoint("/key-signature-game", build)


@router.post(
    "/scale-game",
    response_class=JSONResponse,
    responses={200: {"description": "Scale identification question"}},
    tags=["Music Generation"],
)
def get_scale_game(
    payload: ScaleGameInput,
    service: MusicService = Depends(get_music_service),
):
    """
    Renders one octave of a random scale (whole notes, ascending). In
    "accidentals" mode there is no key signature so accidentals print
    inline; in "key_signature" mode the scale's key signature is shown
    instead. The answer is the scale type.

    Example:
        POST /scale-game
        {
            "tonicPool": ["C", "G", "F"],
            "scaleTypes": ["major", "harmonic_minor"],
            "questionMode": "accidentals",
            "octave": 4,
            "clefs": ["treble"]
        }
        Returns:
        {
            "generatedXml": "<score-partwise>...</score-partwise>",
            "tonic": "G",
            "scaleType": "harmonic_minor",
            "clef": "treble"
        }
    """

    def build():
        music, tonic, scale_type, clef_used = service.get_scale_game(
            payload.tonicPool,
            payload.scaleTypes,
            payload.octave,
            payload.clefs,
            payload.questionMode,
        )
        return {
            "generatedXml": music,
            "tonic": tonic,
            "scaleType": scale_type,
            "clef": clef_used,
        }

    return run_game_endpoint("/scale-game", build)


@router.post(
    "/chord-game",
    response_class=JSONResponse,
    responses={200: {"description": "Chord identification question"}},
    tags=["Music Generation"],
)
def get_chord_game(
    payload: ChordGameInput,
    service: MusicService = Depends(get_music_service),
):
    """
    Renders a single whole-note chord built from a random root and
    quality, optionally inverted. The answer is the chord quality.

    Example:
        POST /chord-game
        {
            "rootPool": ["C", "F", "G"],
            "qualities": ["major", "minor", "dominant7"],
            "inversions": true,
            "octave": 4,
            "clefs": ["treble"]
        }
        Returns:
        {
            "generatedXml": "<score-partwise>...</score-partwise>",
            "root": "F",
            "quality": "dominant7",
            "inversion": 2,
            "clef": "treble"
        }
    """

    def build():
        music, root, quality, inversion, clef_used = service.get_chord_game(
            payload.rootPool,
            payload.qualities,
            payload.octave,
            payload.clefs,
            payload.inversions,
        )
        return {
            "generatedXml": music,
            "root": root,
            "quality": quality,
            "inversion": inversion,
            "clef": clef_used,
        }

    return run_game_endpoint("/chord-game", build)


@router.post(
    "/interval-game",
    response_class=JSONResponse,
    responses={200: {"description": "Interval identification question"}},
    tags=["Music Generation"],
)
def get_interval_game(
    payload: IntervalGameInput,
    service: MusicService = Depends(get_music_service),
):
    """
    Renders a random interval above a natural root note, either as a
    stacked chord ("harmonic") or two sequential whole notes
    ("melodic"). The answer is the interval name.

    Example:
        POST /interval-game
        {
            "clefs": ["treble"],
            "displayMode": "harmonic",
            "intervals": ["m3", "M3", "P5"]
        }
        Returns:
        {
            "generatedXml": "<score-partwise>...</score-partwise>",
            "interval": "M3",
            "number": 3,
            "quality": "M",
            "clef": "treble"
        }
    """

    def build():
        music, name, number, quality, clef_used = service.get_interval_game(
            payload.clefs,
            payload.octave,
            payload.displayMode,
            payload.intervals,
        )
        return {
            "generatedXml": music,
            "interval": name,
            "number": number,
            "quality": quality,
            "clef": clef_used,
        }

    return run_game_endpoint("/interval-game", build)
