import React, { useState } from 'react';
import { generateImage } from '../services/geminiService';
import JARSISOutput from './common/JARSISOutput';
import UserQueryInput from './common/UserQueryInput';
import { AspectRatio } from '../types';
import { JARVIS_ERROR_PREFIX, DEFAULT_ASPECT_RATIOS } from '../constants'; // Keep constants for direct prefixes if needed
import { getJarvisPrefix } from '../utils/jarvisPersona'; // Import from new utility

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>(AspectRatio.ONE_TO_ONE);

  const handleGenerate = async (query: string) => {
    setError(null);
    setGeneratedImageUrl(null);
    setIsLoading(true);
    setPrompt(query);

    try {
      const result = await generateImage(query, selectedAspectRatio);
      if (typeof result === 'string') {
        setError(result);
        setGeneratedImageUrl(null);
      } else {
        setGeneratedImageUrl(result.imageUrl);
      }
    } catch (err) {
      console.error("J.A.R.V.I.S. reports: Image Generation Protocol Error:", err);
      setError(`${JARVIS_ERROR_PREFIX} An unhandled error occurred during image generation.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 flex flex-col h-full">
      <h2 className="text-2xl font-bold mb-6 text-blue-400">Image Generation Protocol</h2>
      <p className="text-gray-300 mb-4">
        Utilize advanced image synthesis to create visual assets from textual prompts.
      </p>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-300 p-3 rounded-lg mb-4">
          <p>{error}</p>
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="aspect-ratio-select" className="block text-gray-300 text-sm font-bold mb-2">
          Select Aspect Ratio:
        </label>
        <select
          id="aspect-ratio-select"
          value={selectedAspectRatio}
          onChange={(e) => setSelectedAspectRatio(e.target.value as AspectRatio)}
          className="block w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
          disabled={isLoading}
        >
          {DEFAULT_ASPECT_RATIOS.map((ratio) => (
            <option key={ratio} value={ratio}>
              {ratio}
            </option>
          ))}
        </select>
      </div>

      <UserQueryInput
        onQuery={handleGenerate}
        isLoading={isLoading}
        placeholder="Describe the image you wish to generate, Sir/Ma'am."
      />

      {isLoading && (
        <div className="mt-6">
          <JARSISOutput text={`${getJarvisPrefix()} Image generation in progress. This process may require several moments.`} isStreaming={true} />
        </div>
      )}

      {generatedImageUrl && (
        <div className="mt-6 flex flex-col items-center">
          <JARSISOutput text={`${getJarvisPrefix()} Image generation complete. Visualizing result.`} />
          <img
            src={generatedImageUrl}
            alt={`Generated from: ${prompt}`}
            className="max-w-full h-auto rounded-lg shadow-lg border border-gray-700"
          />
        </div>
      )}
    </div>
  );
};

export default ImageGenerator;