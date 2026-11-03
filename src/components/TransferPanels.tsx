import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Activity, ChevronUp, Zap } from 'lucide-react';
import { useVFSStore } from '../store/vfsStore';
import { SetupStatus } from '../types/vfs';
import { formatBytes, formatSpeed, TransferItemCard } from './TransferDrawer';

export const MobileTransfersPanel: React.FC = () => {
  const {
    activeTransfers,
    clearCompletedTransfers,
    pauseFileUpload,
    resumeFileUpload,
    cancelFileUpload,
    pauseFileDownload,
    resumeFileDownload,
    cancelFileDownload,
    dismissTransfer,
  } = useVFSStore(
    useShallow((state) => ({
      activeTransfers: state.activeTransfers,
      clearCompletedTransfers: state.clearCompletedTransfers,
      pauseFileUpload: state.pauseFileUpload,
      resumeFileUpload: state.resumeFileUpload,
      cancelFileUpload: state.cancelFileUpload,
      pauseFileDownload: state.pauseFileDownload,
      resumeFileDownload: state.resumeFileDownload,
      cancelFileDownload: state.cancelFileDownload,
      dismissTransfer: state.dismissTransfer,
    }))
  );
  const transfersList = Object.values(activeTransfers);
  const activeCount = transfersList.filter(
    (transfer) => transfer.status === 'UPLOADING' || transfer.status === 'DOWNLOADING'
  ).length;
  const completedCount = transfersList.filter((transfer) => transfer.status === 'COMPLETED').length;
  const totalSpeed = transfersList.reduce(
    (sum, transfer) =>
      transfer.status === 'UPLOADING' || transfer.status === 'DOWNLOADING'
        ? sum + (transfer.speedBytesPerSec || 0)
        : sum,
    0
  );

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="p-4 rounded-2xl bg-vault-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Active Transfers</h3>
          </div>
          <span className="text-xs font-mono font-semibold text-cyan-300">{formatSpeed(totalSpeed)}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
          <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            {activeCount} Active
          </span>
          {completedCount > 0 && (
            <button
              onClick={clearCompletedTransfers}
              className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 hover:text-white ml-auto"
            >
              Clear Completed ({completedCount})
            </button>
          )}
        </div>
      </div>

      {transfersList.length === 0 ? (
        <div className="py-16 text-center text-slate-500 text-xs space-y-2">
          <Activity className="w-8 h-8 text-slate-600 mx-auto" />
          <p>No active transfers right now.</p>
          <p className="text-[11px] text-slate-600">Files uploaded or downloaded will appear here in real-time.</p>
        </div>
      ) : (
        <div className="space-y-3">
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
      )}
    </div>
  );
};

export const DesktopTransferBar: React.FC<{
  setupStatus?: SetupStatus | null;
  isMobile: boolean;
}> = ({ setupStatus, isMobile }) => {
  const { activeTransfers, isDrawerOpen, setDrawerOpen } = useVFSStore(
    useShallow((state) => ({
      activeTransfers: state.activeTransfers,
      isDrawerOpen: state.isDrawerOpen,
      setDrawerOpen: state.setDrawerOpen,
    }))
  );
  const transfersList = Object.values(activeTransfers);
  const activeCount = transfersList.filter(
    (transfer) => transfer.status === 'UPLOADING' || transfer.status === 'DOWNLOADING'
  ).length;
  const totalSpeed = transfersList.reduce(
    (sum, transfer) =>
      transfer.status === 'UPLOADING' || transfer.status === 'DOWNLOADING'
        ? sum + (transfer.speedBytesPerSec || 0)
        : sum,
    0
  );

  return (
    <div
      onClick={() => setDrawerOpen(!isDrawerOpen)}
      className={`${isMobile ? 'hidden' : 'flex'} h-12 border-t border-slate-800/80 bg-[#090d16]/95 backdrop-blur-md px-3 lg:px-6 items-center justify-between gap-3 text-xs shrink-0 cursor-pointer hover:bg-slate-900/60 transition select-none overflow-hidden`}
    >
      <div className="flex min-w-0 items-center gap-2 lg:gap-3">
        {activeCount > 0 ? (
          <>
            <Activity className="h-4 w-4 text-cyan-400 animate-spin" />
            <span className="text-white font-medium">Active Transfers ({activeCount})</span>
            <span className="text-cyan-300 font-mono text-[11px]">{formatBytes(totalSpeed)}/s</span>
          </>
        ) : (
          <>
            <Activity className="h-4 w-4 text-emerald-400" />
            <span className="text-slate-300 font-medium">Active Channels:</span>
            <span className="text-slate-500 font-mono truncate">
              {setupStatus ? `${setupStatus.bot_count} Worker Bots Idle / Ready` : '5 Worker Bots Idle / Ready'}
            </span>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 lg:gap-4 text-slate-400 font-mono text-[11px]">
        <span>Cloud State: <strong className="text-emerald-400 font-normal">Synced</strong></span>
        <span className="hidden lg:inline">Offset Buffer: <strong className="text-slate-200 font-normal">8 MB</strong></span>
        <div className="flex items-center gap-1 text-slate-400 hover:text-white transition">
          <span className="text-[10px] uppercase font-sans font-semibold">
            {isDrawerOpen ? 'Hide Drawer' : 'Show Drawer'}
          </span>
          <ChevronUp className={`w-3.5 h-3.5 transition-transform ${isDrawerOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>
    </div>
  );
};

export const MobileTransfersNavButton: React.FC<{
  active: boolean;
  onClick: () => void;
}> = ({ active, onClick }) => {
  const activeCount = useVFSStore((state) =>
    Object.values(state.activeTransfers).filter(
      (transfer) => transfer.status === 'UPLOADING' || transfer.status === 'DOWNLOADING'
    ).length
  );

  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center py-1 relative transition-all ${
        active ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      <div className="relative">
        <Zap className="w-5 h-5 mb-0.5" />
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-cyan-500 text-vault-950 font-bold font-mono text-[9px] flex items-center justify-center animate-pulse">
            {activeCount}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium tracking-tight">Transfers</span>
    </button>
  );
};
