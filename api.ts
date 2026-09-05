export type Business = {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string | null;
  website?: string | null;
  hours?: Record<string, string> | null;
  imageUrls?: string[] | null;
  verified: boolean;
};

const BASE = '/api';

export async function fetchBusinessesInView(
  bbox: [number, number, number, number]
): Promise<Business[]> {
  const res = await fetch(`${BASE}/businesses?bbox=${bbox.join(',')}`);
  if (!res.ok) throw new Error('Failed to load businesses');
  return res.json();
}

// The bbox listing above only selects a handful of columns (see
// server/src/routes/businesses.ts), so the detail sheet fetches the
// full record — description, phone, website, hours — on demand. This
// endpoint already existed server-side but nothing in the frontend
// actually called it until now.
export async function fetchBusinessById(id: string): Promise<Business> {
  const res = await fetch(`${BASE}/businesses/${id}`);
  if (!res.ok) throw new Error('Failed to load business details');
  return res.json();
}

export async function submitBusiness(
  payload: Omit<Business, 'id' | 'verified'>
): Promise<Business> {
  const res = await fetch(`${BASE}/businesses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to submit business');
  }
  return res.json();
}

export type GeocodeResult = { lat: string; lon: string; display_name: string };

export async function geocodeAddress(query: string): Promise<GeocodeResult[]> {
  const res = await fetch(`${BASE}/geocode/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Geocoding failed');
  return res.json();
}

export async function reverseGeocode(lat: number, lon: number): Promise<{ display_name: string }> {
  const res = await fetch(`${BASE}/geocode/reverse?lat=${lat}&lon=${lon}`);
  if (!res.ok) throw new Error('Reverse geocoding failed');
  return res.json();
}
