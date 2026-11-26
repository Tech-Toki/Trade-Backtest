// Candles are bid prices. Ask = bid + the instrument's spread. Buy at ask, sell at bid.
export const quote = (bid, spec) => ({ bid, ask: +(bid + (spec.spread || 0)).toFixed(spec.dp) });
