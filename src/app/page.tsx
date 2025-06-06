'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
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
  const [showTranslation, setShowTranslation] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [sentPrompt, setSentPrompt] = useState('');
  const [feedbackPrompt, setFeedbackPrompt] = useState('');
  const [feedbackResponse, setFeedbackResponse] = useState('');
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [messageDiff, setMessageDiff] = useState<{ original: string; updated: string } | null>(null);

  const { error } = useChat({
    api: '/api/chat',
    onError: (error) => {
      console.error('Chat error:', error);
    }
  });

  const convertToBinary = (text: string) => {
    return text.split('').map(char => 
      char.charCodeAt(0).toString(2).padStart(8, '0')
    );
  };

  const createBinaryImage = (text: string) => {
    // Convert text to one long binary string
    const binaryArray = convertToBinary(text);
    const binaryString = binaryArray.join('');
    
    // Calculate dimensions
    const width = 17; // Fixed width as requested
    const height = Math.ceil(binaryString.length / width);
    
    // Pad the binary string to fit the grid perfectly
    const paddedBinary = binaryString.padEnd(width * height, '0');
    
    // Create the image grid
    const rows: string[] = [];
    for (let i = 0; i < height; i++) {
      const row = paddedBinary.slice(i * width, (i + 1) * width)
        .split('')
        .map(bit => bit === '1' ? '█' : '░')
        .join('');
      rows.push(row);
    }
    
    return rows;
  };

  const getDisplayMessage = (text: string): string | string[] => {
    switch (viewMode) {
      case 'binary':
        return convertToBinary(text);
      case 'image':
        return createBinaryImage(text);
      case 'text':
      default:
        return text;
    }
  };

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

  useEffect(() => {
    if (error) {
      console.error('Chat error:', error);
    }
  }, [error]);

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

  const renderBinaryImage = (imageRows: string[]) => {
    return (
      <div className="font-mono whitespace-pre leading-4 tracking-[0.2em]">
        {imageRows.map((row, index) => (
          <div key={index} className="text-center">
            {row}
          </div>
        ))}
      </div>
    );
  };

  const getDictionaryEntries = () => {
    const entries = Object.entries(dictionary);
    const searchLower = dictionarySearch.toLowerCase();
    
    return entries
      .filter(([symbol, meaning]) => 
        symbol.toLowerCase().includes(searchLower) ||
        meaning.toLowerCase().includes(searchLower)
      )
      .map(([symbol, meaning], index) => {
        const isInCurrentRange = index >= selectedLesson.dictionary.start && 
                               index < selectedLesson.dictionary.end;
        const isNewSymbol = index === selectedLesson.dictionary.end - 1;
        const isFutureSymbol = index >= selectedLesson.dictionary.end;
        
        return {
          symbol,
          meaning,
          isInCurrentRange,
          isNewSymbol,
          isFutureSymbol
        };
      });
  };

  const handleCopyToClipboard = async () => {
    const text = selectedLesson.lines
      .map(line => line.encoded)
      .join('\n');
    
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleDecode = async () => {
    console.log('Decode button clicked');
    setIsDecoding(true);
    setAiResponse('');
    setFeedbackResponse('');
    setMessageDiff(null);
    
    const currentDictionary = Object.entries(dictionary)
      .slice(0, selectedLesson.dictionary.start)
      .map(([symbol, meaning]) => `${symbol}: ${meaning}`)
      .join('\n');

    const prompt = `You received a signal from a far-away galaxy. This is what you were able to decode so far:

${currentDictionary}

This is a new portion of the message teaching you something new:
${selectedLesson.lines.map(line => line.encoded).join('\n')}

Detect the new symbols and try to understand what they mean. Provide your reasoning.`;

    setSentPrompt(prompt);
    console.log('Sending prompt:', prompt);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: { prompt } }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      let fullResponse = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = new TextDecoder().decode(value);
        fullResponse += text;
        setAiResponse(prev => prev + text);
      }

      // After getting the AI analysis, generate feedback
      await generateFeedback(fullResponse);
    } catch (error) {
      console.error('Error submitting:', error);
    } finally {
      setIsDecoding(false);
    }
  };

  const generateFeedback = async (aiAnalysis: string) => {
    setIsGeneratingFeedback(true);
    setFeedbackResponse('');
    setMessageDiff(null);

    const originalMessage = selectedLesson.lines.map(line => line.encoded).join('\n');
    const lessonGoals = selectedLesson.goal.symbols
      .map(symbol => `${symbol}: ${dictionary[symbol as keyof typeof dictionary]}`)
      .join('\n');

    const currentDictionary = Object.entries(dictionary)
      .slice(0, selectedLesson.dictionary.start)
      .map(([symbol, meaning]) => `${symbol}: ${meaning}`)
      .join('\n');

    const prompt = `You are an expert in creating clear and educational messages for extraterrestrial beings. 
I have a message that needs to be improved for better understanding.
It contains strange symbols. We know how to decode all of them.
The goal for this message is to teach the following symbols:
${lessonGoals}

All other symbols are already known:
${currentDictionary}

Lesson context:
Title: ${selectedLesson.title}
Description: ${selectedLesson.goal.description}

The original message:
${originalMessage}

How a listener (who is supposed to learn the new symbols) would understand the message:
${aiAnalysis}

Please provide an improved version of the message that would be easier to understand while maintaining the same meaning.
You can use only the symbols that are already known and that are in the goals. No English allowed.

Format your response as:
UPDATED MESSAGE:
[your improved message]

EXPLANATION:
[your explanation]`;

    setFeedbackPrompt(prompt);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: { prompt } }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      let fullResponse = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = new TextDecoder().decode(value);
        fullResponse += text;
        setFeedbackResponse(prev => prev + text);
      }

      // Parse the response to extract the updated message
      const updatedMessageMatch = fullResponse.match(/UPDATED MESSAGE:\n([\s\S]*?)(?=\n\nEXPLANATION:|$)/);
      if (updatedMessageMatch) {
        const updatedMessage = updatedMessageMatch[1].trim();
        setMessageDiff({
          original: originalMessage,
          updated: updatedMessage
        });
      }
    } catch (error) {
      console.error('Error generating feedback:', error);
    } finally {
      setIsGeneratingFeedback(false);
    }
  };

  const handleCalculateDiff = async () => {
    if (!aiResponse) return;
    await generateFeedback(aiResponse);
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

            <div className="h-[250px] overflow-y-auto pr-2 custom-scrollbar">
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
            <h3 className="text-lg font-bold text-blue-400 justify-middle mb-3">Incoming message</h3>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-4">
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
                  <button
                    onClick={() => setViewMode('image')}
                    className={`px-3 py-1.5 rounded text-sm ${
                      viewMode === 'image'
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  >
                    Image
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 text-sm text-gray-400">
                  <input
                    type="checkbox"
                    checked={showTranslation}
                    onChange={(e) => setShowTranslation(e.target.checked)}
                    className="form-checkbox h-4 w-4 text-blue-500 rounded border-gray-600 bg-slate-700"
                  />
                  <span>Show translation</span>
                </label>
                <button
                  onClick={handleCopyToClipboard}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    copySuccess
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  {copySuccess ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="bg-black p-3 rounded font-mono text-green-400 h-[300px] overflow-auto">
              <div className="space-y-3">
                {selectedLesson.lines.map((line, index) => (
                  <div key={index} className="space-y-0.5">
                    <div className="text-green-400">
                      {viewMode === 'text' 
                        ? renderEncodedText(getDisplayMessage(line.encoded) as string) 
                        : viewMode === 'binary'
                        ? renderBinaryText(getDisplayMessage(line.encoded) as string[])
                        : renderBinaryImage(getDisplayMessage(line.encoded) as string[])}
                    </div>
                    {showTranslation && (
                      <div className="text-gray-500 text-sm">
                        {line.decoded}
                      </div>
                    )}
                  </div>
                ))}
              </div>
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

        {/* Right Side */}
        <div className="space-y-4">
          <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm">
            <h2 className="text-lg font-bold mb-3 text-blue-400">Dictionary</h2>
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
              {getDictionaryEntries().map(({ symbol, meaning, isInCurrentRange, isFutureSymbol }) => (
                <div 
                  key={symbol} 
                  className={`p-2 rounded transition-colors duration-200 ${
                    isInCurrentRange 
                      ? 'bg-blue-500/20 border border-blue-500' 
                      : isFutureSymbol
                      ? 'bg-slate-800/50 opacity-40'
                      : 'bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-mono text-base ${isFutureSymbol ? 'text-gray-500' : ''}`}>
                      {symbol}
                    </span>
                  </div>
                  <div className="flex items-center mt-1">
                    <span className={`${isFutureSymbol ? 'text-gray-600' : 'text-gray-400'}`}>→</span>
                    <span className={`ml-2 text-sm ${isFutureSymbol ? 'text-gray-500' : ''}`}>
                      {meaning}
                    </span>
                  </div>
                  {isInCurrentRange && (
                    <div className="text-xs text-blue-400 mt-1">
                      Goal in this lesson!
                    </div>
                  )}
                  {isFutureSymbol && (
                    <div className="text-xs text-gray-500 mt-1">
                      Coming soon
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-blue-400">AI Analysis</h2>
              <button
                onClick={handleDecode}
                disabled={isDecoding}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  isDecoding
                    ? 'bg-slate-600 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {isDecoding ? 'Decoding...' : 'Decode'}
              </button>
            </div>
            <div className="bg-black p-3 rounded font-mono h-[300px] overflow-auto">
              <div className="space-y-4">
                {sentPrompt && (
                  <div className="p-2 rounded bg-blue-500/20 text-blue-300">
                    <div className="font-bold mb-1">Task</div>
                    <div className="text-sm whitespace-pre-wrap">{sentPrompt}</div>
                  </div>
                )}
                {isDecoding && (
                  <div className="p-2 rounded bg-blue-500/20 text-blue-300">
                    <div className="font-bold mb-1">AI Response</div>
                    <div className="text-sm">
                      <span className="inline-block animate-pulse">Decoding</span>
                      <span className="inline-block animate-bounce delay-100">.</span>
                      <span className="inline-block animate-bounce delay-200">.</span>
                      <span className="inline-block animate-bounce delay-300">.</span>
                    </div>
                  </div>
                )}
                {aiResponse && (
                  <div className="p-2 rounded bg-green-500/20 text-green-300">
                    <div className="font-bold mb-1">AI Response</div>
                    <div className="text-sm whitespace-pre-wrap">{aiResponse}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-blue-400">Message Improving Suggestion</h2>
              <div className="flex items-center space-x-3">
                {isGeneratingFeedback && (
                  <div className="text-sm text-blue-400">
                    Analyzing message...
                  </div>
                )}
                <button
                  onClick={handleCalculateDiff}
                  disabled={!aiResponse || isGeneratingFeedback || isDecoding}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    !aiResponse || isGeneratingFeedback || isDecoding
                      ? 'bg-slate-600 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {isGeneratingFeedback ? '...' : 'Suggest'}
                </button>
              </div>
            </div>
            <div className="bg-black p-3 rounded font-mono h-[300px] overflow-auto">
              <div className="space-y-4">
                {isGeneratingFeedback && !messageDiff && (
                  <div className="p-2 rounded bg-blue-500/20 text-blue-300">
                    <div className="font-bold mb-1">Analyzing Message</div>
                    <div className="text-sm">
                      <span className="inline-block animate-pulse">Processing</span>
                      <span className="inline-block animate-bounce delay-100">.</span>
                      <span className="inline-block animate-bounce delay-200">.</span>
                      <span className="inline-block animate-bounce delay-300">.</span>
                    </div>
                  </div>
                )}
                {messageDiff && (
                  <div className="p-2 rounded bg-yellow-500/20 text-yellow-300">
                    <div className="text-sm space-y-2">
                      <div>
                        <div className="font-semibold text-red-400">Original:</div>
                        <div className="whitespace-pre-wrap">{messageDiff.original}</div>
                      </div>
                      <div>
                        <div className="font-semibold text-green-400">Updated:</div>
                        <div className="whitespace-pre-wrap">{messageDiff.updated}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-blue-400">Feedback on the message structure</h2>
              {isGeneratingFeedback && (
                <div className="text-sm text-blue-400">
                  Generating feedback...
                </div>
              )}
            </div>
            <div className="bg-black p-3 rounded font-mono h-[300px] overflow-auto">
              <div className="space-y-4">
                {feedbackPrompt && (
                  <div className="p-2 rounded bg-blue-500/20 text-blue-300">
                    <div className="font-bold mb-1">Feedback Request</div>
                    <div className="text-sm whitespace-pre-wrap">{feedbackPrompt}</div>
                  </div>
                )}
                {isGeneratingFeedback && !feedbackResponse && (
                  <div className="p-2 rounded bg-blue-500/20 text-blue-300">
                    <div className="font-bold mb-1">Generating Feedback</div>
                    <div className="text-sm">
                      <span className="inline-block animate-pulse">Processing</span>
                      <span className="inline-block animate-bounce delay-100">.</span>
                      <span className="inline-block animate-bounce delay-200">.</span>
                      <span className="inline-block animate-bounce delay-300">.</span>
                    </div>
                  </div>
                )}
                {feedbackResponse && (
                  <div className="p-2 rounded bg-green-500/20 text-green-300">
                    <div className="font-bold mb-1">Feedback Response</div>
                    <div className="text-sm whitespace-pre-wrap">{feedbackResponse}</div>
                  </div>
                )}
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
