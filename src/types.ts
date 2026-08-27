export interface GPSLocationData {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  isMock?: boolean;
}

export type WatermarkPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'bottom-bar' | 'top-bar';
export type CoordinateFormat = 'decimal' | 'dms' | 'utm';
export type DateFormatOption = 'YYYY-MM-DD HH:mm:ss' | 'DD/MM/YYYY hh:mm:ss A' | 'MMM DD, YYYY HH:mm' | 'UTC';
export type WatermarkFontFamily = 'JetBrains Mono' | 'Plus Jakarta Sans' | 'Inter' | 'Roboto Mono' | 'Space Mono' | 'Courier New';
export type WatermarkFontWeight = '400' | '500' | '600' | '700';

export interface WatermarkConfig {
  position: WatermarkPosition;
  showCoordinates: boolean;
  coordinateFormat: CoordinateFormat;
  showTimestamp: boolean;
  dateFormat: DateFormatOption;
  showAddress: boolean;
  showAltitude: boolean;
  showHeading: boolean;
  showAccuracy: boolean;
  showSpeed: boolean;
  showAppBranding: boolean;
  brandingText: string;
  boxOpacity: number; // 0.0 to 1.0
  boxCornerRadius: number; // in relative px
  fontSizeScale: number; // 0.7 to 1.6
  fontFamily: WatermarkFontFamily;
  fontWeight: WatermarkFontWeight;
  textColor: string;
  accentColor: string;
  boxColor: string;
  textShadow: boolean;
  customNote: string;
}

export type AppTheme = 'dark' | 'oled' | 'light' | 'emerald' | 'amber' | 'cyan';

export interface AppSettings {
  appTheme: AppTheme;
  mobileCameraFolder: 'DCIM/Camera' | 'Pictures/GPSCamera' | 'DCIM/GPS_Survey' | 'Download/GPS_Photos' | string;
  autoSaveToDevice: boolean;
  autoSyncGoogleDrive: boolean;
  driveRootFolder: string;
  imageQuality: number; // 0.8 to 1.0
  filenamePrefix: string;
}

export interface CapturedPhoto {
  id: string;
  dataUrl: string;
  timestamp: number;
  filename: string;
  fileSize: number;
  width: number;
  height: number;
  location: GPSLocationData;
  watermarkConfig: WatermarkConfig;
  localSavedPath?: string;
  driveFileId?: string;
  driveViewUrl?: string;
  driveSyncedAt?: number;
  isDriveSyncing?: boolean;
}

export interface CameraState {
  facingMode: 'environment' | 'user';
  isTorchOn: boolean;
  hasTorch: boolean;
  aspectRatio: '4:3' | '16:9' | '1:1';
  gridEnabled: boolean;
  isCapturing: boolean;
  cameraPermission: 'prompt' | 'granted' | 'denied';
  locationPermission: 'prompt' | 'granted' | 'denied';
  deviceOrientation: number;
}

export interface AndroidProjectFile {
  path: string;
  language: 'kotlin' | 'xml' | 'gradle' | 'json' | 'markdown';
  title: string;
  category: 'compose-ui' | 'camerax' | 'watermark-engine' | 'mediastore' | 'location' | 'manifest' | 'gradle';
  description: string;
  content: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
}
