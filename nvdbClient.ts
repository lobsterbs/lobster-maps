// NVDB (Nasjonalt vegdatabank) - Norwegian road database
// API for checking road closures, incidents, and restrictions
// No API key required - public data

export interface NVDBIncident {
  id: string;
  roadRef: string; // E.g., "E6", "Fv4"
  location: {
    lat: number;
    lng: number;
    description: string;
  };
  type:
    | 'closed'
    | 'accident'
    | 'roadworks'
    | 'weather'
    | 'other';
  severity: 'closed' | 'major' | 'moderate' | 'minor';
  description: string;
  estimatedStart?: Date;
  estimatedEnd?: Date;
  affectedLanes?: number;
}

export class NVDBClient {
  private baseUrl = 'https://dataut.vegvesen.no/api/v3';
  private cachedIncidents: Map<string, NVDBIncident> = new Map();
  private lastUpdate = 0;
  private updateInterval = 300000; // 5 minutes cache

  /**
   * Get current road closures and incidents
   */
  async getIncidents(
    region?: string // E.g., "Hordaland", "Sogn og Fjordane"
  ): Promise<NVDBIncident[]> {
    // Check cache first
    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval) {
      return Array.from(this.cachedIncidents.values());
    }

    try {
      // Query NVDB for traffic situations (DATEX format)
      const url = region
        ? `${this.baseUrl}/situations?areas=${region}`
        : `${this.baseUrl}/situations`;

      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        console.warn(`NVDB API error: ${response.statusText}`);
        return Array.from(this.cachedIncidents.values());
      }

      const data = await response.json();
      this.parseIncidents(data);
      this.lastUpdate = now;

      return Array.from(this.cachedIncidents.values());
    } catch (err) {
      console.error('Failed to fetch NVDB incidents:', err);
      return Array.from(this.cachedIncidents.values());
    }
  }

  /**
   * Check if a specific road segment is affected by closures
   */
  async isRoadClosed(
    roadId: string,
    lat: number,
    lng: number,
    bufferKm: number = 1
  ): Promise<boolean> {
    const incidents = await this.getIncidents();

    for (const incident of incidents) {
      if (
        incident.type === 'closed' &&
        this.isNearIncident(lat, lng, incident.location.lat, incident.location.lng, bufferKm)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get delay estimate for a route due to incidents
   */
  async estimateDelay(
    route: Array<{ lat: number; lng: number }>,
    bufferKm: number = 0.5
  ): Promise<number> {
    // In seconds
    const incidents = await this.getIncidents();
    let totalDelay = 0;

    for (const point of route) {
      for (const incident of incidents) {
        if (
          this.isNearIncident(
            point.lat,
            point.lng,
            incident.location.lat,
            incident.location.lng,
            bufferKm
          )
        ) {
          // Estimate delay based on severity
          const delayMap: Record<string, number> = {
            closed: 600, // 10 min
            major: 300, // 5 min
            moderate: 120, // 2 min
            minor: 30, // 30 sec
          };

          totalDelay += delayMap[incident.severity] || 60;
        }
      }
    }

    return totalDelay;
  }

  /**
   * Poll NVDB for real-time updates (for live apps)
   */
  async subscribeToUpdates(callback: (incident: NVDBIncident) => void): Promise<void> {
    // Long-polling fallback (NVDB doesn't have WebSocket)
    const poll = async () => {
      try {
        const incidents = await this.getIncidents();

        // Compare with cached and notify on changes
        for (const incident of incidents) {
          const cached = this.cachedIncidents.get(incident.id);
          if (!cached || cached.severity !== incident.severity) {
            callback(incident);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }

      // Reschedule
      setTimeout(poll, this.updateInterval);
    };

    await poll();
  }

  private parseIncidents(data: any): void {
    // Parse DATEX-IL format incidents from NVDB
    // Full spec: https://dataut.vegvesen.no/

    // Simplified: iterate through situations and extract key fields
    if (Array.isArray(data.situations)) {
      for (const situation of data.situations) {
        const incident = this.parseSituation(situation);
        if (incident) {
          this.cachedIncidents.set(incident.id, incident);
        }
      }
    }

    // Cleanup old closed incidents (>6 hours old)
    const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
    for (const [id, incident] of this.cachedIncidents) {
      if (incident.estimatedEnd && incident.estimatedEnd.getTime() < sixHoursAgo) {
        this.cachedIncidents.delete(id);
      }
    }
  }

  private parseSituation(situation: any): NVDBIncident | null {
    // Extract from DATEX structure
    // This is simplified - real NVDB returns complex nested DATEX-IL
    try {
      const type = this.mapSituationType(situation.type || 'other');
      if (!type) return null;

      const severity = this.mapSeverity(situation.severity);
      const location = situation.geometry
        ? {
            lat: situation.geometry.coordinates?.[1] || 0,
            lng: situation.geometry.coordinates?.[0] || 0,
            description: situation.location_description || 'Unknown location',
          }
        : {
            lat: 0,
            lng: 0,
            description: 'Unknown',
          };

      return {
        id: situation.id?.toString() || `unknown_${Date.now()}`,
        roadRef: situation.road_number || 'Unknown',
        location,
        type,
        severity,
        description: situation.description || situation.type || 'Traffic incident',
        estimatedStart: situation.start_time ? new Date(situation.start_time) : undefined,
        estimatedEnd: situation.end_time ? new Date(situation.end_time) : undefined,
        affectedLanes: situation.lanes_affected,
      };
    } catch (err) {
      console.error('Failed to parse NVDB situation:', err);
      return null;
    }
  }

  private mapSituationType(
    type: string
  ): 'closed' | 'accident' | 'roadworks' | 'weather' | 'other' | null {
    const typeMap: Record<string, string> = {
      closed: 'closed',
      closure: 'closed',
      accident: 'accident',
      collision: 'accident',
      roadwork: 'roadworks',
      construction: 'roadworks',
      weather: 'weather',
      wind: 'weather',
      snow: 'weather',
      ice: 'weather',
      rain: 'weather',
    };

    const mapped = typeMap[type.toLowerCase()];
    return (mapped || 'other') as any;
  }

  private mapSeverity(
    severity?: string
  ): 'closed' | 'major' | 'moderate' | 'minor' {
    if (severity === 'closed' || severity === 'blockage') return 'closed';
    if (severity === 'high') return 'major';
    if (severity === 'medium') return 'moderate';
    return 'minor';
  }

  private isNearIncident(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
    bufferKm: number
  ): boolean {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance <= bufferKm;
  }
}

// Singleton instance
export const nvdbClient = new NVDBClient();
