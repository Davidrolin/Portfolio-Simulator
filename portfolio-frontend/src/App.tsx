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

function formatNumberWithSpaces(value: number, decimals = 0): string {
  return value
    .toLocaleString('sv-SE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    .replace(/\u00a0/g, ' ');
}

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

  const runSimulation = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const totalWeight = assets.reduce((sum, asset) => sum + asset.weight, 0);
    if (totalWeight !== 100) {
      setError(`Portföljens procentandelar måste summera till 100 %. Just nu är de ${totalWeight} %.`);
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
        throw new Error('Kunde inte köra simuleringen. Kontrollera dina aktiesymboler.');
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
    <div style={{ minHeight: '100vh', backgroundColor: '#0b1936', padding: '40px 24px' }}>
      <div style={{ maxWidth: '1320px', margin: '0 auto' }}>
        {/* Header */}
        <header style={{ marginBottom: '36px' }}>
          <h1
            style={{
              fontSize: '36px',
              fontWeight: 700,
              margin: '0 0 10px 0',
              letterSpacing: '-0.02em',
              color: '#ffffff',
            }}
          >
            Portföljsimulator
          </h1>
          <p
            style={{
              fontSize: '16px',
              color: '#cbd5e1',
              margin: 0,
              maxWidth: '720px',
              lineHeight: 1.5,
            }}
          >
            Simulera hur din aktieportfölj hade utvecklats historiskt och jämför avkastningen mot index (SPY) över olika tidsperioder.
          </p>
        </header>

        {/* Huvudlayout: Graf tar störst plats (ca 68%), kontroller till höger (ca 32%) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '32px',
            alignItems: 'start',
          }}
        >
          {/* Vänster: Stor graf + nyckeltal */}
          <div
            style={{
              gridColumn: 'span 2',
              backgroundColor: '#112246',
              borderRadius: '14px',
              padding: '28px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
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
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#ffffff' }}>
                  Utveckling över tid
                </h2>
                {result && (
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                    Indexerad utveckling (start = 100) · {formatNumberWithSpaces(chartSeries.length)} datapunkter
                  </span>
                )}
              </div>

              {/* Tidsramar */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {TIMEFRAMES.map((tf) => {
                  const active = timeframe === tf.key;
                  return (
                    <button
                      key={tf.key}
                      type="button"
                      onClick={() => setTimeframe(tf.key)}
                      disabled={!result}
                      style={{
                        padding: '7px 13px',
                        borderRadius: '8px',
                        border: active
                          ? '1px solid #38bdf8'
                          : '1px solid rgba(255, 255, 255, 0.14)',
                        backgroundColor: active ? '#1e3a6e' : 'rgba(255, 255, 255, 0.04)',
                        color: active ? '#ffffff' : '#cbd5e1',
                        fontSize: '13px',
                        fontWeight: active ? 600 : 400,
                        cursor: result ? 'pointer' : 'not-allowed',
                        opacity: result ? 1 : 0.5,
                      }}
                    >
                      {tf.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Själva grafen (stor och tydlig) */}
            <div style={{ width: '100%', height: '460px' }}>
              {result && chartSeries.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartSeries} margin={{ top: 12, right: 16, left: 4, bottom: 8 }}>
                    <CartesianGrid
                      strokeDasharray="2 4"
                      stroke="rgba(255, 255, 255, 0.08)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      stroke="#94a3b8"
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      tickLine={false}
                      minTickGap={36}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      stroke="#94a3b8"
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val: number) => formatNumberWithSpaces(val, 0)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f1e3d',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '10px',
                        color: '#f8fafc',
                      }}
                      formatter={(value: number, name: string, item) => {
                        const diffPct = value - 100;
                        const sign = diffPct >= 0 ? '+' : '';
                        const labelName =
                          name === 'portfolioIndexed' ? 'Portfölj' : 'SPY Index';
                        const rawVal =
                          name === 'portfolioIndexed'
                            ? item?.payload?.rawPortfolioValue
                            : item?.payload?.rawBenchmarkValue;
                        return [
                          `${formatNumberWithSpaces(value, 2)} (${sign}${formatNumberWithSpaces(diffPct, 2)} %) · Värde: ${formatNumberWithSpaces(Number(rawVal ?? 0), 2)}`,
                          labelName,
                        ];
                      }}
                      labelFormatter={(label: string) => `Datum: ${label}`}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: '12px' }}
                      formatter={(value: string) =>
                        value === 'portfolioIndexed' ? 'Portfölj' : 'SPY Index'
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="portfolioIndexed"
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, fill: '#38bdf8' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="benchmarkIndexed"
                      stroke="#34d399"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, fill: '#34d399' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                    border: '1px dashed rgba(255, 255, 255, 0.14)',
                    borderRadius: '10px',
                    fontSize: '15px',
                  }}
                >
                  Välj aktier och procentandel till höger och klicka på ”Simulera” för att visa utvecklingen.
                </div>
              )}
            </div>

            {/* Nyckeltal under grafen (inspirerat av bottenraden i skärmdumpen) */}
            {result && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '20px',
                  marginTop: '28px',
                  paddingTop: '22px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
                    Portfölj ({activeTimeframeLabel})
                  </div>
                  <div
                    style={{
                      fontSize: '26px',
                      fontWeight: 300,
                      marginTop: '4px',
                      color: (periodPortfolioReturn ?? 0) >= 0 ? '#34d399' : '#f87171',
                    }}
                  >
                    {periodPortfolioReturn !== null
                      ? `${periodPortfolioReturn >= 0 ? '+' : ''}${formatNumberWithSpaces(periodPortfolioReturn * 100, 2)} %`
                      : '0,00 %'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
                    SPY Index ({activeTimeframeLabel})
                  </div>
                  <div
                    style={{
                      fontSize: '26px',
                      fontWeight: 300,
                      marginTop: '4px',
                      color: (periodBenchmarkReturn ?? 0) >= 0 ? '#34d399' : '#f87171',
                    }}
                  >
                    {periodBenchmarkReturn !== null
                      ? `${periodBenchmarkReturn >= 0 ? '+' : ''}${formatNumberWithSpaces(periodBenchmarkReturn * 100, 2)} %`
                      : '0,00 %'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
                    Total avkastning (Portfölj)
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 300, marginTop: '4px', color: '#ffffff' }}>
                    {formatNumberWithSpaces(result.totalPortfolioReturn * 100, 2)} %
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
                    Volatilitet / Sharpe / Drawdown
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 400, marginTop: '8px', color: '#e2e8f0' }}>
                    {formatNumberWithSpaces(result.portfolioVolatility * 100, 1)} % ·{' '}
                    {formatNumberWithSpaces(result.sharpeRatio, 2)} ·{' '}
                    {formatNumberWithSpaces(result.maxDrawdown * 100, 1)} %
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Höger: Aktier och procentandel */}
          <div
            style={{
              backgroundColor: '#112246',
              borderRadius: '14px',
              padding: '28px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 600, color: '#ffffff' }}>
              Aktier och procentandel
            </h2>

            <form onSubmit={runSimulation}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 95px 38px',
                  gap: '10px',
                  marginBottom: '8px',
                  fontSize: '12px',
                  color: '#94a3b8',
                }}
              >
                <span>Aktie (ticker)</span>
                <span>Procent (%)</span>
                <span />
              </div>

              {assets.map((asset, index) => (
                <div
                  key={index}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 95px 38px',
                    gap: '10px',
                    marginBottom: '12px',
                    alignItems: 'center',
                  }}
                >
                  <input
                    type="text"
                    placeholder="T.ex. AAPL"
                    value={asset.ticker}
                    onChange={(e) => handleAssetChange(index, 'ticker', e.target.value)}
                    required
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      backgroundColor: '#192f5d',
                      color: '#ffffff',
                      fontSize: '14px',
                      width: '100%',
                    }}
                  />
                  <input
                    type="number"
                    placeholder="%"
                    value={asset.weight}
                    onChange={(e) => handleAssetChange(index, 'weight', e.target.value)}
                    required
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      backgroundColor: '#192f5d',
                      color: '#ffffff',
                      fontSize: '14px',
                      width: '100%',
                      textAlign: 'right',
                    }}
                  />
                  {assets.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeAsset(index)}
                      title="Ta bort aktie"
                      style={{
                        height: '38px',
                        width: '38px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: '#cbd5e1',
                        cursor: 'pointer',
                        fontSize: '16px',
                      }}
                    >
                      ×
                    </button>
                  ) : (
                    <div />
                  )}
                </div>
              ))}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={addAsset}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    backgroundColor: 'transparent',
                    color: '#e2e8f0',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  + Lägg till aktie
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '12px 18px',
                    backgroundColor: '#38bdf8',
                    color: '#0b1936',
                    fontWeight: 700,
                    fontSize: '15px',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Simulerar...' : 'Simulera'}
                </button>
              </div>
            </form>

            {error && (
              <p
                style={{
                  color: '#fca5a5',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  marginTop: '16px',
                  marginBottom: 0,
                }}
              >
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
