import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';

export type ChartMode = 'area' | 'line' | 'candle';

export interface ChartDatum {
  time: number; // unix ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface D3PriceChartProps {
  data: ChartDatum[];
  mode: ChartMode;
  className?: string;
  emptyLabel?: string;
}

const padding = { top: 12, right: 18, bottom: 20, left: 40 };

export const D3PriceChart: React.FC<D3PriceChartProps> = ({ data, mode, className, emptyLabel }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const chartState = useMemo(() => {
    if (!data || data.length === 0 || size.width === 0 || size.height === 0) {
      return null;
    }

    const sorted = [...data].sort((a, b) => a.time - b.time);
    const xExtent = d3.extent(sorted, (d) => d.time) as [number, number];
    const yExtent = [
      d3.min(sorted, (d) => d.low) ?? 0,
      d3.max(sorted, (d) => d.high) ?? 1,
    ];

    const width = size.width;
    const height = size.height;

    const xScale = d3
      .scaleTime()
      .domain(xExtent)
      .range([padding.left, width - padding.right]);

    const yScale = d3
      .scaleLinear()
      .domain([yExtent[0], yExtent[1]])
      .nice()
      .range([height - padding.bottom, padding.top]);

    const lineGenerator = d3
      .line<ChartDatum>()
      .x((d) => xScale(d.time))
      .y((d) => yScale(d.close))
      .curve(d3.curveMonotoneX);

    const areaGenerator = d3
      .area<ChartDatum>()
      .x((d) => xScale(d.time))
      .y0(height - padding.bottom)
      .y1((d) => yScale(d.close))
      .curve(d3.curveMonotoneX);

    const xTicks = xScale.ticks(4).map((tick) => ({ value: tick as Date, x: xScale(tick) }));
    const yTicks = yScale.ticks(5).map((tick) => ({ value: tick as number, y: yScale(tick) }));

    return {
      sorted,
      xScale,
      yScale,
      linePath: lineGenerator(sorted) ?? '',
      areaPath: areaGenerator(sorted) ?? '',
      xTicks,
      yTicks,
      width,
      height,
    };
  }, [data, size]);

  return (
    <div ref={containerRef} className={className}>
      {chartState ? (
        <svg width={chartState.width} height={chartState.height} className="text-xs">
          <defs>
            <linearGradient id="d3-area-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(34,197,94,0.55)" />
              <stop offset="100%" stopColor="rgba(34,197,94,0.05)" />
            </linearGradient>
          </defs>

          {/* grid lines */}
          {chartState.yTicks.map((tick) => (
            <line
              key={`y-grid-${tick.value}`}
              x1={padding.left}
              x2={chartState.width - padding.right}
              y1={tick.y}
              y2={tick.y}
              stroke="rgba(148,163,184,0.12)"
              strokeDasharray="4 4"
            />
          ))}

          {chartState.xTicks.map((tick) => (
            <line
              key={`x-grid-${tick.value}`}
              x1={tick.x}
              x2={tick.x}
              y1={padding.top}
              y2={chartState.height - padding.bottom}
              stroke="rgba(148,163,184,0.08)"
              strokeDasharray="4 4"
            />
          ))}

          {/* Y-axis labels */}
          {chartState.yTicks.map((tick) => (
            <text key={`y-label-${tick.value}`} x={padding.left - 8} y={tick.y + 3} fill="#94a3b8" fontSize={10} textAnchor="end">
              {tick.value.toFixed(0)}
            </text>
          ))}

          {/* X-axis labels */}
          {chartState.xTicks.map((tick) => (
            <text
              key={`x-label-${tick.value}`}
              x={tick.x}
              y={chartState.height - 4}
              fill="#94a3b8"
              fontSize={10}
              textAnchor="middle"
            >
              {d3.timeFormat('%b %d')(tick.value as Date)}
            </text>
          ))}

          {mode === 'area' && (
            <>
              <path d={chartState.areaPath} fill="url(#d3-area-fill)" stroke="none" />
              <path d={chartState.linePath} fill="none" stroke="#22c55e" strokeWidth={2} />
            </>
          )}

          {mode === 'line' && <path d={chartState.linePath} fill="none" stroke="#22c55e" strokeWidth={2} />}

          {mode === 'candle' &&
            chartState.sorted.map((d) => {
              const x = chartState.xScale(d.time);
              const candleWidth = Math.max(2, (chartState.width - padding.left - padding.right) / chartState.sorted.length - 2);
              const candleX = x - candleWidth / 2;
              const yOpen = chartState.yScale(d.open);
              const yClose = chartState.yScale(d.close);
              const yHigh = chartState.yScale(d.high);
              const yLow = chartState.yScale(d.low);
              const isUp = d.close >= d.open;
              return (
                <g key={`candle-${d.time}`}>
                  <line x1={x} x2={x} y1={yHigh} y2={yLow} stroke={isUp ? '#22c55e' : '#ef4444'} strokeWidth={1} />
                  <rect
                    x={candleX}
                    y={Math.min(yOpen, yClose)}
                    width={candleWidth}
                    height={Math.max(Math.abs(yClose - yOpen), 1)}
                    fill={isUp ? '#22c55e' : '#ef4444'}
                    opacity={0.9}
                    rx={1}
                  />
                </g>
              );
            })}
        </svg>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
          {emptyLabel ?? 'No chart data available'}
        </div>
      )}
    </div>
  );
};
