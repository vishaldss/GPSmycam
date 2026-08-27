import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const provider = new GoogleAuthProvider();
DRIVE_SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Cache daily folder IDs in memory: "RootFolder/YYYY-MM-DD" -> folderId
const folderIdCache: Record<string, string> = {};

/**
 * Initialize Auth State Listener
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Try getting fresh token or prompt if needed
        if (onAuthSuccess) onAuthSuccess(user, null);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sign in with Google Popup
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Could not retrieve Google Drive access token from authentication.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign In error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Get current cached access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  // If user is already logged in, prompt popup to refresh token
  if (auth.currentUser) {
    try {
      const res = await googleSignIn();
      return res?.accessToken || null;
    } catch {
      return null;
    }
  }

  return null;
};

/**
 * Logout from Firebase & clear memory tokens
 */
export const googleLogout = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
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
