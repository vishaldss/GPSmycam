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

export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<{ address: string; city: string; state: string; country: string; postalCode: string }> {
  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'GPSWatermarkCameraAndroidApp/1.0',
        },
      }
    );
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};
      
      const road = addr.road || addr.pedestrian || addr.street || addr.neighbourhood || addr.suburb || '';
      const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
      const state = addr.state || addr.region || '';
      const country = addr.country || '';
      const postalCode = addr.postcode || '';

      const parts = [road, city, state, country].filter(Boolean);
      const fullAddress = parts.length > 0 ? parts.join(', ') : (data.display_name?.split(',').slice(0, 3).join(',') || 'Location Identified');

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

  // Generic fallback if network fails
  return {
    address: `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`,
    city: 'Current Location',
    state: '',
    country: '',
    postalCode: '',
  };
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
