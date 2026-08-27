import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import { app, auth } from '../firebase';

export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.photos.readonly',
];

const provider = new GoogleAuthProvider();
DRIVE_SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

const TOKEN_STORAGE_KEY = 'gps_camera_drive_access_token_v1';
const TOKEN_EXPIRY_KEY = 'gps_camera_drive_token_expiry_v1';

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Try restoring cached token from localStorage
try {
  const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (savedToken && expiry && parseInt(expiry, 10) > Date.now()) {
    cachedAccessToken = savedToken;
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  }
} catch {
  // Ignore local storage error
}

// Cache daily folder IDs in memory: "RootFolder/YYYY-MM-DD" -> folderId
const folderIdCache: Record<string, string> = {};

export function saveCachedAccessToken(token: string, expiresInSeconds: number = 3500): void {
  cachedAccessToken = token;
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    const expiryTime = Date.now() + expiresInSeconds * 1000;
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
  } catch (err) {
    console.warn('Failed to store access token:', err);
  }
}

export function clearCachedAccessToken(): void {
  cachedAccessToken = null;
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  } catch {
    // ignore
  }
}

/**
 * Check if the current browser environment is mobile
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.matchMedia && window.matchMedia('(max-width: 768px)').matches && 'ontouchstart' in window)
  );
}

/**
 * Initialize Auth State Listener and check for Redirect Results (Mobile)
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  // Check for redirect result on page boot (Crucial for mobile redirect flow)
  getRedirectResult(auth)
    .then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          saveCachedAccessToken(credential.accessToken);
          if (onAuthSuccess) {
            onAuthSuccess(result.user, credential.accessToken);
          }
        }
      }
    })
    .catch((err) => {
      console.warn('Redirect auth result warning:', err);
    });

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        if (onAuthSuccess) onAuthSuccess(user, null);
      }
    } else {
      clearCachedAccessToken();
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sign in with Google (Supports both Mobile-friendly Popup and Redirect mode)
 */
export const googleSignIn = async (
  forceRedirect: boolean = false
): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const isMobile = isMobileDevice();

    // If mobile or explicitly requested redirect mode, use signInWithRedirect
    if (forceRedirect) {
      await signInWithRedirect(auth, provider);
      return null;
    }

    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);

      if (!credential?.accessToken) {
        throw new Error('Google Drive access scope not granted. Please approve permissions.');
      }

      saveCachedAccessToken(credential.accessToken);
      return { user: result.user, accessToken: credential.accessToken };
    } catch (popupError: any) {
      console.warn('Popup sign in encountered issue:', popupError);

      // If popup was blocked, closed prematurely on mobile, or user-agent blocked:
      if (
        popupError.code === 'auth/popup-blocked' ||
        popupError.code === 'auth/popup-closed-by-user' ||
        popupError.code === 'auth/cancelled-popup-request' ||
        isMobile
      ) {
        console.log('Falling back to Mobile Redirect flow...');
        await signInWithRedirect(auth, provider);
        return null;
      }

      if (popupError.code === 'auth/unauthorized-domain') {
        const hostname = window.location.hostname;
        throw new Error(
          `Domain "${hostname}" is not authorized in Firebase Console. Add "${hostname}" to Firebase Console -> Authentication -> Settings -> Authorized Domains.`
        );
      }

      throw popupError;
    }
  } catch (error: any) {
    console.error('Google Sign In error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Get current cached access token or prompt
 */
export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  // If user is already logged in, prompt popup to refresh token
  if (auth.currentUser) {
    try {
      const res = await googleSignIn(false);
      return res?.accessToken || null;
    } catch {
      return null;
    }
  }

  return null;
};

/**
 * Logout from Firebase & clear tokens
 */
export const googleLogout = async (): Promise<void> => {
  await signOut(auth);
  clearCachedAccessToken();
  Object.keys(folderIdCache).forEach((k) => delete folderIdCache[k]);
};

/**
 * Search or create a folder in Google Drive
 */
export async function getOrCreateFolder(
  folderName: string,
  parentFolderId: string | null,
  accessToken: string
): Promise<string> {
  const cacheKey = `${parentFolderId || 'root'}/${folderName}`;
  if (folderIdCache[cacheKey]) {
    return folderIdCache[cacheKey];
  }

  // Query existing folder
  let query = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  } else {
    query += ` and 'root' in parents`;
  }

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`Drive folder search failed: ${errText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    const existingId = searchData.files[0].id;
    folderIdCache[cacheKey] = existingId;
    return existingId;
  }

  // Create folder
  const folderMetadata: Record<string, any> = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentFolderId) {
    folderMetadata.parents = [parentFolderId];
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(folderMetadata),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Drive folder creation failed: ${errText}`);
  }

  const createData = await createRes.json();
  folderIdCache[cacheKey] = createData.id;
  return createData.id;
}

/**
 * Get or create daily date folder: Root / YYYY-MM-DD
 */
export async function getDailyDriveFolder(
  rootFolderName: string,
  dateStr: string, // YYYY-MM-DD
  accessToken: string
): Promise<{ rootId: string; dailyFolderId: string; folderUrl: string }> {
  // 1. Root folder
  const rootId = await getOrCreateFolder(rootFolderName, null, accessToken);

  // 2. Daily date folder
  const dailyFolderId = await getOrCreateFolder(dateStr, rootId, accessToken);

  const folderUrl = `https://drive.google.com/drive/folders/${dailyFolderId}`;
  return { rootId, dailyFolderId, folderUrl };
}

/**
 * Upload a Photo Blob to a specific Google Drive Folder
 */
export async function uploadPhotoToDrive(
  photoBlob: Blob,
  filename: string,
  folderId: string,
  accessToken: string,
  description?: string
): Promise<{ fileId: string; viewUrl: string; filename: string }> {
  const metadata = {
    name: filename,
    description: description || 'GPS Watermarked Photo captured with GPS Camera Pro',
    parents: [folderId],
    mimeType: 'image/jpeg',
  };

  const formData = new FormData();
  formData.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  formData.append('file', photoBlob);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Drive photo upload failed: ${errText}`);
  }

  const data = await uploadRes.json();
  return {
    fileId: data.id,
    viewUrl: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
    filename: data.name || filename,
  };
}
