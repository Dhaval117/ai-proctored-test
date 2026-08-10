from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import numpy as np
import logging
import asyncio
from app.speech_service import get_speech_service
from app.config import LIVE_TRANSCRIPTION_ENABLED

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/speech", tags=["speech"])

@router.websocket("/live")
async def websocket_speech_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    try:
        speech_service = get_speech_service()
    except Exception as e:
        logger.error(f"Failed to load speech service: {e}")
        await websocket.close()
        return

    audio_buffer = bytearray()
    transcription_lock = asyncio.Lock()
    last_interim_samples = 0
    previous_text = ""
    
    try:
        while True:
            data = await websocket.receive_bytes()
            audio_buffer.extend(data)
            
            valid_len = len(audio_buffer) - (len(audio_buffer) % 4)
            if valid_len == 0:
                continue
                
            audio_array = np.frombuffer(audio_buffer[:valid_len], dtype=np.float32)
            total_samples = len(audio_array)
            
            # Use to_thread to avoid blocking event loop
            timestamps = await asyncio.to_thread(speech_service.get_speech_timestamps, audio_array)
            
            if not timestamps:
                continue
                
            last_speech_end = timestamps[-1]['end']
            
            is_pause = (total_samples - last_speech_end) > 4000
            
            if is_pause or total_samples > 480000:
                async with transcription_lock:
                    text = await asyncio.to_thread(speech_service.transcribe, audio_array, previous_text)
                    if text:
                        await websocket.send_json({"text": text, "is_final": True})
                        previous_text = (previous_text + " " + text)[-200:].strip()
                
                audio_buffer = bytearray()
                last_interim_samples = 0
            elif LIVE_TRANSCRIPTION_ENABLED:
                # Send interim updates every 1 second (16000 samples)
                if total_samples - last_interim_samples >= 16000:
                    if not transcription_lock.locked():
                        last_interim_samples = total_samples
                        
                        async def run_interim(arr):
                            async with transcription_lock:
                                text = await asyncio.to_thread(speech_service.transcribe, arr, previous_text)
                                if text:
                                    await websocket.send_json({"text": text, "is_final": False})
                                    
                        asyncio.create_task(run_interim(audio_array.copy()))
                    
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error in speech streaming: {e}")
