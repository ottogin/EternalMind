'use client';

import { useState, useRef, useEffect } from 'react';
import messages from '../data/messages.json';
import dictionary from '../data/dictionary.json';

export default function Home() {
  const [selectedLesson, setSelectedLesson] = useState('Lesson1. Numbers');
  const [viewMode, setViewMode] = useState('text');
  const [selectedMessage, setSelectedMessage] = useState(0);
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);
  const [dictionarySearch, setDictionarySearch] = useState('');
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentMessages = messages[selectedLesson as keyof typeof messages];
  const currentMessage = currentMessages[selectedMessage];

  const convertToBinary = (text: string) => {
    return text.split('').map(char => 
      char.charCodeAt(0).toString(2).padStart(8, '0')
    );
  };

  const getDisplayMessage = (): string | string[] => {
    switch (viewMode) {
      case 'binary':
        return convertToBinary(currentMessage.encoded);
      case 'text':
      default:
        return currentMessage.encoded;
    }
  };

  const filteredDictionary = Object.entries(dictionary).filter(([symbol, meaning]) => 
    symbol.toLowerCase().includes(dictionarySearch.toLowerCase()) ||
    meaning.toLowerCase().includes(dictionarySearch.toLowerCase())
  );

  const handleSymbolHover = (symbol: string, event: React.MouseEvent) => {
    setHoveredSymbol(symbol);
    setHoverPosition({ x: event.clientX, y: event.clientY });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (hoveredSymbol && tooltipRef.current) {
        setHoverPosition({ x: e.clientX, y: e.clientY });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [hoveredSymbol]);

  const renderEncodedText = (text: string) => {
    return text.split('').map((char, index) => (
      <span
        key={index}
        className="cursor-help hover:text-blue-400 transition-colors"
        onMouseEnter={(e) => handleSymbolHover(char, e)}
        onMouseLeave={() => setHoveredSymbol(null)}
      >
        {char}
      </span>
    ));
  };

  const renderBinaryText = (binaryArray: string[]) => {
    return binaryArray.map((binary, index) => {
      const originalChar = currentMessage.encoded[index];
      return (
        <span
          key={index}
          className="cursor-help hover:text-blue-400 transition-colors"
          onMouseEnter={(e) => handleSymbolHover(originalChar, e)}
          onMouseLeave={() => setHoveredSymbol(null)}
        >
          {binary}
          {index < binaryArray.length - 1 && ' '}
        </span>
      );
    });
  };

  const displayMessage = getDisplayMessage();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black text-white p-8">
      <h1 className="text-4xl font-bold text-center mb-8 text-blue-400">
        Interstellar Communication Protocol
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-7xl mx-auto">
        {/* Left Side */}
        <div className="space-y-6">
          <div className="bg-slate-800/50 rounded-lg p-6 backdrop-blur-sm">
            <div className="flex space-x-4 mb-4">
              {Object.keys(messages).map((lesson) => (
                <button
                  key={lesson}
                  onClick={() => setSelectedLesson(lesson)}
                  className={`px-4 py-2 rounded ${
                    selectedLesson === lesson
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  {lesson}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {currentMessages.map((msg, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedMessage(index)}
                  className={`p-4 rounded cursor-pointer ${
                    selectedMessage === index
                      ? 'bg-blue-500/20 border border-blue-500'
                      : 'bg-slate-700/50 hover:bg-slate-700'
                  }`}
                >
                  <div className="font-mono">{renderEncodedText(msg.encoded)}</div>
                  <div className="text-sm text-gray-400">{msg.decoded}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-6 backdrop-blur-sm">
            <div className="flex space-x-4 mb-4">
              <button
                onClick={() => setViewMode('text')}
                className={`px-4 py-2 rounded ${
                  viewMode === 'text'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                Text
              </button>
              <button
                onClick={() => setViewMode('binary')}
                className={`px-4 py-2 rounded ${
                  viewMode === 'binary'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                Binary
              </button>
            </div>
            <div className="bg-black p-4 rounded font-mono text-green-400 h-32 overflow-auto">
              {viewMode === 'text' 
                ? renderEncodedText(displayMessage as string) 
                : renderBinaryText(displayMessage as string[])}
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="space-y-6">
          <div className="bg-slate-800/50 rounded-lg p-6 backdrop-blur-sm">
            <h2 className="text-xl font-bold mb-4 text-blue-400">Symbol Dictionary</h2>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search symbols or meanings..."
                value={dictionarySearch}
                onChange={(e) => setDictionarySearch(e.target.value)}
                className="w-full px-4 py-2 rounded bg-slate-700/50 border border-slate-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredDictionary.map(([symbol, meaning]) => (
                <div key={symbol} className="bg-slate-700/50 p-3 rounded">
                  <span className="font-mono text-lg">{symbol}</span>
                  <span className="text-gray-400 ml-2">→</span>
                  <span className="ml-2">{meaning}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-6 backdrop-blur-sm">
            <h2 className="text-xl font-bold mb-4 text-blue-400">Translated Message</h2>
            <div className="bg-black p-4 rounded font-mono text-green-400 h-32 overflow-auto">
              {currentMessage.decoded}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredSymbol && dictionary[hoveredSymbol as keyof typeof dictionary] && (
        <div
          ref={tooltipRef}
          className="fixed z-50 bg-slate-800 border border-blue-500 rounded-lg p-2 shadow-lg pointer-events-none"
          style={{
            left: hoverPosition.x + 15,
            top: hoverPosition.y + 15,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg">{hoveredSymbol}</span>
            <span className="text-gray-400">→</span>
            <span>{dictionary[hoveredSymbol as keyof typeof dictionary]}</span>
          </div>
        </div>
      )}
    </div>
  );
}
