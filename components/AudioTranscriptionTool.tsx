import React, { useState, useRef } from 'react';
import { transcribeAudio } from '../services/geminiService';
import { FileData } from '../types';
import JARSISOutput from './common/JARSISOutput';
import { JARVIS_ERROR_PREFIX } from '../constants'; // Keep constants for direct prefixes if needed
import { fileToBase64 } from '../utils/imageUtils'; // Reusing for file handling
import { getJarvisPrefix } from '../utils/jarvisPersona'; // Import from new utility

const AudioTranscriptionTool: React.FC = () => {
  const [audioFile, setAudioFile] = useState<FileData | null>(null);
  const [transcriptionResult, setTranscriptionResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setTranscriptionResult(null);
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        setError(`${JARVIS_ERROR_PREFIX} Invalid file format. Audio file expected.`);
        setAudioFile(null);
        return;
      }
      try {
        const base64 = await fileToBase64(file);
        setAudioFile({ base64, mimeType: file.type, name: file.name });
      } catch (err) {
        console.error("J.A.R.V.I.S. reports: Audio Upload Protocol Error:", err);
        setError(`${JARVIS_ERROR_PREFIX} Failed to process audio file. Ensure it is a valid audio format.`);
        setAudioFile(null);
      }
    } else {
      setAudioFile(null);
    }
  };

  const startRecording = async () => {
    setError(null);
    setTranscriptionResult(null);
    setAudioFile(null); // Clear any uploaded file
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const input = audioContextRef.current.createMediaStreamSource(stream);

      // MediaRecorder works with various audio formats (e.g., audio/webm), which Gemini can handle.
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        setIsRecording(false);
        setIsLoading(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        try {
          const base64 = await fileToBase64(audioBlob as File); // Treat blob as file for conversion
          const transcribedText = await transcribeAudio(base64, 'audio/webm'); // Use webm mimeType
          setTranscriptionResult(transcribedText);
          setAudioFile({ base64, mimeType: 'audio/webm', name: 'Recorded Audio' });
        } catch (err) {
          console.error("J.A.R.V.I.S. reports: Recording Transcription Protocol Error:", err);
          setError(`${JARVIS_ERROR_PREFIX} An unhandled error occurred during recording transcription.`);
        } finally {
          setIsLoading(false);
          stream.getTracks().forEach(track => track.stop()); // Stop microphone stream
          if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
          }
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      console.log("J.A.R.V.I.S. reports: Audio recording initiated.");
    } catch (err) {
      console.error("J.A.R.V.I.S. reports: Microphone access denied or unavailable:", err);
      setError(`${JARVIS_ERROR_PREFIX} Microphone access denied or unavailable. Ensure permissions are granted. Details: ${err instanceof Error ? err.message : String(err)}`);
      setIsRecording(false);
      setIsLoading(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      console.log("J.A.R.V.I.S. reports: Audio recording terminated.");
    }
  };

  const handleTranscribeFile = async () => {
    setError(null);
    setTranscriptionResult(null);
    if (!audioFile) {
      setError(`${JARVIS_ERROR_PREFIX} No audio file selected for transcription.`);
      return;
    }

    setIsLoading(true);
    try {
      const transcribedText = await transcribeAudio(audioFile.base64, audioFile.mimeType);
      setTranscriptionResult(transcribedText);
    } catch (err) {
      console.error("J.A.R.V.I.S. reports: File Transcription Protocol Error:", err);
      setError(`${JARVIS_ERROR_PREFIX} An unhandled error occurred during audio file transcription.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 flex flex-col h-full">
      <h2 className="text-2xl font-bold mb-6 text-blue-400">Audio Transcription Protocol</h2>
      <p className="text-gray-300 mb-4">
        Convert spoken input from your microphone or an uploaded audio file into textual data.
      </p>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-300 p-3 rounded-lg mb-4">
          <p>{error}</p>
        </div>
      )}

      <div className="mb-6 border border-gray-700 p-4 rounded-lg bg-gray-800">
        <label htmlFor="audio-upload" className="block text-gray-300 text-sm font-bold mb-2">
          Upload Audio File:
        </label>
        <input
          type="file"
          id="audio-upload"
          accept="audio/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 cursor-pointer mb-2"
          disabled={isLoading || isRecording}
        />
        {audioFile && (
          <p className="mt-2 text-sm text-gray-400">
            Audio file selected: <span className="text-blue-300">{audioFile.name}</span>
          </p>
        )}
        <button
          onClick={handleTranscribeFile}
          disabled={isLoading || isRecording || !audioFile}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading && audioFile ? 'Transcribing File...' : 'Transcribe Uploaded Audio'}
        </button>
      </div>

      <div className="mb-6 border border-gray-700 p-4 rounded-lg bg-gray-800">
        <p className="block text-gray-300 text-sm font-bold mb-2">Record Audio via Microphone:</p>
        <div className="flex space-x-4">
          <button
            onClick={startRecording}
            disabled={isLoading || isRecording}
            className={`flex-1 px-4 py-2 rounded-lg font-bold transition duration-200
              ${isRecording ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
          >
            {isRecording ? 'Recording...' : 'Start Recording'}
          </button>
          <button
            onClick={stopRecording}
            disabled={isLoading || !isRecording}
            className={`flex-1 px-4 py-2 rounded-lg font-bold transition duration-200
              ${!isRecording ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'}`}
          >
            Stop Recording
          </button>
        </div>
        {isRecording && (
          <p className="mt-2 text-sm text-green-400 animate-pulse">
            Active Recording: Input is being captured.
          </p>
        )}
      </div>


      {isLoading && (
        <div className="mt-6">
          <JARSISOutput text={`${getJarvisPrefix()} Audio data processing. Stand by for transcription.`} isStreaming={true} />
        </div>
      )}

      {transcriptionResult && (
        <div className="mt-6">
          <JARSISOutput text={transcriptionResult} />
        </div>
      )}
    </div>
  );
};

export default AudioTranscriptionTool;