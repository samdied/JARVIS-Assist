import React from 'react';
import ReactMarkdown from 'react-markdown';
import { JARVIS_PREFIX, JARVIS_MAAM_PREFIX } from '../../constants'; // Keep constants for direct prefixes if needed

interface JARSISOutputProps {
  text: string;
  isStreaming?: boolean;
  groundingUrls?: Array<{ uri: string; title: string }>;
}

const JARSISOutput: React.FC<JARSISOutputProps> = ({ text, isStreaming = false, groundingUrls }) => {
  // Ensure that the displayed text starts with the prefix for consistency, but remove it from markdown rendering
  // The prefix itself is primarily for auditory/conversational flow, not part of the markdown content.
  const displayableText = text.startsWith(JARVIS_PREFIX) ? text.substring(JARVIS_PREFIX.length).trim() :
                          text.startsWith(JARVIS_MAAM_PREFIX) ? text.substring(JARVIS_MAAM_PREFIX.length).trim() :
                          text.trim();

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md mb-4 border border-blue-600">
      <div className="flex items-center mb-2">
        <span className="text-blue-400 font-semibold mr-2">J.A.R.V.I.S.:</span>
        <div className="flex-1">
          {/* Fix: Wrap ReactMarkdown with a div to apply className, as ReactMarkdown does not accept className directly */}
          <div className="markdown break-words">
            <ReactMarkdown>
              {displayableText}
            </ReactMarkdown>
          </div>
        </div>
        {isStreaming && (
          <span className="ml-2 animate-pulse text-blue-500">...</span>
        )}
      </div>
      {groundingUrls && groundingUrls.length > 0 && (
        <div className="mt-4 border-t border-gray-700 pt-3">
          <p className="text-gray-400 text-sm mb-2">Information Protocols Accessed:</p>
          <ul className="list-disc list-inside text-sm text-blue-300">
            {groundingUrls.map((url, index) => (
              <li key={index} className="truncate">
                <a
                  href={url.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-blue-400"
                  title={url.title}
                >
                  {url.title || url.uri}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default JARSISOutput;