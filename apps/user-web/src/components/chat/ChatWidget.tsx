import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles, MapPin, Calendar, HelpCircle } from 'lucide-react';
import { useAiChat } from '@/hooks';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_ACTIONS = [
  { icon: MapPin, label: 'Shops near me', message: 'Find shops near me' },
  { icon: Calendar, label: 'My bookings', message: 'Show my upcoming bookings' },
  { icon: HelpCircle, label: 'How it works', message: 'How does Overline work?' },
];

export function ChatWidget() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const chatMutation = useAiChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(scrollToBottom, [messages]);

  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');

    try {
      const response = await chatMutation.mutateAsync({
        messages: newMessages,
      });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.content },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I'm having trouble connecting. Please try again in a moment.",
        },
      ]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-24 md:bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all',
          isOpen
            ? 'bg-secondary hover:bg-secondary-container shadow-card'
            : 'bg-gradient-to-br from-primary-600 to-primary-800 shadow-button hover:shadow-button-hover'
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-40 md:bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[520px] max-h-[calc(100vh-200px)] md:max-h-[calc(100vh-120px)] bg-surface-container-lowest rounded-3xl shadow-glass-strong border border-outline-variant/40 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-br from-primary-600 to-primary-800 text-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Overline Assistant</h3>
                  <p className="text-white/70 text-xs">AI-powered help</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <Sparkles className="w-10 h-10 text-primary-300 mx-auto mb-3" />
                  <p className="text-on-surface text-sm font-semibold mb-1">
                    Hi! I&apos;m your Overline Assistant
                  </p>
                  <p className="text-on-surface-variant text-xs mb-6">
                    Ask me about shops, bookings, or anything else
                  </p>

                  {/* Quick Actions */}
                  <div className="flex flex-wrap justify-center gap-2">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => sendMessage(action.message)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary-fixed/40 rounded-full hover:bg-primary-fixed/60 dark:bg-primary-900/30 dark:text-primary-300 dark:hover:bg-primary-900/50 transition-colors"
                      >
                        <action.icon className="w-3.5 h-3.5" />
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                      msg.role === 'user'
                        ? 'bg-primary text-white rounded-br-md shadow-sm'
                        : 'bg-surface-container text-on-surface rounded-bl-md'
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {chatMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-surface-container rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-on-surface-variant/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-on-surface-variant/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-on-surface-variant/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-outline-variant/40 flex-shrink-0 bg-surface-container-lowest">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  className="flex-1 px-4 py-2.5 text-sm bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/60 border border-outline-variant rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary transition-all"
                  disabled={chatMutation.isPending}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || chatMutation.isPending}
                  aria-label="Send message"
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 text-white flex items-center justify-center shadow-button hover:shadow-button-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
