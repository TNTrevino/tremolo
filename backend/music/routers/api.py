import logging

from fastapi import APIRouter, Depends, status
from fastapi.responses import Response, JSONResponse
from music21 import note as m21note
from music21.exceptions21 import Music21Exception

from models import MaryInput, RandomInput, NoteGameInput
from services.deps import get_music_service
from services.music_service import MusicService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health", tags=["Health"])
async def health_check():
    checks = {}

    try:
        n = m21note.Note("C4")
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
async def get_note_game(
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
    try:
        music, note_name = service.get_note_game(payload.scale, payload.octave)
    except (ValueError, KeyError, Music21Exception) as e:
        return JSONResponse(
            content=f"something is not right!{e}",
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    except Exception:
        logger.exception("Unexpected error in /note-game")
        return JSONResponse(
            content="Internal server error",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    response = {
        "generatedXml": music,
        "noteName": note_name,
        "noteOctave": payload.octave,
    }

    return JSONResponse(content=response)
