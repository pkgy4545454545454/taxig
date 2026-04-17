import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, X, MessageSquare } from 'lucide-react';
import { Button } from '../components/ui/button';
import { chatApi } from '../lib/api';

const ChatPanel = ({ courseId, isOpen, onClose, userType }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const messagesEndRef = useRef(null);
  const lastTimestampRef = useRef(null);
  const audioRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Poll messages every 2 seconds
  useEffect(() => {
    if (!courseId || !isOpen) return;

    const fetchMessages = async () => {
      try {
        const res = await chatApi.getMessages(courseId, lastTimestampRef.current);
        const newMsgs = res.data.messages || [];
        if (newMsgs.length > 0) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const truly = newMsgs.filter(m => !existingIds.has(m.id));
            if (truly.length > 0) {
              // Play sound for messages from the other party
              const hasNew = truly.some(m => m.sender_type !== userType);
              if (hasNew && audioRef.current) {
                audioRef.current.play().catch(() => {});
              }
              return [...prev, ...truly];
            }
            return prev;
          });
          lastTimestampRef.current = newMsgs[newMsgs.length - 1].created_at;
          scrollToBottom();
        }
      } catch (err) { /* silent */ }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [courseId, isOpen, userType, scrollToBottom]);

  // Initial load of all messages
  useEffect(() => {
    if (!courseId || !isOpen) return;
    const loadAll = async () => {
      try {
        const res = await chatApi.getMessages(courseId);
        setMessages(res.data.messages || []);
        if (res.data.messages?.length > 0) {
          lastTimestampRef.current = res.data.messages[res.data.messages.length - 1].created_at;
        }
        setTimeout(scrollToBottom, 100);
      } catch (err) { /* silent */ }
    };
    loadAll();
  }, [courseId, isOpen, scrollToBottom]);

  // Poll unread when closed
  useEffect(() => {
    if (!courseId || isOpen) { setUnread(0); return; }
    const pollUnread = async () => {
      try {
        const res = await chatApi.getUnread(courseId);
        setUnread(res.data.unread || 0);
      } catch (err) { /* silent */ }
    };
    pollUnread();
    const interval = setInterval(pollUnread, 3000);
    return () => clearInterval(interval);
  }, [courseId, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      const res = await chatApi.send(courseId, text);
      setMessages(prev => [...prev, res.data]);
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0A1628]" data-testid="chat-panel">
      {/* Notification sound */}
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRl4FAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YToFAABkZGRiYFxWTkRAPERQYHJ+goB4aFhMSExaeIqSkoh2YlBKTl50iJSUjHhiUEpQZHqMlJCEcFxQTFhsgJCUkIR0YFRSXnCCkJKMgHBgVlhqfIqQjoh4aF5aZHR+iIqGfHBmYGBqdn6EhIB4cGpmaG50eHx8eHRwbGxucHR2eHh2dHJwbnBydHZ2dnZ0cnBwcHJ0dHR0dHRycHBwcnR0dHR0cnJycHBycnR0dHRycnJycnJydHR0dHJycnJycnJ0dHR0cnJycnJycnR0" />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#1A3358] bg-[#0F2240]">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-[#FF6B00]" />
          <h3 className="text-white font-bold">Chat</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white" data-testid="chat-close-btn">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="chat-messages">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Envoyez un message</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_type === userType;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                isMine
                  ? 'bg-[#FF6B00] text-white rounded-br-md'
                  : 'bg-[#1A3358] text-white rounded-bl-md'
              }`} data-testid={`chat-msg-${msg.id}`}>
                {!isMine && (
                  <p className="text-[#FF8533] text-xs font-bold mb-1">{msg.sender_name}</p>
                )}
                <p className="text-sm leading-relaxed">{msg.message}</p>
                <p className={`text-xs mt-1 ${isMine ? 'text-white/60' : 'text-slate-500'}`}>
                  {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#1A3358] bg-[#0F2240]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Votre message..."
            className="flex-1 h-12 bg-[#0A1628] border border-[#1A3358] rounded-xl px-4 text-white placeholder:text-slate-500 focus:border-[#FF6B00] focus:outline-none transition-colors"
            data-testid="chat-input"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="h-12 w-12 btn-taxi rounded-xl p-0"
            data-testid="chat-send-btn"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Chat toggle button with unread badge
export const ChatToggleButton = ({ courseId, onClick, userType }) => {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!courseId) return;
    const poll = async () => {
      try {
        const res = await chatApi.getUnread(courseId);
        setUnread(res.data.unread || 0);
      } catch (err) { /* silent */ }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [courseId]);

  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-xl bg-[#FF6B00]/20 hover:bg-[#FF6B00]/30 transition-colors"
      data-testid="chat-toggle-btn"
    >
      <MessageSquare className="w-5 h-5 text-[#FF6B00]" />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-pulse" data-testid="chat-unread-badge">
          {unread}
        </span>
      )}
    </button>
  );
};

export default ChatPanel;
