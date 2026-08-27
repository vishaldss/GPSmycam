import { AppSettings, CapturedPhoto, WatermarkConfig } from '../types';

const STORAGE_KEY = 'gps_camera_saved_photos_v2';
const SETTINGS_KEY = 'gps_camera_app_settings_v2';
const WATERMARK_CONFIG_KEY = 'gps_camera_watermark_config_v2';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  appTheme: 'dark',
  mobileCameraFolder: 'DCIM/Camera',
  autoSaveToDevice: true,
  autoSyncGoogleDrive: true,
  driveRootFolder: 'GPS Camera Photos',
  imageQuality: 0.95,
  filenamePrefix: 'GPS_IMG',
};

export const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = {
  position: 'bottom-left',
  showCoordinates: true,
  coordinateFormat: 'decimal',
  showTimestamp: true,
  dateFormat: 'YYYY-MM-DD HH:mm:ss',
  showAddress: true,
  showAltitude: true,
  showHeading: true,
  showAccuracy: true,
  showSpeed: false,
  showAppBranding: false,
  brandingText: 'GPS Camera Pro',
  boxOpacity: 0.7,
  boxCornerRadius: 12,
  fontSizeScale: 1.0,
  fontFamily: 'JetBrains Mono',
  fontWeight: '600',
  textColor: '#FFFFFF',
  accentColor: '#38BDF8',
  boxColor: '#000000',
  textShadow: true,
  customNote: '',
};

export function getAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_APP_SETTINGS;
    return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export function saveAppSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Failed to persist app settings:', err);
  }
}

export function getWatermarkConfig(): WatermarkConfig {
  try {
    const raw = localStorage.getItem(WATERMARK_CONFIG_KEY);
    if (!raw) return DEFAULT_WATERMARK_CONFIG;
    return { ...DEFAULT_WATERMARK_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_WATERMARK_CONFIG;
  }
}

export function saveWatermarkConfig(config: WatermarkConfig): void {
  try {
    localStorage.setItem(WATERMARK_CONFIG_KEY, JSON.stringify(config));
  } catch (err) {
    console.warn('Failed to persist watermark config:', err);
  }
}

export async function savePhotoToMediaStore(photo: CapturedPhoto, targetFolder: string = 'DCIM/Camera'): Promise<string> {
  const cleanFolder = targetFolder.replace(/^\/+|\/+$/g, '') || 'DCIM/Camera';
  const mediaStorePath = `${cleanFolder}/${photo.filename}`;
  photo.localSavedPath = mediaStorePath;
  
  try {
    const existing = getSavedPhotos();
    const updated = [photo, ...existing];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 100))); // Keep last 100
  } catch (err) {
    console.warn('LocalStorage save warning:', err);
  }

  return mediaStorePath;
}

export function updatePhotoDriveStatus(
  photoId: string,
  driveFileId: string,
  driveViewUrl: string
): void {
  try {
    const existing = getSavedPhotos();
    const updated = existing.map((p) => {
      if (p.id === photoId) {
        return {
          ...p,
          driveFileId,
          driveViewUrl,
          driveSyncedAt: Date.now(),
          isDriveSyncing: false,
        };
      }
      return p;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to update drive sync status:', err);
  }
}

export function getSavedPhotos(): CapturedPhoto[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function deleteSavedPhoto(id: string): void {
  try {
    const existing = getSavedPhotos();
    const updated = existing.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete photo:', err);
  }
}

export function clearAllSavedPhotos(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear photos:', err);
  }
}

export function downloadPhotoFile(photo: CapturedPhoto): void {
  const link = document.createElement('a');
  link.href = photo.dataUrl;
  link.download = photo.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function generatePhotoFilename(prefix: string = 'GPS_IMG', timestamp: number = Date.now()): string {
  const d = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateStr = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const timeStr = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '') || 'GPS_IMG';
  return `${cleanPrefix}_${dateStr}_${timeStr}.jpg`;
}
