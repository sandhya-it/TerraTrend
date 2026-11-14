import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { TrendAnalysisResult } from '../types/terratrend';

interface ScientificTimeSeriesChartProps {
  result: TrendAnalysisResult;
  comparisonResult?: TrendAnalysisResult | null;
  height?: number;
  onImageReady?: (dataUrl: string) => void;
}

export function ScientificTimeSeriesChart({
  result,
  comparisonResult,
  height = 380,
  onImageReady,
}: ScientificTimeSeriesChartProps) {
  const plotRef = useRef<HTMLDivElement | null>(null);
  const imageCallbackRef = useRef(onImageReady);
  imageCallbackRef.current = onImageReady;

  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;

    const xLabels = result.series.map((s) => s.label);
    const observed = result.series.map((s) => s.value);
    const movingAvg = result.series.map((s) => s.movingAverage);
    const senLine = result.series.map((s) => s.senFitted);
    const olsLine = result.series.map((s) => s.olsFitted);

    const traces: Plotly.Data[] = [
      {
        x: xLabels,
        y: observed,
        type: 'scatter',
        mode: 'lines+markers',
        name: `${result.regionName} (Observed)`,
        line: { color: '#3887FF', width: 1.5 },
        marker: { size: 4, color: '#36D9E6' },
        connectgaps: false,
      },
      {
        x: xLabels,
        y: movingAvg,
        type: 'scatter',
        mode: 'lines',
        name: 'Moving Average',
        line: { color: '#39D6A0', width: 2.2 },
        connectgaps: true,
      },
      {
        x: xLabels,
        y: senLine,
        type: 'scatter',
        mode: 'lines',
        name: "Sen's Slope Trend",
        line: { color: '#FFB547', width: 2.2, dash: 'dash' },
      },
      {
        x: xLabels,
        y: olsLine,
        type: 'scatter',
        mode: 'lines',
        name: 'OLS Linear Fit',
        line: { color: '#F45B69', width: 1.6, dash: 'dot' },
      },
    ];

    if (comparisonResult) {
      traces.push({
        x: comparisonResult.series.map((s) => s.label),
        y: comparisonResult.series.map((s) => s.value),
        type: 'scatter',
        mode: 'lines',
        name: `${comparisonResult.regionName} (Observed)`,
        line: { color: '#F45B69', width: 1.6 },
        connectgaps: false,
      });
      traces.push({
        x: comparisonResult.series.map((s) => s.label),
        y: comparisonResult.series.map((s) => s.senFitted),
        type: 'scatter',
        mode: 'lines',
        name: `${comparisonResult.regionName} (Sen Trend)`,
        line: { color: '#FF758F', width: 2, dash: 'dashdot' },
      });
    }

    const layout: Partial<Plotly.Layout> = {
      height,
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(7,20,38,0.55)',
      font: {
        family: 'IBM Plex Mono, monospace',
        color: '#8FA8C8',
        size: 11,
      },
      margin: { t: 28, r: 20, b: 48, l: 58 },
      xaxis: {
        gridcolor: 'rgba(54, 217, 230, 0.08)',
        zerolinecolor: 'rgba(54, 217, 230, 0.16)',
        tickangle: -20,
        nticks: 10,
      },
      yaxis: {
        title: { text: `${result.variableName} (${result.unit})`, font: { size: 11, color: '#F4F8FF' } },
        gridcolor: 'rgba(54, 217, 230, 0.08)',
        zerolinecolor: 'rgba(54, 217, 230, 0.16)',
      },
      legend: {
        orientation: 'h',
        y: 1.14,
        x: 0,
        font: { size: 10, color: '#F4F8FF' },
      },
      hovermode: 'x unified',
      hoverlabel: {
        bgcolor: '#0B1E36',
        bordercolor: '#36D9E6',
        font: { color: '#F4F8FF', family: 'IBM Plex Mono, monospace', size: 11 },
      },
    };

    const config: Partial<Plotly.Config> = {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    };

    Plotly.newPlot(el, traces, layout, config).then(() => {
      if (imageCallbackRef.current) {
        Plotly.toImage(el, { format: 'png', width: 920, height: 380 })
          .then((url) => imageCallbackRef.current?.(url))
          .catch(() => {});
      }
    });

    return () => {
      Plotly.purge(el);
    };
  }, [result, comparisonResult, height]);

  return <div ref={plotRef} className="w-full" />;
}
