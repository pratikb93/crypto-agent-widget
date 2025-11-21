import React, { useState, useRef, useEffect } from 'react';
import type { IndicatorSnapshot } from '../agent/useCryptoAgent';

interface AgentChatProps {
    symbol: string;
    indicators: IndicatorSnapshot | null;
}

interface Message {
    id: string;
    role: 'user' | 'agent';
    text: string;
    timestamp: number;
}

export const AgentChat: React.FC<AgentChatProps> = ({ symbol, indicators }) => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'agent',
            text: `Hello! I'm tracking ${symbol}. Ask me about the trend, RSI, or if you should buy.`,
            timestamp: Date.now(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    // Reset chat when symbol changes
    useEffect(() => {
        setMessages([
            {
                id: 'welcome',
                role: 'agent',
                text: `Hello! I'm tracking ${symbol}. Ask me about the trend, RSI, or if you should buy.`,
                timestamp: Date.now(),
            },
        ]);
        setInput('');
        setIsTyping(false);
    }, [symbol]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: input,
            timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        // Simulate AI delay
        setTimeout(() => {
            let response = "I'm not sure about that. Try asking about the trend or indicators.";
            const lowerInput = userMsg.text.toLowerCase();

            if (lowerInput.includes('buy') || lowerInput.includes('sell') || lowerInput.includes('should i')) {
                const { rsi, macd, macdSignal, maFast, maSlow, signal } = indicators || {};

                if (signal === 'BUY') {
                    response = `My indicators suggest a **BUY** signal for ${symbol}. RSI is ${rsi?.toFixed(1)} and momentum is positive.`;
                } else if (signal === 'SELL') {
                    response = `I'm seeing a **SELL** signal right now. RSI is ${rsi?.toFixed(1)} and momentum is negative.`;
                } else {
                    // Nuanced Neutral
                    let nuance = "";
                    if (rsi && rsi < 40) nuance += " However, RSI is approaching oversold territory.";
                    else if (rsi && rsi > 60) nuance += " However, RSI is approaching overbought levels.";

                    if (macd && macdSignal && macd > macdSignal) nuance += " MACD is showing some bullish momentum.";
                    else if (macd && macdSignal && macd < macdSignal) nuance += " MACD is showing bearish momentum.";

                    response = `The market is technically **NEUTRAL**. It might be best to wait for a clearer trend.${nuance}`;
                }
            } else if (lowerInput.includes('trend')) {
                if (indicators?.maFast && indicators?.maSlow) {
                    if (indicators.maFast > indicators.maSlow) response = `The trend is **BULLISH** (Short-term MA is above Long-term MA).`;
                    else response = `The trend is **BEARISH** (Short-term MA is below Long-term MA).`;
                } else {
                    response = "I need more data to determine the trend.";
                }
            } else if (lowerInput.includes('rsi')) {
                response = `The RSI is currently **${indicators?.rsi?.toFixed(1) ?? '--'}**. ${(indicators?.rsi ?? 50) > 70 ? 'It is overbought.' : (indicators?.rsi ?? 50) < 30 ? 'It is oversold.' : 'It is in a neutral zone.'
                    }`;
            } else if (lowerInput.includes('price')) {
                response = `The current price of ${symbol} is **$${indicators?.lastPrice?.toFixed(2) ?? '--'}**.`;
            }

            const agentMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'agent',
                text: response,
                timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, agentMsg]);
            setIsTyping(false);
        }, 1000);
    };

    return (
        <div className="flex flex-col h-[400px] bg-slate-900/40 rounded-2xl border border-slate-800/50 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-800/50 bg-slate-900/50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-400">
                        <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.414a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.586a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM15.657 14.586a.75.75 0 010 1.06l-1.06 1.06a.75.75 0 11-1.06-1.06l1.06-1.06a.75.75 0 011.06 0zM6.464 5.414a.75.75 0 010-1.06l-1.06-1.06a.75.75 0 011.06 1.06l1.06 1.06z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-sm font-medium text-slate-200">Agent Chat</h3>
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Online
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref={scrollRef}>
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                            className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                ? 'bg-emerald-500/20 text-emerald-100 rounded-tr-none border border-emerald-500/20'
                                : 'bg-slate-800/50 text-slate-300 rounded-tl-none border border-slate-700/50'
                                }`}
                        >
                            <span dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-slate-800/50 p-3 rounded-2xl rounded-tl-none border border-slate-700/50 flex gap-1">
                            <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 bg-slate-900/30 border-t border-slate-800/50">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about the trend..."
                        className="w-full bg-slate-950/50 text-slate-200 text-sm rounded-xl pl-4 pr-10 py-3 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 border border-slate-800/50 placeholder-slate-600"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isTyping}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    );
};
