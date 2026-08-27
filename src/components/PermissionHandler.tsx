import React from 'react';
import { Camera, MapPin, ShieldCheck, AlertCircle, RefreshCw, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';

interface PermissionHandlerProps {
  cameraPermission: 'prompt' | 'granted' | 'denied';
  locationPermission: 'prompt' | 'granted' | 'denied';
  onRequestPermissions: () => void;
  onContinueWithMock: () => void;
}

export const PermissionHandler: React.FC<PermissionHandlerProps> = ({
  cameraPermission,
  locationPermission,
  onRequestPermissions,
  onContinueWithMock,
}) => {
  const isCameraDenied = cameraPermission === 'denied';
  const isLocationDenied = locationPermission === 'denied';
  const hasDenied = isCameraDenied || isLocationDenied;

  return (
    <div id="permission-screen" className="flex-1 flex flex-col items-center justify-center p-6 bg-zinc-950 text-zinc-100 min-h-screen overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 flex flex-col items-center text-center"
      >
        {/* Top Icon Badge */}
        <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 shadow-inner">
          <Camera className="w-10 h-10" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
          Camera & Location Access
        </h1>
        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
          GPS Watermark Camera requires real-time camera and GPS permissions to capture high-resolution photos and bake location metadata into each image.
        </p>

        {/* Permission items status list */}
        <div className="w-full space-y-3 mb-8 text-left">
          {/* Camera item */}
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 shrink-0 mt-0.5">
              <Camera className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm text-zinc-100">Camera Access</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-medium ${
                  cameraPermission === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : cameraPermission === 'denied'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {cameraPermission === 'granted' ? 'Granted' : cameraPermission === 'denied' ? 'Denied' : 'Required'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                android.permission.CAMERA for CameraX live viewfinder & photo capture.
              </p>
            </div>
          </div>

          {/* Location item */}
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0 mt-0.5">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm text-zinc-100">GPS & Fine Location</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-medium ${
                  locationPermission === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : locationPermission === 'denied'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {locationPermission === 'granted' ? 'Granted' : locationPermission === 'denied' ? 'Denied' : 'Required'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                ACCESS_FINE_LOCATION & ACCESS_COARSE_LOCATION for coordinates and reverse geocoding.
              </p>
            </div>
          </div>
        </div>

        {hasDenied && (
          <div className="w-full flex items-center gap-2 p-3 mb-6 bg-rose-500/10 border border-rose-500/30 rounded-xl text-left text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>
              Permissions were blocked in your browser/device settings. Please allow access or test with simulated GPS.
            </span>
          </div>
        )}

        {/* Primary Action Button */}
        <button
          id="btn-grant-permissions"
          onClick={onRequestPermissions}
          className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{hasDenied ? 'Retry Granting Permissions' : 'Grant Permissions'}</span>
        </button>

        {/* Secondary Simulated Fallback Button */}
        <button
          id="btn-continue-mock"
          onClick={onContinueWithMock}
          className="w-full mt-3 py-3 px-6 rounded-2xl bg-zinc-800/80 hover:bg-zinc-800 active:scale-[0.98] text-zinc-300 hover:text-white font-medium text-xs transition-all border border-zinc-700/50 flex items-center justify-center gap-2"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Launch Camera with Simulated GPS (Sample Data)</span>
        </button>
      </motion.div>
    </div>
  );
};
