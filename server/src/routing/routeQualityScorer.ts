/**
 * Route Quality Scorer
 * Analyzes traffic patterns and route characteristics
 */

interface TrafficFactor {
  hour: number;
  delay: number;
  confidence: number;
}

/**
 * Detect congestion anomalies
 */
export function detectCongestionAnomaly(hour: number): boolean {
  // Typically high traffic: 7-9 AM, 4-6 PM
  const peakHours = [7, 8, 9, 16, 17];
  return peakHours.includes(hour);
}

/**
 * Score a route
 */
export function scoreRoute(factors: TrafficFactor[]): number {
  if (factors.length === 0) return 1.0;
  
  const avgDelay = factors.reduce((sum, f) => sum + f.delay, 0) / factors.length;
  return Math.max(0, 1.0 - (avgDelay / 1000));
}

export const routeQualityScorer = {
  detectCongestionAnomaly,
  scoreRoute,
};

export default routeQualityScorer;
