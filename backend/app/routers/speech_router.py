from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import numpy as np
import logging
import asyncio
import os
from app.config import LIVE_TRANSCRIPTION_ENABLED, SPEECH_TO_TEXT_PROVIDER

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/speech", tags=["speech"])

@router.websocket("/live")
async def websocket_speech_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    if SPEECH_TO_TEXT_PROVIDER == "gemini":
        await gemini_speech_handler(websocket)
    else:
        await local_speech_handler(websocket)


async def gemini_speech_handler(websocket: WebSocket):
    try:
        from google import genai
        client = genai.Client()
    except Exception as e:
        logger.error(f"Failed to initialize Gemini Client: {e}")
        await websocket.close()
        return

    try:
        async with client.aio.live.connect(model="gemini-3.5-transcribe-live", config={"generation_config": {"response_modalities": ["TEXT"]}}) as session:
            
            async def receive_from_client():
                try:
                    while True:
                        data = await websocket.receive_bytes()
                        # data is raw int16 PCM at 16kHz from frontend
                        await session.send_realtime_input(media={"data": data, "mime_type": "audio/pcm;rate=16000"})
                except WebSocketDisconnect:
                    logger.info("Client disconnected from Gemini speech stream")
                except Exception as e:
                    logger.error(f"Error receiving from client in Gemini handler: {e}")

            async def send_to_client():
                current_transcript = ""
                try:
                    async for message in session.receive():
                        server_content = getattr(message, "server_content", None)
                        if server_content:
                            if getattr(server_content, "input_transcription", None):
                                text = server_content.input_transcription.text
                                is_final = getattr(server_content.input_transcription, "finished", False)
                                
                                if text:
                                    current_transcript += text
                                    
                                if current_transcript:
                                    await websocket.send_json({"text": current_transcript, "is_final": is_final})
                                
                                if is_final:
                                    current_transcript = ""
                                    
                            elif getattr(server_content, "model_turn", None):
                                text = "".join([part.text for part in server_content.model_turn.parts if part.text])
                                is_final = getattr(server_content, "turn_complete", True)
                                
                                if text:
                                    current_transcript += text
                                    
                                if current_transcript:
                                    await websocket.send_json({"text": current_transcript, "is_final": is_final})
                                
                                if is_final:
                                    current_transcript = ""
                except Exception as e:
                    logger.error(f"Gemini receive error: {e}")
            
            await asyncio.gather(receive_from_client(), send_to_client())
    except Exception as e:
        logger.error(f"Gemini connection error: {e}")
        await websocket.close()


async def local_speech_handler(websocket: WebSocket):
    try:
        from app.speech_service import get_speech_service
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
            
            # Int16 is 2 bytes per sample
            valid_len = len(audio_buffer) - (len(audio_buffer) % 2)
            if valid_len == 0:
                continue
                
            audio_array = np.frombuffer(audio_buffer[:valid_len], dtype=np.int16)
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
