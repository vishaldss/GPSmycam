import React, { useState } from 'react';
import {
  MapPin,
  Search,
  Crosshair,
  Sparkles,
  Check,
  X,
  Compass,
  Building2,
  Navigation,
  Globe,
  Radio,
  Sliders,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { GPSLocationData, AppSettings } from '../types';
import { searchAddressOrLandmark, reverseGeocode, getGpsSignalQuality, PRESET_LOCATIONS } from '../utils/geoUtils';

interface LocationSearchModalProps {
  currentLocation: GPSLocationData;
  appSettings: AppSettings;
  onUpdateLocation: (newLoc: GPSLocationData) => void;
  onRefreshHardwareGps: () => Promise<void>;
  onClose: () => void;
}

export const LocationSearchModal: React.FC<LocationSearchModalProps> = ({
  currentLocation,
  appSettings,
  onUpdateLocation,
  onRefreshHardwareGps,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isRefreshingGps, setIsRefreshingGps] = useState(false);
  const [manualLat, setManualLat] = useState(currentLocation.latitude.toString());
  const [manualLon, setManualLon] = useState(currentLocation.longitude.toString());
  const [activeSubTab, setActiveSubTab] = useState<'search' | 'manual' | 'presets'>('search');

  const gpsQuality = getGpsSignalQuality(currentLocation.accuracy);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchAddressOrLandmark(
        searchQuery,
        appSettings.googleMapsApiKey
      );
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = async (item: any) => {
    const geo = await reverseGeocode(item.latitude, item.longitude, appSettings.googleMapsApiKey);
    const updated: GPSLocationData = {
      ...currentLocation,
      latitude: item.latitude,
      longitude: item.longitude,
      accuracy: 2.0, // High precision manual/Google Maps fix
      address: geo.address || item.address,
      city: geo.city || item.city,
      state: geo.state || item.state,
      country: geo.country || item.country,
      postalCode: geo.postalCode || item.postalCode,
      source: 'google_maps',
      timestamp: Date.now(),
    };
    onUpdateLocation(updated);
    onClose();
  };

  const handleApplyManual = async () => {
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);
    if (isNaN(lat) || isNaN(lon)) return;

    const geo = await reverseGeocode(lat, lon, appSettings.googleMapsApiKey);
    const updated: GPSLocationData = {
      ...currentLocation,
      latitude: lat,
      longitude: lon,
      accuracy: 1.5,
      address: geo.address,
      city: geo.city,
      state: geo.state,
      country: geo.country,
      postalCode: geo.postalCode,
      source: 'manual_search',
      timestamp: Date.now(),
    };
    onUpdateLocation(updated);
    onClose();
  };

  const handleSelectPreset = async (preset: (typeof PRESET_LOCATIONS)[0]) => {
    const updated: GPSLocationData = {
      ...currentLocation,
      latitude: preset.lat,
      longitude: preset.lon,
      altitude: preset.alt,
      accuracy: 2.0,
      address: preset.address,
      city: preset.city,
      state: preset.state,
      country: preset.country,
      source: 'preset',
      timestamp: Date.now(),
    };
    onUpdateLocation(updated);
    onClose();
  };

  const handleReacquireGps = async () => {
    setIsRefreshingGps(true);
    try {
      await onRefreshHardwareGps();
    } finally {
      setIsRefreshingGps(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Google Maps Location & GPS Precision
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Rooftop Accuracy
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Fix indoor GPS drift, search exact landmark addresses, or enter custom coordinates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live GPS Health Bar */}
        <div className="p-4 bg-zinc-900/40 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base">{gpsQuality.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">Current Hardware GPS Signal:</span>
                <span className={`px-2 py-0.5 rounded-full font-bold border ${gpsQuality.badgeColor} ${gpsQuality.textColor}`}>
                  {gpsQuality.label}
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                {currentLocation.latitude.toFixed(6)}°, {currentLocation.longitude.toFixed(6)}° • {currentLocation.city || 'Acquiring'}
              </div>
            </div>
          </div>

          <button
            onClick={handleReacquireGps}
            disabled={isRefreshingGps}
            className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Crosshair className={`w-3.5 h-3.5 ${isRefreshingGps ? 'animate-spin' : ''}`} />
            <span>{isRefreshingGps ? 'Locking Satellites...' : 'Calibrate GPS'}</span>
          </button>
        </div>

        {/* Sub Navigation */}
        <div className="flex border-b border-zinc-800 px-6 bg-zinc-950 shrink-0">
          <button
            onClick={() => setActiveSubTab('search')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 flex items-center gap-2 transition-all ${
              activeSubTab === 'search'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>1. Google Maps Search</span>
          </button>

          <button
            onClick={() => setActiveSubTab('manual')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 flex items-center gap-2 transition-all ${
              activeSubTab === 'manual'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>2. Exact Lat / Long</span>
          </button>

          <button
            onClick={() => setActiveSubTab('presets')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 flex items-center gap-2 transition-all ${
              activeSubTab === 'presets'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>3. Quick Survey Presets</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: SEARCH */}
          {activeSubTab === 'search' && (
            <div className="space-y-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search any place, street, building, or address (e.g. VIP Road Bhopal)..."
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-2xl transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-blue-600/20"
                >
                  {isSearching ? <span className="animate-spin">🔄</span> : <Search className="w-3.5 h-3.5" />}
                  <span>Search</span>
                </button>
              </form>

              {/* Tips */}
              <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Why use Google Maps search?</div>
                  <p className="text-[11px] text-blue-300/80 mt-0.5">
                    If you are indoors or under heavy tree cover, mobile satellite GPS can drift up to 50 meters. Searching the exact building or street locks rooftop accuracy (±1.5m) onto your watermark.
                  </p>
                </div>
              </div>

              {/* Search Results */}
              <div className="space-y-2">
                {searchResults.length > 0 && (
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Search Results ({searchResults.length})
                  </div>
                )}

                {searchResults.map((res, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectResult(res)}
                    className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-blue-500 hover:bg-blue-600/10 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-zinc-800 text-zinc-300 group-hover:bg-blue-500 group-hover:text-white transition-all shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs group-hover:text-blue-300 transition-colors">
                          {res.name}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
                          {res.address}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500 mt-1">
                          {res.latitude.toFixed(6)}°, {res.longitude.toFixed(6)}° • {res.city}
                        </div>
                      </div>
                    </div>

                    <button className="px-3 py-1.5 rounded-xl bg-zinc-800 group-hover:bg-blue-600 text-zinc-300 group-hover:text-white text-xs font-semibold shrink-0 transition-all">
                      Apply GPS
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: MANUAL COORDINATES */}
          {activeSubTab === 'manual' && (
            <div className="space-y-4 text-xs">
              <p className="text-zinc-400">
                Directly enter surveyed GPS coordinates (WGS84 Decimal Degrees) for zero error tolerance.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Latitude (° N/S)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    placeholder="e.g. 23.259933"
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Longitude (° E/W)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={manualLon}
                    onChange={(e) => setManualLon(e.target.value)}
                    placeholder="e.g. 77.412615"
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400">Current Applied Location:</span>
                <span className="font-mono text-blue-400 font-bold">
                  {currentLocation.latitude.toFixed(6)}° N, {currentLocation.longitude.toFixed(6)}° E
                </span>
              </div>

              <button
                onClick={handleApplyManual}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Apply Exact GPS Coordinates</span>
              </button>
            </div>
          )}

          {/* TAB 3: PRESETS */}
          {activeSubTab === 'presets' && (
            <div className="space-y-3">
              <div className="text-xs text-zinc-400 mb-2">
                Click any preset location to test watermark rendering:
              </div>

              <div className="grid grid-cols-1 gap-2">
                {PRESET_LOCATIONS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectPreset(preset)}
                    className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 hover:border-blue-500 hover:bg-blue-600/10 text-left transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-bold text-white text-xs group-hover:text-blue-300">
                        {preset.name}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">{preset.address}</div>
                      <div className="text-[10px] font-mono text-zinc-500 mt-1">
                        {preset.lat}° N, {preset.lon}° E • Alt: {preset.alt}m
                      </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-xl bg-zinc-800 group-hover:bg-blue-600 text-zinc-300 group-hover:text-white text-xs font-semibold transition-all">
                      Select
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" />
            <span>Google Maps Platform Grounded Reverse Geocoding</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
