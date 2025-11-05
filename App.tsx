import React, { useState } from 'react';
import { MAIN_TABS, IMAGE_TOOL_SUB_TABS, INFO_RETRIEVAL_SUB_TABS, ADVANCED_TOOL_SUB_TABS } from './constants';
import { Tab, ImageToolSubTab, InfoRetrievalSubTab, AdvancedToolSubTab } from './types';

import LiveAssistant from './components/LiveAssistant';
import TextChat from './components/TextChat';
import ImageGenerator from './components/ImageGenerator';
import ImageEditor from './components/ImageEditor';
import ImageAnalyzer from './components/ImageAnalyzer';
import GoogleSearchGrounding from './components/GoogleSearchGrounding';
import GoogleMapsGrounding from './components/GoogleMapsGrounding';
import ThinkingModeQuery from './components/ThinkingModeQuery';
import TTSUtility from './components/TTSUtility';
import AudioTranscriptionTool from './components/AudioTranscriptionTool';
import TaskMaster from './components/TaskMaster'; // Import new TaskMaster component

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.LIVE_ASSISTANT);
  const [activeImageToolSubTab, setActiveImageToolSubTab] = useState<ImageToolSubTab>(ImageToolSubTab.GENERATE);
  const [activeInfoRetrievalSubTab, setActiveInfoRetrievalSubTab] = useState<InfoRetrievalSubTab>(InfoRetrievalSubTab.SEARCH);
  const [activeAdvancedToolSubTab, setActiveAdvancedToolSubTab] = useState<AdvancedToolSubTab>(AdvancedToolSubTab.THINKING_MODE);

  const renderContent = () => {
    switch (activeTab) {
      case Tab.LIVE_ASSISTANT:
        return <LiveAssistant />;
      case Tab.TEXT_CHAT:
        return <TextChat />;
      case Tab.IMAGE_TOOLS:
        switch (activeImageToolSubTab) {
          case ImageToolSubTab.GENERATE:
            return <ImageGenerator />;
          case ImageToolSubTab.EDIT:
            return <ImageEditor />;
          case ImageToolSubTab.ANALYZE:
            return <ImageAnalyzer />;
          default:
            return <ImageGenerator />;
        }
      case Tab.INFORMATION_RETRIEVAL:
        switch (activeInfoRetrievalSubTab) {
          case InfoRetrievalSubTab.SEARCH:
            return <GoogleSearchGrounding />;
          case InfoRetrievalSubTab.MAPS:
            return <GoogleMapsGrounding />;
          default:
            return <GoogleSearchGrounding />;
        }
      case Tab.ADVANCED_TOOLS:
        switch (activeAdvancedToolSubTab) {
          case AdvancedToolSubTab.THINKING_MODE:
            return <ThinkingModeQuery />;
          case AdvancedToolSubTab.TTS:
            return <TTSUtility />;
          case AdvancedToolSubTab.AUDIO_TRANSCRIPTION:
            return <AudioTranscriptionTool />;
          default:
            return <ThinkingModeQuery />;
        }
      case Tab.MANAGEMENT_PROTOCOLS: // New tab case
        return <TaskMaster />;
      default:
        return <LiveAssistant />;
    }
  };

  const renderSubTabs = (currentTab: Tab) => {
    let subTabs;
    let activeSubTab;
    let setActiveSubTab: (tab: any) => void;

    switch (currentTab) {
      case Tab.IMAGE_TOOLS:
        subTabs = IMAGE_TOOL_SUB_TABS;
        activeSubTab = activeImageToolSubTab;
        setActiveSubTab = setActiveImageToolSubTab;
        break;
      case Tab.INFORMATION_RETRIEVAL:
        subTabs = INFO_RETRIEVAL_SUB_TABS;
        activeSubTab = activeInfoRetrievalSubTab;
        setActiveSubTab = setActiveInfoRetrievalSubTab;
        break;
      case Tab.ADVANCED_TOOLS:
        subTabs = ADVANCED_TOOL_SUB_TABS;
        activeSubTab = activeAdvancedToolSubTab;
        setActiveSubTab = setActiveAdvancedToolSubTab;
        break;
      case Tab.MANAGEMENT_PROTOCOLS: // No sub-tabs for TaskMaster currently
        return null;
      default:
        return null;
    }

    return (
      <div className="flex space-x-2 mt-4 mb-4 border-b border-gray-700 pb-2 overflow-x-auto custom-scrollbar">
        {subTabs.map((subTab) => (
          <button
            key={subTab.id}
            onClick={() => setActiveSubTab(subTab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200
              ${activeSubTab === subTab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
          >
            {subTab.name}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 p-4 shadow-md sticky top-0 z-10 border-b border-gray-700">
        <h1 className="text-3xl font-extrabold text-blue-500 text-center">J.A.R.V.I.S. Absolute Mode</h1>
      </header>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <nav className="w-full md:w-64 bg-gray-800 p-4 border-r border-gray-700 overflow-y-auto custom-scrollbar flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-200 mb-4">Protocols</h2>
          <ul className="space-y-2">
            {MAIN_TABS.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`block w-full text-left px-4 py-2 rounded-lg transition-colors duration-200
                    ${activeTab === tab.id
                      ? 'bg-blue-700 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                    }`}
                >
                  {tab.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main Content Pane */}
        <main className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-gray-900 flex flex-col">
          {renderSubTabs(activeTab)}
          <div className="flex-1 min-h-0"> {/* flex-1 min-h-0 ensures content grows/scrolls within its bounds */}
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 p-3 text-center text-gray-400 text-sm border-t border-gray-700 sticky bottom-0 z-10">
        <p>&copy; {new Date().getFullYear()} J.A.R.V.I.S. Absolute Mode. All systems nominal.</p>
      </footer>
    </div>
  );
};

export default App;