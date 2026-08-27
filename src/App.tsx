import React, { useState, useEffect, useCallback } from 'react';
import { CameraState, CapturedPhoto, GPSLocationData, ToastMessage, WatermarkConfig } from './types';
import { CameraViewfinder } from './components/CameraViewfinder';
import { PermissionHandler } from './components/PermissionHandler';
import { GalleryDrawer } from './components/GalleryDrawer';
import { WatermarkSettingsModal } from './components/WatermarkSettingsModal';
import { LocationPresetModal } from './components/LocationPresetModal';
import { AndroidCodeModal } from './components/AndroidCodeModal';
import { AndroidToast } from './components/AndroidToast';
import { getSavedPhotos } from './utils/storage';
import { reverseGeocode, PRESET_LOCATIONS } from './utils/geoUtils';

const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = {
  position: 'bottom-left',
  showCoordinates: true,
  coordinateFormat: 'decimal',
  showTimestamp: true,
  dateFormat: 'YYYY-MM-DD HH:mm:ss',
  showAddress: true,
  showAltitude: true,
  showHeading: true,
  showAccuracy: false,
  showAppBranding: false,
  brandingText: 'GPS Camera Pro',
  boxOpacity: 0.68,
  boxCornerRadius: 12,
  fontSizeScale: 1.0,
  textColor: '#FFFFFF',
  boxColor: '#000000',
  customNote: '',
};

export default function App() {
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [locationPermission, setLocationPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [permissionsBypassed, setPermissionsBypassed] = useState<boolean>(false);

  const [currentLocation, setCurrentLocation] = useState<GPSLocationData | null>(null);
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig>(DEFAULT_WATERMARK_CONFIG);
  const [savedPhotos, setSavedPhotos] = useState<CapturedPhoto[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals state
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLocationPresetsOpen, setIsLocationPresetsOpen] = useState(false);
  const [isCodeViewerOpen, setIsCodeViewerOpen] = useState(false);

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
      // 1. Camera request
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      setCameraPermission('granted');
    } catch (e) {
      console.warn('Camera request failed:', e);
      setCameraPermission('denied');
    }

    // 2. Geolocation request
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
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

  return (
    <div className="w-screen h-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden select-none">
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
          savedPhotosCount={savedPhotos.length}
          onPhotoCaptured={handlePhotoCaptured}
          onOpenGallery={() => setIsGalleryOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenLocationPresets={() => setIsLocationPresetsOpen(true)}
          onOpenCodeViewer={() => setIsCodeViewerOpen(true)}
          onShowToast={showToast}
          onUpdateCustomNote={(note) => {
            setWatermarkConfig((prev) => ({ ...prev, customNote: note }));
            showToast(note ? `Custom details updated: "${note}"` : 'Custom details cleared', 'success');
          }}
        />
      )}

      {/* Gallery Modal */}
      <GalleryDrawer
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        photos={savedPhotos}
        onPhotosUpdated={handlePhotosUpdated}
        onShowToast={showToast}
      />

      {/* Watermark Configurator Modal */}
      <WatermarkSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={watermarkConfig}
        onChange={(updated) => setWatermarkConfig(updated)}
      />

      {/* GPS Location Source / Preset Modal */}
      <LocationPresetModal
        isOpen={isLocationPresetsOpen}
        onClose={() => setIsLocationPresetsOpen(false)}
        currentLocation={currentLocation}
        onSelectPreset={(loc) => {
          setCurrentLocation(loc);
          showToast(`GPS set to ${loc.city || 'custom location'}`, 'info');
        }}
        onUseLiveDeviceGps={() => {
          startLiveLocationTracking();
          showToast('Switched to Live Device GPS', 'success');
        }}
      />

      {/* Android Kotlin Project Source Code & ZIP Exporter */}
      <AndroidCodeModal
        isOpen={isCodeViewerOpen}
        onClose={() => setIsCodeViewerOpen(false)}
        onShowToast={showToast}
      />
    </div>
  );
}
