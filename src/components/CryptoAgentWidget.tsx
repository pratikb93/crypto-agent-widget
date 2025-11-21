import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useCryptoAgent } from '../agent/useCryptoAgent';
import type { Timeframe, SearchResult } from '../lib/api';
import { TradingViewChart, type TvChartStyle } from './TradingViewChart';
import { SignalGauge } from './SignalGauge';
import { NewsFeed } from './NewsFeed';
import { AIAnalyst } from './AIAnalyst';
import { AgentChat } from './AgentChat';

const timeframeLabels: Record<Timeframe, string> = {
    '30m': '30m',
    '1h': '1H',
    '2h': '2H',
    '4h': '4H',
    '1d': '1D',
};

export const CryptoAgentWidget: React.FC = () => {
    const { state, setSymbol, setTimeframe, search } = useCryptoAgent('BTC-USD', '4h');
    const { symbol, timeframe, candles, indicators, profile, news, loading, error } = state;

    const [chartStyle, setChartStyle] = useState<TvChartStyle>('area');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length > 1) {
                setIsSearching(true);
                try {
                    const results = await search(searchQuery);
                    setSearchResults(results);
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, search]);

    // Click outside to close search
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSearch(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const chartData = useMemo(
        () =>
            state.candles.map((c) => ({
                time: c.openTime / 1000, // TV chart expects seconds
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: c.volume,
            })),
        [state.candles]
    );

    const indicator = state.indicators;

    // Map signal to gauge value (-1 to 1)
    const gaugeValue = useMemo(() => {
        if (!indicator) return 0;
        let score = 0;

        // RSI contribution (-0.5 to 0.5)
        if (indicator.rsi) {
            score += (50 - indicator.rsi) / 40;
        }

        // MACD contribution (-0.5 to 0.5)
        if (indicator.macd && indicator.macdSignal) {
            if (indicator.macd > indicator.macdSignal) score += 0.3;
            else score -= 0.3;
        }

        // Moving Average contribution
        if (indicator.maFast && indicator.maSlow) {
            if (indicator.maFast > indicator.maSlow) score += 0.2;
            else score -= 0.2;
        }

        return Math.max(-1, Math.min(1, score));
    }, [indicator]);

    const gaugeLabel = useMemo(() => {
        if (gaugeValue >= 0.5) return 'STRONG BUY';
        if (gaugeValue >= 0.15) return 'BUY';
        if (gaugeValue <= -0.5) return 'STRONG SELL';
        if (gaugeValue <= -0.15) return 'SELL';
        return 'NEUTRAL';
    }, [gaugeValue]);

    return (
        <div className="w-full max-w-6xl rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl shadow-slate-950/50 backdrop-blur-2xl overflow-hidden font-sans transition-all duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 sm:px-8 py-5 border-b border-slate-800/60 bg-gradient-to-r from-slate-900/50 via-slate-900/30 to-slate-900/50 gap-4">
                <div className="flex-1 min-w-0 relative" ref={searchRef}>
                    <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setShowSearch(!showSearch)}>
                        <div className="relative">
                            <div className="absolute -inset-2 bg-emerald-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <h1 className="relative text-2xl sm:text-3xl font-bold text-slate-50 tracking-tight group-hover:text-emerald-400 transition-colors duration-300">
                                {profile?.name || state.symbol}
                            </h1>
                        </div>
                        <div className="flex flex-col items-start">
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span className="font-mono bg-slate-800/80 px-2 py-0.5 rounded text-slate-300 border border-slate-700/50">{state.symbol}</span>
                                {profile?.exchange && <span className="hidden sm:inline">• {profile.exchange}</span>}
                            </div>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors duration-300 transform group-hover:rotate-180">
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                    </div>

                    {/* Search Dropdown */}
                    {showSearch && (
                        <div className="absolute top-full left-0 mt-3 w-full sm:w-[28rem] bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-3 border-b border-slate-800">
                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                                    </svg>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-800/50 text-slate-200 text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder-slate-500 transition-all"
                                        placeholder="Search symbol (e.g. AAPL, BTC-USD)..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                {isSearching ? (
                                    <div className="p-8 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
                                        <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                                        Searching...
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    searchResults.map((res) => (
                                        <button
                                            key={res.ticker}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-800/50 flex items-center justify-between group transition-all border-b border-slate-800/30 last:border-0"
                                            onClick={() => {
                                                setSymbol(res.ticker);
                                                setShowSearch(false);
                                                setSearchQuery('');
                                                setSearchResults([]);
                                            }}
                                        >
                                            <div>
                                                <div className="font-semibold text-slate-200 text-sm group-hover:text-emerald-400 transition-colors">{res.ticker}</div>
                                                <div className="text-xs text-slate-500 truncate max-w-[240px]">{res.name}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded-md border border-slate-700/50">{res.exchange}</div>
                                                <div className="text-[10px] text-slate-600 mt-1">{res.type}</div>
                                            </div>
                                        </button>
                                    ))
                                ) : searchQuery.length > 1 ? (
                                    <div className="p-8 text-center text-sm text-slate-500">No results found</div>
                                ) : (
                                    <div className="p-8 text-center text-sm text-slate-500">Type to search...</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className="inline-flex rounded-xl bg-slate-950/40 p-1.5 border border-slate-800/60">
                        {(['30m', '1h', '4h', '1d'] as Timeframe[]).map((tf) => (
                            <button
                                key={tf}
                                onClick={() => setTimeframe(tf)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${state.timeframe === tf
                                    ? 'bg-emerald-500/10 text-emerald-400 shadow-sm border border-emerald-500/20'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                                    }`}
                            >
                                {timeframeLabels[tf]}
                            </button>
                        ))}
                    </div>
                    <div className="inline-flex rounded-xl bg-slate-950/40 p-1.5 border border-slate-800/60">
                        {(['area', 'candle'] as TvChartStyle[]).map((style) => (
                            <button
                                key={style}
                                type="button"
                                onClick={() => setChartStyle(style)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${chartStyle === style
                                    ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                                    }`}
                            >
                                {style === 'area' ? 'Line' : 'Candles'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr,350px] divide-y lg:divide-y-0 lg:divide-x divide-slate-800/60">
                {/* Main Chart Area */}
                <div className="p-4 sm:p-6 bg-slate-900/20 flex flex-col gap-6">
                    <div className="h-[500px] w-full rounded-2xl overflow-hidden relative group border border-slate-800/40 bg-slate-950/30 shadow-inner">
                        {state.loading && chartData.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10 backdrop-blur-sm">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                                    <div className="text-emerald-400 text-sm font-medium animate-pulse">Loading market data...</div>
                                </div>
                            </div>
                        )}
                        {state.error ? (
                            <div className="h-full flex items-center justify-center text-sm text-rose-400 bg-rose-500/5">
                                <div className="bg-rose-950/30 px-6 py-4 rounded-xl border border-rose-500/20 flex items-center gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                    </svg>
                                    {state.error}
                                </div>
                            </div>
                        ) : (
                            <TradingViewChart
                                data={chartData}
                                style={chartStyle}
                                height={500}
                                showVolume={true}
                            />
                        )}
                    </div>

                    {/* AI Analyst Section */}
                    <AIAnalyst indicators={indicators} news={news} symbol={symbol} loading={loading} />

                    {/* News Feed Section */}
                    <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-4 font-medium flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
                            </svg>
                            Latest News
                        </div>
                        <NewsFeed news={news} loading={loading} />
                    </div>

                    {/* Profile Info */}
                    {profile && (
                        <div className="mt-2">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-lg font-bold text-slate-200 border border-slate-700 shadow-lg">
                                    {symbol.substring(0, 1)}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-100 tracking-tight">{profile?.name || symbol}</h2>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span className="bg-slate-800/50 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700/50">{profile?.exchange || 'CRYPTO'}</span>
                                        <span>•</span>
                                        <span>{profile?.currency || 'USD'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs border-t border-slate-800/50 pt-6 px-2">
                                <div className="space-y-1">
                                    <div className="text-slate-500 uppercase tracking-wider text-[10px]">Sector</div>
                                    <div className="text-slate-300 font-medium text-sm">{profile.sector || '-'}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-slate-500 uppercase tracking-wider text-[10px]">Industry</div>
                                    <div className="text-slate-300 font-medium text-sm truncate" title={profile.industry}>{profile.industry || '-'}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-slate-500 uppercase tracking-wider text-[10px]">Country</div>
                                    <div className="text-slate-300 font-medium text-sm">{profile.country || '-'}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-slate-500 uppercase tracking-wider text-[10px]">Website</div>
                                    {profile.website ? (
                                        <a href={profile.website} target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 hover:underline truncate block text-sm transition-colors">
                                            Visit Site &rarr;
                                        </a>
                                    ) : (
                                        <span className="text-slate-600">-</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar / Analysis */}
                <div className="bg-slate-950/20 p-6 space-y-8 backdrop-blur-sm flex flex-col h-full">
                    {/* Price & Signal */}
                    <div className="space-y-6">
                        <div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">Current Price</div>
                            <div className="text-4xl font-bold text-slate-50 font-mono tracking-tight">
                                {indicator?.lastPrice
                                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: profile?.currency || 'USD' }).format(indicator.lastPrice)
                                    : '--'}
                            </div>
                            {indicator?.lastPrice && (
                                <div className="text-xs text-slate-500 mt-1">
                                    Updated {new Date().toLocaleTimeString()}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col items-center justify-center py-4 bg-slate-900/40 rounded-2xl border border-slate-800/50">
                            <SignalGauge value={gaugeValue} label={gaugeLabel} />
                            <div className="text-[10px] text-slate-500 mt-2 text-center px-4">
                                Signal strength based on RSI, MACD & MA convergence
                            </div>
                        </div>
                    </div>

                    {/* Agent Chat */}
                    <div>
                        <AgentChat symbol={symbol} indicators={indicators} />
                    </div>

                    {/* Technicals */}
                    <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-4 font-medium flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                <path fillRule="evenodd" d="M1 2.75A.75.75 0 011.75 2h16.5a.75.75 0 010 1.5H1.75A.75.75 0 011 2.75zm0 9A.75.75 0 011.75 11h16.5a.75.75 0 010 1.5H1.75A.75.75 0 011 11.75zM1.75 7a.75.75 0 000 1.5h16.5a.75.75 0 000-1.5H1.75zM1.75 16.25a.75.75 0 000 1.5h16.5a.75.75 0 000-1.5H1.75z" clipRule="evenodd" />
                            </svg>
                            Key Indicators
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-800/30 hover:bg-slate-800/50 transition-colors">
                                <span className="text-xs text-slate-400 font-medium">RSI (14)</span>
                                <span className={`text-sm font-mono font-bold ${(indicator?.rsi ?? 50) > 70 ? 'text-rose-400' : (indicator?.rsi ?? 50) < 30 ? 'text-emerald-400' : 'text-slate-200'
                                    }`}>
                                    {indicator?.rsi?.toFixed(2) ?? '--'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-800/30 hover:bg-slate-800/50 transition-colors">
                                <span className="text-xs text-slate-400 font-medium">MACD</span>
                                <div className="text-right">
                                    <div className={`text-sm font-mono font-bold ${(indicator?.macd ?? 0) > (indicator?.macdSignal ?? 0) ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {indicator?.macd?.toFixed(2) ?? '--'}
                                    </div>
                                    <div className="text-[10px] text-slate-500">Sig: {indicator?.macdSignal?.toFixed(2) ?? '--'}</div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-800/30 hover:bg-slate-800/50 transition-colors">
                                <span className="text-xs text-slate-400 font-medium">Trend (MA)</span>
                                <div className="text-right">
                                    <div className={`text-sm font-bold ${(indicator?.maFast ?? 0) > (indicator?.maSlow ?? 0) ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {(indicator?.maFast ?? 0) > (indicator?.maSlow ?? 0) ? 'BULLISH' : 'BEARISH'}
                                    </div>
                                    <div className="text-[10px] text-slate-500">20 vs 50 SMA</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
