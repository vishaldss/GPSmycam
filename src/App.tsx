import React, { useState, useEffect, useCallback } from 'react';
import { AppSettings, CapturedPhoto, GPSLocationData, ToastMessage, WatermarkConfig } from './types';
import { CameraViewfinder } from './components/CameraViewfinder';
import { PermissionHandler } from './components/PermissionHandler';
import { GalleryDrawer } from './components/GalleryDrawer';
import { BackendSettingsPage } from './components/BackendSettingsPage';
import { LocationSearchModal } from './components/LocationSearchModal';
import { AndroidCodeModal } from './components/AndroidCodeModal';
import { AndroidToast } from './components/AndroidToast';
import {
  getSavedPhotos,
  getAppSettings,
  saveAppSettings,
  getWatermarkConfig,
  saveWatermarkConfig,
  updatePhotoDriveStatus,
} from './utils/storage';
import { reverseGeocode, PRESET_LOCATIONS } from './utils/geoUtils';
import { User } from 'firebase/auth';
import { testFirestoreConnection } from './firebase';
import {
  initAuth,
  getAccessToken,
  getDailyDriveFolder,
  uploadPhotoToDrive,
  googleSignIn,
} from './utils/googleDrive';

export default function App() {
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [locationPermission, setLocationPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [permissionsBypassed, setPermissionsBypassed] = useState<boolean>(false);

  const [currentLocation, setCurrentLocation] = useState<GPSLocationData | null>(null);
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig>(getWatermarkConfig());
  const [appSettings, setAppSettings] = useState<AppSettings>(getAppSettings());
  const [savedPhotos, setSavedPhotos] = useState<CapturedPhoto[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cachedToken, setCachedToken] = useState<string | null>(null);

  // Modals state
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLocationPresetsOpen, setIsLocationPresetsOpen] = useState(false);
  const [isCodeViewerOpen, setIsCodeViewerOpen] = useState(false);

  // Initialize Firebase Auth listener & test connection
  useEffect(() => {
    testFirestoreConnection();

    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        if (token) setCachedToken(token);
      },
      () => {
        setCurrentUser(null);
        setCachedToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Load saved photos on mount
  useEffect(() => {
    setSavedPhotos(getSavedPhotos());
  }, []);

  // Show Toast Helper
  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Check initial permissions
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'camera' as PermissionName })
        .then((res) => {
          setCameraPermission(res.state);
          res.onchange = () => setCameraPermission(res.state);
        })
        .catch(() => {});

      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((res) => {
          setLocationPermission(res.state);
          res.onchange = () => setLocationPermission(res.state);
        })
        .catch(() => {});
    }
  }, []);

  // GPS Location Watcher
  const startLiveLocationTracking = useCallback(() => {
    if (!('geolocation' in navigator)) {
      useFallbackLocation();
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        setLocationPermission('granted');
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const alt = pos.coords.altitude;
        const acc = pos.coords.accuracy;
        const heading = pos.coords.heading;
        const speed = pos.coords.speed;

        // Perform reverse geocoding
        const geo = await reverseGeocode(lat, lon);

        setCurrentLocation({
          latitude: lat,
          longitude: lon,
          altitude: alt,
          accuracy: acc,
          heading: heading,
          speed: speed,
          timestamp: pos.timestamp || Date.now(),
          address: geo.address,
          city: geo.city,
          state: geo.state,
          country: geo.country,
          postalCode: geo.postalCode,
          isMock: false,
        });
      },
      (err) => {
        console.warn('Geolocation watch error:', err);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationPermission('denied');
        }
        useFallbackLocation();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 2000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Set default sample location (Bhopal sample)
  const useFallbackLocation = () => {
    const sample = PRESET_LOCATIONS[0];
    setCurrentLocation({
      latitude: sample.lat,
      longitude: sample.lon,
      altitude: sample.alt,
      accuracy: 4.2,
      heading: 142,
      speed: null,
      timestamp: Date.now(),
      address: sample.address,
      city: sample.city,
      state: sample.state,
      country: sample.country,
      postalCode: '462001',
      isMock: true,
    });
  };

  // Trigger permission prompt flow
  const handleRequestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      setCameraPermission('granted');
    } catch (e) {
      console.warn('Camera request failed:', e);
      setCameraPermission('denied');
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async () => {
          setLocationPermission('granted');
          startLiveLocationTracking();
        },
        (err) => {
          console.warn('GPS request failed:', err);
          setLocationPermission('denied');
          useFallbackLocation();
        },
        { enableHighAccuracy: true }
      );
    } else {
      useFallbackLocation();
    }
  };

  const handleContinueWithMock = () => {
    setPermissionsBypassed(true);
    setCameraPermission('granted');
    setLocationPermission('granted');
    useFallbackLocation();
  };

  // Start tracking when granted
  useEffect(() => {
    if (locationPermission === 'granted' || permissionsBypassed) {
      startLiveLocationTracking();
    }
  }, [locationPermission, permissionsBypassed, startLiveLocationTracking]);

  const allPermissionsGranted =
    permissionsBypassed || (cameraPermission === 'granted' && locationPermission === 'granted');

  const handlePhotoCaptured = (newPhoto: CapturedPhoto) => {
    setSavedPhotos((prev) => [newPhoto, ...prev]);
  };

  const handlePhotosUpdated = () => {
    setSavedPhotos(getSavedPhotos());
  };

  const handleSaveAppSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    saveAppSettings(newSettings);
  };

  const handleSaveWatermarkConfig = (newConfig: WatermarkConfig) => {
    setWatermarkConfig(newConfig);
    saveWatermarkConfig(newConfig);
  };

  /**
   * Upload Photo to Google Drive in dynamic daily folder (Root / YYYY-MM-DD)
   */
  const handleUploadPhotoToDrive = async (
    photo: CapturedPhoto,
    blob?: Blob
  ): Promise<{ fileId: string; viewUrl: string }> => {
    let token = cachedToken;

    // If no cached token, try getting or prompting
    if (!token) {
      token = await getAccessToken();
    }

    if (!token) {
      const signInRes = await googleSignIn();
      if (!signInRes?.accessToken) {
        throw new Error('Google Drive authorization required.');
      }
      token = signInRes.accessToken;
      setCachedToken(token);
      setCurrentUser(signInRes.user);
    }

    // Convert dataUrl to blob if blob not passed
    let photoBlob = blob;
    if (!photoBlob) {
      const res = await fetch(photo.dataUrl);
      photoBlob = await res.blob();
    }

    // Determine today's date string: YYYY-MM-DD
    const photoDate = new Date(photo.timestamp);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${photoDate.getFullYear()}-${pad(photoDate.getMonth() + 1)}-${pad(photoDate.getDate())}`;

    // Get or Create Daily Folder
    const rootFolder = appSettings.driveRootFolder || 'GPS Camera Photos';
    const folderRes = await getDailyDriveFolder(rootFolder, dateStr, token);

    // Upload Photo File to this daily folder
    const uploadRes = await uploadPhotoToDrive(
      photoBlob,
      photo.filename,
      folderRes.dailyFolderId,
      token,
      `GPS Coordinates: ${photo.location.latitude}, ${photo.location.longitude} | Address: ${photo.location.address || 'N/A'}`
    );

    // Update in local storage and memory
    updatePhotoDriveStatus(photo.id, uploadRes.fileId, uploadRes.viewUrl);
    setSavedPhotos((prev) =>
      prev.map((p) =>
        p.id === photo.id
          ? {
              ...p,
              driveFileId: uploadRes.fileId,
              driveViewUrl: uploadRes.viewUrl,
              driveSyncedAt: Date.now(),
            }
          : p
      )
    );

    showToast(`☁️ Uploaded to Google Drive / ${dateStr} / ${photo.filename}`, 'success');
    return uploadRes;
  };

  // Theme Wrapper Classes
  const getThemeWrapperClass = () => {
    switch (appSettings.appTheme) {
      case 'oled':
        return 'bg-black text-white';
      case 'light':
        return 'bg-zinc-100 text-zinc-900';
      case 'emerald':
        return 'bg-emerald-950 text-emerald-100';
      case 'amber':
        return 'bg-amber-950 text-amber-100';
      case 'cyan':
        return 'bg-cyan-950 text-cyan-100';
      case 'dark':
      default:
        return 'bg-zinc-950 text-zinc-100';
    }
  };

  return (
    <div className={`w-screen h-screen ${getThemeWrapperClass()} flex flex-col overflow-hidden select-none`}>
      {/* Toast Manager */}
      <AndroidToast toasts={toasts} onDismiss={dismissToast} />

      {!allPermissionsGranted ? (
        <PermissionHandler
          cameraPermission={cameraPermission}
          locationPermission={locationPermission}
          onRequestPermissions={handleRequestPermissions}
          onContinueWithMock={handleContinueWithMock}
        />
      ) : (
        <CameraViewfinder
          location={currentLocation}
          watermarkConfig={watermarkConfig}
          appSettings={appSettings}
          currentUser={currentUser}
          savedPhotosCount={savedPhotos.length}
          onPhotoCaptured={handlePhotoCaptured}
          onOpenGallery={() => setIsGalleryOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenLocationPresets={() => setIsLocationPresetsOpen(true)}
          onOpenCodeViewer={() => setIsCodeViewerOpen(true)}
          onUploadToDrive={handleUploadPhotoToDrive}
          onShowToast={showToast}
          onUpdateCustomNote={(note) => {
            const updated = { ...watermarkConfig, customNote: note };
            setWatermarkConfig(updated);
            saveWatermarkConfig(updated);
            showToast(note ? `Custom details saved: "${note}"` : 'Custom details cleared', 'success');
          }}
        />
      )}

      {/* Gallery Modal */}
      <GalleryDrawer
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        photos={savedPhotos}
        appSettings={appSettings}
        onPhotosUpdated={handlePhotosUpdated}
        onSyncPhotoToDrive={handleUploadPhotoToDrive}
        onShowToast={showToast}
      />

      {/* Full Backend & App Settings Page */}
      <BackendSettingsPage
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        appSettings={appSettings}
        watermarkConfig={watermarkConfig}
        onSaveAppSettings={handleSaveAppSettings}
        onSaveWatermarkConfig={handleSaveWatermarkConfig}
        currentUser={currentUser}
        onShowToast={showToast}
      />

      {/* Google Maps GPS Location Search & Rooftop Accuracy Refinement Modal */}
      {isLocationPresetsOpen && (
        <LocationSearchModal
          currentLocation={
            currentLocation || {
              latitude: 23.2599,
              longitude: 77.4126,
              altitude: 527,
              accuracy: 2.5,
              heading: 145,
              speed: null,
              timestamp: Date.now(),
              address: 'Upper Lake, VIP Road, Bhopal, MP, India',
              city: 'Bhopal',
              state: 'Madhya Pradesh',
              country: 'India',
              postalCode: '462001',
              isMock: true,
              source: 'google_maps',
            }
          }
          appSettings={appSettings}
          onUpdateLocation={(newLoc) => {
            setCurrentLocation(newLoc);
            showToast(`GPS location refined: ${newLoc.address}`, 'success');
          }}
          onRefreshHardwareGps={async () => {
            startLiveLocationTracking();
            showToast('Recalibrating Hardware GPS Satellites...', 'info');
          }}
          onClose={() => setIsLocationPresetsOpen(false)}
        />
      )}

      {/* Android Kotlin Project Source Code & ZIP Exporter */}
      <AndroidCodeModal
        isOpen={isCodeViewerOpen}
        onClose={() => setIsCodeViewerOpen(false)}
        onShowToast={showToast}
      />
    </div>
  );
}
