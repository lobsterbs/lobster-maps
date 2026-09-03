// Entur JourneyPlanner client — real public transport trip planning
// covering all of Norway, including Skyss (Bergen/Vestland), via
// Entur's national aggregator, not a Skyss-specific integration.
// OpenTripPlanner under the hood, hosted by Entur, so none of the
// self-hosting problems that would come with running OTP ourselves.
//
// No API key, no signup — just a self-identifying header. Confirmed
// against Entur's own docs (developer.entur.org) before writing this:
// endpoint, the ET-Client-Name auth requirement, and the coordinates-
// based from/to shape (confirmed via the official @entur/sdk package's
// own documented usage). The trip/tripPatterns/legs/line.name query
// shape is copied from a real, working example query someone else
// published, not invented.
//
// IMPORTANT CAVEAT, different from the ORS situation: GraphQL fails
// the ENTIRE query if even one requested field doesn't exist, it's not
// forgiving the way REST is about extra/wrong response fields. So this
// query is deliberately kept close to what's been directly confirmed
// working, plus a small number of very standard, high-confidence
// additions (mode, distance, endTime) rather than guessing at a fuller
// field set. If this query itself fails outright (not just returns
// unexpected data, actually errors), that's the first thing to check,
// not assume the whole approach is broken.

const ENTUR_URL = 'https://api.entur.io/journey-planner/v3/graphql';
const CLIENT_NAME = 'lobstermaps-directions'; // "company-application" per Entur's required format

export type TransitLeg = {
  mode: string; // e.g. "foot", "bus", "tram" — lowercase per Transmodel convention
  durationSeconds: number;
  distanceMeters: number;
  lineName: string | null; // null for walking legs, which have no line
};

export type TransitTrip = {
  startTime: string; // ISO datetime
  endTime: string;
  durationSeconds: number;
  legs: TransitLeg[];
};

export async function getTransitTrip(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number }
): Promise<TransitTrip | null> {
  const query = `
    query Trip($fromLat: Float!, $fromLon: Float!, $toLat: Float!, $toLon: Float!) {
      trip(
        from: { coordinates: { latitude: $fromLat, longitude: $fromLon } }
        to: { coordinates: { latitude: $toLat, longitude: $toLon } }
        numTripPatterns: 1
      ) {
        tripPatterns {
          startTime
          endTime
          duration
          legs {
            mode
            duration
            distance
            line {
              name
            }
          }
        }
      }
    }
  `;

  const resp = await fetch(ENTUR_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ET-Client-Name': CLIENT_NAME,
    },
    body: JSON.stringify({
      query,
      variables: { fromLat: from.lat, fromLon: from.lon, toLat: to.lat, toLon: to.lon },
    }),
  });

  if (!resp.ok) {
    console.error(`Entur responded ${resp.status}: ${await resp.text().catch(() => '')}`);
    return null;
  }

  const data = await resp.json();

  // GraphQL convention: errors come back as a 200 with an "errors"
  // array, not necessarily a non-2xx status — checked separately.
  if (data.errors) {
    console.error('Entur GraphQL errors:', data.errors);
    return null;
  }

  const pattern = data?.data?.trip?.tripPatterns?.[0];
  if (!pattern) return null;

  return {
    startTime: pattern.startTime,
    endTime: pattern.endTime,
    durationSeconds: pattern.duration ?? 0,
    legs: (pattern.legs ?? []).map((leg: { mode?: string; duration?: number; distance?: number; line?: { name?: string } }) => ({
      mode: (leg.mode ?? 'unknown').toLowerCase(),
      durationSeconds: leg.duration ?? 0,
      distanceMeters: leg.distance ?? 0,
      lineName: leg.line?.name ?? null,
    })),
  };
}

import { Bus, TramFront, TrainFront, TrainFrontTunnel, Ship, Bike, Footprints, MapPin, type LucideIcon } from 'lucide-react';

// Real icons, not emoji — lucide-react, MIT licensed, already used
// elsewhere in the app (TripPlanner.tsx). Returns the icon component
// itself so callers can size/color it like any other lucide icon.
export function modeIcon(mode: string): LucideIcon {
  switch (mode) {
    case 'foot': return Footprints;
    case 'bus': return Bus;
    case 'tram': return TramFront;
    case 'rail': return TrainFront;
    case 'metro': return TrainFrontTunnel;
    case 'water': return Ship;
    case 'bicycle': return Bike;
    default: return MapPin;
  }
}
