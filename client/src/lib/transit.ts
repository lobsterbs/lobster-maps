// Entur JourneyPlanner client — real public transport trip planning
// covering all of Norway, including Skyss (Bergen/Vestland), via
// Entur's national aggregator. REST API (simpler, more reliable than GraphQL).
// 
// No API key needed — just ET-Client-Name header for identification.
// Coordinates-based queries work directly (no StopPlace ID lookup).

import React from 'react';
import { Bus, Train, TrendingUp, Footprints } from 'lucide-react';

const ENTUR_URL = 'https://api.entur.io/journey-planner/v2/trips';
const CLIENT_NAME = 'lobstermaps-directions';

export type TransitLeg = {
  mode: string; // 'foot', 'bus', 'tram', 'train', 'metro', 'rail', etc
  durationSeconds: number;
  distanceMeters: number;
  lineName: string | null; // null for walking legs
  line?: { id: string; name: string };
  fromStop?: string;
  toStop?: string;
};

export type TransitTrip = {
  startTime: string; // ISO datetime
  endTime: string;
  durationSeconds: number;
  legs: TransitLeg[];
};

/**
 * Get icon for transit mode
 */
export function modeIcon(mode: string): React.ReactNode {
  const iconProps = { size: 16, className: 'text-emerald-600' };
  
  switch ((mode || '').toLowerCase()) {
    case 'bus':
      return React.createElement(Bus, iconProps);
    case 'tram':
    case 'train':
    case 'metro':
    case 'rail':
      return React.createElement(Train, iconProps);
    case 'foot':
    case 'walk':
      return React.createElement(Footprints, iconProps);
    default:
      return React.createElement(TrendingUp, iconProps);
  }
}

export async function getTransitTrip(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number }
): Promise<TransitTrip | null> {
  try {
    const resp = await fetch(ENTUR_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ET-Client-Name': CLIENT_NAME,
      },
      body: JSON.stringify({
        from: {
          place: {
            coordinates: {
              latitude: from.lat,
              longitude: from.lon,
            },
          },
        },
        to: {
          place: {
            coordinates: {
              latitude: to.lat,
              longitude: to.lon,
            },
          },
        },
        numTripPatterns: 3, // Get top 3 options
        dateTime: new Date().toISOString(),
      }),
    });

    if (!resp.ok) {
      console.error(`Entur API error: ${resp.status} ${resp.statusText}`);
      return null;
    }

    const data = await resp.json();

    // Check for API errors
    if (data.error) {
      console.error('Entur API returned error:', data.error);
      return null;
    }

    if (!data.tripPatterns || data.tripPatterns.length === 0) {
      console.warn('No trip patterns found');
      return null;
    }

    const pattern = data.tripPatterns[0];

    const legs: TransitLeg[] = (pattern.legs || []).map(
      (leg: any) => ({
        mode: (leg.mode || 'unknown').toLowerCase(),
        durationSeconds: Math.round((leg.duration || 0) / 1000),
        distanceMeters: leg.distance || 0,
        lineName: leg.line?.name || null,
        line: leg.line,
        fromStop: leg.fromPlace?.name || leg.fromStop?.name,
        toStop: leg.toPlace?.name || leg.toStop?.name,
      })
    );

    return {
      startTime: pattern.startTime || new Date().toISOString(),
      endTime: pattern.endTime || new Date().toISOString(),
      durationSeconds: Math.round((pattern.duration || 0) / 1000),
      legs,
    };
  } catch (err) {
    console.error('Transit query failed:', err);
    return null;
  }
}

export async function getMultipleTransitOptions(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number }
): Promise<TransitTrip[]> {
  try {
    const resp = await fetch(ENTUR_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ET-Client-Name': CLIENT_NAME,
      },
      body: JSON.stringify({
        from: {
          place: {
            coordinates: { latitude: from.lat, longitude: from.lon },
          },
        },
        to: {
          place: {
            coordinates: { latitude: to.lat, longitude: to.lon },
          },
        },
        numTripPatterns: 5,
        dateTime: new Date().toISOString(),
      }),
    });

    if (!resp.ok) return [];

    const data = await resp.json();
    if (!data.tripPatterns) return [];

    return data.tripPatterns.map((pattern: any) => ({
      startTime: pattern.startTime,
      endTime: pattern.endTime,
      durationSeconds: Math.round((pattern.duration || 0) / 1000),
      legs: (pattern.legs || []).map((leg: any) => ({
        mode: (leg.mode || 'unknown').toLowerCase(),
        durationSeconds: Math.round((leg.duration || 0) / 1000),
        distanceMeters: leg.distance || 0,
        lineName: leg.line?.name || null,
        line: leg.line,
        fromStop: leg.fromPlace?.name || leg.fromStop?.name,
        toStop: leg.toPlace?.name || leg.toStop?.name,
      })),
    }));
  } catch (err) {
    console.error('Multi-option transit query failed:', err);
    return [];
  }
}
