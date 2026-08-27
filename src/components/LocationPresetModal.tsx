import React, { useState } from 'react';
import { X, Navigation, MapPin, Search, Check, RefreshCw } from 'lucide-react';
import { GPSLocationData } from '../types';
import { PRESET_LOCATIONS, reverseGeocode } from '../utils/geoUtils';

interface LocationPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: GPSLocationData | null;
  onSelectPreset: (location: GPSLocationData) => void;
  onUseLiveDeviceGps: () => void;
}

export const LocationPresetModal: React.FC<LocationPresetModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onSelectPreset,
  onUseLiveDeviceGps,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customLat, setCustomLat] = useState('23.2599');
  const [customLon, setCustomLon] = useState('77.4126');
  const [isApplyingCustom, setIsApplyingCustom] = useState(false);

  if (!isOpen) return null;

  const filteredPresets = PRESET_LOCATIONS.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApplyCustom = async () => {
    const lat = parseFloat(customLat);
    const lon = parseFloat(customLon);
    if (isNaN(lat) || isNaN(lon)) return;

    setIsApplyingCustom(true);
    const geo = await reverseGeocode(lat, lon);
    setIsApplyingCustom(false);

    onSelectPreset({
      latitude: lat,
      longitude: lon,
      altitude: 450,
      accuracy: 5,
      heading: 90,
      speed: null,
      timestamp: Date.now(),
      address: geo.address,
      city: geo.city,
      state: geo.state,
      country: geo.country,
      postalCode: geo.postalCode,
      isMock: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        id="location-preset-dialog"
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl max-h-[90vh] flex flex-col text-zinc-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">GPS Location Source</h2>
              <p className="text-xs text-zinc-400">Switch between Live Device GPS and Presets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Device GPS Quick Button */}
        <div className="pt-4 shrink-0">
          <button
            onClick={() => {
              onUseLiveDeviceGps();
              onClose();
            }}
            className="w-full p-3.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-[0.99] border border-emerald-500/30 text-emerald-300 font-semibold text-xs flex items-center justify-between transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Navigation className="w-4 h-4 text-emerald-400" />
              <span>Use Real Device GPS (High Accuracy)</span>
            </div>
            {!currentLocation?.isMock && <Check className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>

        {/* Presets List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1 text-sm">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cities or preset locations..."
              className="w-full pl-8 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-2">
            {filteredPresets.map((preset) => {
              const isSelected =
                currentLocation?.isMock &&
                Math.abs(currentLocation.latitude - preset.lat) < 0.001 &&
                Math.abs(currentLocation.longitude - preset.lon) < 0.001;

              return (
                <button
                  key={preset.name}
                  onClick={() => {
                    onSelectPreset({
                      latitude: preset.lat,
                      longitude: preset.lon,
                      altitude: preset.alt,
                      accuracy: 3.5,
                      heading: 120,
                      speed: null,
                      timestamp: Date.now(),
                      address: preset.address,
                      city: preset.city,
                      state: preset.state,
                      country: preset.country,
                      postalCode: '',
                      isMock: true,
                    });
                    onClose();
                  }}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-2 ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-white">{preset.name}</div>
                    <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      Lat: {preset.lat.toFixed(4)}°, Long: {preset.lon.toFixed(4)}°
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate mt-0.5">{preset.address}</div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-1" />}
                </button>
              );
            })}
          </div>

          {/* Custom Coordinates Section */}
          <div className="pt-3 border-t border-zinc-800">
            <div className="text-xs font-semibold text-zinc-300 mb-2">Custom Coordinates</div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Latitude</label>
                <input
                  type="text"
                  value={customLat}
                  onChange={(e) => setCustomLat(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Longitude</label>
                <input
                  type="text"
                  value={customLon}
                  onChange={(e) => setCustomLon(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white"
                />
              </div>
            </div>
            <button
              onClick={handleApplyCustom}
              disabled={isApplyingCustom}
              className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-xs font-semibold rounded-xl text-zinc-200 transition-all flex items-center justify-center gap-1.5"
            >
              {isApplyingCustom ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Set Custom GPS Coordinates'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
