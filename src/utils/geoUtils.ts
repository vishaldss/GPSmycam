import { CoordinateFormat, GPSLocationData } from '../types';

export function formatLatitude(lat: number, format: CoordinateFormat = 'decimal'): string {
  const dir = lat >= 0 ? 'N' : 'S';
  const absLat = Math.abs(lat);
  
  if (format === 'decimal') {
    return `${absLat.toFixed(4)}° ${dir}`;
  }
  
  // DMS Format
  const deg = Math.floor(absLat);
  const minFloat = (absLat - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = ((minFloat - min) * 60).toFixed(1);
  return `${deg}°${min}'${sec}"${dir}`;
}

export function formatLongitude(lon: number, format: CoordinateFormat = 'decimal'): string {
  const dir = lon >= 0 ? 'E' : 'W';
  const absLon = Math.abs(lon);
  
  if (format === 'decimal') {
    return `${absLon.toFixed(4)}° ${dir}`;
  }
  
  // DMS Format
  const deg = Math.floor(absLon);
  const minFloat = (absLon - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = ((minFloat - min) * 60).toFixed(1);
  return `${deg}°${min}'${sec}"${dir}`;
}

export function formatCoordinates(lat: number, lon: number, format: CoordinateFormat = 'decimal'): string {
  return `Lat: ${formatLatitude(lat, format)}, Long: ${formatLongitude(lon, format)}`;
}

export function getHeadingDirection(heading: number | null): string {
  if (heading === null || isNaN(heading)) return '';
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((heading % 360) / 45)) % 8;
  return `${directions[index]} (${Math.round(heading)}°)`;
}

// Simple in-memory cache for reverse geocoding to avoid rate limits
const geocodeCache = new Map<string, { address: string; city: string; state: string; country: string; postalCode: string }>();

export interface GpsSignalQuality {
  level: 'excellent' | 'good' | 'moderate' | 'poor' | 'unknown';
  label: string;
  badgeColor: string;
  textColor: string;
  icon: string;
  meters: number | null;
}

export function getGpsSignalQuality(accuracy: number | null): GpsSignalQuality {
  if (accuracy === null || isNaN(accuracy)) {
    return {
      level: 'unknown',
      label: 'Acquiring GPS...',
      badgeColor: 'bg-zinc-700/60 border-zinc-600',
      textColor: 'text-zinc-400',
      icon: '📡',
      meters: null,
    };
  }

  if (accuracy <= 6) {
    return {
      level: 'excellent',
      label: `±${accuracy.toFixed(1)}m Satellite Lock`,
      badgeColor: 'bg-emerald-500/20 border-emerald-500/40',
      textColor: 'text-emerald-300',
      icon: '🛰️',
      meters: accuracy,
    };
  }

  if (accuracy <= 15) {
    return {
      level: 'good',
      label: `±${accuracy.toFixed(1)}m GPS Fix`,
      badgeColor: 'bg-blue-500/20 border-blue-500/40',
      textColor: 'text-blue-300',
      icon: '📍',
      meters: accuracy,
    };
  }

  if (accuracy <= 35) {
    return {
      level: 'moderate',
      label: `±${Math.round(accuracy)}m Cell/Wi-Fi`,
      badgeColor: 'bg-amber-500/20 border-amber-500/40',
      textColor: 'text-amber-300',
      icon: '📶',
      meters: accuracy,
    };
  }

  return {
    level: 'poor',
    label: `±${Math.round(accuracy)}m Weak GPS (IP)`,
    badgeColor: 'bg-rose-500/20 border-rose-500/40',
    textColor: 'text-rose-300',
    icon: '⚠️',
    meters: accuracy,
  };
}

/**
 * Reverse geocodes coordinates with Google Maps API (if key provided) or Nominatim rooftop resolution
 */
export async function reverseGeocode(
  lat: number,
  lon: number,
  googleMapsApiKey?: string
): Promise<{ address: string; city: string; state: string; country: string; postalCode: string }> {
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  // 1. Try Google Maps Geocoding API if key is provided
  if (googleMapsApiKey && googleMapsApiKey.trim().length > 10) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${encodeURIComponent(googleMapsApiKey.trim())}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'OK' && json.results && json.results.length > 0) {
          const resultObj = json.results[0];
          let city = '';
          let state = '';
          let country = '';
          let postalCode = '';

          for (const comp of resultObj.address_components || []) {
            if (comp.types.includes('locality') || comp.types.includes('postal_town')) {
              city = comp.long_name;
            }
            if (comp.types.includes('administrative_area_level_1')) {
              state = comp.long_name;
            }
            if (comp.types.includes('country')) {
              country = comp.long_name;
            }
            if (comp.types.includes('postal_code')) {
              postalCode = comp.long_name;
            }
          }

          const parsed = {
            address: resultObj.formatted_address || `${lat.toFixed(5)}°, ${lon.toFixed(5)}°`,
            city: city || state || 'GPS Area',
            state: state || country,
            country: country || '',
            postalCode: postalCode || '',
          };

          geocodeCache.set(cacheKey, parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Google Maps geocoding error:', e);
    }
  }

  // 2. High-Precision OpenStreetMap / Photon Fallback
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'GPSWatermarkCameraPro/2.4',
        },
      }
    );
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};
      
      const houseNumber = addr.house_number || '';
      const road = addr.road || addr.pedestrian || addr.street || addr.neighbourhood || addr.suburb || '';
      const area = addr.suburb || addr.neighbourhood || addr.commercial || addr.residential || '';
      const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
      const state = addr.state || addr.region || '';
      const country = addr.country || '';
      const postalCode = addr.postcode || '';

      const parts = [
        houseNumber ? `${houseNumber} ${road}` : road,
        area !== road ? area : '',
        city,
        state,
        country,
      ].filter(Boolean);

      const fullAddress = parts.length > 0 ? parts.join(', ') : (data.display_name?.split(',').slice(0, 4).join(', ') || `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`);

      const result = {
        address: fullAddress,
        city: city || state || 'GPS Area',
        state: state || country,
        country: country || '',
        postalCode: postalCode || '',
      };

      geocodeCache.set(cacheKey, result);
      return result;
    }
  } catch {
    // Fallback if network offline or blocked
  }

  // Generic fallback
  return {
    address: `${lat.toFixed(5)}°, ${lon.toFixed(5)}°`,
    city: 'GPS Coordinates',
    state: '',
    country: '',
    postalCode: '',
  };
}

/**
 * Searches for places or addresses using Google Maps or Photon geocoding
 */
export async function searchAddressOrLandmark(
  query: string,
  googleMapsApiKey?: string
): Promise<{
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}[]> {
  if (!query || query.trim().length < 2) return [];
  const cleanQ = query.trim();

  // 1. If Google Maps API Key provided
  if (googleMapsApiKey && googleMapsApiKey.trim().length > 10) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cleanQ)}&key=${encodeURIComponent(googleMapsApiKey.trim())}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'OK' && json.results) {
          return json.results.slice(0, 5).map((r: any) => {
            let city = '';
            let state = '';
            let country = '';
            let postalCode = '';

            for (const comp of r.address_components || []) {
              if (comp.types.includes('locality') || comp.types.includes('postal_town')) city = comp.long_name;
              if (comp.types.includes('administrative_area_level_1')) state = comp.long_name;
              if (comp.types.includes('country')) country = comp.long_name;
              if (comp.types.includes('postal_code')) postalCode = comp.long_name;
            }

            return {
              name: r.formatted_address?.split(',')[0] || cleanQ,
              address: r.formatted_address,
              latitude: r.geometry.location.lat,
              longitude: r.geometry.location.lng,
              city: city || state,
              state: state || country,
              country,
              postalCode,
            };
          });
        }
      }
    } catch (e) {
      console.warn('Google search failed:', e);
    }
  }

  // 2. OpenStreetMap / Photon Search
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQ)}&limit=6&addressdetails=1`, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'GPSWatermarkCameraPro/2.4',
      },
    });
    if (res.ok) {
      const list = await res.json();
      return list.map((item: any) => {
        const addr = item.address || {};
        const city = addr.city || addr.town || addr.village || addr.county || '';
        const state = addr.state || addr.region || '';
        const country = addr.country || '';
        const postalCode = addr.postcode || '';

        return {
          name: item.name || item.display_name?.split(',')[0] || cleanQ,
          address: item.display_name,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          city: city || state,
          state: state || country,
          country,
          postalCode,
        };
      });
    }
  } catch (err) {
    console.warn('Search geocode error:', err);
  }

  return [];
}

export const PRESET_LOCATIONS: { name: string; lat: number; lon: number; alt: number; address: string; city: string; state: string; country: string }[] = [
  {
    name: 'Bhopal (Sample Test)',
    lat: 23.2599,
    lon: 77.4126,
    alt: 527,
    address: 'VIP Road, Upper Lake, Bhopal, Madhya Pradesh',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    country: 'India',
  },
  {
    name: 'New York (Times Square)',
    lat: 40.7580,
    lon: -73.9855,
    alt: 15,
    address: 'Broadway & 7th Ave, Manhattan, New York, NY 10036',
    city: 'New York',
    state: 'New York',
    country: 'United States',
  },
  {
    name: 'San Francisco (Golden Gate)',
    lat: 37.8199,
    lon: -122.4783,
    alt: 67,
    address: 'Golden Gate Bridge, San Francisco, CA 94129',
    city: 'San Francisco',
    state: 'California',
    country: 'United States',
  },
  {
    name: 'Tokyo (Shinjuku)',
    lat: 35.6909,
    lon: 139.7003,
    alt: 39,
    address: 'Kabukicho, Shinjuku City, Tokyo 160-0021',
    city: 'Tokyo',
    state: 'Kanto',
    country: 'Japan',
  },
  {
    name: 'London (Tower Bridge)',
    lat: 51.5055,
    lon: -0.0754,
    alt: 11,
    address: 'Tower Bridge Rd, London SE1 2UP',
    city: 'London',
    state: 'Greater London',
    country: 'United Kingdom',
  },
  {
    name: 'Paris (Eiffel Tower)',
    lat: 48.8584,
    lon: 2.2945,
    alt: 35,
    address: 'Champ de Mars, 5 Av. Anatole France, 75007 Paris',
    city: 'Paris',
    state: 'Île-de-France',
    country: 'France',
  },
];
