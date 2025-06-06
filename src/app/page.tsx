'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import numbersChapter from '../data/chapters/numbers.json';
import arithmeticChapter from '../data/chapters/arithmetic.json';
import programmingChapter from '../data/chapters/programming.json';
import naturalLanguageChapter from '../data/chapters/natural_language.json';
import felicisAiChapter from '../data/chapters/felicis_ai.json';
import dictionary from '../data/dictionary.json';

type Chapter = typeof numbersChapter;
type Lesson = Chapter['lessons'][0];

const chapters = [numbersChapter, arithmeticChapter, programmingChapter, naturalLanguageChapter, felicisAiChapter];

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [isAiMode, setIsAiMode] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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

  const createBinaryAudio = async (text: string) => {
    // Create AudioContext if it doesn't exist
    let context = audioContext;
    if (!context) {
      context = new AudioContext();
      setAudioContext(context);
    }

    // Convert text to binary
    const binaryArray = convertToBinary(text);
    const binaryString = binaryArray.join('');
    
    // Audio parameters
    const frequency = 800; // Frequency of the beep (Hz)
    const bitDuration = 0.1; // Duration of each bit (seconds)
    
    // Create an array of oscillators and gains
    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    
    // Schedule the beeps
    binaryString.split('').forEach((bit, index) => {
      if (bit === '1') {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        oscillator.frequency.value = frequency;
        gainNode.gain.value = 0;
        
        const startTime = index * bitDuration;
        
        // Smooth transitions to avoid clicks
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, startTime + bitDuration - 0.01);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + bitDuration);
        
        oscillators.push(oscillator);
        gains.push(gainNode);
      }
    });

    return {
      play: () => {
        setIsPlaying(true);
        context.resume();
      },
      stop: () => {
        setIsPlaying(false);
        context.close().then(() => {
          setAudioContext(null);
        });
      },
      duration: binaryString.length * bitDuration
    };
  };

  const getDisplayMessage = (text: string): string | string[] => {
    switch (viewMode) {
      case 'binary':
        return convertToBinary(text);
      case 'image':
        return createBinaryImage(text);
      case 'audio':
        return text;
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

  const renderAudioPlayer = (lines: { encoded: string }[]) => {
    const handlePlay = async () => {
      if (isPlaying) {
        audioContext?.close();
        setAudioContext(null);
        setIsPlaying(false);
        return;
      }

      // Concatenate all lines into one string
      const fullText = lines.map(line => line.encoded).join('');
      const audio = await createBinaryAudio(fullText);
      audio.play();
      
      // Stop playing after the sequence is complete
      setTimeout(() => {
        audio.stop();
      }, audio.duration * 1000);
    };

    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-4">
        <button
          onClick={handlePlay}
          className={`px-8 py-3 rounded-full ${
            isPlaying 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-green-500 hover:bg-green-600'
          } text-white font-medium transition-colors flex items-center space-x-2`}
        >
          <span>{isPlaying ? 'Stop Transmission' : 'Transmit Full Message'}</span>
          {isPlaying && (
            <div className="flex space-x-1 ml-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
            </div>
          )}
        </button>
        <div className="text-sm text-gray-400">
          {isPlaying ? 'Broadcasting interstellar signal...' : 'Ready to broadcast'}
        </div>
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
        // In AI mode, all symbols are considered learned (not new or future)
        const isInCurrentRange = isAiMode ? false : 
          (index >= selectedLesson.dictionary.start && 
           index < selectedLesson.dictionary.end);
        const isNewSymbol = !isAiMode && index === selectedLesson.dictionary.end - 1;
        const isFutureSymbol = !isAiMode && index >= selectedLesson.dictionary.end;
        
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
      .map(([symbol, meaning]) => `${symbol}: ${meaning}`)
      .join('\n');

    // Get the last AI message if in AI mode
    const messageToDecode = isAiMode 
      ? chatMessages[chatMessages.length - 1]?.content || ''
      : selectedLesson.lines.map(line => line.encoded).join('\n');

    const prompt = `You received a message using a symbolic language. Here is the dictionary of all available symbols:

${currentDictionary}

This is the message to decode:
${messageToDecode}

Please provide a detailed translation and explanation of what this message means.`;

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

  // Validate if input contains only allowed symbols
  const validateSymbols = (input: string): boolean => {
    const allowedSymbols = Object.keys(dictionary);
    return input.split('').every(char => allowedSymbols.includes(char) || char === ' ');
  };

  // Handle chat message submission
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSymbols(chatInput)) {
      alert('Please use only allowed symbols from the dictionary');
      return;
    }

    const userMessage = chatInput.trim();
    if (!userMessage) return;

    // Add user message to chat
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');

    // Prepare context for AI
    const context = `You are FelicisAI, an AI that communicates using a symbolic language. 
You must ONLY use the following symbols: ${Object.keys(dictionary).join(' ')}
Each symbol has a specific meaning: ${Object.entries(dictionary).map(([symbol, meaning]) => `${symbol}: ${meaning}`).join(', ')}

You must ALWAYS start your response with "❇ | ❀ ❁ ❄ | ✾ ✿ ❈" (which means "story | AI happy | says hello felicis fellows")

Here are some examples of how to respond:
1. If someone says "❇ | ❋ ❁ ❄ | ✾ | ● ≐ ◎" (hello, 1=0), you should respond with "❇ | ❀ ❁ ❄ | ✾ ✿ ❈ | ● ≐ ●" (hello felicis fellows, 1=1)
2. If someone asks a question, use "❂" (question) and "❃" (answer) symbols
3. Use "❄" (happy), "❅" (neutral), or "❆" (sad) to express emotions
4. Use "❋" (speaker-1) for the user and "❀" (speaker-2) for yourself
5. Use "❁" (speak) to indicate speaking

IMPORTANT RULES:
1. NEVER use any English words or characters not in the symbol list
2. ALWAYS use the correct symbols from the dictionary
3. Keep responses concise but meaningful
4. Use emotions and dialogue markers appropriately

The user's message was: ${userMessage}`;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: { prompt: context } }),
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
      }

      // Filter response to only include allowed symbols
      const allowedSymbols = new Set(Object.keys(dictionary));
      const filteredResponse = fullResponse
        .split('')
        .filter(char => allowedSymbols.has(char) || char === ' ' || char === '|')
        .join('')
        .trim();

      // Add AI response to chat
      setChatMessages(prev => [...prev, { role: 'assistant', content: filteredResponse }]);
    } catch (error) {
      console.error('Error in chat:', error);
    }
  };

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Handle chapter selection
  const handleChapterSelect = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setIsAiMode(chapter.title === 'Ch5: FelicisAI');
    if (chapter.title === 'Ch5: FelicisAI') {
      setChatMessages([{ role: 'assistant', content: '❇ | ❀ ❁ ❄ | ✾ ✿ ❈' }]);
    } else {
      setSelectedLesson(chapter.lessons[0]);
    }
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
            <div className="flex flex-wrap gap-2 mb-3">
              {chapters.map((chapter) => (
                <button
                  key={chapter.title}
                  onClick={() => handleChapterSelect(chapter)}
                  className={`px-2 py-1 rounded text-sm ${
                    selectedChapter.title === chapter.title
                      ? chapter.title === 'Ch5: FelicisAI'
                        ? 'bg-orange-500 text-white'
                        : 'bg-blue-500 text-white'
                      : chapter.title === 'Ch5: FelicisAI'
                        ? 'bg-orange-500/50 hover:bg-orange-500/70'
                        : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  {chapter.title}
                </button>
              ))}
            </div>

            {!isAiMode && (
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
            )}
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-blue-400 mb-3">
              {isAiMode ? 'Chat with FelicisAI' : 'Incoming Message'}
            </h3>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-4">
                {!isAiMode && (
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
                    <button
                      onClick={() => setViewMode('audio')}
                      className={`px-3 py-1.5 rounded text-sm ${
                        viewMode === 'audio'
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-700 hover:bg-slate-600'
                      }`}
                    >
                      Audio
                    </button>
                  </div>
                )}
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
                {!isAiMode && (
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
                )}
              </div>
            </div>
            <div className="bg-black p-3 rounded font-mono text-green-400 h-[300px] overflow-auto">
              {isAiMode ? (
                <div className="space-y-4">
                  {chatMessages.map((message, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded ${
                        message.role === 'user'
                          ? 'bg-blue-500/20 ml-4'
                          : 'bg-green-500/20 mr-4'
                      }`}
                    >
                      <div className="text-sm font-mono">
                        {message.content}
                      </div>
                      {showTranslation && (
                        <div className="text-xs text-gray-400 mt-1">
                          {message.content.split('').map(char => dictionary[char as keyof typeof dictionary] || char).join(' ')}
                        </div>
                      )}
                    </div>
                  ))}
                  <form onSubmit={handleChatSubmit} className="flex space-x-2 mt-4">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type your message using allowed symbols..."
                      className="flex-1 px-3 py-2 rounded bg-slate-700/50 border border-slate-600 focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 transition-colors"
                    >
                      Send
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-3">
                  {viewMode === 'audio' ? (
                    renderAudioPlayer(selectedLesson.lines)
                  ) : (
                    selectedLesson.lines.map((line, index) => (
                      <div key={index} className="space-y-0.5">
                        <div className="text-green-400">
                          {viewMode === 'text' 
                            ? renderEncodedText(getDisplayMessage(line.encoded) as string) 
                            : viewMode === 'binary'
                            ? renderBinaryText(getDisplayMessage(line.encoded) as string[])
                            : viewMode === 'image'
                            ? renderBinaryImage(getDisplayMessage(line.encoded) as string[])
                            : null}
                        </div>
                        {showTranslation && (
                          <div className="text-gray-500 text-sm">
                            {line.decoded}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
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
              <h2 className="text-lg font-bold text-blue-400">Message Improvement</h2>
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
              <h2 className="text-lg font-bold text-blue-400">Message Structure</h2>
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
