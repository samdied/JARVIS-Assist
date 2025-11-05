import React, { useState } from 'react';
import { searchGrounding } from '../services/geminiService';
import JARSISOutput from './common/JARSISOutput';
import UserQueryInput from './common/UserQueryInput';
import { JARVIS_ERROR_PREFIX } from '../constants'; // Keep constants for direct prefixes if needed
import { getJarvisPrefix } from '../utils/jarvisPersona'; // Import from new utility

const GoogleSearchGrounding: React.FC = () => {
  const [queryResult, setQueryResult] = useState<{ text: string; groundingUrls: Array<{ uri: string; title: string }> } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = async (query: string) => {
    setError(null);
    setQueryResult(null);
    setIsLoading(true);

    try {
      const result = await searchGrounding(query);
      if (typeof result === 'string') {
        setError(result);
        setQueryResult(null);
      } else {
        setQueryResult(result);
      }
    } catch (err) {
      console.error("J.A.R.V.I.S. reports: Google Search Grounding Protocol Error:", err);
      setError(`${JARVIS_ERROR_PREFIX} An unhandled error occurred during search grounding.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 flex flex-col h-full">
      <h2 className="text-2xl font-bold mb-6 text-blue-400">Google Search Protocol</h2>
      <p className="text-gray-300 mb-4">
        Query external data sources for real-time information and contextual data.
      </p>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-300 p-3 rounded-lg mb-4">
          <p>{error}</p>
        </div>
      )}

      <UserQueryInput
        onQuery={handleQuery}
        isLoading={isLoading}
        placeholder="Enter your query for Google Search, Sir/Ma'am."
      />

      {isLoading && (
        <div className="mt-6">
          <JARSISOutput text={`${getJarvisPrefix()} Accessing external data protocols. Stand by for information retrieval.`} isStreaming={true} />
        </div>
      )}

      {queryResult && (
        <div className="mt-6">
          <JARSISOutput text={queryResult.text} groundingUrls={queryResult.groundingUrls} />
        </div>
      )}
    </div>
  );
};

export default GoogleSearchGrounding;