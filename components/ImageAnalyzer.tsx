import React, { useState } from 'react';
import { analyzeImage } from '../services/geminiService';
import { FileData } from '../types';
import JARSISOutput from './common/JARSISOutput';
import UserQueryInput from './common/UserQueryInput';
import { fileToBase64 } from '../utils/imageUtils';
import { JARVIS_ERROR_PREFIX } from '../constants'; // Keep constants for direct prefixes if needed
import { getJarvisPrefix } from '../utils/jarvisPersona'; // Import from new utility

const ImageAnalyzer: React.FC = () => {
  const [imageFile, setImageFile] = useState<FileData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setAnalysisResult(null);
    const file = event.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setImageFile({ base64, mimeType: file.type, name: file.name });
      } catch (err) {
        console.error("J.A.R.V.I.S. reports: Image Upload Protocol Error:", err);
        setError(`${JARVIS_ERROR_PREFIX} Failed to process image file. Ensure it is a valid image format.`);
        setImageFile(null);
      }
    } else {
      setImageFile(null);
    }
  };

  const handleAnalyze = async (query: string) => {
    setError(null);
    setAnalysisResult(null);
    if (!imageFile) {
      setError(`${JARVIS_ERROR_PREFIX} No image detected for analysis. Please upload an image first.`);
      return;
    }

    setIsLoading(true);
    try {
      const result = await analyzeImage(imageFile.base64, imageFile.mimeType, query);
      setAnalysisResult(result);
    } catch (err) {
      console.error("J.A.R.V.I.S. reports: Image Analysis Protocol Error:", err);
      setError(`${JARVIS_ERROR_PREFIX} An unhandled error occurred during image analysis.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 flex flex-col h-full">
      <h2 className="text-2xl font-bold mb-6 text-blue-400">Image Analysis Protocol</h2>
      <p className="text-gray-300 mb-4">
        Upload an image and provide a query for J.A.R.V.I.S. to analyze its content.
      </p>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-300 p-3 rounded-lg mb-4">
          <p>{error}</p>
        </div>
      )}

      <div className="mb-6">
        <label htmlFor="image-upload-analyze" className="block text-gray-300 text-sm font-bold mb-2">
          Upload Image:
        </label>
        <input
          type="file"
          id="image-upload-analyze"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 cursor-pointer"
          disabled={isLoading}
        />
        {imageFile && (
          <p className="mt-2 text-sm text-gray-400">
            Image selected: <span className="text-blue-300">{imageFile.name}</span>
          </p>
        )}
      </div>

      <UserQueryInput
        onQuery={handleAnalyze}
        isLoading={isLoading}
        placeholder="Enter your query about the image, e.g., 'Describe this image' or 'What is happening here?', Sir/Ma'am."
      />

      {isLoading && (
        <div className="mt-6">
          <JARSISOutput text={`${getJarvisPrefix()} Image analysis in progress. Stand by for results.`} isStreaming={true} />
        </div>
      )}

      {imageFile && (
        <div className="mt-6 flex flex-col items-center">
          <JARSISOutput text={`${getJarvisPrefix()} Image for analysis rendered.`} />
          <img
            src={`data:${imageFile.mimeType};base64,${imageFile.base64}`}
            alt="Uploaded for analysis"
            className="max-w-full h-auto rounded-lg shadow-lg border border-gray-700"
          />
        </div>
      )}

      {analysisResult && (
        <div className="mt-6">
          <JARSISOutput text={analysisResult} />
        </div>
      )}
    </div>
  );
};

export default ImageAnalyzer;