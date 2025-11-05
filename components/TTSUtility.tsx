import React, { useState, useRef, useCallback } from 'react';
import { textToSpeech } from '../services/geminiService';
import JARSISOutput from './common/JARSISOutput';
import { JARVIS_ERROR_PREFIX } from '../constants'; // Keep constants for direct prefixes if needed
import { decodeBase64, decodeAudioData } from '../utils/audioUtils';
import { getJarvisPrefix } from '../utils/jarvisPersona'; // Import from new utility

const TTSUtility: React.FC = () => {
  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentVoice, setCurrentVoice] = useState('Zephyr'); // Default J.A.R.V.I.S. voice
  const audioContextRef = useRef<AudioContext | null>(null);

  const availableVoices = [
    { name: 'Zephyr', description: 'Standard J.A.R.V.I.S. (Male)' },
    { name: 'Kore', description: 'Formal (Female)' },
    { name: 'Puck', description: 'Authoritative (Male)' },
    { name: 'Charon', description: 'Deep (Male)' },
    { name: 'Fenrir', description: 'Calm (Female)' },
  ];

  const initializeAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
  }, []);

  const handleGenerateSpeech = async () => {
    setError(null);
    if (!textInput.trim()) {
      setError(`${JARVIS_ERROR_PREFIX} Text input required for speech synthesis.`);
      return;
    }

    setIsLoading(true);
    try {
      initializeAudioContext();
      if (!audioContextRef.current) {
        throw new Error("J.A.R.V.I.S. reports: Audio context initialization failed.");
      }

      const result = await textToSpeech(textInput, currentVoice);

      if (typeof result === 'string') {
        setError(result);
      } else {
        const audioData = decodeBase64(result.audioData);
        const audioBuffer = await decodeAudioData(
          audioData,
          audioContextRef.current,
          24000, // Sample rate of model's output audio
          1,     // Number of channels
        );

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.start();
      }
    } catch (err) {
      console.error("J.A.R.V.I.S. reports: Text-to-Speech Protocol Error:", err);
      setError(`${JARVIS_ERROR_PREFIX} An unhandled error occurred during speech synthesis.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 flex flex-col h-full">
      <h2 className="text-2xl font-bold mb-6 text-blue-400">Text-to-Speech Protocol</h2>
      <p className="text-gray-300 mb-4">
        Convert textual input into synthesized speech using J.A.R.V.I.S.'s vocalizer.
      </p>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-300 p-3 rounded-lg mb-4">
          <p>{error}</p>
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="voice-select" className="block text-gray-300 text-sm font-bold mb-2">
          Select Voice Profile:
        </label>
        <select
          id="voice-select"
          value={currentVoice}
          onChange={(e) => setCurrentVoice(e.target.value)}
          className="block w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
          disabled={isLoading}
        >
          {availableVoices.map((voice) => (
            <option key={voice.name} value={voice.name}>
              {voice.name} ({voice.description})
            </option>
          ))}
        </select>
      </div>

      <textarea
        className="w-full p-3 rounded-lg bg-gray-700 text-gray-100 border border-gray-600 focus:border-blue-500 focus:outline-none resize-none mb-4"
        rows={6}
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        placeholder="Enter text for speech synthesis, Sir/Ma'am."
        disabled={isLoading}
      />

      <button
        onClick={handleGenerateSpeech}
        disabled={isLoading || !textInput.trim()}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Synthesizing Audio...' : 'Generate Speech Output'}
      </button>

      {isLoading && (
        <div className="mt-6">
          <JARSISOutput text={`${getJarvisPrefix()} Initiating vocal synthesis. Please await audio playback.`} isStreaming={true} />
        </div>
      )}

      {!isLoading && !error && textInput.trim() && (
        <div className="mt-6">
          <JARSISOutput text={`${getJarvisPrefix()} Audio stream dispatched.`} />
        </div>
      )}
    </div>
  );
};

export default TTSUtility;