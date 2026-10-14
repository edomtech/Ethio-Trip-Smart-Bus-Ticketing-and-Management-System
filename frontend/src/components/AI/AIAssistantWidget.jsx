import React, { useState, useRef, useEffect } from 'react';
import {
  FaRobot, FaTimes, FaPaperPlane, FaMicrophone, FaMicrophoneSlash,
  FaVolumeUp, FaVolumeMute, FaBus, FaArrowRight, FaCheckCircle
} from 'react-icons/fa';
import { aiAPI } from '../../utils/api';
import { toast } from 'react-toastify';

const AIAssistantWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechLang, setSpeechLang] = useState('en-US');  
  const [ttsEnabled, setTtsEnabled] = useState(true);

  const [messages, setMessages] = useState([]);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = speechLang;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setInput(transcript);
          handleSend(transcript);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast.warn('Microphone permission was denied. Please allow microphone access in your browser settings.');
        } else if (event.error !== 'no-speech') {
          toast.info(`Voice input note: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [speechLang]);

  const toggleListening = () => {
    stopSpeaking();
    if (!recognitionRef.current) {
      toast.info('Voice speech recognition is not supported in this browser. Please use Google Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.lang = speechLang;
        recognitionRef.current.start();
        toast.info(speechLang === 'am-ET' ? 'እየሰማሁ ነው... ይናገሩ' : 'Listening... Speak your request');
      } catch (err) {
        console.warn('Start recognition error:', err);
      }
    }
  };

  const toggleVoice = () => {
    if (ttsEnabled) {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setTtsEnabled(false);
      toast.info(speechLang === 'am-ET' ? 'ድምጽ ተዘግቷል (ጽሑፍ ብቻ)' : 'Voice audio turned OFF (Text Only)');
    } else {
      setTtsEnabled(true);
      toast.info(speechLang === 'am-ET' ? 'ድምጽ በርቷል' : 'Voice audio turned ON');
    }
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const speakText = (text) => {
    if (!ttsEnabled || !window.speechSynthesis || !text) return;
    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      const clean = text.replace(/[*#_`•-]/g, ' ').replace(/\n+/g, '. ');
      const utterance = new SpeechSynthesisUtterance(clean);
      const isAmharic = /[\u1200-\u137F]/.test(clean);
      utterance.lang = isAmharic ? 'am-ET' : (speechLang || 'en-US');
      utterance.rate = 1.0;

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        if (isAmharic) {
          const amVoice = voices.find(v => v.lang.startsWith('am') || v.name.toLowerCase().includes('amharic'));
          if (amVoice) utterance.voice = amVoice;
        } else {
          const enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.default));
          if (enVoice) utterance.voice = enVoice;
        }
      }

      window.speechSynthesis.speak(utterance);
    } catch {
    }
  };

  const handleSend = async (textToSend) => {
    const query = (typeof textToSend === 'string' ? textToSend : input).trim();
    if (!query || loading) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await aiAPI.ask(query);
      const botReply = res?.reply || (speechLang === 'am-ET' ? 'ይቅርታ፣ ምላሽ ማግኘት አልቻልኩም። እባክዎ እንደገና ይሞክሩ።' : "I'm sorry, I couldn't generate a response. Please try asking about bus bookings, tickets, or payments.");
      const botMsg = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: botReply,
        extractedSearch: res?.extractedSearch || null,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);

      if (res?.extractedSearch && res.extractedSearch.origin && res.extractedSearch.destination) {
        window.dispatchEvent(
          new CustomEvent('ethiotrip_voice_search', {
            detail: res.extractedSearch,
          })
        );
        toast.success(
          `🎤 Voice AI auto-filled search: ${res.extractedSearch.origin} → ${res.extractedSearch.destination} (${res.extractedSearch.date})`
        );
      }

      speakText(botReply);
    } catch (err) {
      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ **Notice:** ${err.message || 'Unable to reach assistant. Please try again.'}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {}
      <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open Ethio Trip Voice AI Assistant"
          title="Ask Me — Ethio Trip Passenger Voice Assistant"
          className="flex items-center gap-2.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-700 text-white border-2 border-white/40 rounded-full px-5 py-3 shadow-xl shadow-emerald-600/40 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-emerald-600/60 hover:scale-[1.03] cursor-pointer font-bold text-sm tracking-wide transition-all duration-200 font-poppins"
        >
          <div className="w-8 h-8 rounded-full bg-white text-emerald-600 flex items-center justify-center text-base shadow-sm">
            <FaRobot />
          </div>
          <span>Ask Me</span>
          <span className="bg-emerald-50 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
            VOICE AI
          </span>
        </button>
      </div>

      {}
      {isOpen && (
        <div className="fixed bottom-22 right-6 w-[410px] max-w-[calc(100vw-32px)] h-[580px] max-h-[calc(100vh-120px)] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden z-[10000] font-poppins transition-colors animate-in fade-in slide-in-from-bottom-4 duration-200">
          {}
          <div className="bg-gradient-to-r from-emerald-800 to-emerald-600 text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
                <FaRobot />
              </div>
              <div>
                <h4 className="m-0 text-sm font-extrabold tracking-tight flex items-center gap-2">
                  Ethio Trip Voice AI
                  <span className="text-[10px] bg-emerald-500/50 px-2 py-0.5 rounded-full font-bold">
                    Passenger
                  </span>
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-emerald-200 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  Voice Autofill Ready
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {}
              <select
                value={speechLang}
                onChange={(e) => setSpeechLang(e.target.value)}
                className="bg-white/20 text-white text-[11px] font-bold py-1 px-2 rounded-lg border border-white/30 outline-none cursor-pointer"
                title="Select Voice Language"
              >
                <option value="en-US" className="text-slate-900">EN (English)</option>
                <option value="am-ET" className="text-slate-900">አማ (Amharic)</option>
              </select>

              {}
              <button
                type="button"
                onClick={toggleVoice}
                title={ttsEnabled ? 'Voice readout is ON — Click to turn OFF (Text Only)' : 'Voice readout is OFF — Click to turn ON'}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black transition cursor-pointer border ${
                  ttsEnabled
                    ? 'bg-emerald-500 text-white border-emerald-300/40 shadow-sm hover:bg-emerald-400'
                    : 'bg-rose-500/30 text-rose-100 border-rose-300/40 hover:bg-rose-500/40'
                }`}
              >
                {ttsEnabled ? <FaVolumeUp className="text-xs" /> : <FaVolumeMute className="text-xs text-rose-200" />}
                <span className="text-[10px]">{ttsEnabled ? 'Voice ON' : 'Text Only'}</span>
              </button>

              <button
                onClick={() => {
                  stopSpeaking();
                  setIsOpen(false);
                }}
                aria-label="Close Assistant"
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer transition"
              >
                <FaTimes />
              </button>
            </div>
          </div>

          {}
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-slate-50 dark:bg-slate-950">
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500 my-auto">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl mb-3 shadow-inner">
                  <FaRobot />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {speechLang === 'am-ET' ? 'እንዴት ልርዳዎት?' : 'How can I help you today?'}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[240px]">
                  {speechLang === 'am-ET'
                    ? 'ጥያቄዎን በአማርኛ ይናገሩ ወይም ይጻፉ (ለምሳሌ፡ "ያሉ አውቶቡሶችን አሳየኝ" ወይም "ተመላሽ እንዴት ልጠይቅ")'
                    : 'Speak or type your question (e.g. "show me available buses" or "how do I ask for refund")'}
                </p>
              </div>
            )}
            {messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <div
                  key={m.id}
                  className={`max-w-[88%] flex flex-col ${isUser ? 'self-end items-end' : 'self-start items-start'}`}
                >
                  <div
                    className={`p-3 text-xs sm:text-sm leading-relaxed shadow-sm whitespace-pre-wrap break-words ${
                      isUser
                        ? 'bg-emerald-600 text-white rounded-2xl rounded-br-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl rounded-bl-xs border border-slate-100 dark:border-slate-700/60'
                    }`}
                  >
                    {m.text}

                    {}
                    {m.extractedSearch && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-1 text-[11px]">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                          <FaCheckCircle className="text-xs shrink-0" />
                          <span>Auto-filled on Bus Search:</span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-300">
                          <strong>{m.extractedSearch.origin}</strong> → <strong>{m.extractedSearch.destination}</strong> on <strong>{m.extractedSearch.date}</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            window.dispatchEvent(
                              new CustomEvent('ethiotrip_voice_search', {
                                detail: m.extractedSearch,
                              })
                            );
                            stopSpeaking();
                            setIsOpen(false);
                          }}
                          className="mt-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg px-2.5 py-1 font-bold text-[10px] flex items-center justify-between hover:bg-emerald-100 transition cursor-pointer"
                        >
                          <span>Open Bus Search Form</span>
                          <FaArrowRight className="text-[9px]" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-slate-400">
                    <span>{m.time}</span>
                    {!isUser && (
                      <button
                        type="button"
                        onClick={() => speakText(m.text)}
                        title="Replay voice audio"
                        className="hover:text-emerald-500 cursor-pointer flex items-center gap-1 font-bold text-slate-500"
                      >
                        <FaVolumeUp className="text-[10px]" />
                        <span>Listen</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="self-start bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-bl-xs flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 shadow-sm border border-slate-100 dark:border-slate-700/60">
                <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin" />
                Searching platform schedules & thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {}
          {isListening && (
            <div className="bg-red-500 text-white text-xs px-4 py-2 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2 font-bold">
                <FaMicrophone className="animate-bounce" />
                <span>
                  {speechLang === 'am-ET' ? 'እየሰማሁ ነው... ይናገሩ (Amharic)' : 'Listening to your voice... Speak clearly'}
                </span>
              </div>
              <button
                type="button"
                onClick={toggleListening}
                className="bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer"
              >
                Stop
              </button>
            </div>
          )}

          {}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 px-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
          >
            {}
            <button
              type="button"
              onClick={toggleListening}
              title={isListening ? 'Stop Listening' : `Speak in ${speechLang === 'am-ET' ? 'Amharic' : 'English'}`}
              className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition shadow-sm ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-slate-700 hover:bg-emerald-100'
              }`}
            >
              {isListening ? <FaMicrophoneSlash className="text-sm" /> : <FaMicrophone className="text-sm" />}
            </button>

            <input
              type="text"
              placeholder={speechLang === 'am-ET' ? 'በአማርኛ ይናገሩ ወይም ይጻፉ (ምሳሌ፡ ከአዲስ ወደ ባህር ዳር)...' : 'Speak or type: e.g. Addis to Bahir Dar tomorrow...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-full px-4 py-2.5 text-xs sm:text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send Message"
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white w-10 h-10 rounded-full flex items-center justify-center cursor-pointer shadow-md shadow-emerald-600/25 transition shrink-0"
            >
              <FaPaperPlane className="text-xs" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default AIAssistantWidget;
