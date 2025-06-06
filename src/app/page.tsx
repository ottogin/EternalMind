'use client';

import { useState, useRef, useEffect } from 'react';
import numbersChapter from '../data/chapters/numbers.json';
import arithmeticChapter from '../data/chapters/arithmetic.json';
import dictionary from '../data/dictionary.json';

type Chapter = typeof numbersChapter;
type Lesson = Chapter['lessons'][0];

const chapters = [numbersChapter, arithmeticChapter];

export default function Home() {
  const [selectedChapter, setSelectedChapter] = useState<Chapter>(chapters[0]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson>(chapters[0].lessons[0]);
  const [viewMode, setViewMode] = useState('text');
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);
  const [dictionarySearch, setDictionarySearch] = useState('');
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const convertToBinary = (text: string) => {
    return text.split('').map(char => 
      char.charCodeAt(0).toString(2).padStart(8, '0')
    );
  };

  const getDisplayMessage = (text: string): string | string[] => {
    switch (viewMode) {
      case 'binary':
        return convertToBinary(text);
      case 'text':
      default:
        return text;
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
      const originalChar = selectedLesson.lines[0].encoded[index];
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black text-white p-4">
      <h1 className="text-3xl font-bold text-center mb-4 text-blue-400">
        Interstellar Communication Protocol
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-7xl mx-auto">
        {/* Left Side */}
        <div className="space-y-4">
          <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex space-x-4 mb-3 overflow-x-auto pb-2">
              {chapters.map((chapter) => (
                <button
                  key={chapter.title}
                  onClick={() => {
                    setSelectedChapter(chapter);
                    setSelectedLesson(chapter.lessons[0]);
                  }}
                  className={`px-3 py-1.5 rounded whitespace-nowrap text-sm ${
                    selectedChapter.title === chapter.title
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  {chapter.title}
                </button>
              ))}
            </div>

            <div className="h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-2">
                {selectedChapter.lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    onClick={() => setSelectedLesson(lesson)}
                    className={`p-2 rounded cursor-pointer transition-all duration-200 ${
                      selectedLesson.id === lesson.id
                        ? 'bg-blue-500/20 border border-blue-500'
                        : 'bg-slate-700/50 hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="text-sm font-semibold">{lesson.title}</h3>
                      <span className="text-xs text-gray-400">{lesson.id}</span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-1">{lesson.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex space-x-3">
                <button
                  onClick={() => setViewMode('text')}
                  className={`px-3 py-1.5 rounded text-sm ${
                    viewMode === 'text'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  Text
                </button>
                <button
                  onClick={() => setViewMode('binary')}
                  className={`px-3 py-1.5 rounded text-sm ${
                    viewMode === 'binary'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  Binary
                </button>
              </div>
              <div className="text-sm text-gray-400">
                Signal Console
              </div>
            </div>
            <div className="bg-black p-3 rounded font-mono text-green-400 h-[300px] overflow-auto">
              <div className="space-y-3">
                {selectedLesson.lines.map((line, index) => (
                  <div key={index} className="space-y-0.5">
                    <div className="text-green-400">
                      {viewMode === 'text' 
                        ? renderEncodedText(getDisplayMessage(line.encoded) as string) 
                        : renderBinaryText(getDisplayMessage(line.encoded) as string[])}
                    </div>
                    <div className="text-gray-500 text-sm">
                      {line.decoded}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="space-y-4">
          <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm">
            <h2 className="text-lg font-bold mb-3 text-blue-400">What is learned to this point</h2>
            <div className="mb-3">
              <input
                type="text"
                placeholder="Search symbols or meanings..."
                value={dictionarySearch}
                onChange={(e) => setDictionarySearch(e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-slate-700/50 border border-slate-600 focus:border-blue-500 focus:outline-none text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredDictionary.map(([symbol, meaning]) => (
                <div key={symbol} className="bg-slate-700/50 p-2 rounded">
                  <span className="font-mono text-base">{symbol}</span>
                  <span className="text-gray-400 ml-2">→</span>
                  <span className="ml-2 text-sm">{meaning}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm">
            <h2 className="text-lg font-bold mb-3 text-blue-400">Learning Goals</h2>
            <div className="mb-3">
              <h3 className="text-base font-semibold mb-1">{selectedLesson.title}</h3>
              <p className="text-sm text-gray-400 mb-3">{selectedLesson.goal.description}</p>
              <div className="grid grid-cols-2 gap-3">
                {selectedLesson.goal.symbols.map((symbol) => (
                  <div key={symbol} className="bg-slate-700/50 p-2 rounded">
                    <span className="font-mono text-base">{symbol}</span>
                    <span className="text-gray-400 ml-2">→</span>
                    <span className="ml-2 text-sm">{dictionary[symbol as keyof typeof dictionary]}</span>
                  </div>
                ))}
              </div>
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
            <span className="font-mono text-base">{hoveredSymbol}</span>
            <span className="text-gray-400">→</span>
            <span className="text-sm">{dictionary[hoveredSymbol as keyof typeof dictionary]}</span>
          </div>
        </div>
      )}
    </div>
  );
}
