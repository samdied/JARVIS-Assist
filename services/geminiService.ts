import { GoogleGenAI, GenerateContentResponse, Modality, FunctionDeclaration, Type, LiveServerMessage, Blob, Content } from '@google/genai';
import { JARVIS_ERROR_PREFIX, MODELS } from '../constants';
import { ChatMessage, FileData, Coordinates, TaskStatus, Task } from '../types';
import { decodeBase64, decodeAudioData, createPcmBlob, playAudioBuffer } from '../utils/audioUtils';
import { getJarvisPrefix, getJarvisSystemInstruction } from '../utils/jarvisPersona'; // Import from new utility
import TaskService from './taskService'; // Import the new TaskService

/**
 * Formats an unknown error into a user-friendly string message.
 * This is used for UI display.
 * @param error The unknown error object.
 * @returns A string representation of the error.
 */
const formatErrorForUI = (error: unknown): string => {
  if (error instanceof ErrorEvent) {
    if (error.error instanceof Error) {
      return error.error.message;
    }
    return error.message || "Unknown Error Event";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

/**
 * General error handler for Gemini API calls, maintaining J.A.R.V.I.S. persona.
 * @param error The error object.
 * @returns A formatted error message.
 */
const handleGeminiError = (error: unknown): string => {
  console.error("Gemini API Error:", error);
  return `${JARVIS_ERROR_PREFIX} ${formatErrorForUI(error)}`;
};

/**
 * Checks for API key selection for Veo models and prompts the user if necessary.
 * @returns A Promise that resolves to true if an API key is selected, false otherwise.
 */
async function ensureApiKeySelected(): Promise<boolean> {
  if (typeof window.aistudio === 'undefined' || typeof window.aistudio.hasSelectedApiKey === 'undefined') {
    console.warn("window.aistudio is not available. API Key selection cannot be managed.");
    return true; // Assume API key is present in process.env for development/local testing
  }

  const hasKey = await window.aistudio.hasSelectedApiKey();
  if (!hasKey) {
    console.log("No API key selected. Opening key selection dialog.");
    window.aistudio.openSelectKey();
    // Assume success after opening dialog for race condition mitigation
    return true;
  }
  return true;
}

/**
 * Sends a text message to the Gemini chat model and streams the response.
 * @param messages The current array of chat messages.
 * @param userMessage The user's new message.
 * @param model The Gemini model to use.
 * @param onChunkReceived Callback for each streamed chunk.
 * @returns A Promise that resolves when the streaming is complete.
 */
export async function sendChatMessageStream(
  messages: ChatMessage[],
  userMessage: string,
  model: string,
  onChunkReceived: (chunk: GenerateContentResponse) => void,
): Promise<void> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: getJarvisSystemInstruction(), // Use the centralized system instruction
      },
    });

    const stream = await chat.sendMessageStream({
      message: userMessage,
    });

    for await (const chunk of stream) {
      onChunkReceived(chunk);
    }
  } catch (error) {
    onChunkReceived({ text: handleGeminiError(error) } as GenerateContentResponse);
  }
}

/**
 * Generates an image based on a text prompt and aspect ratio using Imagen.
 * @param prompt The text prompt for image generation.
 * @param aspectRatio The desired aspect ratio for the image.
 * @returns A Promise that resolves with the base64 image data or an error message.
 */
export async function generateImage(
  prompt: string,
  aspectRatio: string,
): Promise<{ imageUrl: string } | string> {
  try {
    await ensureApiKeySelected(); // Veo model requires key selection, general for image gen.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateImages({
      model: MODELS.IMAGEN_4_GENERATE,
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: aspectRatio,
      },
    });

    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    return { imageUrl: `data:image/jpeg;base64,${base64ImageBytes}` };
  } catch (error) {
    return handleGeminiError(error);
  }
}

/**
 * Edits an image based on a text prompt using Gemini 2.5 Flash Image.
 * @param imageData The base64 data of the original image.
 * @param mimeType The MIME type of the original image.
 * @param prompt The text prompt for image editing.
 * @returns A Promise that resolves with the base64 edited image data or an error message.
 */
export async function editImage(
  imageData: string,
  mimeType: string,
  prompt: string,
): Promise<{ imageUrl: string } | string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: MODELS.GEMINI_FLASH_IMAGE,
      contents: {
        parts: [
          {
            inlineData: {
              data: imageData,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const editedImagePart = response.candidates?.[0]?.content?.parts?.[0];
    if (editedImagePart?.inlineData) {
      const base64ImageBytes: string = editedImagePart.inlineData.data;
      return { imageUrl: `data:${editedImagePart.inlineData.mimeType};base64,${base64ImageBytes}` };
    }
    return `${JARVIS_ERROR_PREFIX} Image editing operation did not return a valid image.`;
  } catch (error) {
    return handleGeminiError(error);
  }
}

/**
 * Analyzes an image with an optional text prompt using Gemini 2.5 Flash.
 * @param imageData The base64 data of the image.
 * @param mimeType The MIME type of the image.
 * @param prompt An optional text prompt for analysis.
 * @returns A Promise that resolves with the analysis text or an error message.
 */
export async function analyzeImage(
  imageData: string,
  mimeType: string,
  prompt?: string,
): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // Use the `Content` type structure for multi-modal input
    const contents: Content = {
      parts: [
        {
          inlineData: {
            data: imageData,
            mimeType: mimeType,
          },
        },
      ],
    };

    if (prompt) {
      contents.parts.push({ text: prompt });
    }

    const response = await ai.models.generateContent({
      model: MODELS.GEMINI_FLASH,
      contents: contents,
    });

    const analysis = response.text;
    return `${getJarvisPrefix()} ${analysis}`;
  } catch (error) {
    return handleGeminiError(error);
  }
}

/**
 * Performs a Google Search grounded query using Gemini 2.5 Flash.
 * @param query The search query.
 * @returns A Promise that resolves with the search result text and grounding URLs or an error message.
 */
export async function searchGrounding(
  query: string,
): Promise<{ text: string; groundingUrls: Array<{ uri: string; title: string }> } | string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: MODELS.GEMINI_FLASH,
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const groundingUrls: Array<{ uri: string; title: string }> = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      for (const chunk of response.candidates[0].groundingMetadata.groundingChunks) {
        if (chunk.web) {
          groundingUrls.push({ uri: chunk.web.uri, title: chunk.web.title || 'Untitled Source' });
        }
      }
    }

    const resultText = response.text;
    return { text: `${getJarvisPrefix()} ${resultText}`, groundingUrls };
  } catch (error) {
    return handleGeminiError(error);
  }
}

/**
 * Performs a Google Maps grounded query using Gemini 2.5 Flash.
 * @param query The maps query.
 * @param coordinates Optional user coordinates for location-aware queries.
 * @returns A Promise that resolves with the maps result text and grounding URLs or an error message.
 */
export async function mapsGrounding(
  query: string,
  coordinates?: Coordinates,
): Promise<{ text: string; groundingUrls: Array<{ uri: string; title: string }> } | string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const config: any = {
      tools: [{ googleMaps: {} }],
    };
    if (coordinates) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
          },
        },
      };
    }

    const response = await ai.models.generateContent({
      model: MODELS.GEMINI_FLASH,
      contents: query,
      config: config,
    });

    const groundingUrls: Array<{ uri: string; title: string }> = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      for (const chunk of response.candidates[0].groundingMetadata.groundingChunks) {
        if (chunk.maps) {
          groundingUrls.push({ uri: chunk.maps.uri, title: chunk.maps.title || 'Untitled Place' });
        }
        // Add Array.isArray check for placeAnswerSources before iterating
        if (chunk.maps?.placeAnswerSources && Array.isArray(chunk.maps.placeAnswerSources)) {
          chunk.maps.placeAnswerSources.forEach(source => {
            if (source.reviewSnippets) {
              source.reviewSnippets.forEach(snippet => {
                if (snippet.uri) {
                  groundingUrls.push({ uri: snippet.uri, title: `Review: ${snippet.review}` || 'Review Snippet' });
                }
              });
            }
          });
        }
      }
    }

    const resultText = response.text;
    return { text: `${getJarvisPrefix()} ${resultText}`, groundingUrls };
  } catch (error) {
    return handleGeminiError(error);
  }
}

/**
 * Handles complex queries using Gemini 2.5 Pro with thinking mode enabled.
 * @param prompt The complex query.
 * @returns A Promise that resolves with the response text or an error message.
 */
export async function queryWithThinkingMode(prompt: string): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: MODELS.GEMINI_PRO,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }, // Max budget for 2.5-pro
      },
    });

    const resultText = response.text;
    return `${getJarvisPrefix()} ${resultText}`;
  } catch (error) {
    return handleGeminiError(error);
  }
}

/**
 * Converts text to speech using Gemini 2.5 Flash TTS.
 * @param text The text to convert.
 * @param voiceName The name of the prebuilt voice to use (e.g., 'Zephyr', 'Kore').
 * @returns A Promise that resolves with the base64 audio data or an error message.
 */
export async function textToSpeech(text: string, voiceName: string): Promise<{ audioData: string, mimeType: string } | string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: MODELS.GEMINI_FLASH_TTS,
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const audioPart = response.candidates?.[0]?.content?.parts?.[0];
    if (audioPart?.inlineData) {
      return {
        audioData: audioPart.inlineData.data,
        mimeType: audioPart.inlineData.mimeType || 'audio/x-pcm', // Default to raw PCM if not specified
      };
    }
    return `${JARVIS_ERROR_PREFIX} Text-to-speech operation did not return valid audio data.`;
  } catch (error) {
    return handleGeminiError(error);
  }
}

/**
 * Transcribes audio input using Gemini 2.5 Flash.
 * @param audioData The base64 encoded audio data.
 * @param mimeType The MIME type of the audio data.
 * @returns A Promise that resolves with the transcription text or an error message.
 */
export async function transcribeAudio(audioData: string, mimeType: string): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: MODELS.GEMINI_FLASH,
      contents: {
        parts: [{
          inlineData: {
            data: audioData,
            mimeType: mimeType,
          }
        }]
      },
      config: {
        responseModalities: [Modality.TEXT],
      }
    });
    return `${getJarvisPrefix()} Transcription: ${response.text}`;
  } catch (error) {
    return handleGeminiError(error);
  }
}

// --- Task Management Functions ---

/**
 * Function declarations for task management.
 */
const createTaskDeclaration: FunctionDeclaration = {
  name: 'createTask',
  parameters: {
    type: Type.OBJECT,
    description: 'Create a new task with a description and due date.',
    properties: {
      description: {
        type: Type.STRING,
        description: 'The description of the task.',
      },
      dueDate: {
        type: Type.STRING,
        description: 'The due date of the task in YYYY-MM-DD format.',
      },
    },
    required: ['description', 'dueDate'],
  },
};

const listTasksDeclaration: FunctionDeclaration = {
  name: 'listTasks',
  parameters: {
    type: Type.OBJECT,
    description: 'List all tasks or filter by status or due date.',
    properties: {
      status: {
        type: Type.STRING,
        description: 'Optional. Filter tasks by status (pending, in_progress, completed).',
        enum: Object.values(TaskStatus),
      },
      dueDate: {
        type: Type.STRING,
        description: 'Optional. Filter tasks by due date in YYYY-MM-DD format.',
      },
    },
  },
};

const updateTaskDeclaration: FunctionDeclaration = {
  name: 'updateTask',
  parameters: {
    type: Type.OBJECT,
    description: 'Update an existing task identified by its ID.',
    properties: {
      id: {
        type: Type.STRING,
        description: 'The ID of the task to update (e.g., "TSK-001").',
      },
      description: {
        type: Type.STRING,
        description: 'Optional. The new description for the task.',
      },
      dueDate: {
        type: Type.STRING,
        description: 'Optional. The new due date for the task in YYYY-MM-DD format.',
      },
      status: {
        type: Type.STRING,
        description: 'Optional. The new status for the task (pending, in_progress, completed).',
        enum: Object.values(TaskStatus),
      },
    },
    required: ['id'],
  },
};

const deleteTaskDeclaration: FunctionDeclaration = {
  name: 'deleteTask',
  parameters: {
    type: Type.OBJECT,
    description: 'Delete a task identified by its ID.',
    properties: {
      id: {
        type: Type.STRING,
        description: 'The ID of the task to delete (e.g., "TSK-001").',
      },
    },
    required: ['id'],
  },
};

/**
 * Processes a user's task management command using Gemini's function calling.
 * @param userQuery The user's command related to tasks.
 * @returns A Promise that resolves with J.A.R.V.I.S.'s response or an error message.
 */
export async function handleTaskCommand(userQuery: string): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = MODELS.GEMINI_FLASH;

    // Send the user query to Gemini with the task management tools
    const response = await ai.models.generateContent({
      model: model,
      contents: userQuery,
      config: {
        systemInstruction: getJarvisSystemInstruction(),
        tools: [{
          functionDeclarations: [
            createTaskDeclaration,
            listTasksDeclaration,
            updateTaskDeclaration,
            deleteTaskDeclaration,
          ],
        }],
      },
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      const functionCalls = response.functionCalls;
      let toolResponses: any[] = [];
      let finalMessage = '';

      for (const fc of functionCalls) {
        let toolResult: any;
        let serviceResponse;

        switch (fc.name) {
          case 'createTask':
            serviceResponse = TaskService.createTask(fc.args.description, fc.args.dueDate);
            toolResult = { message: serviceResponse.message, data: serviceResponse.data };
            finalMessage += `${getJarvisPrefix()} ${serviceResponse.message}`;
            break;
          case 'listTasks':
            serviceResponse = TaskService.listTasks(fc.args.status as TaskStatus, fc.args.dueDate);
            if (serviceResponse.success && serviceResponse.data && serviceResponse.data.length > 0) {
              const taskList = serviceResponse.data.map(task =>
                `ID: ${task.id}, Description: ${task.description}, Due: ${task.dueDate}, Status: ${task.status}`
              ).join('\n');
              toolResult = { message: 'Tasks retrieved successfully.', tasks: serviceResponse.data };
              finalMessage += `${getJarvisPrefix()} Task roster:\n${taskList}`;
            } else {
              toolResult = { message: serviceResponse.message };
              finalMessage += `${getJarvisPrefix()} ${serviceResponse.message}`;
            }
            break;
          case 'updateTask':
            serviceResponse = TaskService.updateTask(fc.args.id, fc.args.description, fc.args.dueDate, fc.args.status as TaskStatus);
            toolResult = { message: serviceResponse.message, data: serviceResponse.data };
            finalMessage += `${getJarvisPrefix()} ${serviceResponse.message}`;
            break;
          case 'deleteTask':
            serviceResponse = TaskService.deleteTask(fc.args.id);
            toolResult = { message: serviceResponse.message };
            finalMessage += `${getJarvisPrefix()} ${serviceResponse.message}`;
            break;
          default:
            toolResult = { message: `${JARVIS_ERROR_PREFIX} Unrecognized function call: ${fc.name}.` };
            finalMessage += `${JARVIS_ERROR_PREFIX} Unrecognized function call: ${fc.name}.`;
        }

        toolResponses.push({
          id: fc.id, // Use the ID from the function call
          name: fc.name,
          response: { result: toolResult },
        });
      }

      // Send the tool responses back to Gemini to get a final natural language response
      const toolResponse = await ai.models.generateContent({
        model: model,
        contents: [
          {
            parts: [{ text: userQuery }],
            role: 'user',
          },
          {
            parts: functionCalls.map(fc => ({ functionCall: fc })),
            role: 'model',
          },
          {
            parts: toolResponses.map(tr => ({ functionResponse: tr })),
            role: 'tool',
          }
        ],
        config: {
          systemInstruction: getJarvisSystemInstruction(),
          tools: [{
            functionDeclarations: [
              createTaskDeclaration,
              listTasksDeclaration,
              updateTaskDeclaration,
              deleteTaskDeclaration,
            ],
          }],
        },
      });

      // Prefer the model's final response if available, otherwise use our immediate message
      return toolResponse.text ? `${getJarvisPrefix()} ${toolResponse.text}` : finalMessage;

    } else {
      // If no function calls, Gemini provides a direct text response
      return `${getJarvisPrefix()} ${response.text}`;
    }
  } catch (error) {
    return handleGeminiError(error);
  }
}


interface LiveAssistantCallbacks {
  onTranscription: (text: string, isUser: boolean) => void;
  onAudioPlayback: () => void; // Modified: no longer passes audioBuffer
  onError: (error: string) => void;
  onClose: () => void;
}

interface LiveAssistantState {
  isConnecting: boolean;
  isConnected: boolean;
  transcriptionHistory: ChatMessage[];
  currentInputTranscription: string;
  currentOutputTranscription: string;
  microphoneStream: MediaStream | null;
  inputAudioContext: AudioContext | null;
  outputAudioContext: AudioContext | null;
  inputScriptProcessor: ScriptProcessorNode | null;
  inputAudioSource: MediaStreamAudioSourceNode | null;
  outputGainNode: GainNode | null;
  playbackNextStartTime: number;
  activeAudioSources: Set<AudioBufferSourceNode>;
  sessionPromise: Promise<any> | null; // Use any for simplicity due to dynamic session type
}

/**
 * Establishes and manages a real-time voice conversation session with Gemini Live API.
 * This is a stateful service that interacts directly with the DOM for audio.
 */
export const LiveAssistantService = {
  state: {
    isConnecting: false,
    isConnected: false,
    transcriptionHistory: [],
    currentInputTranscription: '',
    currentOutputTranscription: '',
    microphoneStream: null,
    inputAudioContext: null,
    outputAudioContext: null,
    inputScriptProcessor: null,
    inputAudioSource: null,
    outputGainNode: null,
    playbackNextStartTime: 0,
    activeAudioSources: new Set<AudioBufferSourceNode>(),
    sessionPromise: null,
  } as LiveAssistantState,

  callbacks: {
    onTranscription: (text: string, isUser: boolean) => {},
    onAudioPlayback: () => {},
    onError: (error: string) => {},
    onClose: () => {},
  } as LiveAssistantCallbacks,

  init: (cb: LiveAssistantCallbacks) => {
    LiveAssistantService.callbacks = cb;
  },

  /**
   * Starts the real-time conversation session.
   */
  startConversation: async (): Promise<void> => {
    if (LiveAssistantService.state.isConnected || LiveAssistantService.state.isConnecting) {
      console.log("J.A.R.V.I.S. reports: Live session is already active or in connection phase.");
      LiveAssistantService.callbacks.onError(`${JARVIS_ERROR_PREFIX} Live session already in progress.`);
      return;
    }

    LiveAssistantService.state.isConnecting = true;
    LiveAssistantService.state.transcriptionHistory = [];
    LiveAssistantService.state.currentInputTranscription = '';
    LiveAssistantService.state.currentOutputTranscription = '';
    LiveAssistantService.state.playbackNextStartTime = 0;
    LiveAssistantService.state.activeAudioSources.clear();

    try {
      // 1. Get microphone access
      LiveAssistantService.state.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      LiveAssistantService.state.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      LiveAssistantService.state.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      LiveAssistantService.state.outputGainNode = LiveAssistantService.state.outputAudioContext.createGain();
      LiveAssistantService.state.outputGainNode.connect(LiveAssistantService.state.outputAudioContext.destination);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // 2. Connect to Live API
      LiveAssistantService.state.sessionPromise = ai.live.connect({
        model: MODELS.GEMINI_FLASH_NATIVE_AUDIO,
        callbacks: {
          onopen: () => {
            console.debug('J.A.R.V.I.S. reports: Live session established.');
            LiveAssistantService.state.isConnected = true;
            LiveAssistantService.state.isConnecting = false;
            // 3. Stream audio from microphone to model
            if (LiveAssistantService.state.inputAudioContext && LiveAssistantService.state.microphoneStream) {
              LiveAssistantService.state.inputAudioSource = LiveAssistantService.state.inputAudioContext.createMediaStreamSource(LiveAssistantService.state.microphoneStream);
              LiveAssistantService.state.inputScriptProcessor = LiveAssistantService.state.inputAudioContext.createScriptProcessor(4096, 1, 1);
              LiveAssistantService.state.inputScriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                const pcmBlob = createPcmBlob(inputData);
                LiveAssistantService.state.sessionPromise?.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              };
              LiveAssistantService.state.inputAudioSource.connect(LiveAssistantService.state.inputScriptProcessor);
              LiveAssistantService.state.inputScriptProcessor.connect(LiveAssistantService.state.inputAudioContext.destination);
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            // Process transcription
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              if (text) {
                LiveAssistantService.state.currentOutputTranscription += text;
                LiveAssistantService.callbacks.onTranscription(LiveAssistantService.state.currentOutputTranscription, false);
              }
            } else if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              if (text) {
                LiveAssistantService.state.currentInputTranscription += text;
                LiveAssistantService.callbacks.onTranscription(LiveAssistantService.state.currentInputTranscription, true);
              }
            }

            if (message.serverContent?.turnComplete) {
              const userTurn: ChatMessage = {
                id: `user-${Date.now()}-live`,
                sender: 'user',
                text: LiveAssistantService.state.currentInputTranscription.trim(),
              };
              const jarvisTurn: ChatMessage = {
                id: `jarvis-${Date.now()}-live`,
                sender: 'jarvis',
                text: `${getJarvisPrefix()} ${LiveAssistantService.state.currentOutputTranscription.trim()}`,
              };
              LiveAssistantService.state.transcriptionHistory.push(userTurn, jarvisTurn);
              LiveAssistantService.state.currentInputTranscription = '';
              LiveAssistantService.state.currentOutputTranscription = '';
            }

            // Process audio output
            const base64EncodedAudioString = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64EncodedAudioString && LiveAssistantService.state.outputAudioContext && LiveAssistantService.state.outputGainNode) {
              const audioBuffer = await decodeAudioData(
                decodeBase64(base64EncodedAudioString),
                LiveAssistantService.state.outputAudioContext,
                24000, // Sample rate of model's output audio
                1,     // Number of channels
              );
              LiveAssistantService.state.playbackNextStartTime = playAudioBuffer(
                audioBuffer,
                LiveAssistantService.state.outputAudioContext,
                LiveAssistantService.state.outputGainNode,
                LiveAssistantService.state.playbackNextStartTime,
                LiveAssistantService.state.activeAudioSources,
              );
              LiveAssistantService.callbacks.onAudioPlayback();
            }

            // Handle interruption
            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              LiveAssistantService.state.activeAudioSources.forEach(source => {
                source.stop();
              });
              LiveAssistantService.state.activeAudioSources.clear();
              LiveAssistantService.state.playbackNextStartTime = 0;
            }

            // Handle tool calls (if any)
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                console.debug('J.A.R.V.I.S. reports: Function call requested: ', fc);
                // In a real application, you would execute the function here.
                // For this example, we return a simple "ok" result.
                const result = "Function executed successfully. Data processed.";
                LiveAssistantService.state.sessionPromise?.then((session) => {
                  session.sendToolResponse({
                    functionResponses: {
                      id: fc.id,
                      name: fc.name,
                      response: { result: result },
                    }
                  });
                });
              }
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('J.A.R.V.I.S. reports: Live session error: ', e);
            // Fix: Explicitly cast the template literal to string to resolve potential compiler inference issues with 'unknown' in template expressions.
            LiveAssistantService.callbacks.onError((`${JARVIS_ERROR_PREFIX} Live session encountered an error: ${formatErrorForUI(e)}`) as string);
            LiveAssistantService.stopConversation();
          },
          onclose: (e: CloseEvent) => {
            console.debug('J.A.R.V.I.S. reports: Live session terminated. Code:', e.code, 'Reason:', e.reason);
            LiveAssistantService.callbacks.onClose();
            LiveAssistantService.stopConversation(); // Clean up on close
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }, // Default voice for J.A.R.V.I.S.
          },
          systemInstruction: getJarvisSystemInstruction(),
          outputAudioTranscription: {}, // Enable transcription for model output audio.
          inputAudioTranscription: {}, // Enable transcription for user input audio.
          // Example of a function declaration for Live API
          tools: [{
            functionDeclarations: [{
              name: 'controlLight',
              parameters: {
                type: Type.OBJECT,
                description: 'Set the brightness and color temperature of a room light.',
                properties: {
                  brightness: {
                    type: Type.NUMBER,
                    description: 'Light level from 0 to 100. Zero is off and 100 is full brightness.',
                  },
                  colorTemperature: {
                    type: Type.STRING,
                    description: 'Color temperature of the light fixture such as `daylight`, `cool` or `warm`.',
                  },
                },
                required: ['brightness', 'colorTemperature'],
              },
            }],
          }],
        },
      });
    } catch (error) {
      console.error("J.A.R.V.I.S. reports: Failed to initiate live session: ", error);
      // Fix: Explicitly cast the template literal to string to resolve potential compiler inference issues with 'unknown' in template expressions.
      LiveAssistantService.callbacks.onError((`${JARVIS_ERROR_PREFIX} Failed to start live session: ${formatErrorForUI(error)}`) as string);
      LiveAssistantService.state.isConnecting = false;
      LiveAssistantService.state.isConnected = false;
      LiveAssistantService.stopConversation(); // Ensure cleanup
    }
  },

  /**
   * Stops the real-time conversation session and cleans up resources.
   */
  stopConversation: (): void => {
    if (LiveAssistantService.state.microphoneStream) {
      LiveAssistantService.state.microphoneStream.getTracks().forEach(track => track.stop());
      LiveAssistantService.state.microphoneStream = null;
    }
    if (LiveAssistantService.state.inputAudioContext) {
      LiveAssistantService.state.inputAudioContext.close();
      LiveAssistantService.state.inputAudioContext = null;
    }
    if (LiveAssistantService.state.outputAudioContext) {
      LiveAssistantService.state.outputAudioContext.close();
      LiveAssistantService.state.outputAudioContext = null;
    }
    if (LiveAssistantService.state.inputScriptProcessor) {
      LiveAssistantService.state.inputScriptProcessor.disconnect();
      LiveAssistantService.state.inputScriptProcessor.onaudioprocess = null;
      LiveAssistantService.state.inputScriptProcessor = null;
    }
    if (LiveAssistantService.state.inputAudioSource) {
      LiveAssistantService.state.inputAudioSource.disconnect();
      LiveAssistantService.state.inputAudioSource = null;
    }
    if (LiveAssistantService.state.outputGainNode) {
      LiveAssistantService.state.outputGainNode.disconnect();
      LiveAssistantService.state.outputGainNode = null;
    }
    LiveAssistantService.state.activeAudioSources.forEach(source => {
      source.stop();
    });
    LiveAssistantService.state.activeAudioSources.clear();
    LiveAssistantService.state.playbackNextStartTime = 0;

    // Close the session if it was established
    LiveAssistantService.state.sessionPromise?.then((session) => {
      session.close();
      LiveAssistantService.state.sessionPromise = null;
    });

    LiveAssistantService.state.isConnected = false;
    LiveAssistantService.state.isConnecting = false;
    console.debug('J.A.R.V.I.S. reports: Live session resources deallocated.');
  },

  /**
   * Returns the current connection status.
   */
  getConnectionStatus: () => ({
    isConnecting: LiveAssistantService.state.isConnecting,
    isConnected: LiveAssistantService.state.isConnected,
    transcriptionHistory: LiveAssistantService.state.transcriptionHistory,
    currentInputTranscription: LiveAssistantService.state.currentInputTranscription,
    currentOutputTranscription: LiveAssistantService.state.currentOutputTranscription,
  }),
};