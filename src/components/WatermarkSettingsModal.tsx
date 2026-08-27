import React from 'react';
import { X, Sliders, Type, MapPin, Calendar, Layers, Eye } from 'lucide-react';
import { CoordinateFormat, DateFormatOption, WatermarkConfig, WatermarkPosition } from '../types';

interface WatermarkSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WatermarkConfig;
  onChange: (updated: WatermarkConfig) => void;
}

export const WatermarkSettingsModal: React.FC<WatermarkSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
}) => {
  if (!isOpen) return null;

  const positions: { id: WatermarkPosition; label: string }[] = [
    { id: 'bottom-left', label: 'Bottom-Left (Default)' },
    { id: 'bottom-right', label: 'Bottom-Right' },
    { id: 'top-left', label: 'Top-Left' },
    { id: 'top-right', label: 'Top-Right' },
    { id: 'bottom-bar', label: 'Full Bottom Bar' },
  ];

  const dateFormats: { id: DateFormatOption; label: string; sample: string }[] = [
    { id: 'YYYY-MM-DD HH:mm:ss', label: 'ISO Standard', sample: '2026-08-26 23:12:00' },
    { id: 'DD/MM/YYYY hh:mm:ss A', label: '12-Hour AM/PM', sample: '26/08/2026 11:12:00 PM' },
    { id: 'MMM DD, YYYY HH:mm', label: 'Short Month', sample: 'Aug 26, 2026 23:12:00' },
    { id: 'UTC', label: 'UTC Universal', sample: 'Wed, 26 Aug 2026 23:12:00 GMT' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        id="watermark-settings-dialog"
        className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl max-h-[90vh] flex flex-col text-zinc-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Watermark Settings</h2>
              <p className="text-xs text-zinc-400">Configure how GPS data is baked onto images</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1 text-sm">
          {/* 1. Placement Position */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Overlay Position
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {positions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onChange({ ...config, position: p.id })}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium text-left transition-all ${
                    config.position === p.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Coordinate Formatting */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Coordinate Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onChange({ ...config, coordinateFormat: 'decimal' })}
                className={`py-2.5 px-3 rounded-xl border text-xs font-mono text-left transition-all ${
                  config.coordinateFormat === 'decimal'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="font-semibold text-white">Decimal Degrees</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">Lat: 23.2599° N, Long: 77.4126° E</div>
              </button>

              <button
                onClick={() => onChange({ ...config, coordinateFormat: 'dms' })}
                className={`py-2.5 px-3 rounded-xl border text-xs font-mono text-left transition-all ${
                  config.coordinateFormat === 'dms'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="font-semibold text-white">DMS (Degrees/Min/Sec)</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">23°15'35.6"N 77°24'45.4"E</div>
              </button>
            </div>
          </div>

          {/* 3. Date & Timestamp Format */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Date & Timestamp Style
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {dateFormats.map((df) => (
                <button
                  key={df.id}
                  onClick={() => onChange({ ...config, dateFormat: df.id })}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                    config.dateFormat === df.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="font-medium text-white">{df.label}</div>
                  <div className="text-[11px] text-zinc-400 font-mono mt-0.5">{df.sample}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Display Toggles */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Watermark Information Fields
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { key: 'showCoordinates', label: 'GPS Latitude / Longitude', desc: 'Precise coordinates' },
                { key: 'showTimestamp', label: 'Date & Time Stamp', desc: 'Real-time capture timestamp' },
                { key: 'showAddress', label: 'Street Address & City', desc: 'Reverse geocoded location' },
                { key: 'showAltitude', label: 'Altitude (Meters)', desc: 'Height above sea level' },
                { key: 'showHeading', label: 'Compass Bearing', desc: 'Facing direction (N/E/S/W)' },
                { key: 'showAccuracy', label: 'GPS Precision (±meters)', desc: 'Sensor accuracy radius' },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-start gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 cursor-pointer hover:bg-zinc-800/40 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(config[item.key as keyof WatermarkConfig])}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        [item.key]: e.target.checked,
                      })
                    }
                    className="mt-0.5 rounded border-zinc-700 text-indigo-600 focus:ring-indigo-500 bg-zinc-900"
                  />
                  <div>
                    <div className="text-xs font-semibold text-white">{item.label}</div>
                    <div className="text-[11px] text-zinc-400">{item.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 5. Visual Styling (Opacity & Scale) */}
          <div className="space-y-4 pt-2">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-zinc-300">Background Box Opacity</span>
                <span className="font-mono text-zinc-400">{Math.round(config.boxOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="0.95"
                step="0.05"
                value={config.boxOpacity}
                onChange={(e) => onChange({ ...config, boxOpacity: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-zinc-300">Text & Watermark Scale</span>
                <span className="font-mono text-zinc-400">{config.fontSizeScale.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.4"
                step="0.05"
                value={config.fontSizeScale}
                onChange={(e) => onChange({ ...config, fontSizeScale: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Custom User Details Tag Field */}
            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-blue-300">
                  Custom User Details / Project Tag (Bakes below GPS details)
                </label>
                {config.customNote && (
                  <button
                    onClick={() => onChange({ ...config, customNote: '' })}
                    className="text-[10px] text-zinc-400 hover:text-white underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mb-2">
                Feed your personal, surveyor, or project details into this field to display below all GPS coordinates on photos.
              </p>
              <input
                type="text"
                value={config.customNote}
                onChange={(e) => onChange({ ...config, customNote: e.target.value })}
                placeholder="e.g. Surveyor: John Doe | Site Survey #104 | Project Alpha"
                className="w-full px-3 py-2 bg-zinc-950 border border-blue-400/40 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-medium"
              />
              {/* Quick Preset Chips */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] text-zinc-500 font-medium">Quick suggestions:</span>
                {[
                  'Surveyor: Vishal',
                  'Site Inspection #01',
                  'Project Alpha',
                  'Work Order #8892',
                  'Building Asset A',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => onChange({ ...config, customNote: suggestion })}
                    className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-blue-500/20 hover:text-blue-300 text-zinc-400 border border-white/10 text-[10px] transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-zinc-800 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
          >
            Apply & Done
          </button>
        </div>
      </div>
    </div>
  );
};
