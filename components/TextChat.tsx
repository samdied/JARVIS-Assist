import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessageStream } from '../services/geminiService';
import { ChatMessage } from '../types';
import JARSISOutput from './common/JARSISOutput';
import { JARVIS_ERROR_PREFIX, MODELS } from '../constants'; // Keep constants for direct prefixes if needed
import UserQueryInput from './common/UserQueryInput';
import { GenerateContentResponse } from '@google/genai';
import { getJarvisPrefix } from '../utils/jarvisPersona'; // Import from new utility

const TextChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Fix: Change selectedModel state type to string to allow assignment from select input
  const [selectedModel, setSelectedModel] = useState<string>(MODELS.GEMINI_FLASH); // Default to Flash
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleQuery = async (userQuery: string) => {
    setError(null);
    setIsLoading(true);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userQuery,
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);

    // Add a placeholder for J.A.R.V.I.S.'s streaming response
    const jarvisMessageId = `jarvis-${Date.now()}`;
    setMessages((prevMessages) => [
      ...prevMessages,
      { id: jarvisMessageId, sender: 'jarvis', text: `${getJarvisPrefix()} Initiating response protocol.`, isStreaming: true },
    ]);

    let fullResponse = '';
    const onChunkReceived = (chunk: GenerateContentResponse) => {
      if (chunk.text) {
        fullResponse += chunk.text;
      } else if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
        // Fallback for older chunk structure, though .text should be preferred
        fullResponse += chunk.candidates[0].content.parts[0].text;
      }
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === jarvisMessageId ? { ...msg, text: `${getJarvisPrefix()} ${fullResponse}`, isStreaming: true } : msg
        )
      );
    };

    try {
      await sendChatMessageStream(messages, userQuery, selectedModel, onChunkReceived);
    } catch (err) {
      console.error("J.A.R.V.I.S. reports: Text Chat Protocol Error:", err);
      setError(`${JARVIS_ERROR_PREFIX} An unhandled error occurred during chat processing.`);
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === jarvisMessageId ? { ...msg, text: `${JARVIS_ERROR_PREFIX} An error occurred during response generation.`, isStreaming: false } : msg
        )
      );
    } finally {
      setIsLoading(false);
      // Ensure the final message is marked as not streaming
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === jarvisMessageId ? { ...msg, isStreaming: false } : msg
        )
      );
    }
  };

  return (
    <div className="p-6 flex flex-col h-full">
      <h2 className="text-2xl font-bold mb-6 text-blue-400">J.A.R.V.I.S. Text Chat Protocol</h2>
      <p className="text-gray-300 mb-4">
        Engage J.A.R.V.I.S. with textual queries. Select a model suitable for your latency requirements.
      </p>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-300 p-3 rounded-lg mb-4">
          <p>{error}</p>
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="model-select" className="block text-gray-300 text-sm font-bold mb-2">
          Select Response Model:
        </label>
        <select
          id="model-select"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="block w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
          disabled={isLoading}
        >
          <option value={MODELS.GEMINI_FLASH}>{MODELS.GEMINI_FLASH} (Standard)</option>
          <option value={MODELS.GEMINI_FLASH_LITE}>{MODELS.GEMINI_FLASH_LITE} (Low Latency)</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar mb-6 border border-gray-700 p-4 rounded-lg bg-gray-800">
        {messages.map((msg, index) => (
          msg.sender === 'user' ? (
            <div key={index} className="flex justify-end mb-4">
              <div className="bg-blue-800 p-3 rounded-lg shadow-md max-w-[70%]">
                <span className="font-semibold text-blue-200">User:</span> {msg.text}
              </div>
            </div>
          ) : (
            <div key={index} className="flex justify-start mb-4">
              <div className="max-w-[70%]">
                <JARSISOutput text={msg.text} isStreaming={msg.isStreaming} />
              </div>
            </div>
          )
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-auto">
        <UserQueryInput
          onQuery={handleQuery}
          isLoading={isLoading}
          placeholder="Enter your query for J.A.R.V.I.S., Sir/Ma'am."
        />
      </div>
    </div>
  );
};

export default TextChat;