import React, { useEffect, useMemo, useRef } from 'react';
import {
  ColorType,
  CrosshairMode,
  LineType,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';

export type TvChartStyle = 'area' | 'line' | 'candle';

export interface TvCandlePoint {
  time: number; // seconds since epoch (UTC)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface TradingViewChartProps {
  data: TvCandlePoint[];
  height?: number;
  style: TvChartStyle;
  showVolume?: boolean;
}

const gridColor = '#1f2937';
const axisColor = '#1e293b';

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  data,
  height = 270,
  style,
  showVolume = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Area'> | ISeriesApi<'Line'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const sortedData = useMemo(() => {
    return [...data]
      .filter((d) => Number.isFinite(d.time))
      .sort((a, b) => a.time - b.time)
      .map((d) => ({
        ...d,
        time: Math.floor(d.time) as UTCTimestamp,
      }));
  }, [data]);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      height,
      width: containerRef.current.clientWidth,
      layout: {
        background: {
          type: ColorType.Solid,
          color: 'transparent',
        },
        textColor: '#94a3b8',
        fontSize: 11,
        fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system',
      },
      grid: {
        vertLines: { color: gridColor, style: 3, visible: true },
        horzLines: { color: gridColor, style: 3, visible: true },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#64748b', width: 1, style: 3, labelBackgroundColor: '#0f172a' },
        horzLine: { color: '#64748b', width: 1, style: 3, labelBackgroundColor: '#0f172a' },
      },
      timeScale: {
        borderColor: axisColor,
        secondsVisible: false,
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: axisColor,
      },
    });

    chartRef.current = chart;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current);
      seriesRef.current = null;
    }
    if (volumeSeriesRef.current) {
      chart.removeSeries(volumeSeriesRef.current);
      volumeSeriesRef.current = null;
    }

    if (sortedData.length === 0) {
      chart.timeScale().fitContent();
      return;
    }

    if (style === 'candle') {
      const candleSeries = chart.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#f87171',
        priceLineVisible: false,
      });
      candleSeries.setData(sortedData as CandlestickData[]);
      seriesRef.current = candleSeries;

      if (showVolume) {
        const histogram = chart.addHistogramSeries({
          color: '#475569',
          priceFormat: { type: 'volume' },
          priceScaleId: 'volume',
        });
        const volumeData = sortedData.map((d) => ({
          time: d.time,
          value: d.volume ?? 0,
          color: d.close >= d.open ? 'rgba(34,197,94,0.35)' : 'rgba(248,113,113,0.35)',
        }));
        histogram.setData(volumeData);
        volumeSeriesRef.current = histogram;
      }
    } else if (style === 'line') {
      const lineSeries = chart.addLineSeries({
        color: '#22c55e',
        lineWidth: 2,
        priceLineVisible: false,
        lineType: LineType.WithSteps,
      });
      lineSeries.setData(sortedData.map((d) => ({ time: d.time, value: d.close })));
      seriesRef.current = lineSeries;
    } else {
      const areaSeries = chart.addAreaSeries({
        lineColor: '#22c55e',
        topColor: 'rgba(34,197,94,0.45)',
        bottomColor: 'rgba(34,197,94,0.05)',
        lineWidth: 2,
        priceLineVisible: false,
      });
      areaSeries.setData(sortedData.map((d) => ({ time: d.time, value: d.close })));
      seriesRef.current = areaSeries;
    }

    chart.timeScale().fitContent();
  }, [sortedData, style, showVolume]);

  return <div ref={containerRef} className="w-full h-full" />;
};
