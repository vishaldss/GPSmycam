import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Clock, Compass, Mountain, Settings2, Navigation, Edit3, Check, Tag, User } from 'lucide-react';
import { GPSLocationData, WatermarkConfig } from '../types';
import { formatCoordinates, formatDate } from '../utils/watermarkEngine';
import { getHeadingDirection } from '../utils/geoUtils';

interface GPSOverlayHUDProps {
  location: GPSLocationData | null;
  config: WatermarkConfig;
  onOpenSettings: () => void;
  onOpenLocationPresets: () => void;
  onUpdateCustomNote?: (newNote: string) => void;
}

export const GPSOverlayHUD: React.FC<GPSOverlayHUDProps> = ({
  location,
  config,
  onOpenSettings,
  onOpenLocationPresets,
  onUpdateCustomNote,
}) => {
  const [liveTimestamp, setLiveTimestamp] = useState<number>(Date.now());
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);
  const [noteInput, setNoteInput] = useState<string>(config.customNote || '');
  const inputRef = useRef<HTMLInputElement>(null);

  // Synchronize local input state if config changes from modal
  useEffect(() => {
    setNoteInput(config.customNote || '');
  }, [config.customNote]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingNote && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditingNote]);

  // Update clock every second for live preview HUD
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveNote = () => {
    if (onUpdateCustomNote) {
      onUpdateCustomNote(noteInput.trim());
    }
    setIsEditingNote(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveNote();
    } else if (e.key === 'Escape') {
      setNoteInput(config.customNote || '');
      setIsEditingNote(false);
    }
  };

  if (!location) {
    return (
      <div id="gps-hud-loading" className="flex items-center gap-2.5 px-4 py-2.5 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 text-white/80 text-xs">
        <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
        <span className="font-mono">Acquiring High-Accuracy GPS Lock...</span>
      </div>
    );
  }

  const coordStr = formatCoordinates(location.latitude, location.longitude, config.coordinateFormat);
  const timeStr = formatDate(liveTimestamp, config.dateFormat);
  const headingText = location.heading !== null ? getHeadingDirection(location.heading) : '';

  return (
    <div
      id="gps-live-hud-overlay"
      className="group relative max-w-sm sm:max-w-md w-full bg-black/75 backdrop-blur-md rounded-2xl border border-white/15 p-3.5 shadow-2xl transition-all duration-200"
    >
      {/* Top micro badges */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <button
          onClick={onOpenLocationPresets}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-[11px] text-white/90 font-medium transition-colors"
          title="Click to change location preset or use device GPS"
        >
          <Navigation className="w-3 h-3 text-emerald-400" />
          <span>{location.isMock ? 'Simulated GPS' : 'Live Device GPS'}</span>
          {location.accuracy && (
            <span className="text-white/60 text-[10px]">±{Math.round(location.accuracy)}m</span>
          )}
        </button>

        <button
          onClick={onOpenSettings}
          className="p-1 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/70 hover:text-white transition-colors"
          title="Customize Watermark Style & Format"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Coordinate Line */}
      {config.showCoordinates && (
        <div className="flex items-center gap-2 text-white font-mono font-semibold text-xs sm:text-sm tracking-tight mb-1">
          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">{coordStr}</span>
        </div>
      )}

      {/* Timestamp Line */}
      {config.showTimestamp && (
        <div className="flex items-center gap-2 text-white/90 font-mono text-[11px] sm:text-xs mb-1">
          <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>{timeStr}</span>
        </div>
      )}

      {/* Address line */}
      {config.showAddress && location.address && (
        <div className="text-zinc-300 text-[11px] sm:text-xs font-sans line-clamp-2 leading-relaxed mb-1.5 pl-5">
          {location.address}
        </div>
      )}

      {/* Extra chips: Altitude & Heading */}
      {(config.showAltitude || config.showHeading) && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/10 text-[10px] text-zinc-400 font-mono mb-2">
          {config.showAltitude && location.altitude !== null && (
            <div className="flex items-center gap-1">
              <Mountain className="w-3 h-3 text-amber-400" />
              <span>Alt: {Math.round(location.altitude)}m</span>
            </div>
          )}

          {config.showHeading && headingText && (
            <div className="flex items-center gap-1">
              <Compass className="w-3 h-3 text-purple-400" />
              <span>{headingText}</span>
            </div>
          )}
        </div>
      )}

      {/* Custom Text / User Details Field (Placed directly below all GPS details) */}
      <div className="pt-2 border-t border-white/15">
        {isEditingNote ? (
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your details (Name, Project, Site #, Surveyor)..."
                className="w-full px-2.5 py-1.5 text-xs bg-black/90 border border-blue-400/80 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <button
              onClick={handleSaveNote}
              className="p-1.5 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white rounded-lg text-xs flex items-center justify-center transition-all"
              title="Save Custom Details to GPS Tag"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditingNote(true)}
            className="w-full flex items-center justify-between text-left group/note p-1.5 -mx-1 rounded-lg hover:bg-white/10 transition-colors"
            title="Click to edit custom user details in the GPS Tag"
          >
            <div className="flex items-start gap-1.5 flex-1 min-w-0 pr-2">
              <Tag className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
              {config.customNote && config.customNote.trim() ? (
                <div className="text-xs text-blue-200 font-medium break-words">
                  <span className="text-[10px] text-blue-400/80 uppercase font-semibold block tracking-wider">User Details / Tag:</span>
                  <span>{config.customNote}</span>
                </div>
              ) : (
                <span className="text-xs text-white/50 italic flex items-center gap-1">
                  <span>+ Tap to add user details, project, or notes</span>
                </span>
              )}
            </div>
            <div className="p-1 rounded bg-white/5 group-hover/note:bg-blue-500 group-hover/note:text-white text-white/50 transition-colors">
              <Edit3 className="w-3 h-3" />
            </div>
          </button>
        )}
      </div>
    </div>
  );
};
