
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import type { GenerateVideosOperationResponse, VideosOperation } from '@google/genai';

// FIX: Removed conflicting global type declaration for `window.aistudio`.
// The TypeScript compiler error indicates that `window.aistudio` is already typed in the global scope,
// and this declaration was causing a conflict.

// --- SVG Icon Components ---

const FilmIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
  </svg>
);

const KeyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H5v-2H3v-2H1.258a1 1 0 01-.97-1.243l1.258-7.5a1 1 0 01.97-1.243H15z" />
  </svg>
);

// --- Child Components defined outside App to prevent re-rendering issues ---

const LOADING_MESSAGES = [
  "Summoning digital actors...",
  "Setting up the virtual scene...",
  "Rendering the first few frames...",
  "Action! The cameras are rolling...",
  "This can take a few minutes, please hang tight!",
  "Adding sound effects and dialogue...",
  "Finalizing the cinematic masterpiece...",
];

const LoadingIndicator: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % LOADING_MESSAGES.length);
    }, 3000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-gray-800 rounded-lg shadow-xl">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-400 mb-6"></div>
      <h3 className="text-xl font-semibold text-white mb-2">Generating Your Video</h3>
      <p className="text-gray-300 transition-opacity duration-500">{LOADING_MESSAGES[messageIndex]}</p>
    </div>
  );
};

interface ApiKeySelectorProps {
  onKeySelected: () => void;
}

const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ onKeySelected }) => {
  const handleSelectKey = async () => {
    try {
      await window.aistudio.openSelectKey();
      // Assume success and immediately update the UI state.
      // This handles potential race conditions with hasSelectedApiKey.
      onKeySelected();
    } catch (error) {
      console.error("Error opening API key selection:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-lg w-full text-center border border-gray-700">
        <KeyIcon className="h-12 w-12 mx-auto text-indigo-400 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-3">API Key Required</h2>
        <p className="text-gray-300 mb-6">
          To use the Veo video generation model, you need to select an API key.
          This will be used for your requests.
        </p>
        <button
          onClick={handleSelectKey}
          className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-opacity-50 transition-transform transform hover:scale-105"
        >
          Select Your API Key
        </button>
        <p className="text-gray-500 text-sm mt-4">
          For more information on billing, please visit the{' '}
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
            official documentation
          </a>.
        </p>
      </div>
    </div>
  );
};

const VideoPlayer: React.FC<{ videoUrl: string }> = ({ videoUrl }) => (
  <div className="w-full max-w-4xl bg-black rounded-lg overflow-hidden shadow-2xl border border-gray-700">
    <video
      key={videoUrl}
      src={videoUrl}
      controls
      autoPlay
      loop
      className="w-full h-full object-contain"
    >
      Your browser does not support the video tag.
    </video>
  </div>
);


// --- Main App Component ---

export default function App() {
  const initialPrompt = useMemo(() => "Create a re-enactment of a scene set in a Texas Walmart. The scene begins with a male customer discovering a broken olive oil bottle on the floor of the aisle, with shards of glass scattered around. The customer appears concerned and hurriedly searches for a store employee to report the spill and prevent any injuries. As he finds various employees, they smile and shrug their shoulders, indicating they do not speak English, which adds to his frustration. He then takes one employee by the hand and leads her to the accident site. At this moment, two women in electric shopping carts rush past, colliding with additional bottles and causing more chaos. Focus on the expressions of concern from the customer, the confusion of the employees, and the chaotic energy of the scene as the shopping carts crash. Use realistic animations and sounds to enhance the urgency and humor of the situation.", []);
  
  const [prompt, setPrompt] = useState<string>(initialPrompt);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isKeySelected, setIsKeySelected] = useState<boolean>(false);
  const [checkingKey, setCheckingKey] = useState<boolean>(true);
  
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        if (window.aistudio) {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setIsKeySelected(hasKey);
        } else {
            // Fallback for environments where aistudio is not available
            console.warn("aistudio not found on window object. Assuming no key selected.");
            setIsKeySelected(false);
        }
      } catch (e) {
        console.error("Error checking for API key:", e);
        setIsKeySelected(false);
      } finally {
        setCheckingKey(false);
      }
    };
    checkApiKey();
  }, []);

  const pollOperation = useCallback(async <T extends GenerateVideosOperationResponse,>(
    ai: GoogleGenAI,
    operation: VideosOperation<T>
  ): Promise<T> => {
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
      try {
        operation = await ai.operations.getVideosOperation({ operation: operation });
      } catch (e) {
        console.error("Error polling operation status:", e);
        throw new Error("Failed to get video generation status.");
      }
    }
    if (!operation.response?.generatedVideos?.[0]?.video?.uri) {
        throw new Error("Video generation completed but no video URI was found.");
    }
    return operation.response;
  }, []);

  const handleGenerateVideo = useCallback(async () => {
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setVideoUrl(null);
    setError(null);

    try {
      // Re-instantiate GenAI client each time to use the latest key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });
      
      const response = await pollOperation(ai, operation);
      const downloadLink = response.generatedVideos[0].video.uri;

      const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      if (!videoResponse.ok) {
        throw new Error(`Failed to download video: ${videoResponse.statusText}`);
      }
      const videoBlob = await videoResponse.blob();
      const objectUrl = URL.createObjectURL(videoBlob);
      setVideoUrl(objectUrl);

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Video generation failed:", errorMessage);

      if (errorMessage.includes("Requested entity was not found")) {
        setError("Your API key is invalid or not found. Please select a new key.");
        setIsKeySelected(false);
      } else {
        setError(`An error occurred: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [prompt, isLoading, pollOperation]);

  if (checkingKey) {
      return (
          <div className="min-h-screen bg-gray-900 flex items-center justify-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-400"></div>
          </div>
      );
  }

  if (!isKeySelected) {
    return <ApiKeySelector onKeySelected={() => setIsKeySelected(true)} />;
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <div className="flex justify-center items-center gap-4 mb-4">
            <FilmIcon className="h-10 w-10 text-indigo-400" />
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              AI Video Scene Generator
            </h1>
          </div>
          <p className="mt-2 text-lg text-gray-400">
            Bring your stories to life. Describe a scene and watch it get generated.
          </p>
        </header>

        <main>
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
            <label htmlFor="prompt" className="block text-lg font-medium text-gray-200 mb-2">
              Scene Prompt
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A robot holding a red skateboard..."
              rows={10}
              className="w-full p-4 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 text-gray-200 resize-y"
              disabled={isLoading}
            />
            <button
              onClick={handleGenerateVideo}
              disabled={isLoading || !prompt.trim()}
              className="mt-6 w-full flex items-center justify-center gap-3 bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-opacity-50 transition-all duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:transform-none transform hover:scale-105"
            >
              {isLoading ? 'Generating...' : 'Generate Video'}
            </button>
          </div>

          <div className="mt-10 flex flex-col items-center justify-center">
            {isLoading && <LoadingIndicator />}
            {error && (
              <div className="w-full text-center bg-red-900 border border-red-700 text-red-200 p-4 rounded-lg">
                <p className="font-bold">Error</p>
                <p>{error}</p>
              </div>
            )}
            {videoUrl && !isLoading && <VideoPlayer videoUrl={videoUrl} />}
          </div>
        </main>
      </div>
    </div>
  );
}
