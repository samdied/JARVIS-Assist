import React, { useEffect, useState, useRef, useCallback } from 'react';
import { LiveAssistantService } from '../services/geminiService';
import { ChatMessage } from '../types';
import JARSISOutput from './common/JARSISOutput';
import { JARVIS_ERROR_PREFIX } from '../constants'; // Keep constants for direct prefixes if needed
import { getJarvisPrefix } from '../utils/jarvisPersona'; // Import from new utility

const LiveAssistant: React.FC = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [transcriptionHistory, setTranscriptionHistory] = useState<ChatMessage[]>([]);
  const [currentInputTranscription, setCurrentInputTranscription] = useState('');
  const [currentOutputTranscription, setCurrentOutputTranscription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [transcriptionHistory, currentInputTranscription, currentOutputTranscription]);

  const onTranscription = useCallback((text: string, isUser: boolean) => {
    if (isUser) {
      setCurrentInputTranscription(text);
    } else {
      setCurrentOutputTranscription(text);
    }
    setError(null);
  }, []);

  const onAudioPlayback = useCallback(() => {
    // Audio is handled by the service directly via AudioContext.
    // This callback can be used to trigger UI updates if needed, e.g., a playing indicator.
    // For now, no specific UI update is required, hence no parameters.
  }, []);

  const onError = useCallback((err: string) => {
    setError(err);
    setIsConnecting(false);
    setIsConnected(false);
    console.error("J.A.R.V.I.S. Live Assistant Error Callback:", err);
  }, []);

  const onClose = useCallback(() => {
    setIsConnected(false);
    setIsConnecting(false);
    setCurrentInputTranscription('');
    setCurrentOutputTranscription('');
    setError(null);
    console.log("J.A.R.V.I.S. reports: Live session connection terminated.");
  }, []);

  useEffect(() => {
    LiveAssistantService.init({
      onTranscription,
      onAudioPlayback,
      onError,
      onClose,
    });

    // Initial state sync
    const status = LiveAssistantService.getConnectionStatus();
    setIsConnecting(status.isConnecting);
    setIsConnected(status.isConnected);
    setTranscriptionHistory(status.transcriptionHistory);
    setCurrentInputTranscription(status.currentInputTranscription);
    setCurrentOutputTranscription(status.currentInputTranscription);

    return () => {
      // Cleanup on component unmount
      if (isConnected || isConnecting) {
        LiveAssistantService.stopConversation();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount to initialize the service callbacks

  const handleStartConversation = async () => {
    setError(null);
    setIsConnecting(true);
    setTranscriptionHistory([]);
    setCurrentInputTranscription('');
    setCurrentOutputTranscription('');
    await LiveAssistantService.startConversation();
    const status = LiveAssistantService.getConnectionStatus();
    setIsConnected(status.isConnected);
    setIsConnecting(status.isConnecting);
  };

  const handleStopConversation = () => {
    LiveAssistantService.stopConversation();
    setIsConnected(false);
    setIsConnecting(false);
  };

  return (
    <div className="p-6 flex flex-col h-full">
      <h2 className="text-2xl font-bold mb-6 text-blue-400">J.A.R.V.I.S. Live Assistant</h2>
      <p className="text-gray-300 mb-4">
        Initiate real-time vocal communication with J.A.R.V.I.S. Your input will be transcribed, and a synthesized vocal response will be provided.
      </p>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-300 p-3 rounded-lg mb-4">
          <p>{error}</p>
        </div>
      )}

      <div className="flex space-x-4 mb-6">
        <button
          onClick={handleStartConversation}
          disabled={isConnecting || isConnected}
          className={`px-6 py-3 rounded-lg font-bold transition duration-200
            ${isConnecting || isConnected
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
        >
          {isConnecting ? 'Establishing Connection...' : 'Initiate Live Protocol'}
        </button>
        <button
          onClick={handleStopConversation}
          disabled={!isConnected && !isConnecting}
          className={`px-6 py-3 rounded-lg font-bold transition duration-200
            ${(!isConnected && !isConnecting)
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
        >
          Terminate Live Protocol
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar border border-gray-700 p-4 rounded-lg bg-gray-800">
        {transcriptionHistory.map((msg, index) => (
          msg.sender === 'user' ? (
            <div key={index} className="flex justify-end mb-4">
              <div className="bg-blue-800 p-3 rounded-lg shadow-md max-w-[70%]">
                <span className="font-semibold text-blue-200">User:</span> {msg.text}
              </div>
            </div>
          ) : (
            <div key={index} className="flex justify-start mb-4">
              <div className="max-w-[70%]">
                <JARSISOutput text={msg.text} />
              </div>
            </div>
          )
        ))}

        {currentInputTranscription && (
          <div className="flex justify-end mb-4">
            <div className="bg-blue-800 p-3 rounded-lg shadow-md max-w-[70%]">
              <span className="font-semibold text-blue-200">User:</span> {currentInputTranscription}
            </div>
          </div>
        )}

        {currentOutputTranscription && (
          <div className="flex justify-start mb-4">
            <div className="max-w-[70%]">
              <JARSISOutput text={`${getJarvisPrefix()} ${currentOutputTranscription}`} isStreaming={true} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-4 p-4 bg-gray-800 border border-gray-700 rounded-lg">
        <p className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
          Status: {isConnecting ? 'Connecting...' : (isConnected ? 'Online' : 'Offline')}
        </p>
        <p className="text-gray-400 text-sm mt-2">
          J.A.R.V.I.S. operates on a continuous audio stream. Please ensure your microphone is enabled and positioned correctly.
        </p>
      </div>
    </div>
  );
};

export default LiveAssistant;