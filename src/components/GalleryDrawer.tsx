import React, { useState } from 'react';
import {
  X,
  Download,
  Trash2,
  MapPin,
  Calendar,
  ExternalLink,
  Image as ImageIcon,
  Copy,
  Check,
  ZoomIn,
  Cloud,
  CloudCheck,
  RefreshCw,
  Folder,
} from 'lucide-react';
import { AppSettings, CapturedPhoto } from '../types';
import { downloadPhotoFile, deleteSavedPhoto } from '../utils/storage';
import { formatCoordinates, formatDate } from '../utils/watermarkEngine';

interface GalleryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  photos: CapturedPhoto[];
  appSettings: AppSettings;
  onPhotosUpdated: () => void;
  onSyncPhotoToDrive?: (photo: CapturedPhoto) => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

export const GalleryDrawer: React.FC<GalleryDrawerProps> = ({
  isOpen,
  onClose,
  photos,
  appSettings,
  onPhotosUpdated,
  onSyncPhotoToDrive,
  onShowToast,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(null);
  const [copied, setCopied] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = (photo: CapturedPhoto) => {
    if (confirm(`Delete ${photo.filename} from Gallery?`)) {
      deleteSavedPhoto(photo.id);
      onPhotosUpdated();
      if (selectedPhoto?.id === photo.id) {
        setSelectedPhoto(null);
      }
      onShowToast('Photo deleted from local storage', 'info');
    }
  };

  const handleCopyMetadata = (photo: CapturedPhoto) => {
    const text = [
      `File: ${photo.filename}`,
      `Date: ${formatDate(photo.timestamp, 'YYYY-MM-DD HH:mm:ss')}`,
      `Coordinates: ${formatCoordinates(photo.location.latitude, photo.location.longitude, 'decimal')}`,
      photo.location.address ? `Address: ${photo.location.address}` : '',
      photo.location.altitude ? `Altitude: ${Math.round(photo.location.altitude)}m` : '',
      `Mobile Storage: ${appSettings.mobileCameraFolder}/${photo.filename}`,
      photo.driveViewUrl ? `Google Drive: ${photo.driveViewUrl}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShowToast('GPS metadata copied to clipboard', 'success');
  };

  const handleManualDriveSync = async (photo: CapturedPhoto) => {
    if (!onSyncPhotoToDrive) return;
    try {
      setSyncingId(photo.id);
      await onSyncPhotoToDrive(photo);
      onPhotosUpdated();
      // update selected photo state with new drive metadata
      setSelectedPhoto((prev) => (prev && prev.id === photo.id ? { ...prev, isDriveSyncing: false } : prev));
    } catch (err: any) {
      onShowToast(`Drive sync failed: ${err.message}`, 'error');
    } finally {
      setSyncingId(null);
    }
  };

  const currentFolder = appSettings.mobileCameraFolder || 'DCIM/Camera';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
      <div
        id="mediastore-gallery-view"
        className="w-full max-w-4xl h-[92vh] bg-zinc-950 border border-zinc-800 rounded-3xl flex flex-col overflow-hidden text-zinc-100 shadow-2xl"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Camera & GPS Gallery</h2>
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[11px] font-mono text-zinc-300 border border-zinc-700">
                  {photos.length} photos
                </span>
              </div>
              <div className="text-xs text-zinc-400 font-mono flex items-center gap-1.5 mt-0.5">
                <Folder className="w-3.5 h-3.5 text-blue-400" />
                <span>{currentFolder}/</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {photos.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
              <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                <ImageIcon className="w-8 h-8 text-zinc-400" />
              </div>
              <h3 className="text-base font-semibold text-zinc-300 mb-1">No GPS Photos Captured Yet</h3>
              <p className="text-xs max-w-sm text-zinc-400">
                Press the shutter button in the Camera to capture a photo with GPS location metadata watermarked directly onto it.
              </p>
            </div>
          ) : (
            <>
              {/* Photo Thumbnails Grid */}
              <div
                className={`overflow-y-auto p-4 ${
                  selectedPhoto ? 'hidden md:block md:w-5/12 border-r border-zinc-800/80' : 'w-full'
                }`}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-3">
                  {photos.map((photo) => {
                    const isSelected = selectedPhoto?.id === photo.id;
                    const hasDrive = !!photo.driveViewUrl;
                    return (
                      <div
                        key={photo.id}
                        onClick={() => setSelectedPhoto(photo)}
                        className={`group relative rounded-2xl overflow-hidden aspect-[4/3] bg-zinc-900 border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 ring-2 ring-blue-500/30'
                            : 'border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <img
                          src={photo.dataUrl}
                          alt={photo.filename}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />
                        
                        {/* Drive Status Badge */}
                        <div className="absolute top-2 right-2">
                          {hasDrive ? (
                            <span className="p-1 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 block shadow-sm" title="Synced to Google Drive">
                              <Cloud className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="p-1 rounded-lg bg-black/60 border border-white/10 text-zinc-400 block" title="Local Only">
                              <Folder className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>

                        <div className="absolute bottom-2 left-2 right-2 text-[10px] text-white/90">
                          <div className="font-mono font-medium truncate">
                            {formatCoordinates(photo.location.latitude, photo.location.longitude, 'decimal')}
                          </div>
                          <div className="text-zinc-400 text-[9px] truncate">
                            {formatDate(photo.timestamp, 'MMM DD, YYYY HH:mm')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Photo Inspector */}
              {selectedPhoto ? (
                <div className="flex-1 flex flex-col bg-zinc-950 overflow-y-auto">
                  {/* Photo Preview Canvas */}
                  <div className="relative flex-1 min-h-[280px] flex items-center justify-center p-4 bg-black/50">
                    <img
                      src={selectedPhoto.dataUrl}
                      alt={selectedPhoto.filename}
                      className="max-h-[48vh] md:max-h-[55vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10"
                    />
                    <button
                      onClick={() => setSelectedPhoto(null)}
                      className="md:hidden absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-black/80 text-white text-xs font-semibold border border-white/10"
                    >
                      ← Back to Grid
                    </button>
                  </div>

                  {/* Metadata and Actions Sheet */}
                  <div className="p-4 sm:p-5 bg-zinc-900/90 border-t border-zinc-800 space-y-4 shrink-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-white font-mono">{selectedPhoto.filename}</h4>
                        <p className="text-xs text-blue-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <Folder className="w-3.5 h-3.5" />
                          <span>{selectedPhoto.localSavedPath || `${currentFolder}/${selectedPhoto.filename}`}</span>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Drive Status & Sync Button */}
                        {selectedPhoto.driveViewUrl ? (
                          <a
                            href={selectedPhoto.driveViewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <Cloud className="w-4 h-4 text-emerald-400" />
                            <span>Open in Drive</span>
                            <ExternalLink className="w-3 h-3 ml-0.5 text-emerald-400" />
                          </a>
                        ) : (
                          <button
                            onClick={() => handleManualDriveSync(selectedPhoto)}
                            disabled={syncingId === selectedPhoto.id}
                            className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncingId === selectedPhoto.id ? 'animate-spin' : ''}`} />
                            <span>{syncingId === selectedPhoto.id ? 'Uploading...' : 'Sync to Google Drive'}</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleCopyMetadata(selectedPhoto)}
                          className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-300 hover:text-white transition-all text-xs flex items-center gap-1.5"
                          title="Copy GPS EXIF text"
                        >
                          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          <span className="hidden sm:inline">Copy Info</span>
                        </button>

                        <button
                          onClick={() => downloadPhotoFile(selectedPhoto)}
                          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white transition-all text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/30"
                        >
                          <Download className="w-4 h-4" />
                          <span>Save to Device</span>
                        </button>

                        <button
                          onClick={() => handleDelete(selectedPhoto)}
                          className="p-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 active:scale-95 text-rose-300 hover:text-rose-200 transition-all text-xs"
                          title="Delete photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata Badges */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                        <div className="text-zinc-400 flex items-center gap-1.5 mb-1 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Coordinates</span>
                        </div>
                        <div className="font-mono text-white text-[11px]">
                          {formatCoordinates(selectedPhoto.location.latitude, selectedPhoto.location.longitude, 'decimal')}
                        </div>
                        <div className="font-mono text-zinc-400 text-[10px] mt-0.5">
                          {formatCoordinates(selectedPhoto.location.latitude, selectedPhoto.location.longitude, 'dms')}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                        <div className="text-zinc-400 flex items-center gap-1.5 mb-1 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-sky-400" />
                          <span>Capture Timestamp</span>
                        </div>
                        <div className="font-mono text-white text-[11px]">
                          {formatDate(selectedPhoto.timestamp, 'YYYY-MM-DD HH:mm:ss')}
                        </div>
                        <div className="text-zinc-400 text-[10px] mt-0.5">
                          {selectedPhoto.width} × {selectedPhoto.height} px • {(selectedPhoto.fileSize / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>

                      {selectedPhoto.location.address && (
                        <div className="sm:col-span-2 p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                          <div className="text-zinc-400 mb-1 font-medium text-[11px]">Geocoded Address</div>
                          <div className="text-white text-xs leading-relaxed">{selectedPhoto.location.address}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="hidden md:flex flex-1 items-center justify-center p-8 text-center text-zinc-500 bg-zinc-950/50">
                  <div>
                    <ZoomIn className="w-10 h-10 mx-auto mb-2 text-zinc-600" />
                    <p className="text-sm text-zinc-400">Select a photo on the left to inspect watermark details</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
