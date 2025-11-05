import React, { useState } from 'react';
import { queryWithThinkingMode } from '../services/geminiService';
import JARSISOutput from './common/JARSISOutput';
import UserQueryInput from './common/UserQueryInput';
import { JARVIS_ERROR_PREFIX } from '../constants'; // Keep constants for direct prefixes if needed
import { getJarvisPrefix } from '../utils/jarvisPersona'; // Import from new utility

const ThinkingModeQuery: React.FC = () => {
  const [queryResult, setQueryResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = async (query: string) => {
    setError(null);
    setQueryResult(null);
    setIsLoading(true);

    try {
      const result = await queryWithThinkingMode(query);
      setQueryResult(result);
    } catch (err) {
      console.error("J.A.R.V.I.S. reports: Thinking Mode Protocol Error:", err);
      setError(`${JARVIS_ERROR_PREFIX} An unhandled error occurred during complex query processing.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 flex flex-col h-full">
      <h2 className="text-2xl font-bold mb-6 text-blue-400">Thinking Mode Protocol (Complex Queries)</h2>
      <p className="text-gray-300 mb-4">
        Activate J.A.R.V.I.S.'s enhanced cognitive processing for intricate or abstract queries.
        This mode utilizes an expanded thinking budget for deeper reasoning.
      </p>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-300 p-3 rounded-lg mb-4">
          <p>{error}</p>
        </div>
      )}

      <UserQueryInput
        onQuery={handleQuery}
        isLoading={isLoading}
        placeholder="Submit your complex query for in-depth analysis, Sir/Ma'am."
      />

      {isLoading && (
        <div className="mt-6">
          <JARSISOutput text={`${getJarvisPrefix()} Engaging advanced cognitive modules. This process may require extended computation.`} isStreaming={true} />
        </div>
      )}

      {queryResult && (
        <div className="mt-6">
          <JARSISOutput text={queryResult} />
        </div>
      )}
    </div>
  );
};

export default ThinkingModeQuery;