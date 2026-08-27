import React, { useState } from 'react';
import { X, Code2, Download, Copy, Check, FileCode, FolderTree, Sparkles } from 'lucide-react';
import JSZip from 'jszip';
import { ANDROID_PROJECT_FILES } from '../data/androidSourceCode';
import { AndroidProjectFile } from '../types';

interface AndroidCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info') => void;
}

export const AndroidCodeModal: React.FC<AndroidCodeModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'code' | 'guide'>('code');
  const [selectedFile, setSelectedFile] = useState<AndroidProjectFile>(ANDROID_PROJECT_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShowToast(`Copied ${selectedFile.title} to clipboard`, 'success');
  };

  const handleDownloadZip = async () => {
    setIsExportingZip(true);
    try {
      const zip = new JSZip();

      // Add all project files into the zip structure
      ANDROID_PROJECT_FILES.forEach((file) => {
        zip.file(file.path, file.content);
      });

      // Generate additional standard Gradle files for completeness
      zip.file(
        'settings.gradle.kts',
        `pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\\\.android.*")
                includeGroupByRegex("com\\\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "GPSWatermarkCamera"
include(":app")
`
      );

      zip.file(
        'gradle/libs.versions.toml',
        `[versions]
agp = "8.8.0"
kotlin = "2.0.21"
composeBom = "2024.12.01"

[libraries]
androidx-compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "composeBom" }
androidx-ui = { group = "androidx.compose.ui", name = "ui" }
androidx-ui-graphics = { group = "androidx.compose.ui", name = "ui-graphics" }
androidx-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
androidx-material3 = { group = "androidx.compose.material3", name = "material3" }
androidx-material-icons-extended = { group = "androidx.compose.material", name = "material-icons-extended" }
androidx-activity-compose = { group = "androidx.activity", name = "activity-compose", version = "1.9.3" }
androidx-lifecycle-runtime-compose = { group = "androidx.lifecycle", name = "lifecycle-runtime-compose", version = "2.8.7" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
`
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'GPSWatermarkCamera-Android-Kotlin.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onShowToast('Exported full Android Studio Project (.ZIP)', 'success');
    } catch (err) {
      console.error(err);
      onShowToast('Failed to build ZIP archive', 'info');
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
      <div
        id="android-code-viewer"
        className="w-full max-w-5xl h-[92vh] bg-zinc-900 border border-zinc-800 rounded-3xl flex flex-col overflow-hidden text-zinc-100 shadow-2xl"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">Native Android Source Code</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-mono font-semibold border border-emerald-500/30">
                  Kotlin + Jetpack Compose
                </span>
              </div>
              <p className="text-xs text-zinc-400">CameraX, FusedLocationProvider, Canvas Watermark & MediaStore</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadZip}
              disabled={isExportingZip}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingZip ? 'Generating ZIP...' : 'Export Android Studio ZIP'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 py-2 bg-zinc-950/80 border-b border-zinc-800 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'code'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Android Source Code ({ANDROID_PROJECT_FILES.length} Files)</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'guide'
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>📱 How to Use on Android Mobile (2 Methods)</span>
          </button>
        </div>

        {/* Workspace Body */}
        {activeTab === 'guide' ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-zinc-200 bg-zinc-950">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Method 1: Instant Mobile Web App */}
              <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Instant Use on Mobile Browser (PWA) — Ready Now!</h3>
                    <p className="text-xs text-zinc-400">No installation or compilation needed. Runs directly on your phone.</p>
                  </div>
                </div>

                <ol className="list-decimal list-inside space-y-2 text-xs text-zinc-300 ml-2">
                  <li>
                    Open <strong>Google Chrome</strong> or <strong>Samsung Internet</strong> on your Android phone.
                  </li>
                  <li>
                    Navigate to your shared app URL (or this dev URL).
                  </li>
                  <li>
                    When prompted, tap <strong>"Allow"</strong> for Camera and Location permissions so it can access real hardware GPS.
                  </li>
                  <li>
                    <strong>For Full-Screen App Experience</strong>: Tap Chrome's menu (<strong>⋮</strong> three dots top-right) and select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.
                  </li>
                  <li>
                    Launch it directly from your phone's home screen just like a native app with real-time GPS watermarking!
                  </li>
                </ol>
              </div>

              {/* Method 2: Native Android Studio APK */}
              <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Native Android App (Kotlin + Jetpack Compose)</h3>
                    <p className="text-xs text-zinc-400">Build a standalone .APK or install via Android Studio</p>
                  </div>
                </div>

                <ol className="list-decimal list-inside space-y-2 text-xs text-zinc-300 ml-2">
                  <li>
                    Click the <strong>"Export Android Studio ZIP"</strong> button above to download the complete ready-to-build project.
                  </li>
                  <li>
                    Unzip the folder and open it in <strong>Android Studio (Ladybug / Iguana or newer)</strong>.
                  </li>
                  <li>
                    Wait for Gradle sync to complete automatically (all dependencies for CameraX, Accompanist, and Play Services Location are included in <code>build.gradle.kts</code>).
                  </li>
                  <li>
                    Connect your Android phone via USB (with <em>Developer Options & USB Debugging enabled</em>), or use an Android Emulator.
                  </li>
                  <li>
                    Click the green <strong>Run (▶)</strong> button in Android Studio, or go to <strong>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong> to generate an installable <code>app-debug.apk</code> file.
                  </li>
                </ol>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* File Explorer Sidebar */}
            <div className="w-full md:w-72 bg-zinc-950/70 border-b md:border-b-0 md:border-r border-zinc-800 p-3 overflow-y-auto shrink-0">
              <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                <FolderTree className="w-3.5 h-3.5" />
                <span>Project Structure</span>
              </div>

              <div className="space-y-1">
                {ANDROID_PROJECT_FILES.map((file) => {
                  const isSelected = selectedFile.path === file.path;
                  return (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFile(file)}
                      className={`w-full p-2.5 rounded-xl text-left text-xs transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-indigo-600/20 border border-indigo-500/50 text-white font-medium'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
                      }`}
                    >
                      <FileCode
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          isSelected ? 'text-indigo-400' : 'text-zinc-500'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="font-mono text-zinc-200 truncate">{file.title}</div>
                        <div className="text-[10px] text-zinc-500 truncate">{file.path}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Code Viewer Panel */}
            <div className="flex-1 flex flex-col bg-zinc-950 min-w-0 overflow-hidden">
              {/* File metadata & copy bar */}
              <div className="p-3 px-4 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between gap-2 shrink-0">
                <div className="min-w-0">
                  <div className="font-mono text-xs font-semibold text-zinc-200 truncate">
                    {selectedFile.path}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate">{selectedFile.description}</div>
                </div>

                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 hover:text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-all shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy File'}</span>
                </button>
              </div>

              {/* Code Content */}
              <div className="flex-1 overflow-auto p-4 bg-[#0d1117] text-zinc-200 font-mono text-xs leading-relaxed selection:bg-indigo-500/30 selection:text-white">
                <pre className="tab-4 whitespace-pre">
                  <code>{selectedFile.content}</code>
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
