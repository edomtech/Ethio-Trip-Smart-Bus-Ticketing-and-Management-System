import React, { useState, useEffect, useRef } from 'react';
import {
  FaRobot, FaPaperPlane, FaMicrophone, FaMicrophoneSlash,
  FaVolumeUp, FaVolumeMute, FaCheckCircle, FaArrowRight, FaBus
} from 'react-icons/fa';
import { aiAPI } from '../../utils/api';
import { toast } from 'react-toastify';
import { useTranslation } from '../../i18n';

const AIAssistantPage = () => {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechLang, setSpeechLang] = useState('en-US');  
  const [ttsEnabled, setTtsEnabled] = useState(true);

  const [messages, setMessages] = useState([]);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = speechLang;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setInput(transcript);
          handleSend(transcript);
        }
      };
      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast.warn('Microphone access denied. Please enable microphone permissions in your browser.');
        }
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, [speechLang]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.info('Voice speech recognition is not supported in this browser. Please use Chrome or Edge.');
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
        console.warn(err);
      }
    }
  };

  const speakText = (text) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      const clean = text.replace(/[*#_`•-]/g, ' ').replace(/\n+/g, '. ');
      const utterance = new SpeechSynthesisUtterance(clean);
      const isAmharic = /[\u1200-\u137F]/.test(clean);
      utterance.lang = isAmharic ? 'am-ET' : speechLang;
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {}
  };

  const handleSend = async (customPrompt) => {
    const query = (typeof customPrompt === 'string' ? customPrompt : input).trim();
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
      const botReply = res?.reply || (speechLang === 'am-ET' ? 'ይቅርታ፣ ምላሽ ማግኘት አልቻልኩም። እባክዎ እንደገና ይሞክሩ።' : "I'm sorry, I couldn't generate a response. Please try asking about bus schedules or bookings.");
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
      const errReply = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ Notice: ${err.message || 'Could not reach Ethio Trip Assistant service.'}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errReply]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm max-w-[900px] mx-auto font-poppins">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5 mb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 text-white flex items-center justify-center text-2xl shadow-md shadow-emerald-600/30 shrink-0">
            <FaRobot />
          </div>
          <div>
            <h3 className="m-0 text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              {t('assistant.title', 'Ethio Trip Voice & Text Assistant')}
              <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                {t('passenger ai', 'Passenger AI')}
              </span>
            </h3>
            <p className="m-0 mt-0.5 text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
              {t('assistant.subtitle', 'Speak or type in English and Amharic to search real buses and automatically populate your booking')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <select
            value={speechLang}
            onChange={(e) => setSpeechLang(e.target.value)}
            className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white text-xs font-bold py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 outline-none cursor-pointer"
          >
            <option value="en-US">English (US)</option>
            <option value="am-ET">አማርኛ (Amharic)</option>
          </select>

          <button
            type="button"
            onClick={() => setTtsEnabled(!ttsEnabled)}
            title={ttsEnabled ? t('mute ai voice', 'Mute AI Voice') : t('enable ai voice', 'Enable AI Voice')}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer transition text-xs"
          >
            {ttsEnabled ? <FaVolumeUp /> : <FaVolumeMute />}
          </button>
        </div>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 min-h-[360px] max-h-[500px] overflow-y-auto p-5 flex flex-col gap-3.5 mb-4">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 dark:text-slate-500 my-auto">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl mb-3 shadow-inner">
              <FaRobot />
            </div>
            <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
              {speechLang === 'am-ET' ? t('assistant.promptAm', 'እንዴት ልርዳዎት?') : t('assistant.howCanIHelp', 'How can I help you today?')}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[280px]">
              {speechLang === 'am-ET'
                ? 'ጥያቄዎን በአማርኛ ይናገሩ ወይም ይጻፉ (ለምሳሌ፡ ከአዲስ አበባ ወደ ባህር ዳር)'
                : t('assistant.promptEn', 'Speak or type your bus travel question (e.g., buses from Addis Ababa to Bahir Dar)')}
            </p>
          </div>
        )}
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div
              key={m.id}
              className={`max-w-[85%] flex flex-col ${isUser ? 'self-end items-end' : 'self-start items-start'}`}
            >
              <div
                className={`py-3 px-4.5 text-xs sm:text-sm leading-relaxed shadow-sm whitespace-pre-wrap break-words ${
                  isUser
                    ? 'bg-emerald-600 text-white rounded-2xl rounded-br-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl rounded-bl-xs border border-slate-100 dark:border-slate-700/60'
                }`}
              >
                {m.text}

                {m.extractedSearch && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                      <FaCheckCircle className="text-xs" />
                      <span>{t('assistant.autoFilled', 'Auto-filled on Bus Search:')}</span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                      <strong>{m.extractedSearch.origin}</strong> → <strong>{m.extractedSearch.destination}</strong> on <strong>{m.extractedSearch.date}</strong>
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1">
                {m.time}
              </span>
            </div>
          );
        })}

        {loading && (
          <div className="self-start bg-white dark:bg-slate-800 py-3 px-4.5 rounded-2xl rounded-bl-xs text-xs text-slate-500 dark:text-slate-400 shadow-sm border border-slate-100 dark:border-slate-700/60 flex items-center gap-2">
            <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin" />
            {t('assistant.searching', 'Searching schedules & generating response...')}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {isListening && (
        <div className="bg-red-500 text-white text-xs px-4 py-2 rounded-xl mb-3 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2 font-bold">
            <FaMicrophone className="animate-bounce" />
            <span>{speechLang === 'am-ET' ? 'እየሰማሁ ነው... በአማርኛ ይናገሩ' : t('assistant.listening', 'Listening... Speak your request')}</span>
          </div>
          <button
            type="button"
            onClick={toggleListening}
            className="bg-white/20 hover:bg-white/30 text-white px-2.5 py-0.5 rounded text-xs font-bold cursor-pointer"
          >
            {t('assistant.stop', 'Stop')}
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex gap-2.5"
      >
        <button
          type="button"
          onClick={toggleListening}
          title={isListening ? t('assistant.stop', 'Stop Listening') : `Speak in ${speechLang === 'am-ET' ? 'Amharic' : 'English'}`}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer transition shadow-sm shrink-0 ${
            isListening
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-slate-700 hover:bg-emerald-100'
          }`}
        >
          {isListening ? <FaMicrophoneSlash className="text-base" /> : <FaMicrophone className="text-base" />}
        </button>

        <input
          type="text"
          placeholder={speechLang === 'am-ET' ? 'በአማርኛ ይናገሩ ወይም ይጻፉ (ምሳሌ፡ ከአዲስ አበባ ወደ ባህር ዳር ነገ)...' : 'Speak or type: e.g. Find a bus from Addis Ababa to Bahir Dar tomorrow...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="flex-1 py-3 px-4.5 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none font-inherit transition focus:border-emerald-500 disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-emerald-600 hover:bg-emerald-500 text-white border-none rounded-2xl px-6 font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20 shrink-0"
        >
          <span>{t('assistant.send', 'Send')}</span>
          <FaPaperPlane className="text-xs" />
        </button>
      </form>
    </div>
  );
};

export default AIAssistantPage;
