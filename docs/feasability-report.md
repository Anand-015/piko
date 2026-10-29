| Test | What to record |
| --- | --- |
| Ollama + Qwen | Model version, generation latency, peak RAM, correct field mapping |
| Whisper.cpp | Transcription accuracy and elapsed time for your own recording |
| Piper | Time to generate the WAV file and whether playback is clear |
| Combined workload | Total memory use and responsiveness when all components are active |
| Network isolation | Whether inference continues after the required models and voices have been downloaded |
| Licensing | Model-weight license, engine license, and voice license |

Do not guess latency or claim that the experience is real-time until it has been measured. For a voice assistant, users experience the delay across the whole pipeline, not just the language model.
