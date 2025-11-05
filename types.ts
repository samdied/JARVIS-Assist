export interface ChatMessage {
  id: string;
  sender: 'user' | 'jarvis';
  text: string;
  image?: string; // base64 image data
  isStreaming?: boolean;
  groundingUrls?: Array<{ uri: string; title: string }>;
}

export interface FileData {
  base64: string;
  mimeType: string;
  name: string;
}

export enum Tab {
  LIVE_ASSISTANT = 'LIVE_ASSISTANT',
  TEXT_CHAT = 'TEXT_CHAT',
  IMAGE_TOOLS = 'IMAGE_TOOLS',
  INFORMATION_RETRIEVAL = 'INFORMATION_RETRIEVAL',
  ADVANCED_TOOLS = 'ADVANCED_TOOLS',
  MANAGEMENT_PROTOCOLS = 'MANAGEMENT_PROTOCOLS', // New tab for task management
}

export enum ImageToolSubTab {
  GENERATE = 'GENERATE',
  EDIT = 'EDIT',
  ANALYZE = 'ANALYZE',
}

export enum InfoRetrievalSubTab {
  SEARCH = 'SEARCH',
  MAPS = 'MAPS',
}

export enum AdvancedToolSubTab {
  THINKING_MODE = 'THINKING_MODE',
  TTS = 'TTS',
  AUDIO_TRANSCRIPTION = 'AUDIO_TRANSCRIPTION',
}

export enum AspectRatio {
  ONE_TO_ONE = '1:1',
  THREE_TO_FOUR = '3:4',
  FOUR_TO_THREE = '4:3',
  NINE_TO_SIXTEEN = '9:16',
  SIXTEEN_TO_NINE = '16:9',
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export interface Task {
  id: string;
  description: string;
  dueDate: string; // ISO date string for consistency
  status: TaskStatus;
}