// Local AI: Congestion anomaly detection + route quality scoring
// No external APIs, runs entirely on Render

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  score: number; // 0-1, how unusual is this
  reason?: string;
  expectedSpeed?: number; // What we'd expect at this time
  observedSpeed?: number;
  deviation: number; // % deviation from expected
}

export interface RouteQualityScore {
  overall: number; // 0-100
  distance: number; // Prefer shorter routes (0-30 points)
  time: number; // Prefer faster routes (0-30 points)
  traffic: number; // Prefer less congested (0-20 points)
  safety: number; // Avoid dangerous conditions (0-20 points)
  recommendation: string;
}

class CongestionLearner {
  private observations: Map<string, SpeedObservation[]> = new Map(); // key: "hour:dayOfWeek"
  private hourlyStats: Map<string, HourlyStats> = new Map();
  private maxObservations = 1000; // Prevent memory bloat

  recordObservation(
    hour: number,
    dayOfWeek: number,
    speedMultiplier: number,
    roadType: string
  ) {
    const key = `${hour}:${dayOfWeek}:${roadType}`;

    if (!this.observations.has(key)) {
      this.observations.set(key, []);
    }

    this.observations.get(key)!.push({
      multiplier: speedMultiplier,
      timestamp: Date.now(),
    });

    // Cleanup old observations
    if (this.observations.get(key)!.length > this.maxObservations) {
      const obs = this.observations.get(key)!;
      obs.splice(0, Math.floor(obs.length * 0.2)); // Remove oldest 20%
    }

    this.updateHourlyStats(key);
  }

  private updateHourlyStats(key: string) {
    const obs = this.observations.get(key) || [];
    if (obs.length < 2) return;

    const multipliers = obs.map((o) => o.multiplier);
    const mean = multipliers.reduce((a, b) => a + b, 0) / multipliers.length;
    const variance =
      multipliers.reduce((sum, m) => sum + Math.pow(m - mean, 2), 0) / multipliers.length;
    const stdDev = Math.sqrt(variance);

    this.hourlyStats.set(key, {
      mean,
      stdDev,
      count: multipliers.length,
      min: Math.min(...multipliers),
      max: Math.max(...multipliers),
    });
  }

  detectAnomaly(
    hour: number,
    dayOfWeek: number,
    speedMultiplier: number,
    roadType: string
  ): AnomalyDetectionResult {
    const key = `${hour}:${dayOfWeek}:${roadType}`;
    const stats = this.hourlyStats.get(key);

    if (!stats || stats.count < 5) {
      // Not enough data, can't detect anomaly
      return {
        isAnomaly: false,
        score: 0,
        deviation: 0,
      };
    }

    // Z-score: how many standard deviations away from mean?
    const zScore = Math.abs((speedMultiplier - stats.mean) / (stats.stdDev || 0.1));
    const isAnomaly = zScore > 2; // 2 sigma = ~95% confidence

    return {
      isAnomaly,
      score: Math.min(zScore / 3, 1), // Normalize to 0-1
      reason: isAnomaly
        ? zScore > 3
          ? 'Extreme congestion detected'
          : 'Unusual traffic patterns'
        : undefined,
      expectedSpeed: stats.mean,
      observedSpeed: speedMultiplier,
      deviation: ((speedMultiplier - stats.mean) / stats.mean) * 100,
    };
  }

  getAnomalyCount(): { total: number; anomalies: number } {
    let total = 0;
    let anomalies = 0;

    for (const obs of this.observations.values()) {
      total += obs.length;
    }

    // Count high Z-scores
    for (const [key, stats] of this.hourlyStats) {
      if (stats.stdDev > 0.2) {
        anomalies += Math.ceil((stats.max - stats.mean) / stats.stdDev);
      }
    }

    return { total, anomalies };
  }
}

interface SpeedObservation {
  multiplier: number;
  timestamp: number;
}

interface HourlyStats {
  mean: number;
  stdDev: number;
  count: number;
  min: number;
  max: number;
}

export class RouteQualityScorer {
  private learner = new CongestionLearner();

  scoreRoute(
    distance: number, // meters
    duration: number, // seconds
    trafficMultiplier: number,
    weatherCondition: string,
    hasIncidents: boolean
  ): RouteQualityScore {
    let score = 0;

    // Distance scoring (prefer <20km)
    const distanceKm = distance / 1000;
    const distanceScore =
      distanceKm < 5 ? 30 : distanceKm < 20 ? 25 : distanceKm < 50 ? 15 : 5;

    // Time scoring (prefer <1.5 hours)
    const durationHours = duration / 3600;
    const timeScore =
      durationHours < 0.25
        ? 30
        : durationHours < 0.5
          ? 28
          : durationHours < 1
            ? 25
            : durationHours < 1.5
              ? 20
              : 10;

    // Traffic scoring (prefer low multipliers)
    const trafficScore =
      trafficMultiplier > 0.9
        ? 20
        : trafficMultiplier > 0.8
          ? 18
          : trafficMultiplier > 0.6
            ? 12
            : trafficMultiplier > 0.4
              ? 6
              : 0;

    // Safety scoring (weather + incidents)
    let safetyScore = 20;
    if (weatherCondition === 'snow' || weatherCondition === 'extreme') safetyScore -= 10;
    if (weatherCondition === 'rain') safetyScore -= 5;
    if (hasIncidents) safetyScore -= 8;

    score = distanceScore + timeScore + trafficScore + Math.max(0, safetyScore);

    let recommendation = '';
    if (score >= 85) {
      recommendation = 'Excellent route - fast, short, low traffic';
    } else if (score >= 70) {
      recommendation = 'Good route - reasonable time and conditions';
    } else if (score >= 55) {
      recommendation = 'Average route - slower or longer due to traffic/weather';
    } else {
      recommendation = 'Avoid - heavy congestion or dangerous conditions';
    }

    return {
      overall: Math.round(score),
      distance: Math.round(distanceScore),
      time: Math.round(timeScore),
      traffic: Math.round(trafficScore),
      safety: Math.max(0, safetyScore),
      recommendation,
    };
  }

  recordTraffic(
    hour: number,
    dayOfWeek: number,
    speedMultiplier: number,
    roadType: string
  ) {
    this.learner.recordObservation(hour, dayOfWeek, speedMultiplier, roadType);
  }

  detectCongestionAnomaly(
    hour: number,
    dayOfWeek: number,
    speedMultiplier: number,
    roadType: string
  ): AnomalyDetectionResult {
    return this.learner.detectAnomaly(hour, dayOfWeek, speedMultiplier, roadType);
  }

  getStats(): { observationCount: number; anomalyRate: number } {
    const { total, anomalies } = this.learner.getAnomalyCount();
    return {
      observationCount: total,
      anomalyRate: total > 0 ? (anomalies / total) * 100 : 0,
    };
  }
}

export const routeQualityScorer = new RouteQualityScorer();
