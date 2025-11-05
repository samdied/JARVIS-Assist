import React, { useState } from 'react';
import { editImage } from '../services/geminiService';
import { FileData } from '../types';
import JARSISOutput from './common/JARSISOutput';
import UserQueryInput from './common/UserQueryInput';
import { fileToBase64 } from '../utils/imageUtils';
import { JARVIS_ERROR_PREFIX } from '../constants'; // Keep constants for direct prefixes if needed
import { getJarvisPrefix } from '../utils/jarvisPersona'; // Import from new utility

const ImageEditor: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<FileData | null>(null);
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setEditedImageUrl(null);
    const file = event.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setOriginalImage({ base64, mimeType: file.type, name: file.name });
      } catch (err) {
        console.error("J.A.R.V.I.S. reports: Image Upload Protocol Error:", err);
        setError(`${JARVIS_ERROR_PREFIX} Failed to process image file. Ensure it is a valid image format.`);
        setOriginalImage(null);
      }
    } else {
      setOriginalImage(null);
    }
  };

  const handleEdit = async (query: string) => {
    setError(null);
    setEditedImageUrl(null);
    if (!originalImage) {
      setError(`${JARVIS_ERROR_PREFIX} No image detected for editing. Please upload an image first.`);
      return;
    }

    setIsLoading(true);
    try {
      const result = await editImage(originalImage.base64, originalImage.mimeType, query);
      if (typeof result === 'string') {
        setError(result);
        setEditedImageUrl(null);
      } else {
        setEditedImageUrl(result.imageUrl);
      }
    } catch (err) {
      console.error("J.A.R.V.I.S. reports: Image Editing Protocol Error:", err);
      setError(`${JARVIS_ERROR_PREFIX} An unhandled error occurred during image editing.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 flex flex-col h-full">
      <h2 className="text-2xl font-bold mb-6 text-blue-400">Image Editing Protocol</h2>
      <p className="text-gray-300 mb-4">
        Upload an image and provide textual instructions for modification.
      </p>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-300 p-3 rounded-lg mb-4">
          <p>{error}</p>
        </div>
      )}

      <div className="mb-6">
        <label htmlFor="image-upload" className="block text-gray-300 text-sm font-bold mb-2">
          Upload Image:
        </label>
        <input
          type="file"
          id="image-upload"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 cursor-pointer"
          disabled={isLoading}
        />
        {originalImage && (
          <p className="mt-2 text-sm text-gray-400">
            Image selected: <span className="text-blue-300">{originalImage.name}</span>
          </p>
        )}
      </div>

      <UserQueryInput
        onQuery={handleEdit}
        isLoading={isLoading}
        placeholder="Provide editing instructions, e.g., 'Add a retro filter' or 'Remove the person in the background', Sir/Ma'am."
      />

      {isLoading && (
        <div className="mt-6">
          <JARSISOutput text={`${getJarvisPrefix()} Image editing in progress. Please await processing completion.`} isStreaming={true} />
        </div>
      )}

      {(originalImage || editedImageUrl) && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {originalImage && (
            <div>
              <JARSISOutput text={`${getJarvisPrefix()} Original image rendered.`} />
              <img
                src={`data:${originalImage.mimeType};base64,${originalImage.base64}`}
                alt="Original"
                className="max-w-full h-auto rounded-lg shadow-lg border border-gray-700"
              />
            </div>
          )}
          {editedImageUrl && (
            <div>
              <JARSISOutput text={`${getJarvisPrefix()} Edited image rendered.`} />
              <img
                src={editedImageUrl}
                alt="Edited"
                className="max-w-full h-auto rounded-lg shadow-lg border border-gray-700"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageEditor;