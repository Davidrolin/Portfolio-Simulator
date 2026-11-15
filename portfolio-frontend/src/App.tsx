import { useState, FormEvent } from 'react';
import './App.css';

interface Asset {
  ticker: string;
  weight: number;
}

interface BacktestDataPoint {
  date: string;
  portfolioValue: number;
  benchmarkValue: number;
  portfolioDrawdown: number;
}

interface BacktestResult {
  series: BacktestDataPoint[];
  totalPortfolioReturn: number;
  totalBenchmarkReturn: number;
  portfolioVolatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

function App() {
  const [assets, setAssets] = useState<Asset[]>([
    { ticker: 'AAPL', weight: 60 },
    { ticker: 'MSFT', weight: 40 }
  ]);

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
        body: JSON.stringify({ assets })
      });

      if (!response.ok) {
        throw new Error('Kunde inte köra backtest. Kontrollera dina tickers.');
      }

      const data: BacktestResult = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', fontFamily: 'sans-serif', padding: '20px' }}>
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
        <button type="submit" disabled={loading} style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
          {loading ? 'Kör backtest...' : 'Kör Backtest'}
        </button>
      </form>

      {error && <p style={{ color: 'red', marginTop: '20px' }}>{error}</p>}

      {result && (
        <div style={{ marginTop: '40px', background: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
          <h2>Resultat</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '20px' }}>
            <div><strong>Total Avkastning (Portfölj):</strong> {(result.totalPortfolioReturn * 100).toFixed(2)}%</div>
            <div><strong>Total Avkastning (SPY Index):</strong> {(result.totalBenchmarkReturn * 100).toFixed(2)}%</div>
            <div><strong>Volatilitet (Årlig):</strong> {(result.portfolioVolatility * 100).toFixed(2)}%</div>
            <div><strong>Sharpe-kvot:</strong> {result.sharpeRatio.toFixed(2)}</div>
            <div><strong>Max Drawdown:</strong> {(result.maxDrawdown * 100).toFixed(2)}%</div>
          </div>

          <h3>Historisk utveckling ({result.series.length} datapunkter)</h3>
          <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'white', padding: '10px', border: '1px solid #ddd' }}>
            {result.series.map((point, index) => (
              <div key={index} style={{ fontSize: '14px', borderBottom: '1px solid #eee', padding: '4px 0' }}>
                {point.date} — Portfölj: {point.portfolioValue.toFixed(2)} | SPY: {point.benchmarkValue.toFixed(2)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
