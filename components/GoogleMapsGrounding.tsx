import React, { useState, useEffect } from 'react';
import { mapsGrounding } from '../services/geminiService';
import JARSISOutput from './common/JARSISOutput';
import UserQueryInput from './common/UserQueryInput';
import { JARVIS_ERROR_PREFIX } from '../constants'; // Keep constants for direct prefixes if needed
import { Coordinates } from '../types';
import { getJarvisPrefix } from '../utils/jarvisPersona'; // Import from new utility

const GoogleMapsGrounding: React.FC = () => {
  const [queryResult, setQueryResult] = useState<{ text: string; groundingUrls: Array<{ uri: string; title: string }> } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    // Attempt to get user location on component mount
    handleGetLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      setIsLocating(true);
      setLocationError(null);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setIsLocating(false);
          console.log("J.A.R.V.I.S. reports: Geolocation acquired. Latitude:", position.coords.latitude, "Longitude:", position.coords.longitude);
        },
        (err) => {
          console.error("J.A.R.V.I.S. reports: Geolocation acquisition failed:", err);
          setLocationError(`${JARVIS_ERROR_PREFIX} Geolocation access denied or unavailable. Details: ${err.message}.`);
          setUserLocation(null);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationError(`${JARVIS_ERROR_PREFIX} Geolocation services are not supported by this browser.`);
      setUserLocation(null);
      setIsLocating(false);
    }
  };

  const handleQuery = async (query: string) => {
    setError(null);
    setQueryResult(null);
    setIsLoading(true);

    try {
      const result = await mapsGrounding(query, userLocation || undefined);
      if (typeof result === 'string') {
        setError(result);
        setQueryResult(null);
      } else {
        setQueryResult(result);
      }
    } catch (err) {
      console.error("J.A.R.V.I.S. reports: Google Maps Grounding Protocol Error:", err);
      setError(`${JARVIS_ERROR_PREFIX} An unhandled error occurred during maps grounding.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 flex flex-col h-full">
      <h2 className="text-2xl font-bold mb-6 text-blue-400">Google Maps Protocol</h2>
      <p className="text-gray-300 mb-4">
        Retrieve geographical and place-based information from Google Maps. Location data will be utilized if available.
      </p>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-300 p-3 rounded-lg mb-4">
          <p>{error}</p>
        </div>
      )}

      <div className="mb-4 bg-gray-800 p-4 rounded-lg border border-gray-700">
        <p className="text-gray-300 text-sm font-bold mb-2">Location Status:</p>
        {isLocating && (
          <p className="text-blue-400 text-sm">Acquiring current coordinates, Sir...</p>
        )}
        {!isLocating && userLocation && (
          <p className="text-green-400 text-sm">
            Current coordinates: Latitude {userLocation.latitude.toFixed(5)}, Longitude {userLocation.longitude.toFixed(5)}.
          </p>
        )}
        {!isLocating && !userLocation && locationError && (
          <p className="text-red-400 text-sm">{locationError}</p>
        )}
        {!isLocating && !userLocation && !locationError && (
          <p className="text-yellow-400 text-sm">Geolocation not yet acquired. Consider enabling location services.</p>
        )}
        <button
          onClick={handleGetLocation}
          disabled={isLocating || isLoading}
          className="mt-3 bg-blue-500 hover:bg-blue-600 text-white text-sm py-1 px-3 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLocating ? 'Acquiring...' : 'Refresh Geolocation'}
        </button>
      </div>

      <UserQueryInput
        onQuery={handleQuery}
        isLoading={isLoading}
        placeholder="Enter your query for Google Maps, e.g., 'Nearest Italian restaurant' or 'Directions to London Eye', Sir/Ma'am."
      />

      {isLoading && (
        <div className="mt-6">
          <JARSISOutput text={`${getJarvisPrefix()} Accessing spatial data protocols. Stand by for geographical information retrieval.`} isStreaming={true} />
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

export default GoogleMapsGrounding;