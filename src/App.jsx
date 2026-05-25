import { useState, useEffect } from 'react';

const INSTRUMENTS = {
  XAUUSD: {
    label: 'XAUUSD',
    pipValue: 100,         // $100 per lot per $1 move
    pipSize: 1,            // $1 price move = 1 "pip" for gold
    slUnit: 'USD',
    slLabel: 'SL Distance ($)',
    entryPlaceholder: '2650.50',
    slPlaceholder: '2642.28',
    description: 'Gold / US Dollar',
    formula: 'Risk ÷ (SL Distance × $100)',
    formulaNote: 'XAUUSD: 1 lot = 100oz · $1 move = $100/lot',
    tpFormulaNote: (dir) => `Entry ${dir === 'BUY' ? '+' : '-'} (SL Distance × RR)`,
  },
  GBPUSD: {
    label: 'GBPUSD',
    pipValue: 10,          // $10 per lot per pip
    pipSize: 0.0001,       // 1 pip = 0.0001
    slUnit: 'pips',
    slLabel: 'SL Distance (pips)',
    entryPlaceholder: '1.27500',
    slPlaceholder: '1.27200',
    description: 'British Pound / US Dollar',
    formula: 'Risk ÷ (SL Pips × $10)',
    formulaNote: 'GBPUSD: 1 lot = 100,000 units · 1 pip = $10/lot',
    tpFormulaNote: (dir) => `Entry ${dir === 'BUY' ? '+' : '-'} (SL Pips × RR × 0.0001)`,
  },
};

export default function App() {
  const [instrument, setInstrument] = useState('XAUUSD');
  const [accountSize, setAccountSize] = useState('1000');
  const [entryPrice, setEntryPrice] = useState('');
  const [slPrice, setSlPrice] = useState('');
  const [riskPercentage, setRiskPercentage] = useState('1');
  const [riskReward, setRiskReward] = useState('3');

  const [lotSize, setLotSize] = useState(null);
  const [slDistance, setSlDistance] = useState(null);
  const [slDistancePips, setSlDistancePips] = useState(null);
  const [riskAmount, setRiskAmount] = useState(null);
  const [tpPrice, setTpPrice] = useState(null);
  const [potentialProfit, setPotentialProfit] = useState(null);
  const [tradeDirection, setTradeDirection] = useState(null);
  const [error, setError] = useState('');

  const inst = INSTRUMENTS[instrument];

  const [copiedEntry, setCopiedEntry] = useState(false);
  const [copiedSl, setCopiedSl] = useState(false);

  useEffect(() => {
    calculateLotSize();
  }, [accountSize, entryPrice, slPrice, riskPercentage, riskReward, instrument]);

  // Reset prices when switching instruments
  const handleInstrumentChange = (newInstrument) => {
    setInstrument(newInstrument);
    setEntryPrice('');
    setSlPrice('');
    setError('');
    setLotSize(null);
    setSlDistance(null);
    setSlDistancePips(null);
    setRiskAmount(null);
    setTpPrice(null);
    setPotentialProfit(null);
    setTradeDirection(null);
  };

  const calculateLotSize = () => {
    setError('');
    setLotSize(null);
    setSlDistance(null);
    setRiskAmount(null);
    setTpPrice(null);
    setPotentialProfit(null);
    setTradeDirection(null);

    // Validate inputs
    const account = parseFloat(accountSize);
    const entry = parseFloat(entryPrice);
    const sl = parseFloat(slPrice);
    const risk = parseFloat(riskPercentage);
    const rr = parseFloat(riskReward);

    if (!account || account <= 0) {
      setError('Please enter a valid account size!');
      return;
    }

    if (!entry || entry <= 0) {
      setError('Please enter a valid entry price!');
      return;
    }

    if (!sl || sl <= 0) {
      setError('Please enter a valid stop loss price!');
      return;
    }

    if (!risk || risk <= 0 || risk > 100) {
      setError('Risk percentage must be between 0 and 100!');
      return;
    }

    if (!rr || rr <= 0) {
      setError('Please enter a valid risk/reward ratio!');
      return;
    }

    if (entry === sl) {
      setError('Entry price and stop loss cannot be the same!');
      return;
    }

    // Determine trade direction
    const direction = entry > sl ? 'BUY' : 'SELL';
    setTradeDirection(direction);

    // Calculate risk amount in dollars
    const riskInDollars = (account * risk) / 100;

    const rawSlDistance = Math.abs(entry - sl);

    let calculatedLotSize;
    let calculatedTpPrice;
    let slInPips = null;

    if (instrument === 'XAUUSD') {
      // Lot Size = Risk / (SL distance × $100)
      calculatedLotSize = riskInDollars / (rawSlDistance * inst.pipValue);
      const tpDistance = rawSlDistance * rr;
      calculatedTpPrice = direction === 'BUY' ? entry + tpDistance : entry - tpDistance;
    } else {
      // GBPUSD: convert SL distance to pips first
      slInPips = rawSlDistance / inst.pipSize;
      // Lot Size = Risk / (SL pips × $10)
      calculatedLotSize = riskInDollars / (slInPips * inst.pipValue);
      const tpDistancePips = slInPips * rr;
      calculatedTpPrice = direction === 'BUY'
        ? entry + tpDistancePips * inst.pipSize
        : entry - tpDistancePips * inst.pipSize;
    }

    // Calculate potential profit
    const profit = riskInDollars * rr;

    // Validation checks
    if (calculatedLotSize < 0.01) {
      setError('Calculated lot size is below minimum (0.01). Consider increasing risk or reducing SL distance.');
    } else if (calculatedLotSize > 100) {
      setError('Calculated lot size exceeds maximum (100 lots). Consider reducing risk or increasing SL distance.');
    }

    setRiskAmount(riskInDollars);
    setSlDistance(rawSlDistance);
    setSlDistancePips(slInPips);
    setLotSize(calculatedLotSize);
    setTpPrice(calculatedTpPrice);
    setPotentialProfit(profit);
  };

  const resetCalculator = () => {
    setAccountSize('1000');
    setEntryPrice('');
    setSlPrice('');
    setRiskPercentage('1');
    setRiskReward('3');
    setLotSize(null);
    setSlDistance(null);
    setSlDistancePips(null);
    setRiskAmount(null);
    setTpPrice(null);
    setPotentialProfit(null);
    setTradeDirection(null);
    setError('');
  };

  const copyValue = (value, decimals = 5) => {
    if (value !== null && value !== undefined) {
      navigator.clipboard.writeText(value.toFixed(decimals));
    }
  };

  // Determine SL distance display
  const slDistanceDisplay = () => {
    if (instrument === 'XAUUSD') {
      return { value: `$${slDistance?.toFixed(3) ?? '—'}`, label: 'SL Distance' };
    } else {
      return { value: `${slDistancePips?.toFixed(1) ?? '—'} pips`, label: 'SL Distance' };
    }
  };

  const tpDistanceDisplay = () => {
    if (instrument === 'XAUUSD') {
      return { value: `$${(slDistance * riskReward)?.toFixed(3) ?? '—'}` };
    } else {
      return { value: `${(slDistancePips * riskReward)?.toFixed(1) ?? '—'} pips` };
    }
  };

  const tpDecimals = instrument === 'XAUUSD' ? 2 : 5;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center">
          <div className="inline-block mb-4">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
              Position Size Calculator
            </h1>
            <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
          </div>
          
          {/* Instrument Toggle */}
            <div className="flex justify-center mb-4">
              <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
                {Object.keys(INSTRUMENTS).map((key) => (
                  <button
                    key={key}
                    onClick={() => handleInstrumentChange(key)}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold tracking-wider transition-all duration-200 hover:cursor-pointer ${
                      instrument === key
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30'
                        : 'text-blue-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>

        </div>

        {/* Main Calculator Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="p-6 md:p-8">
            {/* Input Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Account Size */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold tracking-wider text-blue-100">
                  Account Size ($)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                    $
                  </span>
                  <input
                    type="number"
                    value={accountSize}
                    onChange={(e) => setAccountSize(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="1000"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Risk Percentage */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-blue-100 tracking-wider">
                  Risk Percentage (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={riskPercentage}
                    onChange={(e) => setRiskPercentage(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="1"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                    %
                  </span>
                </div>
              </div>

              {/* Entry Price */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-blue-100 tracking-wider">
                  Entry Price
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder={inst.entryPlaceholder}
                    step="0.0001"
                  />
                   <button
                    onClick={() => {
                      copyValue(parseFloat(entryPrice), 5);
                      setCopiedEntry(true);
                      setTimeout(() => setCopiedEntry(false), 1500);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 hover:cursor-pointer"
                    title="Copy entry price"
                  >
                    <i className={copiedEntry ? "fa-solid fa-check text-green-400" : "fa-regular fa-copy"} />
                  </button>
                </div>
              </div>

              {/* Stop Loss Price */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-blue-100 tracking-wider">
                  Stop Loss Price
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={slPrice}
                    onChange={(e) => setSlPrice(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder={inst.slPlaceholder}
                    step="0.01"
                  />
                  <button
                    onClick={() => {
                      copyValue(parseFloat(slPrice), 5);
                      setCopiedSl(true);
                      setTimeout(() => setCopiedSl(false), 1500);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 hover:cursor-pointer"
                    title="Copy stop loss price"
                  >
                    <i className={copiedSl ? "fa-solid fa-check text-green-400" : "fa-regular fa-copy"} />
                  </button>
                </div>
              </div>

              {/* Risk/Reward Ratio */}
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-semibold text-blue-100 tracking-wider">
                  Risk/Reward Ratio (1:X)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                    1:
                  </span>
                  <input
                    type="number"
                    value={riskReward}
                    onChange={(e) => setRiskReward(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="2"
                    step="0.1"
                    min="0.1"
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
                <p className="text-red-200 text-sm font-medium tracking-wider">{error}</p>
              </div>
            )}

            {/* Results Section */}
            {lotSize !== null && !error && (
              <div className="space-y-4 mb-6">
                {/* Trade Direction Badge */}
                {tradeDirection && (
                  <div className="flex justify-center">
                    <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                      tradeDirection === 'BUY' 
                        ? 'bg-green-500/20 text-green-300 border border-green-500/50' 
                        : 'bg-red-500/20 text-red-300 border border-red-500/50'
                    }`}>
                      {tradeDirection} Position
                    </span>
                  </div>
                )}

                {/* Lot Size Result - Main Display */}
                <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-6 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium mb-1">
                        Calculated Lot Size
                      </p>
                      <p className="text-white text-4xl font-bold tracking-tight">
                        {lotSize.toFixed(5)}
                      </p>
                    </div>
                    <button
                      onClick={() => copyValue(lotSize, 2)}
                      className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm font-medium transition-all active:scale-95 hover:cursor-pointer"
                      title="Copy to clipboard"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* TP Price - Secondary Display */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium mb-1">
                        Take Profit Level
                      </p>
                      <p className="text-white text-4xl font-bold tracking-tight">
                        {tpPrice.toFixed(tpDecimals)}
                      </p>
                    </div>
                    <button
                      onClick={() => copyValue(tpPrice, tpDecimals)}
                      className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm font-medium transition-all active:scale-95 hover:cursor-pointer"
                      title="Copy to clipboard"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Additional Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                    <p className="text-blue-200 text-xs font-medium mb-1">
                      Risk Amount
                    </p>
                    <p className="text-white text-2xl font-bold">
                      ${riskAmount.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                    <p className="text-blue-200 text-xs font-medium mb-1">
                      Potential Profit
                    </p>
                    <p className="text-green-400 text-2xl font-bold">
                      ${potentialProfit.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                    <p className="text-blue-200 text-xs font-medium mb-1">
                      SL Distance
                    </p>
                    <p className="text-white text-2xl font-bold">
                     {slDistanceDisplay().value}
                    </p>
                  </div>
                  <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                    <p className="text-blue-200 text-xs font-medium mb-1">
                      TP Distance
                    </p>
                    <p className="text-white text-2xl font-bold">
                     {tpDistanceDisplay().value}
                    </p>
                  </div>
                </div>

                {/* Quick Info */}
                <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-blue-100 text-sm leading-relaxed">
                      <p className="mb-2">
                        <span className="font-semibold">Lot Size:</span> {inst.formula}
                      </p>
                      <p className="mb-2">
                        <span className="font-semibold">TP Level:</span> {inst.tpFormulaNote(tradeDirection)}
                      </p>
                      <p className="text-xs text-blue-300">
                        {inst.formulaNote}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reset Button */}
            <button
              onClick={resetCalculator}
              className="hover:cursor-pointer w-full py-3 bg-white/5 hover:bg-white/10 border border-white/20 rounded-xl text-white font-medium transition-all active:scale-98"
            >
              Reset Calculator
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-blue-300 text-sm">
            Trade responsibly. Always manage your risk properly.
          </p>
        </div>
      </div>
    </div>
  );
}
