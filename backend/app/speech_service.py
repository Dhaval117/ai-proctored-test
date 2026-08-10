import numpy as np
import logging

logger = logging.getLogger(__name__)

# We use global variables so the model is only loaded once per worker process.
_speech_service_instance = None

class SpeechService:
    def __init__(self, model_size="tiny.en", device="cpu", compute_type="int8"):
        # Import inside init to avoid errors if dependencies aren't installed yet
        from faster_whisper import WhisperModel
        from faster_whisper.vad import get_vad_model

        logger.info(f"Loading faster-whisper model '{model_size}' on {device}...")
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
        
        logger.info("Loading Silero VAD model...")
        self.vad_model = get_vad_model()
        logger.info("Speech models loaded successfully.")

    def transcribe(self, audio_array: np.ndarray, initial_prompt: str = None) -> str:
        """
        Transcribes a float32 numpy array representing 16kHz audio.
        """
        if len(audio_array) == 0:
            return ""
            
        # Add 0.5s (8000 samples) of silence padding to the end of the audio.
        # This helps Whisper correctly finalize the last word without hallucinating.
        padded_array = np.pad(audio_array, (0, 8000), mode='constant')
            
        segments, _ = self.model.transcribe(
            padded_array, 
            beam_size=5, 
            language="en", 
            vad_filter=False,
            initial_prompt=initial_prompt
        )
        return " ".join([segment.text for segment in segments]).strip()

    def get_speech_timestamps(self, audio_array: np.ndarray):
        """
        Returns a list of dicts with 'start' and 'end' frames of speech segments.
        """
        if len(audio_array) == 0:
            return []
            
        from faster_whisper.vad import get_speech_timestamps
        return get_speech_timestamps(audio_array, sampling_rate=16000)

def get_speech_service() -> SpeechService:
    global _speech_service_instance
    if _speech_service_instance is None:
        _speech_service_instance = SpeechService()
    return _speech_service_instance
