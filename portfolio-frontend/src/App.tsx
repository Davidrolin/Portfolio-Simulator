import { useState, useMemo, FormEvent } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import './App.css';

interface Asset {
  ticker: string;
  weight: number;
}

interface BacktestDataPoint {
  date: string;
  portfolioValue: number;
  benchmarkValue: number;
  portfolioDrawdown?: number;
}

interface ChartDataPoint {
  date: string;
  portfolioIndexed: number;
  benchmarkIndexed: number;
  rawPortfolioValue: number;
  rawBenchmarkValue: number;
}

interface BacktestResult {
  series: BacktestDataPoint[];
  totalPortfolioReturn: number;
  totalBenchmarkReturn: number;
  portfolioVolatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

type Timeframe = 'YTD' | '1Y' | '3Y' | '5Y' | '10Y' | 'MAX';

const TIMEFRAMES: { key: Timeframe; label: string }[] = [
  { key: 'YTD', label: 'I år' },
  { key: '1Y', label: '1 år' },
  { key: '3Y', label: '3 år' },
  { key: '5Y', label: '5 år' },
  { key: '10Y', label: '10 år' },
  { key: 'MAX', label: 'Max' },
];

function getCutoffDate(timeframe: Timeframe, latestDateStr?: string): string | null {
  if (timeframe === 'MAX') return null;

  const baseDate = latestDateStr ? new Date(`${latestDateStr}T00:00:00`) : new Date();
  if (Number.isNaN(baseDate.getTime())) return null;

  const cutoff = new Date(baseDate);

  if (timeframe === 'YTD') {
    cutoff.setMonth(0, 1);
  } else if (timeframe === '1Y') {
    cutoff.setFullYear(cutoff.getFullYear() - 1);
  } else if (timeframe === '3Y') {
    cutoff.setFullYear(cutoff.getFullYear() - 3);
  } else if (timeframe === '5Y') {
    cutoff.setFullYear(cutoff.getFullYear() - 5);
  } else if (timeframe === '10Y') {
    cutoff.setFullYear(cutoff.getFullYear() - 10);
  }

  return cutoff.toISOString().slice(0, 10);
}

function App() {
  const [assets, setAssets] = useState<Asset[]>([
    { ticker: 'AAPL', weight: 60 },
    { ticker: 'MSFT', weight: 40 },
  ]);

  const [timeframe, setTimeframe] = useState<Timeframe>('1Y');
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleAssetChange = (index: number, field: keyof Asset, value: string | number) => {
    const newAssets = [...assets];
    if (field === 'weight') {
      newAssets[index][field] = Number(value);
    } else {
      newAssets[index][field] = String(value).toUpperCase();
    }
    setAssets(newAssets);
  };

  const addAsset = () => {
    setAssets([...assets, { ticker: '', weight: 0 }]);
  };

  const removeAsset = (index: number) => {
    setAssets(assets.filter((_, i) => i !== index));
  };

  const runBacktest = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const totalWeight = assets.reduce((sum, asset) => sum + asset.weight, 0);
    if (totalWeight !== 100) {
      setError(`Portföljens vikter måste summera till 100%. Just nu är de ${totalWeight}%.`);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8080/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets }),
      });

      if (!response.ok) {
        throw new Error('Kunde inte köra backtest. Kontrollera dina tickers.');
      }

      const data: BacktestResult = await response.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ett oväntat fel uppstod.');
    } finally {
      setLoading(false);
    }
  };

  const { chartSeries, periodPortfolioReturn, periodBenchmarkReturn } = useMemo(() => {
    if (!result || result.series.length === 0) {
      return {
        chartSeries: [] as ChartDataPoint[],
        periodPortfolioReturn: null as number | null,
        periodBenchmarkReturn: null as number | null,
      };
    }

    const sorted = [...result.series].sort((a, b) => a.date.localeCompare(b.date));
    const latestDate = sorted[sorted.length - 1]?.date;
    const cutoffDate = getCutoffDate(timeframe, latestDate);

    const subset = cutoffDate
      ? sorted.filter((point) => point.date >= cutoffDate)
      : sorted;

    const seriesToUse = subset.length > 0 ? subset : sorted;
    const first = seriesToUse[0];
    const last = seriesToUse[seriesToUse.length - 1];

    const basePortfolio = first.portfolioValue !== 0 ? first.portfolioValue : 1;
    const baseBenchmark = first.benchmarkValue !== 0 ? first.benchmarkValue : 1;

    const normalized: ChartDataPoint[] = seriesToUse.map((point) => ({
      date: point.date,
      portfolioIndexed: Number(((point.portfolioValue / basePortfolio) * 100).toFixed(2)),
      benchmarkIndexed: Number(((point.benchmarkValue / baseBenchmark) * 100).toFixed(2)),
      rawPortfolioValue: point.portfolioValue,
      rawBenchmarkValue: point.benchmarkValue,
    }));

    const portReturn =
      first && first.portfolioValue !== 0
        ? (last.portfolioValue - first.portfolioValue) / first.portfolioValue
        : 0;

    const benchReturn =
      first && first.benchmarkValue !== 0
        ? (last.benchmarkValue - first.benchmarkValue) / first.benchmarkValue
        : 0;

    return {
      chartSeries: normalized,
      periodPortfolioReturn: portReturn,
      periodBenchmarkReturn: benchReturn,
    };
  }, [result, timeframe]);

  const activeTimeframeLabel =
    TIMEFRAMES.find((t) => t.key === timeframe)?.label ?? timeframe;

  return (
    <div style={{ maxWidth: '920px', margin: '40px auto', fontFamily: 'sans-serif', padding: '20px' }}>
      <h1>Portföljbacktester</h1>

      <form onSubmit={runBacktest}>
        <h3>Tillgångar och vikter</h3>
        {assets.map((asset, index) => (
          <div key={index} style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Ticker (t.ex. AAPL)"
              value={asset.ticker}
              onChange={(e) => handleAssetChange(index, 'ticker', e.target.value)}
              required
              style={{ padding: '8px', width: '150px' }}
            />
            <input
              type="number"
              placeholder="Vikt (%)"
              value={asset.weight}
              onChange={(e) => handleAssetChange(index, 'weight', e.target.value)}
              required
              style={{ padding: '8px', width: '100px' }}
            />
            {assets.length > 1 && (
              <button type="button" onClick={() => removeAsset(index)} style={{ padding: '8px' }}>
                Ta bort
              </button>
            )}
          </div>
        ))}

        <button type="button" onClick={addAsset} style={{ marginRight: '10px', padding: '8px 12px' }}>
          Lägg till tillgång
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '8px 16px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Kör backtest...' : 'Kör Backtest'}
        </button>
      </form>

      {error && <p style={{ color: 'red', marginTop: '20px' }}>{error}</p>}

      {result && (
        <div
          style={{
            marginTop: '36px',
            background: '#f9f9f9',
            color: '#1a1a1a',
            padding: '24px',
            borderRadius: '10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <h2 style={{ margin: 0 }}>Resultat</h2>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {TIMEFRAMES.map((tf) => {
                const active = timeframe === tf.key;
                return (
                  <button
                    key={tf.key}
                    type="button"
                    onClick={() => setTimeframe(tf.key)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #ccc',
                      background: active ? '#007bff' : 'white',
                      color: active ? 'white' : '#1a1a1a',
                      fontWeight: active ? 600 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {tf.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px',
              marginBottom: '24px',
            }}
          >
            <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e5e5e5' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>
                Avkastning ({activeTimeframeLabel}) – Portfölj
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  marginTop: '4px',
                  color: (periodPortfolioReturn ?? 0) >= 0 ? '#198754' : '#dc3545',
                }}
              >
                {periodPortfolioReturn !== null
                  ? `${periodPortfolioReturn >= 0 ? '+' : ''}${(periodPortfolioReturn * 100).toFixed(2)}%`
                  : '0.00%'}
              </div>
            </div>

            <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e5e5e5' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>
                Avkastning ({activeTimeframeLabel}) – SPY
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  marginTop: '4px',
                  color: (periodBenchmarkReturn ?? 0) >= 0 ? '#198754' : '#dc3545',
                }}
              >
                {periodBenchmarkReturn !== null
                  ? `${periodBenchmarkReturn >= 0 ? '+' : ''}${(periodBenchmarkReturn * 100).toFixed(2)}%`
                  : '0.00%'}
              </div>
            </div>

            <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e5e5e5' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>Total Avkastning (Portfölj)</div>
              <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>
                {(result.totalPortfolioReturn * 100).toFixed(2)}%
              </div>
            </div>

            <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e5e5e5' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>Total Avkastning (SPY Index)</div>
              <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>
                {(result.totalBenchmarkReturn * 100).toFixed(2)}%
              </div>
            </div>

            <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e5e5e5' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>Volatilitet (Årlig)</div>
              <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>
                {(result.portfolioVolatility * 100).toFixed(2)}%
              </div>
            </div>

            <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e5e5e5' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>Sharpe-kvot / Max Drawdown</div>
              <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '4px' }}>
                {result.sharpeRatio.toFixed(2)} / {(result.maxDrawdown * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          <h3>
            Utveckling ({activeTimeframeLabel}, start = 100) – {chartSeries.length} datapunkter
          </h3>
          <div
            style={{
              width: '100%',
              height: '360px',
              background: 'white',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e5e5e5',
              boxSizing: 'border-box',
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartSeries} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={30} />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(val: number) => val.toFixed(0)}
                />
                <Tooltip
                  formatter={(value: number, name: string, item) => {
                    const diffPct = (value - 100).toFixed(2);
                    const sign = value >= 100 ? '+' : '';
                    const labelName =
                      name === 'portfolioIndexed' ? 'Portfölj' : 'SPY Index';
                    const rawVal =
                      name === 'portfolioIndexed'
                        ? item?.payload?.rawPortfolioValue
                        : item?.payload?.rawBenchmarkValue;
                    return [
                      `${value.toFixed(2)} (${sign}${diffPct}%) · Råvärde: ${Number(rawVal ?? 0).toFixed(2)}`,
                      labelName,
                    ];
                  }}
                  labelFormatter={(label: string) => `Datum: ${label}`}
                />
                <Legend
                  formatter={(value: string) =>
                    value === 'portfolioIndexed' ? 'Portfölj' : 'SPY Index'
                  }
                />
                <Line
                  type="monotone"
                  dataKey="portfolioIndexed"
                  stroke="#007bff"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="benchmarkIndexed"
                  stroke="#28a745"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
