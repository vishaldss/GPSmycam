import { CapturedPhoto, GPSLocationData, WatermarkConfig } from '../types';
import { formatCoordinates, getHeadingDirection } from './geoUtils';

export { formatCoordinates };

export function formatDate(timestamp: number, format: string): string {
  const d = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());

  if (format === 'UTC') {
    return d.toUTCString();
  }
  if (format === 'DD/MM/YYYY hh:mm:ss A') {
    const hours12 = d.getHours() % 12 || 12;
    const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
    return `${DD}/${MM}/${YYYY} ${pad(hours12)}:${mm}:${ss} ${ampm}`;
  }
  if (format === 'MMM DD, YYYY HH:mm') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${DD}, ${YYYY} ${HH}:${mm}:${ss}`;
  }
  
  // Default YYYY-MM-DD HH:mm:ss
  return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`;
}

/**
 * Renders the watermark directly onto the canvas using bitmap manipulation
 * matching the Android Canvas / Paint implementation.
 */
export async function applyWatermarkToImage(
  sourceImage: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement,
  location: GPSLocationData,
  config: WatermarkConfig,
  customTimestamp?: number
): Promise<{ dataUrl: string; width: number; height: number; blob: Blob }> {
  // Determine intrinsic dimensions
  let srcWidth = 0;
  let srcHeight = 0;

  if (sourceImage instanceof HTMLVideoElement) {
    srcWidth = sourceImage.videoWidth || 1920;
    srcHeight = sourceImage.videoHeight || 1080;
  } else if (sourceImage instanceof HTMLImageElement) {
    srcWidth = sourceImage.naturalWidth || sourceImage.width;
    srcHeight = sourceImage.naturalHeight || sourceImage.height;
  } else {
    srcWidth = sourceImage.width;
    srcHeight = sourceImage.height;
  }

  // Create high-resolution rendering canvas
  const canvas = document.createElement('canvas');
  canvas.width = srcWidth;
  canvas.height = srcHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Unable to initialize 2D canvas context');
  }

  // Draw base photo frame
  ctx.drawImage(sourceImage, 0, 0, srcWidth, srcHeight);

  // Calculate dynamic scaling relative to photo resolution
  // Base reference is 1080p (min dimension ~1080px)
  const minDim = Math.min(srcWidth, srcHeight);
  const scale = (minDim / 1000) * config.fontSizeScale;

  const baseFontSize = Math.max(14, Math.round(20 * scale));
  const subFontSize = Math.max(11, Math.round(15 * scale));
  const iconSize = Math.max(16, Math.round(22 * scale));
  const paddingX = Math.round(24 * scale);
  const paddingY = Math.round(18 * scale);
  const lineSpacing = Math.round(8 * scale);
  const cornerRadius = Math.round(12 * scale);
  const margin = Math.round(28 * scale);

  const timestamp = customTimestamp || location.timestamp || Date.now();
  const dateStr = formatDate(timestamp, config.dateFormat);
  const coordStr = formatCoordinates(location.latitude, location.longitude, config.coordinateFormat);

  // Prepare text lines
  interface TextLine {
    text: string;
    isPrimary?: boolean;
    isSub?: boolean;
    prefixIcon?: 'location' | 'calendar' | 'compass' | 'altitude' | 'tag';
  }

  const lines: TextLine[] = [];

  if (config.showCoordinates) {
    lines.push({
      text: coordStr,
      isPrimary: true,
      prefixIcon: 'location',
    });
  }

  if (config.showTimestamp) {
    lines.push({
      text: dateStr,
      isPrimary: false,
      prefixIcon: 'calendar',
    });
  }

  if (config.showAddress && location.address) {
    lines.push({
      text: location.address,
      isPrimary: false,
      prefixIcon: 'tag',
    });
  }

  // Extra details line (Altitude, Heading, Accuracy)
  const extras: string[] = [];
  if (config.showAltitude && location.altitude !== null) {
    extras.push(`Alt: ${Math.round(location.altitude)}m`);
  }
  if (config.showHeading && location.heading !== null) {
    extras.push(`Heading: ${getHeadingDirection(location.heading)}`);
  }
  if (config.showAccuracy && location.accuracy !== null) {
    extras.push(`±${Math.round(location.accuracy)}m`);
  }

  if (extras.length > 0) {
    lines.push({
      text: extras.join('  •  '),
      isSub: true,
      prefixIcon: 'altitude',
    });
  }

  if (config.customNote && config.customNote.trim()) {
    lines.push({
      text: `User / Tag: ${config.customNote.trim()}`,
      isSub: false,
      prefixIcon: 'tag',
    });
  }

  if (config.showAppBranding && config.brandingText) {
    lines.push({
      text: config.brandingText,
      isSub: true,
    });
  }

  // Calculate box dimensions
  ctx.save();
  let maxLineWidth = 0;
  let totalTextHeight = 0;

  lines.forEach((line, i) => {
    const fontSize = line.isPrimary ? baseFontSize : (line.isSub ? subFontSize : baseFontSize * 0.9);
    ctx.font = `${line.isPrimary ? '600' : '400'} ${fontSize}px 'JetBrains Mono', 'Plus Jakarta Sans', sans-serif`;
    const metrics = ctx.measureText(line.text);
    const iconOffset = line.prefixIcon ? iconSize + 8 * scale : 0;
    const lineWidth = metrics.width + iconOffset;
    if (lineWidth > maxLineWidth) {
      maxLineWidth = lineWidth;
    }
    totalTextHeight += fontSize + (i > 0 ? lineSpacing : 0);
  });

  // Clamp max box width to 85% of image width for clean aesthetics
  const maxBoxAllowedWidth = srcWidth * 0.85;
  const boxWidth = Math.min(maxBoxAllowedWidth, maxLineWidth + paddingX * 2);
  const boxHeight = totalTextHeight + paddingY * 2;

  // Compute watermark position coordinates
  let boxX = margin;
  let boxY = srcHeight - boxHeight - margin;

  if (config.position === 'bottom-right') {
    boxX = srcWidth - boxWidth - margin;
    boxY = srcHeight - boxHeight - margin;
  } else if (config.position === 'top-left') {
    boxX = margin;
    boxY = margin;
  } else if (config.position === 'top-right') {
    boxX = srcWidth - boxWidth - margin;
    boxY = margin;
  } else if (config.position === 'bottom-bar') {
    boxX = 0;
    boxY = srcHeight - boxHeight;
  }

  // Draw semi-transparent background box
  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${config.boxOpacity})`;

  if (config.position === 'bottom-bar') {
    ctx.fillRect(0, boxY, srcWidth, boxHeight);
  } else {
    // Draw rounded rectangle
    drawRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight, cornerRadius);
    ctx.fill();

    // Subtle 1px border for high contrast
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = Math.max(1, Math.round(1.5 * scale));
    ctx.stroke();
  }
  ctx.restore();

  // Draw text lines
  let currentY = boxY + paddingY;

  lines.forEach((line) => {
    const fontSize = line.isPrimary ? baseFontSize : (line.isSub ? subFontSize : baseFontSize * 0.9);
    const isPrimary = line.isPrimary;
    const isSub = line.isSub;

    ctx.font = `${isPrimary ? '600' : '400'} ${fontSize}px 'JetBrains Mono', 'Plus Jakarta Sans', sans-serif`;
    ctx.textBaseline = 'top';

    const textX = boxX + paddingX;

    // Draw clean text with high legibility
    ctx.fillStyle = isPrimary ? '#FFFFFF' : (isSub ? '#A1A1AA' : '#F4F4F5');
    
    // Draw text with subtle shadow for crisp contrast against any background
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = Math.round(3 * scale);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = Math.round(1 * scale);

    // Truncate text if exceeds box
    let displayText = line.text;
    const availableWidth = boxWidth - paddingX * 2;
    if (ctx.measureText(displayText).width > availableWidth) {
      while (displayText.length > 5 && ctx.measureText(displayText + '...').width > availableWidth) {
        displayText = displayText.slice(0, -1);
      }
      displayText += '...';
    }

    ctx.fillText(displayText, textX, currentY);
    ctx.shadowColor = 'transparent';

    currentY += fontSize + lineSpacing;
  });

  ctx.restore();

  // Export to high-quality JPEG blob and data URL
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to generate image blob'));
          return;
        }
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        resolve({
          dataUrl,
          width: srcWidth,
          height: srcHeight,
          blob,
        });
      },
      'image/jpeg',
      0.95
    );
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
