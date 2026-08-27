import { CapturedPhoto } from '../types';

const STORAGE_KEY = 'gps_camera_saved_photos_v1';

export async function savePhotoToMediaStore(photo: CapturedPhoto): Promise<string> {
  const mediaStorePath = `Pictures/GPSCamera/${photo.filename}`;
  
  try {
    const existing = getSavedPhotos();
    const updated = [photo, ...existing];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 50))); // Keep last 50
  } catch (err) {
    console.warn('LocalStorage save warning:', err);
  }

  return mediaStorePath;
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

export function generatePhotoFilename(timestamp: number = Date.now()): string {
  const d = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateStr = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const timeStr = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `GPS_IMG_${dateStr}_${timeStr}.jpg`;
}
