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

export type WatermarkPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'bottom-bar';
export type CoordinateFormat = 'decimal' | 'dms';
export type DateFormatOption = 'YYYY-MM-DD HH:mm:ss' | 'DD/MM/YYYY hh:mm:ss A' | 'MMM DD, YYYY HH:mm' | 'UTC';

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
  showAppBranding: boolean;
  brandingText: string;
  boxOpacity: number; // 0.0 to 1.0
  boxCornerRadius: number; // in relative px
  fontSizeScale: number; // 0.8 to 1.5
  textColor: string;
  boxColor: string;
  customNote: string;
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
