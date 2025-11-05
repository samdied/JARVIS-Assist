import { AdvancedToolSubTab, ImageToolSubTab, InfoRetrievalSubTab, Tab } from './types';

export const JARVIS_PREFIX = "Indeed, Sir.";
export const JARVIS_ERROR_PREFIX = "System status: Operational anomaly detected.";
export const JARVIS_MAAM_PREFIX = "Understood, Ma'am.";

export const MODELS = {
  GEMINI_FLASH: 'gemini-2.5-flash',
  GEMINI_FLASH_LITE: 'gemini-flash-lite-latest',
  GEMINI_PRO: 'gemini-2.5-pro',
  IMAGEN_4_GENERATE: 'imagen-4.0-generate-001',
  GEMINI_FLASH_IMAGE: 'gemini-2.5-flash-image',
  GEMINI_FLASH_NATIVE_AUDIO: 'gemini-2.5-flash-native-audio-preview-09-2025',
  GEMINI_FLASH_TTS: 'gemini-2.5-flash-preview-tts',
  VEO_FAST_GENERATE: 'veo-3.1-fast-generate-preview',
} as const;

export const MAIN_TABS = [
  { id: Tab.LIVE_ASSISTANT, name: 'Live Assistant' },
  { id: Tab.TEXT_CHAT, name: 'Text Chat' },
  { id: Tab.IMAGE_TOOLS, name: 'Image Tools' },
  { id: Tab.INFORMATION_RETRIEVAL, name: 'Information Retrieval' },
  { id: Tab.ADVANCED_TOOLS, name: 'Advanced Tools' },
  { id: Tab.MANAGEMENT_PROTOCOLS, name: 'Management Protocols' }, // New tab
];

export const IMAGE_TOOL_SUB_TABS = [
  { id: ImageToolSubTab.GENERATE, name: 'Generate' },
  { id: ImageToolSubTab.EDIT, name: 'Edit' },
  { id: ImageToolSubTab.ANALYZE, name: 'Analyze' },
];

export const INFO_RETRIEVAL_SUB_TABS = [
  { id: InfoRetrievalSubTab.SEARCH, name: 'Google Search' },
  { id: InfoRetrievalSubTab.MAPS, name: 'Google Maps' },
];

export const ADVANCED_TOOL_SUB_TABS = [
  { id: AdvancedToolSubTab.THINKING_MODE, name: 'Thinking Mode' },
  { id: AdvancedToolSubTab.TTS, name: 'Text-to-Speech' },
  { id: AdvancedToolSubTab.AUDIO_TRANSCRIPTION, name: 'Audio Transcription' },
];

export const DEFAULT_ASPECT_RATIOS = [
  '1:1', '3:4', '4:3', '9:16', '16:9'
];