import React, { useState } from 'react';
import {
  X,
  Palette,
  Type,
  FolderDown,
  Cloud,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Sliders,
  Smartphone,
  HardDrive,
  LogOut,
  LogIn,
  RefreshCw,
  Eye,
  Layers,
  Copy,
  Check,
  ShieldAlert,
  ArrowRight,
  HelpCircle,
  Camera,
  Compass,
  MapPin,
  Maximize2,
  Radio,
  SlidersHorizontal,
  Globe,
  Crosshair,
  Zap,
} from 'lucide-react';
import {
  AppSettings,
  AppTheme,
  CoordinateFormat,
  DateFormatOption,
  PhotoResolution,
  WatermarkConfig,
  WatermarkFontFamily,
  WatermarkFontWeight,
  WatermarkPosition,
} from '../types';
import { User } from 'firebase/auth';
import { googleSignIn, googleLogout, getDailyDriveFolder, isMobileDevice } from '../utils/googleDrive';
import { DEFAULT_APP_SETTINGS, DEFAULT_WATERMARK_CONFIG } from '../utils/storage';

interface BackendSettingsPageProps {
  isOpen: boolean;
  onClose: () => void;
  appSettings: AppSettings;
  watermarkConfig: WatermarkConfig;
  onSaveAppSettings: (settings: AppSettings) => void;
  onSaveWatermarkConfig: (config: WatermarkConfig) => void;
  currentUser: User | null;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

type TabType = 'theme' | 'quality' | 'gps' | 'font' | 'storage' | 'drive';

export const BackendSettingsPage: React.FC<BackendSettingsPageProps> = ({
  isOpen,
  onClose,
  appSettings,
  watermarkConfig,
  onSaveAppSettings,
  onSaveWatermarkConfig,
  currentUser,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('theme');
  const [isDriveTesting, setIsDriveTesting] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [lastCreatedFolderUrl, setLastCreatedFolderUrl] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState<boolean>(false);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleCopyHostname = () => {
    if (navigator.clipboard && currentHostname) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      onShowToast(`Copied "${currentHostname}" to clipboard!`, 'success');
      setTimeout(() => setCopiedDomain(false), 3000);
    }
  };

  if (!isOpen) return null;

  const themes: { id: AppTheme; name: string; desc: string; bg: string; accent: string; border: string }[] = [
    {
      id: 'dark',
      name: 'Pro Slate (Dark)',
      desc: 'Standard high-contrast surveyor dark theme',
      bg: 'bg-zinc-900',
      accent: 'bg-blue-500',
      border: 'border-blue-500',
    },
    {
      id: 'oled',
      name: 'OLED Pure Black',
      desc: 'Zero backlight pure #000 for battery saving & contrast',
      bg: 'bg-black',
      accent: 'bg-indigo-500',
      border: 'border-indigo-500',
    },
    {
      id: 'light',
      name: 'Field Light',
      desc: 'High ambient daylight visibility mode',
      bg: 'bg-zinc-100 text-zinc-900',
      accent: 'bg-blue-600',
      border: 'border-blue-600',
    },
    {
      id: 'emerald',
      name: 'Emerald Survey',
      desc: 'Forestry & environmental surveying palette',
      bg: 'bg-emerald-950',
      accent: 'bg-emerald-500',
      border: 'border-emerald-500',
    },
    {
      id: 'amber',
      name: 'Tactical Amber',
      desc: 'Night vision & low-light engineering tint',
      bg: 'bg-amber-950',
      accent: 'bg-amber-500',
      border: 'border-amber-500',
    },
    {
      id: 'cyan',
      name: 'Cyber Cyan',
      desc: 'Precision CAD & technical styling',
      bg: 'bg-cyan-950',
      accent: 'bg-cyan-400',
      border: 'border-cyan-400',
    },
  ];

  const fontFamilies: { id: WatermarkFontFamily; label: string; sample: string }[] = [
    { id: 'JetBrains Mono', label: 'JetBrains Mono (Default)', sample: '23.2599°N 77.4126°E 527m' },
    { id: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans', sample: '23.2599°N 77.4126°E 527m' },
    { id: 'Inter', label: 'Inter UI', sample: '23.2599°N 77.4126°E 527m' },
    { id: 'Roboto Mono', label: 'Roboto Mono', sample: '23.2599°N 77.4126°E 527m' },
    { id: 'Space Mono', label: 'Space Mono (Technical)', sample: '23.2599°N 77.4126°E 527m' },
    { id: 'Courier New', label: 'Courier Monospace', sample: '23.2599°N 77.4126°E 527m' },
  ];

  const fontWeights: { id: WatermarkFontWeight; label: string }[] = [
    { id: '400', label: 'Regular (400)' },
    { id: '500', label: 'Medium (500)' },
    { id: '600', label: 'Semi-Bold (600)' },
    { id: '700', label: 'Bold (700)' },
  ];

  const textColors = [
    { hex: '#FFFFFF', label: 'Pure White' },
    { hex: '#FACC15', label: 'High-Vis Yellow' },
    { hex: '#4ADE80', label: 'Laser Green' },
    { hex: '#38BDF8', label: 'Cyan Blue' },
    { hex: '#FB923C', label: 'Safety Orange' },
    { hex: '#E879F9', label: 'Magenta' },
  ];

  const positions: { id: WatermarkPosition; label: string }[] = [
    { id: 'bottom-left', label: 'Bottom-Left (Standard)' },
    { id: 'bottom-right', label: 'Bottom-Right' },
    { id: 'top-left', label: 'Top-Left' },
    { id: 'top-right', label: 'Top-Right' },
    { id: 'bottom-bar', label: 'Full Bottom Bar' },
    { id: 'top-bar', label: 'Full Top Bar' },
  ];

  const mobileFolderPresets = [
    { path: 'DCIM/Camera', desc: 'Default Mobile Camera roll (shows in Google Photos/Gallery immediately)' },
    { path: 'Pictures/GPSCamera', desc: 'Dedicated GPS Camera sub-folder' },
    { path: 'DCIM/GPS_Survey', desc: 'DCIM Survey folder for field engineering' },
    { path: 'Download/GPS_Photos', desc: 'Standard device downloads directory' },
  ];

  const handleGoogleSignIn = async (forceRedirect: boolean = false) => {
    try {
      setIsSigningIn(true);
      const res = await googleSignIn(forceRedirect);
      if (res?.user) {
        onShowToast(`Connected as ${res.user.displayName || res.user.email}`, 'success');
      } else if (forceRedirect) {
        onShowToast('Redirecting to Google Account Sign-In...', 'info');
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      if (err.message?.includes('auth/unauthorized-domain') || err.message?.includes('not authorized in Firebase Console')) {
        onShowToast(`Domain unauthorized: Add "${currentHostname}" in Firebase Console -> Authentication -> Authorized Domains`, 'error');
      } else {
        onShowToast(`Google Sign-In failed: ${err.message}`, 'error');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await googleLogout();
      onShowToast('Signed out of Google Drive', 'info');
    } catch (err: any) {
      onShowToast(`Logout error: ${err.message}`, 'error');
    }
  };

  const handleTestDriveFolder = async () => {
    try {
      setIsDriveTesting(true);
      const signinRes = await googleSignIn();
      if (!signinRes?.accessToken) {
        throw new Error('Please sign in to test Drive sync');
      }

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const folderRes = await getDailyDriveFolder(
        appSettings.driveRootFolder || 'GPS Camera Photos',
        today,
        signinRes.accessToken
      );

      setLastCreatedFolderUrl(folderRes.folderUrl);
      onShowToast(`Drive folder ready: ${appSettings.driveRootFolder}/${today}`, 'success');
    } catch (err: any) {
      onShowToast(`Drive Test Failed: ${err.message}`, 'error');
    } finally {
      setIsDriveTesting(false);
    }
  };

  const todayDateStr = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <div
        id="backend-settings-modal"
        className="w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl max-h-[94vh] flex flex-col text-zinc-100 overflow-hidden"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Backend & App Settings</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  v2.4
                </span>
              </div>
              <p className="text-xs text-zinc-400">Manage App Theme, GPS Typography, Mobile Folders & Google Drive Auto-Sync</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onSaveAppSettings(DEFAULT_APP_SETTINGS);
                onSaveWatermarkConfig(DEFAULT_WATERMARK_CONFIG);
                onShowToast('Settings reset to defaults', 'info');
              }}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs flex items-center gap-1.5 transition-colors"
              title="Reset all settings to factory default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Defaults</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="flex items-center gap-1 px-6 py-2.5 bg-zinc-900/30 border-b border-zinc-800/60 overflow-x-auto shrink-0">
          {[
            { id: 'theme', label: '1. App Theme', icon: Palette },
            { id: 'quality', label: '2. High-Res & 4K Camera', icon: Camera, highlight: true },
            { id: 'gps', label: '3. Google Maps & Accuracy', icon: Compass, highlight: true },
            { id: 'font', label: '4. GPS Font & Watermark', icon: Type },
            { id: 'storage', label: '5. Mobile Camera Folder', icon: Smartphone },
            { id: 'drive', label: '6. Google Drive & Gmail Sync', icon: Cloud },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.highlight && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* ===================== TAB 1: THEME ===================== */}
          {activeTab === 'theme' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
                  Application UI Color Theme
                </h3>
                <p className="text-xs text-zinc-400 mb-4">
                  Select the visual style and high-contrast color scheme for the viewfinder HUD, buttons, and gallery.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {themes.map((t) => {
                    const isSelected = appSettings.appTheme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          onSaveAppSettings({ ...appSettings, appTheme: t.id });
                          onShowToast(`Theme changed to ${t.name}`, 'info');
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-32 ${
                          isSelected
                            ? 'bg-zinc-900 border-blue-500 ring-2 ring-blue-500/30'
                            : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-white text-sm">{t.name}</div>
                            <div className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{t.desc}</div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 ml-2" />}
                        </div>

                        {/* Visual Accent Preview Bar */}
                        <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-white/5">
                          <div className={`w-3 h-3 rounded-full ${t.accent}`} />
                          <div className="w-8 h-2 rounded bg-zinc-800" />
                          <div className="w-12 h-2 rounded bg-zinc-700" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Theme Feature Details */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-semibold text-white">Dynamic Field Optimization</div>
                  <p className="text-zinc-400 mt-0.5">
                    All themes use anti-reflective mathematically balanced palettes tested for intense direct sunlight and night-surveying.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB 2: HIGH-RES QUALITY & 4K CAMERA ===================== */}
          {activeTab === 'quality' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Photo Resolution & Hardware Capture Profile
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    High-Res Engine Active
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mb-4">
                  Select the target resolution for camera capture and watermark rendering. Max Native Sensor uses direct hardware sensor grab.
                </p>

                {/* Resolution Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: 'max_sensor',
                      name: 'Max Hardware Sensor Resolution',
                      badge: 'Best Quality / Native MP',
                      resolution: 'Up to 12MP / 48MP / 64MP Sensor Native',
                      desc: 'Uses modern ImageCapture hardware pipeline to grab full uncompressed native camera frames directly from sensor.',
                      recommended: true,
                    },
                    {
                      id: '4k',
                      name: '4K Ultra HD (3840 × 2160)',
                      badge: '8.3 Megapixels',
                      resolution: '3840 × 2160 px (16:9) or 3840 × 2880 px (4:3)',
                      desc: 'Ultra crisp professional detail. Ideal for engineering, architectural inspection, and land surveying.',
                      recommended: false,
                    },
                    {
                      id: '2k',
                      name: '2K Quad HD (2560 × 1440)',
                      badge: '3.7 Megapixels',
                      resolution: '2560 × 1440 px',
                      desc: 'High clarity with balanced storage size and quick Google Drive uploads.',
                      recommended: false,
                    },
                    {
                      id: '1080p',
                      name: 'Full HD 1080p (1920 × 1080)',
                      badge: '2.1 Megapixels',
                      resolution: '1920 × 1080 px',
                      desc: 'Fastest processing speed. Ideal for low-memory devices or slow network connections.',
                      recommended: false,
                    },
                  ].map((res) => {
                    const isSelected = appSettings.photoResolution === res.id;
                    return (
                      <button
                        key={res.id}
                        onClick={() => {
                          onSaveAppSettings({ ...appSettings, photoResolution: res.id as PhotoResolution });
                          onShowToast(`Resolution set to ${res.name}`, 'success');
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-600/15 border-blue-500 ring-2 ring-blue-500/30'
                            : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold text-white text-xs sm:text-sm">{res.name}</span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />}
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-300">
                              {res.badge}
                            </span>
                            {res.recommended && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                Recommended
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400">{res.desc}</p>
                        </div>

                        <div className="text-[10px] font-mono text-zinc-500 mt-3 pt-2 border-t border-zinc-800/80">
                          Target Matrix: {res.resolution}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* JPEG Quality Slider */}
              <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      JPEG Encoding & Sharpness Quality
                    </span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Controls compression ratio. 98%–100% preserves maximum optical clarity and prevents artifacting.
                    </p>
                  </div>
                  <span className="font-mono text-base text-blue-400 font-bold px-3 py-1 bg-blue-500/15 rounded-xl border border-blue-500/30">
                    {Math.round(appSettings.imageQuality * 100)}%
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <input
                    type="range"
                    min="0.80"
                    max="1.0"
                    step="0.02"
                    value={appSettings.imageQuality}
                    onChange={(e) =>
                      onSaveAppSettings({ ...appSettings, imageQuality: parseFloat(e.target.value) })
                    }
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />

                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>80% (Standard)</span>
                    <span>90% (High Detail)</span>
                    <span className="text-blue-400 font-bold">98% (Ultra Sharp / Recommended)</span>
                    <span>100% (Lossless JPEG)</span>
                  </div>
                </div>
              </div>

              {/* Hardware Sensor Direct Capture Switch */}
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Direct Hardware Sensor Shutter Mode (ImageCapture API)</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Bypasses video stream downsampling to grab the full uncompressed frame directly from the hardware camera sensor.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={appSettings.enableSensorDirectCapture}
                  onChange={(e) =>
                    onSaveAppSettings({ ...appSettings, enableSensorDirectCapture: e.target.checked })
                  }
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 bg-zinc-950 border-zinc-700 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* ===================== TAB 3: GOOGLE MAPS & GPS ACCURACY ===================== */}
          {activeTab === 'gps' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Google Maps Platform Geocoding & Rooftop GPS
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Google Maps Ready
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mb-4">
                  Configure high-accuracy Google Maps reverse geocoding, rooftop address resolution, and satellite calibration.
                </p>

                {/* Google Maps Feature Switch */}
                <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between mb-4">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-400" />
                      <span>Use Google Maps Location Services</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Resolves street numbers, landmarks, municipal zones, and precision rooftop locations.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={appSettings.useGoogleMaps}
                    onChange={(e) =>
                      onSaveAppSettings({ ...appSettings, useGoogleMaps: e.target.checked })
                    }
                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 bg-zinc-950 border-zinc-700 cursor-pointer"
                  />
                </div>

                {/* Google Maps Platform API Key Input */}
                <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-zinc-200">
                      Google Maps Platform API Key (Optional)
                    </label>
                    <a
                      href="https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <span>Get API Key</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Enter your Google Maps Geocoding API key for direct Google Cloud rooftop lookups. If left blank, the app uses built-in high-precision geocoding.
                  </p>
                  <input
                    type="text"
                    value={appSettings.googleMapsApiKey || ''}
                    onChange={(e) =>
                      onSaveAppSettings({ ...appSettings, googleMapsApiKey: e.target.value })
                    }
                    placeholder="AIzaSy..."
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* GPS Drift & Indoor Accuracy Solution Info */}
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-2 mt-4">
                  <div className="font-bold text-white flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-blue-400" />
                    <span>How to get 100% accurate GPS on Mobile & Desktop:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-zinc-300 text-[11px]">
                    <li>
                      <strong className="text-white">Under Open Sky:</strong> Hardware GPS satellites lock within ±2 to ±5 meters.
                    </li>
                    <li>
                      <strong className="text-white">Indoors / In Buildings:</strong> Satellite signals may degrade to ±30m. Tap the <strong>"Satellite Status Pill"</strong> in the top header or HUD to search your exact building/landmark with Google Maps and lock rooftop coordinates!
                    </li>
                    <li>
                      <strong className="text-white">High Refresh Rate:</strong> The app continuously listens with <code className="text-blue-300">enableHighAccuracy: true</code> to refine accuracy every second.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB 2: FONT & WATERMARK ===================== */}
          {activeTab === 'font' && (
            <div className="space-y-6">
              {/* Live Preview Box */}
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-blue-400" />
                    Live Watermark Typography Preview
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400">
                    Font: {watermarkConfig.fontFamily} ({watermarkConfig.fontWeight})
                  </span>
                </div>

                <div
                  style={{
                    backgroundColor: watermarkConfig.boxColor || '#000000',
                    opacity: 1,
                    borderRadius: `${watermarkConfig.boxCornerRadius}px`,
                    fontFamily: watermarkConfig.fontFamily,
                  }}
                  className="p-4 border border-white/10 shadow-lg text-xs space-y-1.5 transition-all"
                >
                  <div
                    style={{
                      color: watermarkConfig.textColor,
                      fontWeight: watermarkConfig.fontWeight,
                      textShadow: watermarkConfig.textShadow ? '0 1px 3px rgba(0,0,0,0.8)' : 'none',
                    }}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span>📍</span>
                    <span>23.259933° N, 77.412615° E</span>
                  </div>
                  <div className="text-zinc-300 text-[11px] flex items-center gap-2">
                    <span>📅</span>
                    <span>{todayDateStr} 12:45:00 PM</span>
                  </div>
                  <div className="text-zinc-300 text-[11px] flex items-center gap-2">
                    <span>🏷️</span>
                    <span>VIP Road, Upper Lake, Bhopal, MP, India</span>
                  </div>
                  <div className="text-zinc-400 text-[10px] flex items-center gap-2">
                    <span>Alt: 527m • Heading: SE 145° • ±3.2m</span>
                  </div>
                  {watermarkConfig.customNote && (
                    <div
                      style={{ color: watermarkConfig.accentColor || '#60A5FA' }}
                      className="text-[11px] font-semibold pt-1 border-t border-white/10"
                    >
                      User / Tag: {watermarkConfig.customNote}
                    </div>
                  )}
                </div>
              </div>

              {/* 1. Font Family */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  GPS Watermark Font Family
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {fontFamilies.map((f) => {
                    const isSelected = watermarkConfig.fontFamily === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => onSaveWatermarkConfig({ ...watermarkConfig, fontFamily: f.id })}
                        style={{ fontFamily: f.id }}
                        className={`p-3 rounded-xl border text-left text-xs transition-all ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-blue-300 ring-1 ring-blue-500'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <div className="font-semibold text-white">{f.label}</div>
                        <div className="text-[11px] text-zinc-400 mt-1 truncate">{f.sample}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Font Weight & Text Shadow */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    Font Weight / Thickness
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {fontWeights.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => onSaveWatermarkConfig({ ...watermarkConfig, fontWeight: w.id })}
                        className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                          watermarkConfig.fontWeight === w.id
                            ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    Font Color & Readability
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {textColors.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => onSaveWatermarkConfig({ ...watermarkConfig, textColor: c.hex })}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs transition-all ${
                          watermarkConfig.textColor === c.hex
                            ? 'border-white bg-white/10 text-white font-bold'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <div className="w-3.5 h-3.5 rounded-full border border-black/40" style={{ backgroundColor: c.hex }} />
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Scale, Opacity & Corner Radius Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-zinc-300">Font Size Scale</span>
                    <span className="font-mono text-blue-400 font-bold">{watermarkConfig.fontSizeScale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.75"
                    max="1.5"
                    step="0.05"
                    value={watermarkConfig.fontSizeScale}
                    onChange={(e) =>
                      onSaveWatermarkConfig({ ...watermarkConfig, fontSizeScale: parseFloat(e.target.value) })
                    }
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-zinc-300">Box Opacity</span>
                    <span className="font-mono text-blue-400 font-bold">{Math.round(watermarkConfig.boxOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={watermarkConfig.boxOpacity}
                    onChange={(e) =>
                      onSaveWatermarkConfig({ ...watermarkConfig, boxOpacity: parseFloat(e.target.value) })
                    }
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-zinc-300">Corner Radius</span>
                    <span className="font-mono text-blue-400 font-bold">{watermarkConfig.boxCornerRadius}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="2"
                    value={watermarkConfig.boxCornerRadius}
                    onChange={(e) =>
                      onSaveWatermarkConfig({ ...watermarkConfig, boxCornerRadius: parseInt(e.target.value) })
                    }
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>

              {/* 4. Placement & Fields */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Overlay Position
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {positions.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onSaveWatermarkConfig({ ...watermarkConfig, position: p.id })}
                      className={`py-2 px-3 rounded-xl border text-xs font-medium text-left transition-all ${
                        watermarkConfig.position === p.id
                          ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Surveyor Tag Input */}
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30">
                <label className="block text-xs font-bold text-blue-300 mb-1">
                  Custom User / Surveyor / Project Tag
                </label>
                <p className="text-[11px] text-zinc-400 mb-2">
                  Bakes below GPS coordinates into every captured image.
                </p>
                <input
                  type="text"
                  value={watermarkConfig.customNote}
                  onChange={(e) => onSaveWatermarkConfig({ ...watermarkConfig, customNote: e.target.value })}
                  placeholder="e.g. Surveyor: Vishal | Site Survey #104 | Project TopNTown"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-blue-400/40 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
          )}

          {/* ===================== TAB 3: MOBILE CAMERA STORAGE ===================== */}
          {activeTab === 'storage' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
                  Mobile Device Camera Storage Folder
                </h3>
                <p className="text-xs text-zinc-400 mb-4">
                  Define where images are routed on mobile storage and within Android MediaStore.
                </p>

                <div className="space-y-2">
                  {mobileFolderPresets.map((preset) => {
                    const isSelected = appSettings.mobileCameraFolder === preset.path;
                    return (
                      <label
                        key={preset.path}
                        onClick={() => onSaveAppSettings({ ...appSettings, mobileCameraFolder: preset.path })}
                        className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-600/15 border-blue-500 ring-1 ring-blue-500'
                            : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="mobileFolder"
                          checked={isSelected}
                          onChange={() => onSaveAppSettings({ ...appSettings, mobileCameraFolder: preset.path })}
                          className="mt-1 text-blue-500 focus:ring-blue-400 bg-zinc-900"
                        />
                        <div className="flex-1">
                          <div className="font-mono font-bold text-white text-xs flex items-center gap-2">
                            <span>📁 {preset.path}</span>
                            {preset.path === 'DCIM/Camera' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-500/20 text-green-300 font-sans border border-green-500/30">
                                Recommended
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-0.5">{preset.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Custom Path Input */}
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Custom Mobile Folder Path
                </label>
                <input
                  type="text"
                  value={appSettings.mobileCameraFolder}
                  onChange={(e) => onSaveAppSettings({ ...appSettings, mobileCameraFolder: e.target.value })}
                  placeholder="e.g. DCIM/Camera or Pictures/MySurveys"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-blue-400"
                />
              </div>

              {/* Auto Download Switch */}
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Auto-Save directly to Device Storage on Click</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Automatically triggers browser/mobile download to the device camera folder on shutter press.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={appSettings.autoSaveToDevice}
                  onChange={(e) => onSaveAppSettings({ ...appSettings, autoSaveToDevice: e.target.checked })}
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 bg-zinc-950 border-zinc-700 cursor-pointer"
                />
              </div>

              {/* File Prefix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Filename Prefix</label>
                  <input
                    type="text"
                    value={appSettings.filenamePrefix}
                    onChange={(e) => onSaveAppSettings({ ...appSettings, filenamePrefix: e.target.value })}
                    placeholder="GPS_IMG"
                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white font-mono"
                  />
                  <div className="text-[10px] text-zinc-500 mt-1">Output: {appSettings.filenamePrefix}_YYYYMMDD_HHMMSS.jpg</div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-zinc-300">JPEG Capture Quality</span>
                    <span className="font-mono text-blue-400 font-bold">{Math.round(appSettings.imageQuality * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.75"
                    max="1.0"
                    step="0.05"
                    value={appSettings.imageQuality}
                    onChange={(e) => onSaveAppSettings({ ...appSettings, imageQuality: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-2"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB 4: GOOGLE DRIVE & GMAIL ===================== */}
          {activeTab === 'drive' && (
            <div className="space-y-6">
              {/* Account Authentication Card */}
              <div className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    {currentUser?.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt="User Avatar"
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-full border-2 border-blue-500 shadow-md"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                        <Cloud className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      {currentUser ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{currentUser.displayName || 'Google Account'}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-500/20 text-green-300 font-bold border border-green-500/30">
                              Connected
                            </span>
                          </div>
                          <div className="text-xs text-zinc-400 font-mono mt-0.5">{currentUser.email}</div>
                        </>
                      ) : (
                        <>
                          <div className="font-bold text-white text-sm">Google Account Not Connected</div>
                          <div className="text-xs text-zinc-400">Connect Gmail to auto-save photos into daily folders</div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Sign In / Sign Out Button */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {currentUser ? (
                      <button
                        onClick={handleGoogleLogout}
                        className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Disconnect Account</span>
                      </button>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => handleGoogleSignIn(false)}
                          disabled={isSigningIn}
                          className="px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
                          title="Standard Google OAuth Sign-In (Best for Desktop & Chrome)"
                        >
                          <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                          </svg>
                          <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
                        </button>

                        <button
                          onClick={() => handleGoogleSignIn(true)}
                          disabled={isSigningIn}
                          className="px-3.5 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                          title="Recommended for Mobile: Full-page redirect without popups"
                        >
                          <Smartphone className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                          <span>Mobile Redirect Sign-In</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile Sign-in Troubleshooting & Authorized Domains Helper */}
              {!currentUser && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-100 text-xs space-y-3">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-amber-300">Why does the login popup vanish on mobile?</div>
                      <div className="text-[11px] text-amber-200/80 mt-1 leading-relaxed">
                        On mobile devices (Android Chrome, iOS Safari, or preview webviews), popup windows are automatically blocked or closed due to cross-origin tracking policies.
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-black/40 rounded-xl border border-amber-500/20 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-[11px] text-zinc-300">
                        <span className="font-semibold text-white">Your Current Web Domain:</span>
                        <span className="font-mono text-emerald-400 ml-1.5 bg-black/60 px-2 py-0.5 rounded border border-emerald-500/30 select-all">
                          {currentHostname || 'localhost'}
                        </span>
                      </div>
                      <button
                        onClick={handleCopyHostname}
                        className="flex items-center justify-center gap-1 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 rounded-lg text-[11px] font-medium transition-colors shrink-0"
                      >
                        {copiedDomain ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedDomain ? 'Copied Domain!' : 'Copy Domain'}</span>
                      </button>
                    </div>

                    <div className="text-[10px] text-zinc-400 pt-1 border-t border-white/5 space-y-1">
                      <div className="font-semibold text-amber-200">How to Fix (2 Solutions):</div>
                      <div className="flex items-start gap-1.5">
                        <span className="font-bold text-blue-400 shrink-0">1. Instant Solution:</span>
                        <span>
                          Tap the <span className="font-semibold text-blue-300">"Mobile Redirect Sign-In"</span> button above. It navigates directly to Google and redirects back without opening popups.
                        </span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="font-bold text-amber-400 shrink-0">2. Firebase Domain Whitelist:</span>
                        <span>
                          Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-blue-400 underline">Firebase Console</a> &gt; <strong>Authentication</strong> &gt; <strong>Settings</strong> &gt; <strong>Authorized Domains</strong> &gt; Add <code className="text-emerald-300">{currentHostname}</code>.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Auto Sync Toggle */}
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-blue-400" />
                    <span>Auto-Save Every Photo to Google Drive</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Automatically organizes every shot into date-based subfolders (`YYYY-MM-DD`).
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={appSettings.autoSyncGoogleDrive}
                  onChange={(e) => onSaveAppSettings({ ...appSettings, autoSyncGoogleDrive: e.target.checked })}
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 bg-zinc-950 border-zinc-700 cursor-pointer"
                />
              </div>

              {/* Dynamic Daily Folder Logic Card */}
              <div className="p-5 rounded-2xl bg-blue-950/30 border border-blue-500/30 space-y-4">
                <div className="flex items-start gap-3">
                  <FolderDown className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                      Daily Date Folder Structure
                    </h4>
                    <p className="text-[11px] text-zinc-300 mt-1">
                      Every photo shot on any date is automatically saved into that date's folder in Google Drive. Next day, the app automatically creates a new folder for the next date!
                    </p>
                  </div>
                </div>

                {/* Root Folder Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-300">
                    Google Drive Root Folder Name:
                  </label>
                  <input
                    type="text"
                    value={appSettings.driveRootFolder}
                    onChange={(e) => onSaveAppSettings({ ...appSettings, driveRootFolder: e.target.value })}
                    placeholder="GPS Camera Photos"
                    className="w-full px-3.5 py-2 bg-zinc-950 border border-blue-500/40 rounded-xl text-xs text-white font-mono"
                  />
                </div>

                {/* Current Target Path Visualization */}
                <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/5 font-mono text-[11px] text-blue-200">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-sans font-bold mb-1">
                    Today's Target Drive Path:
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>📁 Google Drive</span>
                    <span>/</span>
                    <span className="text-white font-bold">{appSettings.driveRootFolder || 'GPS Camera Photos'}</span>
                    <span>/</span>
                    <span className="text-emerald-400 font-bold">{todayDateStr}</span>
                    <span>/</span>
                    <span className="text-zinc-400">GPS_IMG_...jpg</span>
                  </div>
                </div>

                {/* Test Folder Button */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    onClick={handleTestDriveFolder}
                    disabled={isDriveTesting}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isDriveTesting ? 'animate-spin' : ''}`} />
                    <span>{isDriveTesting ? 'Verifying Folder in Drive...' : "Verify & Create Today's Folder"}</span>
                  </button>

                  {lastCreatedFolderUrl && (
                    <a
                      href={lastCreatedFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <span>Open Today's Folder in Drive</span>
                      <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between shrink-0">
          <div className="text-xs text-zinc-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
            <span>Settings saved automatically to local cache & cloud profile</span>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
