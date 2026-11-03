import React from 'react';
import { useVfsStore } from '../store/vfsStore';
import { useShallow } from 'zustand/react/shallow';
import { ActiveTransfer, TransferStatus } from '../types/vfs';
import {
  ChevronDown,
  ChevronUp,
  X,
  Pause,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Upload,
  Bot,
  Zap,
  Clock,
  CheckCheck,
} from 'lucide-react';

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

export const formatSpeed = (bytesPerSec: number): string => {
  if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s';
  const mbPerSec = bytesPerSec / (1024 * 1024);
  if (mbPerSec >= 1) {
    return `${mbPerSec.toFixed(2)} MB/s`;
  }
  const kbPerSec = bytesPerSec / 1024;
  return `${kbPerSec.toFixed(1)} KB/s`;
};

export const formatEta = (remainingBytes: number, speedBytesPerSec: number): string => {
  if (!speedBytesPerSec || speedBytesPerSec <= 0 || remainingBytes <= 0) return '--:--';
  const totalSeconds = Math.round(remainingBytes / speedBytesPerSec);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${seconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours}h ${remMinutes}m`;
};

export const TransferDrawer: React.FC = () => {
  const {
    activeTransfers,
    isDrawerOpen,
    isDrawerMinimized,
    setDrawerOpen,
    setDrawerMinimized,
    pauseFileUpload,
    resumeFileUpload,
    cancelFileUpload,
    pauseFileDownload,
    resumeFileDownload,
    cancelFileDownload,
    clearCompletedTransfers,
    dismissTransfer,
  } = useVfsStore(
    useShallow((state) => ({
      activeTransfers: state.activeTransfers,
      isDrawerOpen: state.isDrawerOpen,
      isDrawerMinimized: state.isDrawerMinimized,
      setDrawerOpen: state.setDrawerOpen,
      setDrawerMinimized: state.setDrawerMinimized,
      pauseFileUpload: state.pauseFileUpload,
      resumeFileUpload: state.resumeFileUpload,
      cancelFileUpload: state.cancelFileUpload,
      pauseFileDownload: state.pauseFileDownload,
      resumeFileDownload: state.resumeFileDownload,
      cancelFileDownload: state.cancelFileDownload,
      clearCompletedTransfers: state.clearCompletedTransfers,
      dismissTransfer: state.dismissTransfer,
    }))
  );

  const transfersList = Object.values(activeTransfers);

  if (!isDrawerOpen || transfersList.length === 0) {
    return null;
  }

  // Aggregate stats
  const activeCount = transfersList.filter(
    (t) => t.status === 'UPLOADING' || t.status === 'DOWNLOADING'
  ).length;
  const pausedCount = transfersList.filter((t) => t.status === 'PAUSED').length;
  const completedCount = transfersList.filter((t) => t.status === 'COMPLETED').length;
  const totalSpeed = transfersList.reduce((acc, t) => {
    return t.status === 'UPLOADING' || t.status === 'DOWNLOADING'
      ? acc + (t.speedBytesPerSec || 0)
      : acc;
  }, 0);

  const totalBytesTransferred = transfersList.reduce((acc, t) => acc + (t.bytesTransferredFile || 0), 0);
  const totalFileBytes = transfersList.reduce((acc, t) => acc + (t.totalSizeBytes || 0), 0);
  const aggregatePercentage =
    totalFileBytes > 0 ? Math.min(100, (totalBytesTransferred / totalFileBytes) * 100) : 0;

  // Minimized Bar View
  if (isDrawerMinimized) {
    return (
      <div className="hidden md:block fixed bottom-4 right-6 z-50 animate-in slide-in-from-bottom-2 duration-200">
        <div className="bg-vault-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl p-3 flex items-center gap-4 text-xs text-slate-200 hover:border-cyan-500/50 transition">
          <div className="flex items-center gap-2">
            {activeCount > 0 ? (
              <div className="relative">
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                <Zap className="w-2.5 h-2.5 text-cyan-300 absolute inset-0 m-auto" />
              </div>
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            )}
            <div>
              <span className="font-semibold text-white">
                {activeCount > 0 ? `Transfers (${activeCount})` : 'Transfers Idle'}
              </span>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="font-mono text-cyan-300">{formatSpeed(totalSpeed)}</span>
                <span>•</span>
                <span>{aggregatePercentage.toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* Mini progress bar */}
          <div className="w-24 bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${aggregatePercentage}%` }}
            />
          </div>

          <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
            <button
              onClick={() => setDrawerMinimized(false)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Expand transfers"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Expanded Slide-Up Drawer
  return (
    <div className="hidden md:block fixed bottom-0 right-6 z-50 w-full max-w-2xl animate-in slide-in-from-bottom duration-300">
      <div className="bg-vault-900/98 border border-slate-700/90 rounded-t-2xl shadow-2xl backdrop-blur-2xl flex flex-col max-h-[32rem] overflow-hidden">
        {/* Drawer Header */}
        <div className="h-14 px-5 border-b border-slate-800 bg-vault-950/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-white tracking-wide">
                  TRANSFER MANAGER
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-medium">
                  {transfersList.length} total
                </span>
                {activeCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    {activeCount} active
                  </span>
                )}
                {pausedCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                    {pausedCount} paused
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Total Speed:</span>
                <span className="font-mono text-cyan-300 font-semibold">
                  {formatSpeed(totalSpeed)}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {completedCount > 0 && (
              <button
                onClick={clearCompletedTransfers}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition mr-2"
                title="Clear completed transfers"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Clear Completed ({completedCount})</span>
              </button>
            )}

            <button
              onClick={() => setDrawerMinimized(true)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Minimize drawer"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Aggregate Progress Header Bar */}
        <div className="w-full bg-slate-850 h-1">
          <div
            className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-emerald-400 h-1 transition-all duration-300"
            style={{ width: `${aggregatePercentage}%` }}
          />
        </div>

        {/* Transfer Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-800/40">
          {transfersList.map((transfer) => (
            <TransferItemCard
              key={transfer.fileId}
              transfer={transfer}
              onPause={() =>
                transfer.transferType === 'DOWNLOAD'
                  ? pauseFileDownload(transfer.fileId)
                  : pauseFileUpload(transfer.fileId)
              }
              onResume={() =>
                transfer.transferType === 'DOWNLOAD'
                  ? resumeFileDownload(transfer.fileId)
                  : resumeFileUpload(transfer.fileId)
              }
              onCancel={() =>
                transfer.transferType === 'DOWNLOAD'
                  ? cancelFileDownload(transfer.fileId)
                  : cancelFileUpload(transfer.fileId)
              }
              onDismiss={() => dismissTransfer(transfer.fileId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export interface TransferItemCardProps {
  transfer: ActiveTransfer;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onDismiss: () => void;
}

export const TransferItemCard: React.FC<TransferItemCardProps> = ({
  transfer,
  onPause,
  onResume,
  onCancel,
  onDismiss,
}) => {
  const filePercentage =
    transfer.totalSizeBytes > 0
      ? Math.min(100, (transfer.bytesTransferredFile / transfer.totalSizeBytes) * 100)
      : 0;

  const chunkPercentage =
    transfer.totalChunkBytes > 0
      ? Math.min(100, (transfer.bytesTransferredChunk / transfer.totalChunkBytes) * 100)
      : 0;

  const remainingFileBytes = Math.max(0, transfer.totalSizeBytes - transfer.bytesTransferredFile);
  const etaText = formatEta(remainingFileBytes, transfer.speedBytesPerSec);

  return (
    <div className="pt-3 first:pt-0 space-y-2.5">
      {/* File info row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-vault-850 border border-slate-700/80 flex items-center justify-center shrink-0 mt-0.5">
            {transfer.transferType === 'DOWNLOAD' ? (
              <Download className="w-4 h-4 text-indigo-400" />
            ) : (
              <Upload className="w-4 h-4 text-cyan-400" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate max-w-sm" title={transfer.fileName}>
              {transfer.fileName}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span>{formatBytes(transfer.bytesTransferredFile)}</span>
              <span>/</span>
              <span>{formatBytes(transfer.totalSizeBytes)}</span>
              <span>•</span>
              <span className="font-mono text-cyan-300">{filePercentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Status & Control buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={transfer.status} error={transfer.error} />

          {(transfer.status === 'UPLOADING' || transfer.status === 'DOWNLOADING') && (
            <button
              onClick={onPause}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition"
              title={transfer.status === 'DOWNLOADING' ? 'Pause download' : 'Pause upload'}
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          )}

          {transfer.status === 'PAUSED' && (
            <button
              onClick={onResume}
              className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition"
              title={transfer.transferType === 'DOWNLOAD' ? 'Resume download' : 'Resume upload'}
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          )}

          {/* If Cancelled, Completed, or Failed, provide a dismiss (X) button to remove the card */}
          {(transfer.status === 'CANCELLED' || transfer.status === 'FAILED' || transfer.status === 'COMPLETED') ? (
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
              title="Dismiss transfer card"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-700 transition"
              title={transfer.transferType === 'DOWNLOAD' ? 'Cancel download' : 'Cancel upload'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-1.5">
        {/* Total File Progress */}
        <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden border border-slate-750">
          <div
            className={`h-2 rounded-full transition-all duration-200 ${
              transfer.status === 'COMPLETED'
                ? 'bg-emerald-500'
                : transfer.status === 'PAUSED'
                ? 'bg-amber-500'
                : transfer.status === 'CANCELLED'
                ? 'bg-slate-600'
                : transfer.status === 'FAILED'
                ? 'bg-red-500'
                : 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-cyan-400'
            }`}
            style={{ width: `${filePercentage}%` }}
          />
        </div>

        {/* Chunk Details Row (Only when uploading or chunking active) */}
        {transfer.totalChunks > 1 && (transfer.status === 'UPLOADING' || transfer.status === 'DOWNLOADING') && (
          <div className="space-y-1 bg-vault-950/40 p-2 rounded-lg border border-slate-800/60">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="font-mono text-cyan-300">
                Chunk {transfer.currentChunkIndex + 1} of {transfer.totalChunks}
              </span>
              <span>
                {formatBytes(transfer.bytesTransferredChunk)} / {formatBytes(transfer.totalChunkBytes)}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
              <div
                className="bg-cyan-400 h-1 rounded-full transition-all duration-150"
                style={{ width: `${chunkPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Meta indicators: Speed, ETA, Worker Bot */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 pt-0.5">
        <div className="flex items-center gap-3">
          {(transfer.status === 'UPLOADING' || transfer.status === 'DOWNLOADING') && (
            <>
              <div className="flex items-center gap-1 font-mono text-cyan-300 font-medium">
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>{formatSpeed(transfer.speedBytesPerSec)}</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-slate-300">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>ETA: {etaText}</span>
              </div>
            </>
          )}

          {/* Active Worker Bot Badge */}
          {transfer.activeWorker && transfer.activeWorker !== 'none' && (
            <div className="flex items-center gap-1.5 text-slate-300 bg-cyan-950/40 px-2.5 py-0.5 rounded-md border border-cyan-500/30">
              <Bot className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="font-mono text-[10px] text-cyan-200 font-medium">
                {transfer.activeWorker}
              </span>
            </div>
          )}
        </div>

        {transfer.error && (
          <div className="text-red-400 text-[10px] flex items-center gap-1 truncate max-w-xs">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span className="truncate">{transfer.error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface StatusBadgeProps {
  status: TransferStatus;
  error?: string | null;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, error }) => {
  switch (status) {
    case 'UPLOADING':
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 font-medium">
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
          Uploading
        </span>
      );
    case 'DOWNLOADING':
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 font-medium">
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
          Downloading
        </span>
      );
    case 'PAUSED':
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-medium">
          <Pause className="w-2.5 h-2.5" />
          Paused
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-medium">
          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
          Ready
        </span>
      );
    case 'FAILED':
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/30 flex items-center gap-1 font-medium" title={error || 'Upload error'}>
          <AlertCircle className="w-2.5 h-2.5" />
          Failed
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1 font-medium">
          Cancelled
        </span>
      );
    default:
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
          {status}
        </span>
      );
  }
};
