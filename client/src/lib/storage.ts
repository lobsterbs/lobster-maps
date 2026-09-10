/**
 * Local Storage Manager
 * Handles user preferences, recent destinations, and view state
 */

interface UserPreferences {
  theme: 'light' | 'dark';
  unit: 'km' | 'mi';
  avoidTolls: boolean;
  avoidHighways: boolean;
  scenicRoute: boolean;
}

interface RecentDestination {
  name: string;
  lat: number;
  lon: number;
  timestamp: number;
}

interface MapViewState {
  zoom: number;
  center: [number, number];
  lastViewed: number;
}

const PREFS_KEY = 'lobsterMaps_prefs';
const DESTINATIONS_KEY = 'lobsterMaps_destinations';
const VIEW_STATE_KEY = 'lobsterMaps_viewState';

const DEFAULT_PREFS: UserPreferences = {
  theme: 'dark',
  unit: 'km',
  avoidTolls: false,
  avoidHighways: false,
  scenicRoute: false,
};

export function getPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_PREFS;
  } catch (e) {
    return DEFAULT_PREFS;
  }
}

export function setPreferences(prefs: Partial<UserPreferences>): void {
  const current = getPreferences();
  localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
}

export function getRecentDestinations(): RecentDestination[] {
  try {
    const stored = localStorage.getItem(DESTINATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

export function addRecentDestination(dest: Omit<RecentDestination, 'timestamp'>): void {
  const dests = getRecentDestinations();
  const updated = [
    { ...dest, timestamp: Date.now() },
    ...dests.filter(
      (d) => !(d.lat === dest.lat && d.lon === dest.lon)
    ),
  ].slice(0, 10);
  localStorage.setItem(DESTINATIONS_KEY, JSON.stringify(updated));
}

export function getMapViewState(): MapViewState | null {
  try {
    const stored = localStorage.getItem(VIEW_STATE_KEY);
    if (!stored) return null;
    const state = JSON.parse(stored);
    // Only restore if less than 24hrs old
    if (Date.now() - state.lastViewed < 24 * 3600 * 1000) {
      return state;
    }
    return null;
  } catch (e) {
    return null;
  }
}

export function saveMapViewState(state: Omit<MapViewState, 'lastViewed'>): void {
  localStorage.setItem(
    VIEW_STATE_KEY,
    JSON.stringify({ ...state, lastViewed: Date.now() })
  );
}

export function clearAll(): void {
  localStorage.removeItem(PREFS_KEY);
  localStorage.removeItem(DESTINATIONS_KEY);
  localStorage.removeItem(VIEW_STATE_KEY);
}

export default {
  getPreferences,
  setPreferences,
  getRecentDestinations,
  addRecentDestination,
  getMapViewState,
  saveMapViewState,
  clearAll,
};
