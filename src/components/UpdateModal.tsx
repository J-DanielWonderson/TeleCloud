import React, { useState } from 'react';
import {
  Download,
  Sparkles,
  X,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { UpdateCheckResult, downloadAndInstallUpdate } from '../services/updateService';
import { formatBytes } from './TransferDrawer';
import { isAndroid } from '../hooks/useMobile';

interface UpdateModalProps {
  updateInfo: UpdateCheckResult;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ updateInfo, onClose }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(updateInfo.assetSize || 0);
  const [error, setError] = useState<string | null>(null);
  const [installTriggered, setInstallTriggered] = useState(false);

  const isMobileAndroid = isAndroid();

  const handleStartUpdate = async () => {
    if (!updateInfo.downloadUrl || !updateInfo.assetName) {
      // Fallback to opening GitHub release page
      window.open(updateInfo.htmlUrl, '_blank');
      return;
    }

    try {
      setIsUpdating(true);
      setError(null);
      setDownloadProgress(0);

      await downloadAndInstallUpdate(
        updateInfo.downloadUrl,
        updateInfo.assetName,
        (rec, tot, pct) => {
          setDownloadedBytes(rec);
          setTotalBytes(tot);
          setDownloadProgress(pct);
        }
      );

      setInstallTriggered(true);
    } catch (err: unknown) {
      console.error('Update installation failed:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Failed to download or launch update package.');
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div
        className="w-full max-w-xl bg-vault-900/95 border border-cyan-500/30 rounded-3xl shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden animate-scaleUp max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-cyan-950/40 via-vault-900 to-vault-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Update Available
              </h3>
              <p className="text-xs text-slate-400">
                A newer version of TeleCloud is ready for installation
              </p>
            </div>
          </div>

          {!isUpdating && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Version Comparison Bar */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
                Current Version
              </span>
              <span className="text-sm font-semibold text-slate-300">
                v{updateInfo.currentVersion}
              </span>
            </div>

            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
              <ArrowRight className="w-4 h-4 text-cyan-400" />
            </div>

            <div className="flex flex-col text-right">
              <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400">
                New Version
              </span>
              <span className="text-sm font-bold text-cyan-300">
                v{updateInfo.latestVersion}
              </span>
            </div>
          </div>

          {/* Package Details & Android Compatibility Badge */}
          <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-semibold text-cyan-200">
                {isMobileAndroid ? 'Android Smooth In-Place Upgrade' : 'Verified Windows Package'}
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                {isMobileAndroid
                  ? 'Consistent certificate signature prevents Android package conflicts. Your cloud vault sessions and settings will be preserved safely.'
                  : 'Automated package installer with user verification.'}
              </p>
              {updateInfo.assetName && (
                <div className="text-[10px] font-mono text-cyan-400/90 pt-0.5">
                  Package: {updateInfo.assetName}{' '}
                  {updateInfo.assetSize > 0 && `(${formatBytes(updateInfo.assetSize)})`}
                </div>
              )}
            </div>
          </div>

          {/* Release Notes */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-300">What's New in this Version:</span>
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed scrollbar-thin">
              {updateInfo.releaseNotes}
            </div>
          </div>

          {/* Download & Installation Progress */}
          {isUpdating && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-cyan-500/30 space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-200 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  {installTriggered ? 'Launching package installer...' : 'Downloading update package...'}
                </span>
                <span className="font-mono text-cyan-400 font-bold">{downloadProgress}%</span>
              </div>

              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-200"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>{formatBytes(downloadedBytes)}</span>
                <span>{totalBytes > 0 ? formatBytes(totalBytes) : 'Calculating...'}</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/40 text-red-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <div className="flex-1 space-y-1">
                <span className="font-semibold">Update encountered an issue:</span>
                <p className="text-[11px] text-red-200/90">{error}</p>
                <button
                  onClick={() => window.open(updateInfo.htmlUrl, '_blank')}
                  className="text-[11px] text-cyan-400 underline font-semibold mt-1 inline-block"
                >
                  Download directly from GitHub Releases
                </button>
              </div>
            </div>
          )}

          {installTriggered && (
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                Installer prompt displayed! Follow the system instructions to finish updating.
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            onClick={() => window.open(updateInfo.htmlUrl, '_blank')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Release on GitHub</span>
          </button>

          <div className="flex items-center gap-2">
            {!installTriggered && (
              <button
                onClick={onClose}
                disabled={isUpdating}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/80 transition disabled:opacity-50"
              >
                Remind Later
              </button>
            )}

            {installTriggered ? (
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/20"
              >
                Done
              </button>
            ) : (
              <button
                onClick={handleStartUpdate}
                disabled={isUpdating}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-50"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Update Now</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
