import React from 'react';

interface SignalGaugeProps {
    value: number; // -1 (Strong Sell) to 1 (Strong Buy)
    label: string;
    className?: string;
}

export const SignalGauge: React.FC<SignalGaugeProps> = ({ value, label, className }) => {
    // Clamp value between -1 and 1
    const clampedValue = Math.max(-1, Math.min(1, value));

    // Map value to angle: -1 -> -90deg, 1 -> 90deg
    const angle = clampedValue * 90;

    // Color based on value
    let color = '#94a3b8'; // slate-400 (Neutral)
    if (clampedValue > 0.2) color = '#34d399'; // emerald-400 (Buy)
    if (clampedValue > 0.6) color = '#10b981'; // emerald-500 (Strong Buy)
    if (clampedValue < -0.2) color = '#fb7185'; // rose-400 (Sell)
    if (clampedValue < -0.6) color = '#f43f5e'; // rose-500 (Strong Sell)

    const radius = 80;
    const strokeWidth = 12;
    const center = radius + strokeWidth;

    // Arc path generation
    const startAngle = -Math.PI;
    const endAngle = 0;

    return (
        <div className={`flex flex-col items-center ${className}`}>
            <div className="relative" style={{ width: center * 2, height: center }}>
                <svg width={center * 2} height={center} className="overflow-visible">
                    <defs>
                        <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f43f5e" />
                            <stop offset="50%" stopColor="#94a3b8" />
                            <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                    </defs>
                    {/* Background Arc */}
                    <path
                        d={`M ${strokeWidth},${center} A ${radius},${radius} 0 0 1 ${center * 2 - strokeWidth},${center}`}
                        fill="none"
                        stroke="#1e293b"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                    />

                    {/* Colored Arc (Gradient) */}
                    <path
                        d={`M ${strokeWidth},${center} A ${radius},${radius} 0 0 1 ${center * 2 - strokeWidth},${center}`}
                        fill="none"
                        stroke="url(#gauge-gradient)"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        opacity={0.3}
                    />

                    {/* Needle */}
                    <g
                        transform={`translate(${center}, ${center}) rotate(${angle})`}
                        className="transition-transform duration-700 ease-out"
                    >
                        <path
                            d="M -4,0 L 0,-radius L 4,0 Z"
                            fill={color}
                            transform={`scale(1, ${radius / 10})`} // Stretch needle
                        />
                        <circle r="6" fill={color} />
                        <path d={`M 0,-${radius - 5} L 0,0`} stroke={color} strokeWidth="2" />
                    </g>

                    {/* Ticks */}
                    {[-1, -0.5, 0, 0.5, 1].map((tick) => {
                        const tickAngle = tick * 90;
                        const isMajor = tick === 0 || Math.abs(tick) === 1;
                        return (
                            <g key={tick} transform={`translate(${center}, ${center}) rotate(${tickAngle})`}>
                                <line
                                    x1="0"
                                    y1={-radius + (isMajor ? -5 : 0)}
                                    x2="0"
                                    y2={-radius - (isMajor ? 10 : 5)}
                                    stroke="#475569"
                                    strokeWidth={isMajor ? 2 : 1}
                                />
                            </g>
                        )
                    })}
                </svg>

            </div>

            {/* Value Text */}
            <div className="mt-4 flex flex-col items-center">
                <div className="text-2xl font-bold transition-colors duration-300" style={{ color }}>
                    {label}
                </div>
            </div>
        </div>
    );
};
