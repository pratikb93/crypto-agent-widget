import React, { useMemo } from 'react';
import type { IndicatorSnapshot } from '../agent/useCryptoAgent';
import type { NewsItem } from '../lib/api';

interface AIAnalystProps {
    indicators: IndicatorSnapshot | null;
    news: NewsItem[];
    symbol: string;
    loading: boolean;
}

export const AIAnalyst: React.FC<AIAnalystProps> = ({ indicators, news, symbol, loading }) => {
    const analysis = useMemo(() => {
        if (!indicators) return null;

        const parts: string[] = [];
        const { rsi, macd, macdSignal, maFast, maSlow, signal } = indicators;

        // 1. Signal Explanation
        if (signal === 'BUY') {
            parts.push(`My analysis suggests a **BUY** opportunity for ${symbol}.`);
        } else if (signal === 'SELL') {
            parts.push(`I am detecting a **SELL** signal for ${symbol}.`);
        } else {
            parts.push(`The market for ${symbol} is currently **NEUTRAL**. I recommend waiting for a clearer trend.`);
        }

        // 2. Technical Reasoning
        if (rsi && rsi < 30) {
            parts.push(`The asset appears **oversold** (RSI: ${rsi.toFixed(1)}), which often precedes a price bounce.`);
        } else if (rsi && rsi > 70) {
            parts.push(`The asset is currently **overbought** (RSI: ${rsi.toFixed(1)}), suggesting a potential pullback.`);
        }

        if (macd && macdSignal) {
            if (macd > macdSignal) {
                parts.push(`Momentum is building upwards as the MACD line has crossed above the signal line.`);
            } else {
                parts.push(`Bearish momentum is visible with the MACD falling below the signal line.`);
            }
        }

        if (maFast && maSlow) {
            if (maFast > maSlow) {
                parts.push(`The short-term trend is bullish, trading above the long-term average.`);
            } else {
                parts.push(`The trend remains bearish, with prices suppressed below key moving averages.`);
            }
        }

        // 3. News Sentiment (Simple keyword check)
        if (news.length > 0) {
            const positiveKeywords = ['surge', 'jump', 'gain', 'bull', 'high', 'record', 'growth', 'profit'];
            const negativeKeywords = ['drop', 'fall', 'crash', 'bear', 'low', 'loss', 'risk', 'down'];

            let sentimentScore = 0;
            news.slice(0, 5).forEach(item => {
                const text = (item.title + item.publisher).toLowerCase();
                if (positiveKeywords.some(k => text.includes(k))) sentimentScore++;
                if (negativeKeywords.some(k => text.includes(k))) sentimentScore--;
            });

            if (sentimentScore > 1) {
                parts.push(`Recent news sentiment appears **positive**, supporting a bullish outlook.`);
            } else if (sentimentScore < -1) {
                parts.push(`News headlines are skewing **negative**, which may add downward pressure.`);
            } else {
                parts.push(`Market news is mixed, showing no strong directional bias from headlines.`);
            }
        }

        return parts.join(' ');
    }, [indicators, news, symbol]);

    if (loading) {
        return (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20" />
                    <div className="h-4 w-32 bg-indigo-500/20 rounded" />
                </div>
                <div className="space-y-2">
                    <div className="h-3 w-full bg-indigo-500/10 rounded" />
                    <div className="h-3 w-5/6 bg-indigo-500/10 rounded" />
                    <div className="h-3 w-4/6 bg-indigo-500/10 rounded" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-24 h-24 text-indigo-500">
                    <path d="M16.5 7.5h-9v9h9v-9z" />
                    <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-4.104 3.114a11.069 11.069 0 005.589 5.589l3.114-4.104a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 4.5V4.5z" clipRule="evenodd" />
                </svg>
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.414a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.586a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM15.657 14.586a.75.75 0 010 1.06l-1.06 1.06a.75.75 0 11-1.06-1.06l1.06-1.06a.75.75 0 011.06 0zM6.464 5.414a.75.75 0 010-1.06l-1.06-1.06a.75.75 0 011.06 1.06l1.06 1.06z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-indigo-100">AI Market Analyst</h3>
                </div>

                <div className="prose prose-invert prose-sm max-w-none">
                    <p className="text-slate-300 leading-relaxed text-justify">
                        {analysis ? (
                            <span dangerouslySetInnerHTML={{ __html: analysis.replace(/\*\*(.*?)\*\*/g, '<span class="text-indigo-400 font-bold">$1</span>') }} />
                        ) : (
                            "Analyzing market data..."
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
};
