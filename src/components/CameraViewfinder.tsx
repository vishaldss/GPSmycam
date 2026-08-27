import React, { useRef, useState, useEffect } from 'react';
import {
  Camera,
  RefreshCw,
  Zap,
  ZapOff,
  Grid3X3,
  Image as ImageIcon,
  Code2,
  Settings2,
  Maximize2,
  Navigation,
  Sliders,
  Cloud,
} from 'lucide-react';
import { GPSLocationData, WatermarkConfig, CapturedPhoto, AppSettings } from '../types';
import { GPSOverlayHUD } from './GPSOverlayHUD';
import { applyWatermarkToImage } from '../utils/watermarkEngine';
import { generatePhotoFilename, savePhotoToMediaStore, downloadPhotoFile } from '../utils/storage';
import { User } from 'firebase/auth';

interface CameraViewfinderProps {
  location: GPSLocationData | null;
  watermarkConfig: WatermarkConfig;
  appSettings: AppSettings;
  currentUser: User | null;
  savedPhotosCount: number;
  onPhotoCaptured: (photo: CapturedPhoto) => void;
  onOpenGallery: () => void;
  onOpenSettings: () => void;
  onOpenLocationPresets: () => void;
  onOpenCodeViewer: () => void;
  onUploadToDrive?: (photo: CapturedPhoto, blob: Blob) => Promise<{ fileId: string; viewUrl: string }>;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onUpdateCustomNote?: (text: string) => void;
}

export const CameraViewfinder: React.FC<CameraViewfinderProps> = ({
  location,
  watermarkConfig,
  appSettings,
  currentUser,
  savedPhotosCount,
  onPhotoCaptured,
  onOpenGallery,
  onOpenSettings,
  onOpenLocationPresets,
  onOpenCodeViewer,
  onUploadToDrive,
  onShowToast,
  onUpdateCustomNote,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [aspectRatio, setAspectRatio] = useState<'4:3' | '16:9' | '1:1'>('4:3');
  const [isGridOn, setIsGridOn] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isShutterFlashing, setIsShutterFlashing] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Initialize camera stream
  useEffect(() => {
    let isMounted = true;

    async function initCamera() {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        const constraints: MediaStreamConstraints = {
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMounted) return;

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }

        // Check torch capability
        const track = stream.getVideoTracks()[0];
        if (track && 'getCapabilities' in track) {
          const caps = (track as any).getCapabilities();
          setHasTorch(Boolean(caps?.torch));
        }

        setCameraError(null);
      } catch (err: any) {
        console.warn('Camera stream error:', err);
        setCameraError(err.message || 'Camera stream could not be started');
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  // Flip Camera
  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && 'applyConstraints' in track) {
      try {
        await (track as any).applyConstraints({
          advanced: [{ torch: !isTorchOn }],
        });
        setIsTorchOn(!isTorchOn);
      } catch (e) {
        console.warn('Torch control error:', e);
      }
    }
  };

  // Tap to Focus Reticle
  const handleViewfinderTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setFocusPoint({ x, y });
    playFocusBeep();

    setTimeout(() => {
      setFocusPoint(null);
    }, 1200);
  };

  // Synthesize camera click & focus audio using Web Audio API
  const playShutterSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Audio context might be restricted before interaction
    }
  };

  const playFocusBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {}
  };

  // Photo Capture Trigger
  const handleCapture = async () => {
    if (isCapturing) return;

    setIsCapturing(true);
    setIsShutterFlashing(true);
    playShutterSound();

    setTimeout(() => {
      setIsShutterFlashing(false);
    }, 250);

    try {
      let sourceElement: HTMLVideoElement | HTMLCanvasElement | null = videoRef.current;

      // Fallback canvas if video element not ready or mock
      if (!sourceElement || (sourceElement instanceof HTMLVideoElement && sourceElement.readyState < 2)) {
        const dummyCanvas = document.createElement('canvas');
        dummyCanvas.width = 1920;
        dummyCanvas.height = 1080;
        const ctx = dummyCanvas.getContext('2d')!;
        
        // Render rich scenic backdrop
        const grad = ctx.createLinearGradient(0, 0, 1920, 1080);
        grad.addColorStop(0, '#1e293b');
        grad.addColorStop(0.5, '#0f172a');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1920, 1080);

        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GPS CameraX Capture Frame', 960, 540);
        sourceElement = dummyCanvas;
      }

      // Default fallback location if still loading
      const activeLocation: GPSLocationData = location || {
        latitude: 23.2599,
        longitude: 77.4126,
        altitude: 527,
        accuracy: 3.5,
        heading: 145,
        speed: null,
        timestamp: Date.now(),
        address: 'Upper Lake, VIP Road, Bhopal, MP, India',
        city: 'Bhopal',
        state: 'Madhya Pradesh',
        country: 'India',
        postalCode: '462001',
        isMock: true,
      };

      const captureTimestamp = Date.now();
      const filename = generatePhotoFilename(appSettings.filenamePrefix || 'GPS_IMG', captureTimestamp);

      // Execute Canvas Watermark Processing
      const result = await applyWatermarkToImage(
        sourceElement,
        activeLocation,
        watermarkConfig,
        captureTimestamp
      );

      const targetFolder = appSettings.mobileCameraFolder || 'DCIM/Camera';

      const capturedPhoto: CapturedPhoto = {
        id: `photo_${captureTimestamp}`,
        dataUrl: result.dataUrl,
        timestamp: captureTimestamp,
        filename,
        fileSize: result.blob.size,
        width: result.width,
        height: result.height,
        location: activeLocation,
        watermarkConfig: { ...watermarkConfig },
        localSavedPath: `${targetFolder}/${filename}`,
      };

      // Save to local cache & indexed MediaStore folder
      const savedPath = await savePhotoToMediaStore(capturedPhoto, targetFolder);

      // Auto-save to device file system if enabled
      if (appSettings.autoSaveToDevice) {
        downloadPhotoFile(capturedPhoto);
      }

      onPhotoCaptured(capturedPhoto);
      onShowToast(`Saved to ${savedPath}`, 'success');

      // Auto-Sync to Google Drive daily date folder if enabled
      if (appSettings.autoSyncGoogleDrive && onUploadToDrive) {
        onUploadToDrive(capturedPhoto, result.blob).catch((err) => {
          console.warn('Background Drive Sync notice:', err);
        });
      }
    } catch (err: any) {
      console.error('Capture error:', err);
      onShowToast(`Capture failed: ${err.message}`, 'error');
    } finally {
      setIsCapturing(false);
    }
  };

  // Determine aspect ratio frame styling
  const getAspectRatioClasses = () => {
    if (aspectRatio === '1:1') return 'aspect-square max-h-[75vh]';
    if (aspectRatio === '16:9') return 'aspect-[9/16] sm:aspect-[16/9] max-h-[85vh]';
    return 'aspect-[3/4] sm:aspect-[4/3] max-h-[80vh]'; // 4:3 default
  };

  return (
    <div
      id="camera-screen-container"
      ref={containerRef}
      className="relative w-full h-full flex flex-col items-center justify-between bg-[#0A0A0A] text-white overflow-hidden select-none font-sans"
    >
      {/* Top Header Bar (Geometric Balance Theme) */}
      <div className="w-full z-30 px-4 sm:px-6 py-3 bg-black/40 backdrop-blur-md border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="text-xs sm:text-sm font-semibold tracking-tight uppercase flex items-center gap-1.5">
            <span>GPS CAMERA</span>
            <span className="text-blue-400 font-bold">PRO</span>
          </div>
          <div className="h-4 w-px bg-white/20 hidden sm:block" />
          <button
            onClick={onOpenLocationPresets}
            className="flex items-center gap-2 text-[10px] text-white/70 hover:text-white tracking-widest uppercase transition-colors"
            title="GPS Signal & Location status (Click to change)"
          >
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.7)] shrink-0" />
            <span className="hidden xs:inline">
              {location?.isMock ? 'Simulated GPS' : 'High Accuracy GPS'}
            </span>
          </button>

          {/* Google Drive Status Indicator */}
          <div className="h-4 w-px bg-white/20 hidden md:block" />
          <button
            onClick={onOpenSettings}
            className={`hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-sans font-medium transition-colors ${
              currentUser
                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                : 'bg-white/5 text-zinc-400 hover:text-zinc-200 border border-white/10'
            }`}
            title={currentUser ? `Connected to Drive (${currentUser.email})` : 'Google Drive not connected (Tap to set up)'}
          >
            <Cloud className={`w-3 h-3 ${currentUser ? 'text-blue-400' : 'text-zinc-500'}`} />
            <span className="truncate max-w-[120px]">
              {currentUser ? 'Drive Synced' : 'Drive Off'}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Flash Toggle */}
          <button
            id="btn-toggle-flash"
            onClick={toggleTorch}
            className={`p-2 rounded-lg border transition-all active:scale-95 ${
              isTorchOn
                ? 'bg-amber-400/20 border-amber-400/80 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20'
            }`}
            title="Flash / Torch toggle"
          >
            {isTorchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
          </button>

          {/* Aspect Ratio Selector Pills */}
          <div className="flex items-center gap-0.5 bg-black/50 p-0.5 rounded-lg border border-white/10">
            {(['4:3', '16:9', '1:1'] as const).map((ratio) => (
              <button
                key={ratio}
                onClick={() => setAspectRatio(ratio)}
                className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                  aspectRatio === ratio
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>

          {/* Grid Toggle */}
          <button
            id="btn-toggle-grid"
            onClick={() => setIsGridOn(!isGridOn)}
            className={`p-2 rounded-lg border transition-all active:scale-95 ${
              isGridOn
                ? 'bg-blue-500/20 border-blue-400 text-blue-300'
                : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20'
            }`}
            title="Toggle Rule-of-Thirds Grid"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>

          {/* Watermark Settings */}
          <button
            id="btn-watermark-settings"
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white/80 transition-all active:scale-95"
            title="Watermark Style & Format"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Android Kotlin Source Code Explorer */}
          <button
            id="btn-view-android-code"
            onClick={onOpenCodeViewer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-400/40 text-xs font-semibold backdrop-blur-md transition-all active:scale-95"
            title="View Android Kotlin & Jetpack Compose Code"
          >
            <Code2 className="w-4 h-4 text-blue-400" />
            <span className="hidden md:inline">Android Code</span>
          </button>
        </div>
      </div>

      {/* Main Viewfinder Center Canvas */}
      <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden bg-[#0A0A0A] p-2 sm:p-4">
        <div
          onClick={handleViewfinderTap}
          className={`relative w-full max-w-3xl bg-[#141414] rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center cursor-crosshair transition-all ${getAspectRatioClasses()}`}
        >
          {/* Camera Video Stream */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />

          {/* Camera Error Fallback Message */}
          {cameraError && (
            <div className="absolute inset-0 bg-[#121212] flex flex-col items-center justify-center p-6 text-center text-zinc-400">
              <Camera className="w-12 h-12 text-blue-400/60 mb-3 animate-pulse" />
              <p className="text-sm font-semibold text-zinc-200 mb-1">Live Viewfinder Ready</p>
              <p className="text-xs text-zinc-500 max-w-xs font-mono">
                Click the shutter button below to capture and bake precision GPS coordinates into the photo.
              </p>
            </div>
          )}

          {/* Geometric Balance Reticles */}
          <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none z-10">
            <div className="w-full h-px bg-white/40 absolute" />
            <div className="h-full w-px bg-white/40 absolute" />
            <div className="w-full h-px bg-white/20 absolute -translate-y-24 sm:-translate-y-32" />
            <div className="w-full h-px bg-white/20 absolute translate-y-24 sm:translate-y-32" />
            <div className="h-full w-px bg-white/20 absolute -translate-x-28 sm:-translate-x-40" />
            <div className="h-full w-px bg-white/20 absolute translate-x-28 sm:translate-x-40" />
          </div>

          {/* Center Geometric Target Circle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-36 h-36 sm:w-48 sm:h-48 border border-white/20 rounded-full flex items-center justify-center animate-pulse-subtle">
              <div className="w-4 h-4 border border-blue-400/80 rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-blue-400 rounded-full" />
              </div>
            </div>
          </div>

          {/* Live Feed Status Pill (Top-Left) */}
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 pointer-events-none">
            <div className="px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-[10px] uppercase font-bold tracking-widest flex items-center gap-2 text-white/90">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
              <span>Live Feed</span>
            </div>
          </div>

          {/* Grid Overlay (Rule of Thirds) */}
          {isGridOn && (
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10">
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-white/20" />
              <div className="border-r border-white/20" />
              <div />
            </div>
          )}

          {/* Focus Reticle Animation */}
          {focusPoint && (
            <div
              style={{ left: focusPoint.x - 24, top: focusPoint.y - 24 }}
              className="absolute w-12 h-12 border-2 border-blue-400 rounded-lg pointer-events-none animate-focus-ring z-20"
            />
          )}

          {/* Shutter Flash Animation */}
          {isShutterFlashing && (
            <div className="absolute inset-0 bg-white animate-shutter z-30 pointer-events-none" />
          )}

          {/* Live Interactive GPS HUD Overlay (Bottom-Left by default) */}
          <div
            className={`absolute z-20 pointer-events-auto transition-all ${
              watermarkConfig.position === 'top-left'
                ? 'top-14 left-4'
                : watermarkConfig.position === 'top-right'
                ? 'top-4 right-4'
                : watermarkConfig.position === 'bottom-right'
                ? 'bottom-4 right-4'
                : watermarkConfig.position === 'bottom-bar'
                ? 'bottom-0 left-0 right-0 max-w-none'
                : 'bottom-4 left-4' // bottom-left default
            }`}
          >
            <GPSOverlayHUD
              location={location}
              config={watermarkConfig}
              onOpenSettings={onOpenSettings}
              onOpenLocationPresets={onOpenLocationPresets}
              onUpdateCustomNote={onUpdateCustomNote}
            />
          </div>
        </div>
      </div>

      {/* Bottom Shutter & Controls Dock (Geometric Balance Theme) */}
      <div className="w-full h-36 sm:h-40 bg-black border-t border-white/5 px-6 sm:px-16 flex flex-col justify-center relative z-30">
        <div className="w-full max-w-2xl mx-auto flex items-center justify-between">
          {/* Gallery Button: Geometric container with rounded corners */}
          <button
            id="btn-open-gallery"
            onClick={onOpenGallery}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 border-white/10 bg-[#1C1C1C] overflow-hidden flex items-center justify-center group cursor-pointer hover:border-blue-400/60 transition-all relative active:scale-95 shadow-lg"
            title="Open MediaStore Gallery"
          >
            <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white/70 group-hover:text-blue-400 transition-colors" />
            </div>
            {savedPhotosCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-blue-500 text-white font-mono text-[10px] font-bold border-2 border-black">
                {savedPhotosCount}
              </span>
            )}
          </button>

          {/* Shutter Button: Iconic Geometric Dual-Ring Circle */}
          <div className="relative flex items-center justify-center">
            <button
              id="btn-capture-shutter"
              onClick={handleCapture}
              disabled={isCapturing}
              className={`w-20 h-20 sm:w-22 sm:h-22 rounded-full border-[3px] border-white flex items-center justify-center p-1.5 hover:scale-105 active:scale-95 transition-transform cursor-pointer disabled:opacity-50 ${
                isCapturing ? 'opacity-75' : ''
              }`}
              title="Capture photo and bake GPS watermark"
            >
              <div
                className={`w-full h-full rounded-full transition-all ${
                  isCapturing ? 'bg-zinc-400 scale-90' : 'bg-white'
                }`}
              />
            </button>
          </div>

          {/* Camera Flip Button: Circular subtle glass container */}
          <button
            id="btn-flip-camera"
            onClick={toggleCameraFacing}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center group cursor-pointer transition-all active:scale-95 shadow-lg"
            title="Switch Front/Rear Camera"
          >
            <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-white/80 group-hover:text-white transition-transform group-hover:rotate-45" />
          </button>
        </div>

        {/* Bottom Mode Indicators */}
        <div className="flex items-center justify-center gap-8 sm:gap-12 mt-2.5">
          <button
            onClick={() => onShowToast('Camera mode active', 'info')}
            className="text-[10px] text-blue-400 font-bold uppercase tracking-widest transition-colors"
          >
            Photo
          </button>
          <button
            onClick={onOpenLocationPresets}
            className="text-[10px] text-white/40 hover:text-white/80 font-bold uppercase tracking-widest transition-colors"
          >
            GPS Overlay
          </button>
          <button
            onClick={onOpenSettings}
            className="text-[10px] text-white/40 hover:text-white/80 font-bold uppercase tracking-widest transition-colors"
          >
            Metadata
          </button>
        </div>
      </div>
    </div>
  );
};
