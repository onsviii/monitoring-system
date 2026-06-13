/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, AlertCircle, MessageSquare, ChevronDown } from 'lucide-react';
import { ChatMessage } from '../../types';
import Badge from '../ui/Badge';
import { sendChatMessage, getChatHistory } from '../../api/analysisService';

interface StrategyAIChatProps {
  id?: string;
  sessionId?: string;
  initialPresets?: string[];
}

const DEFAULT_PRESETS = [
  'Які наші головні сильні сторони?',
  'На що скаржаться клієнти найчастіше?',
  'Як покращити оцінку за сервіс?',
];

export const StrategyAIChat: React.FC<StrategyAIChatProps> = ({
                                                                id,
                                                                sessionId,
                                                                initialPresets = DEFAULT_PRESETS
                                                              }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(true);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Скрол до останнього повідомлення
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && sessionId && !isHistoryLoaded) {
      const loadHistory = async () => {
        setIsTyping(true);
        try {
          const history = await getChatHistory(sessionId);
          if (history && history.length > 0) {
            setMessages(history);
          } else {
            // Стартове повідомлення, якщо історія порожня
            setMessages([{
              id: 'msg_welcome',
              role: 'ASSISTANT',
              text: 'Привіт! Чим можу допомогти з інтерпретацією результатів аналітичного звіту вашого закладу?',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }]);
          }
        } catch (error) {
          console.error('Помилка завантаження історії чату:', error);
          setMessages([{
            id: 'msg_error_init',
            role: 'ASSISTANT',
            text: 'Не вдалося завантажити історію чату. Але ви можете поставити своє запитання.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }]);
        } finally {
          setIsHistoryLoaded(true);
          setIsTyping(false);
        }
      };

      loadHistory();
    }
  }, [isOpen, sessionId, isHistoryLoaded]);

  const handleOpen = () => {
    setIsOpen(true);
    setHasNewMessages(false);
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isTyping || !sessionId) return;

    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'USER',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const aiResponse = await sendChatMessage(sessionId, text);

      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error('Помилка чату:', error);

      const errorMsg: ChatMessage = {
        id: `msg_error_${Date.now()}`,
        role: 'ASSISTANT',
        text: 'На жаль, втрачено зв\'язок із сервером. Спробуйте пізніше.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
      <div className="relative">
        {/* Floating Minimize Button / Launcher */}
        {!isOpen && (
            <button
                type="button"
                onClick={handleOpen}
                className="fixed right-6 bottom-6 z-50 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-full p-4 shadow-2xl flex items-center gap-2 hover:scale-105 duration-200 transition-all cursor-pointer border border-white/20 select-none"
                title="Запитувати AI-консультанта"
            >
              <div className="relative">
                <MessageSquare className="w-5.5 h-5.5" />
                {hasNewMessages && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
                )}
              </div>
              <span className="text-xs font-bold tracking-tight pr-1">Strategy AI</span>
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            </button>
        )}

        {/* Floating Active Chat Window */}
        {isOpen && (
            <div className="fixed right-6 bottom-6 z-50 w-85 sm:w-96 bg-white border border-gray-200 shadow-2xl rounded-2xl flex flex-col h-[525px] overflow-hidden transition-all duration-300 transform scale-100 origin-bottom-right">

              {/* Header Panel */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-150 bg-gray-50/80 select-none">
                <div className="flex items-center space-x-2">
              <span className="bg-indigo-50 p-1 rounded-lg">
                <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
              </span>
                  <span className="font-bold text-xs text-gray-900 tracking-tight">Strategy AI</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Badge variant="ai">ШШІ</Badge>
                  <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="text-gray-400 hover:text-gray-700 p-1.5 hover:bg-gray-150 rounded-lg duration-150 transition-colors cursor-pointer"
                      title="Згорнути"
                  >
                    <ChevronDown className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {/* Chat Messages Panel */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-250 bg-gray-50/10">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex flex-col max-w-[88%] ${
                            msg.role === 'USER' ? 'ml-auto items-end' : 'mr-auto items-start'
                        }`}
                    >
                      <div
                          className={`px-3.5 py-2.5 rounded-2xl text-[12px] leading-relaxed shadow-sm border ${
                              msg.role === 'USER'
                                  ? 'bg-indigo-600 text-white rounded-br-none border-indigo-600 shadow-indigo-100'
                                  : 'bg-white text-gray-800 rounded-bl-none border-gray-100'
                          }`}
                      >
                        <p className="whitespace-pre-line font-medium leading-relaxed">{msg.text}</p>
                      </div>
                      <span className="text-[9px] text-gray-400 mt-1 px-1 font-mono font-medium">{msg.timestamp}</span>
                    </div>
                ))}

                {isTyping && (
                    <div className="mr-auto items-start max-w-[85%]">
                      <div className="px-3.5 py-2.5 rounded-2xl bg-white border border-gray-100 rounded-bl-none">
                  <span className="flex items-center gap-1.5 py-0.5">
                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                      </div>
                    </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Preset Questions Suggestions Drawer */}
              {messages.length <= 1 && sessionId && (
                  <div className="px-3 py-1.5 border-t border-gray-100 bg-white overflow-x-auto whitespace-nowrap flex gap-1.5 scrollbar-none select-none">
                    {initialPresets.map((q, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSend(q)}
                            disabled={isTyping}
                            className="inline-block px-2.5 py-1.5 text-[10px] text-indigo-600 border border-indigo-100 bg-indigo-50/20 hover:bg-indigo-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed duration-200 rounded-lg whitespace-nowrap text-left font-bold cursor-pointer"
                        >
                          {q}
                        </button>
                    ))}
                  </div>
              )}

              {/* Input Form Panel */}
              <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend(inputValue);
                  }}
                  className="p-3 border-t border-gray-150 bg-white flex gap-2 items-center"
              >
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={sessionId ? "Запитайте про конкурентів або стратегію..." : "Завантаження аналізу..."}
                    disabled={!sessionId || isTyping}
                    className="flex-1 bg-gray-50 border border-gray-200 text-[12px] px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-gray-800 transition-colors placeholder:text-gray-400 disabled:opacity-60"
                />
                <button
                    type="submit"
                    disabled={!inputValue.trim() || isTyping || !sessionId}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed text-white rounded-xl p-2.5 flex items-center justify-center transition-colors shadow-sm h-full cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              {/* Footer Disclaimer Panel */}
              <div className="bg-amber-50/60 px-4 py-2 border-t border-gray-100 text-[9px] text-amber-900 flex items-start gap-1.5 leading-relaxed">
                <AlertCircle className="w-3 h-3 text-amber-700 shrink-0 mt-0.5" />
                <span>ШІ консультант спирається на геоаналітику. Перевіряйте важливі факти.</span>
              </div>

            </div>
        )}
      </div>
  );
};

export default StrategyAIChat;