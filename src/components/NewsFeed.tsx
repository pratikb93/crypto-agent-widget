import React from 'react';
import type { NewsItem } from '../lib/api';

interface NewsFeedProps {
    news: NewsItem[];
    loading: boolean;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ news, loading }) => {
    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4 p-3 rounded-xl bg-slate-800/30 border border-slate-800/30">
                        <div className="w-16 h-16 bg-slate-700/50 rounded-lg shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-slate-700/50 rounded w-3/4" />
                            <div className="h-3 bg-slate-700/50 rounded w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (news.length === 0) {
        return <div className="text-center text-slate-500 py-8 text-sm">No recent news found.</div>;
    }

    return (
        <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {news.map((item) => (
                <a
                    key={item.uuid}
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex gap-4 p-3 rounded-xl bg-slate-800/30 border border-slate-800/30 hover:bg-slate-800/50 hover:border-slate-700/50 transition-all group"
                >
                    {item.thumbnail && (
                        <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-slate-900">
                            <img src={item.thumbnail} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-slate-200 group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                            {item.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
                            <span className="font-medium text-slate-400">{item.publisher}</span>
                            <span>•</span>
                            <span>{new Date(item.providerPublishTime * 1000).toLocaleDateString()}</span>
                        </div>
                    </div>
                </a>
            ))}
        </div>
    );
};
