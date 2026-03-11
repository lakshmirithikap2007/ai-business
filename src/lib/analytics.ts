/**
 * Simple linear regression for time series or numeric forecasting.
 * y = mx + b
 */
export interface ForecastPoint {
  x: string | number;
  y: number;
  isForecast: boolean;
}

export function generateForecast(
  data: Record<string, unknown>[],
  xKey: string,
  yKey: string,
  forecastSteps: number = 5
): ForecastPoint[] {
  if (data.length < 2) return data.map(d => ({ x: String(d[xKey]), y: Number(d[yKey]), isForecast: false }));

  // Prepare points for regression
  // Handle numeric x-axis or treat as indices
  const points = data.map((d, i) => ({
    x: i,
    y: Number(d[yKey] || 0),
    originalX: String(d[xKey]),
  }));

  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Historical points
  const result: ForecastPoint[] = points.map(p => ({
    x: p.originalX,
    y: p.y,
    isForecast: false,
  }));

  // Forecast points
  const lastX = points[points.length - 1].x;
  const lastOriginalX = points[points.length - 1].originalX;

  for (let i = 1; i <= forecastSteps; i++) {
    const nextX = lastX + i;
    const predictedY = Math.max(0, slope * nextX + intercept); // Avoid negative predictions
    
    // Attempt to increment the x label if it's numeric/date-like
    let nextLabel = `Next ${i}`;
    if (!isNaN(Number(lastOriginalX))) {
      nextLabel = String(Number(lastOriginalX) + i);
    } else {
      // Basic seasonal label if possible, else just generic
      nextLabel = `Forecast ${i}`;
    }

    result.push({
      x: nextLabel,
      y: predictedY,
      isForecast: true,
    });
  }

  return result;
}
