import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import {
  FolderItem,
  FileItem,
  FolderRecord,
  FileRecord,
  FileChunkRecord,
  Breadcrumb,
  ActiveTransfer,
  TransferProgress,
  TransferProgressEvent,
} from '../types/vfs';

// The native engine can emit a progress packet several times per second.  Keep
// rendering inexpensive while a mobile webview is backgrounded: only the most
// recent update for each transfer is applied when the UI gets time to paint.
const terminalTransferStates = new Set<TransferProgressEvent['status']>([
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'PAUSED',
]);

// Directory refreshes can be requested by focus, visibility, and cloud-sync
// events at nearly the same time.  Serialising them prevents stale SQLite
// responses from fighting over the visible folder after an app resume.
let directoryRefreshInFlight: Promise<void> | null = null;
let directoryRefreshQueued = false;

// Guard transfer actions against double taps and a rapid pause/resume race.
const transferActionsInFlight = new Set<string>();

interface VFSState {
  // Navigation & Hierarchy
  currentFolderId: string | null;
  breadcrumbs: Breadcrumb[];
  folders: FolderItem[];
  files: FileItem[];
  searchQuery: string;
  viewMode: 'grid' | 'list';
  selectedIds: string[];
  loadingVfs: boolean;
  vfsError: string | null;

  // File Chunk Inspector
  inspectingFile: FileRecord | null;
  fileChunks: FileChunkRecord[];
  loadingChunks: boolean;

  // Transfers
  transfers: Record<string, TransferProgress>;
  activeTransfers: Record<string, ActiveTransfer>;
  isDrawerOpen: boolean;
  isDrawerMinimized: boolean;

  // Directory and Item Operations
  setCurrentFolder: (folderId: string | null) => Promise<void>;
  loadDirectory: () => Promise<void>;
  fetchContents: (folderId?: string | null) => Promise<void>;
  navigateToFolder: (folderId: string | null, folderName?: string) => Promise<void>;
  navigateToBreadcrumb: (index: number) => Promise<void>;
  createFolder: (name: string, color?: string) => Promise<FolderRecord>;
  renameFolder: (id: string, newName: string) => Promise<void>;
  deleteFolder: (id: string, permanent?: boolean) => Promise<void>;
  renameFile: (id: string, newName: string) => Promise<void>;
  deleteFile: (id: string, permanent?: boolean) => Promise<void>;
  deleteItem: (id: string, isFolder: boolean) => Promise<void>;
  moveItem: (id: string, isFolder: boolean, targetFolderId: string | null) => Promise<void>;
  inspectFileChunks: (file: FileRecord | null) => Promise<void>;

  // UI State Controls
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  setDrawerOpen: (open: boolean) => void;
  setDrawerMinimized: (minimized: boolean) => void;
  clearCompletedTransfers: () => void;
  dismissTransfer: (fileId: string) => void;

  // MTProto Streaming Operations
  startFileUpload: (filePath: string) => Promise<FileRecord>;
  addActiveTransferFromRecord: (fileRecord: FileRecord, customName?: string) => void;
  pauseFileUpload: (fileId: string) => Promise<void>;
  resumeFileUpload: (fileId: string) => Promise<void>;
  cancelFileUpload: (fileId: string) => Promise<void>;
  startFileDownload: (fileId: string, destinationPath: string, fileRecordItem?: { name?: string; total_size_bytes?: number; total_chunks?: number }) => Promise<void>;
  pauseFileDownload: (fileId: string) => Promise<void>;
  resumeFileDownload: (fileId: string) => Promise<void>;
  cancelFileDownload: (fileId: string) => Promise<void>;
  handleProgressEvent: (event: TransferProgressEvent) => void;
  initEventListener: () => Promise<() => void>;
}

export const useVFSStore = create<VFSState>((set, get) => ({
  currentFolderId: null,
  breadcrumbs: [{ id: null, name: 'Home' }],
  folders: [],
  files: [],
  searchQuery: '',
  viewMode: 'grid',
  selectedIds: [],
  loadingVfs: false,
  vfsError: null,

  inspectingFile: null,
  fileChunks: [],
  loadingChunks: false,

  transfers: {},
  activeTransfers: {},
  isDrawerOpen: false,
  isDrawerMinimized: false,

  setCurrentFolder: async (folderId: string | null) => {
    set({ currentFolderId: folderId, selectedIds: [], loadingVfs: true, vfsError: null });
    const requestedFolderId = folderId;

    try {
      const [folders, files, crumbs] = await Promise.all([
        invoke<FolderItem[]>('get_subfolders', { parentId: requestedFolderId }),
        invoke<FileItem[]>('get_files_in_folder', { folderId: requestedFolderId }),
        invoke<Breadcrumb[]>('get_folder_breadcrumbs', { folderId: requestedFolderId }),
      ]);

      // A newer navigation request has already started. Never let this older
      // response replace the current folder with stale contents.
      if (get().currentFolderId !== requestedFolderId) return;

      set({
        folders,
        files,
        breadcrumbs: crumbs.length > 0 ? crumbs : [{ id: null, name: 'Home' }],
        loadingVfs: false,
      });
    } catch (err: any) {
      console.error('Failed to set current folder:', err);
      if (get().currentFolderId !== requestedFolderId) return;
      set({
        vfsError: typeof err === 'string' ? err : err?.message || 'Failed to navigate directory',
        loadingVfs: false,
      });
    }
  },

  loadDirectory: async () => {
    if (directoryRefreshInFlight) {
      directoryRefreshQueued = true;
      return directoryRefreshInFlight;
    }

    const refresh = async () => {
      do {
        directoryRefreshQueued = false;
        const requestedFolderId = get().currentFolderId;
        if (get().folders.length === 0 && get().files.length === 0) {
          set({ loadingVfs: true, vfsError: null });
        }

        try {
          const [folders, files, crumbs] = await Promise.all([
            invoke<FolderItem[]>('get_subfolders', { parentId: requestedFolderId }),
            invoke<FileItem[]>('get_files_in_folder', { folderId: requestedFolderId }),
            invoke<Breadcrumb[]>('get_folder_breadcrumbs', { folderId: requestedFolderId }),
          ]);

          // Do not overwrite a folder the user navigated to while the
          // background refresh was still reading the previous one.
          if (get().currentFolderId === requestedFolderId) {
            set({
              folders,
              files,
              breadcrumbs: crumbs.length > 0 ? crumbs : [{ id: null, name: 'Home' }],
              loadingVfs: false,
            });
          }
        } catch (err: any) {
          console.error('Failed to load directory:', err);
          if (get().currentFolderId === requestedFolderId) {
            set({
              vfsError: typeof err === 'string' ? err : err?.message || 'Failed to load directory',
              loadingVfs: false,
            });
          }
        }
      } while (directoryRefreshQueued);
    };

    directoryRefreshInFlight = refresh().finally(() => {
      directoryRefreshInFlight = null;
    });
    return directoryRefreshInFlight;
  },

  fetchContents: async (folderId) => {
    const targetFolderId = folderId !== undefined ? folderId : get().currentFolderId;
    await get().setCurrentFolder(targetFolderId);
  },

  navigateToFolder: async (folderId: string | null) => {
    await get().setCurrentFolder(folderId);
  },

  navigateToBreadcrumb: async (index: number) => {
    const { breadcrumbs, setCurrentFolder } = get();
    if (index >= 0 && index < breadcrumbs.length) {
      const target = breadcrumbs[index];
      await setCurrentFolder(target.id);
    }
  },

  createFolder: async (name: string, color?: string) => {
    const { currentFolderId, loadDirectory } = get();
    const created = await invoke<FolderRecord>('create_folder', {
      parentId: currentFolderId,
      name: name.trim(),
      color: color || '#3b82f6',
    });
    await loadDirectory();
    return created;
  },

  renameFolder: async (id: string, newName: string) => {
    const { loadDirectory } = get();
    await invoke('rename_folder', { id, newName: newName.trim() });
    await loadDirectory();
  },

  deleteFolder: async (id: string, permanent = false) => {
    const { loadDirectory } = get();
    await invoke('delete_folder', { id, permanent });
    await loadDirectory();
  },

  renameFile: async (id: string, newName: string) => {
    const { loadDirectory } = get();
    await invoke('rename_file', { id, newName: newName.trim() });
    await loadDirectory();
  },

  deleteFile: async (id: string, permanent = false) => {
    const { loadDirectory } = get();
    await invoke('delete_file', { id, permanent });
    await loadDirectory();
  },

  deleteItem: async (id: string, isFolder: boolean) => {
    const { loadDirectory } = get();
    await invoke(isFolder ? 'delete_folder' : 'delete_file', { id, permanent: false });
    await loadDirectory();
  },

  moveItem: async (id: string, isFolder: boolean, targetFolderId: string | null) => {
    const { loadDirectory } = get();
    await invoke(isFolder ? 'move_folder' : 'move_file', {
      id,
      targetFolderId,
    });
    await loadDirectory();
  },

  inspectFileChunks: async (file: FileRecord | null) => {
    if (!file) {
      set({ inspectingFile: null, fileChunks: [], loadingChunks: false });
      return;
    }

    set({ inspectingFile: file, loadingChunks: true });
    try {
      const chunks = await invoke<FileChunkRecord[]>('get_file_chunks', {
        fileId: file.id,
      });
      set({ fileChunks: chunks, loadingChunks: false });
    } catch (err) {
      console.error('Failed to load chunks for file:', err);
      set({ loadingChunks: false });
    }
  },

  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
  setViewMode: (viewMode: 'grid' | 'list') => set({ viewMode }),

  toggleSelection: (id: string) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((item) => item !== id)
        : [...state.selectedIds, id],
    })),

  clearSelection: () => set({ selectedIds: [] }),
  setDrawerOpen: (open: boolean) => set({ isDrawerOpen: open }),
  setDrawerMinimized: (minimized: boolean) => set({ isDrawerMinimized: minimized }),

  clearCompletedTransfers: () => {
    set((state) => {
      const remaining: Record<string, ActiveTransfer> = {};
      const remainingLegacy: Record<string, TransferProgress> = {};

      for (const [id, transfer] of Object.entries(state.activeTransfers)) {
        if (
          transfer.status === 'UPLOADING' ||
          transfer.status === 'DOWNLOADING' ||
          transfer.status === 'PENDING'
        ) {
          remaining[id] = transfer;
        }
      }

      for (const [id, progress] of Object.entries(state.transfers)) {
        if (state.activeTransfers[id]?.status === 'UPLOADING' || state.activeTransfers[id]?.status === 'DOWNLOADING') {
          remainingLegacy[id] = progress;
        }
      }

      return {
        activeTransfers: remaining,
        transfers: remainingLegacy,
        isDrawerOpen: Object.keys(remaining).length > 0,
      };
    });
  },

  dismissTransfer: (fileId: string) => {
    set((state) => {
      const remainingTransfers = { ...state.activeTransfers };
      delete remainingTransfers[fileId];
      const remainingLegacy = { ...state.transfers };
      delete remainingLegacy[fileId];
      return {
        activeTransfers: remainingTransfers,
        transfers: remainingLegacy,
        isDrawerOpen: Object.keys(remainingTransfers).length > 0,
      };
    });
  },

  startFileUpload: async (filePath: string) => {
    const { currentFolderId, loadDirectory } = get();

    // Extract filename from path
    const normalized = filePath.replace(/\\/g, '/');
    const fileName = normalized.split('/').pop() || 'uploaded_file';

    const now = Date.now();

    // Trigger backend upload command
    const fileRecord = await invoke<FileRecord>('start_upload', {
      filePath,
      folderId: currentFolderId,
    });

    // Populate active transfer
    set((state) => ({
      activeTransfers: {
        ...state.activeTransfers,
        [fileRecord.id]: {
          fileId: fileRecord.id,
          fileName: fileRecord.name || fileName,
          filePath,
          transferType: 'UPLOAD',
          totalSizeBytes: fileRecord.total_size_bytes,
          totalChunks: fileRecord.total_chunks,
          currentChunkIndex: 0,
          bytesTransferredFile: 0,
          bytesTransferredChunk: 0,
          totalChunkBytes:
            fileRecord.total_chunks > 1
              ? Math.floor(fileRecord.total_size_bytes / fileRecord.total_chunks)
              : fileRecord.total_size_bytes,
          speedBytesPerSec: 0,
          activeWorker: 'Initializing bot pool...',
          status: 'UPLOADING',
          error: null,
          startedAt: now,
          updatedAt: now,
        },
      },
      transfers: {
        ...state.transfers,
        [fileRecord.id]: {
          file_id: fileRecord.id,
          file_name: fileRecord.name || fileName,
          bytes_transferred: 0,
          total_bytes: fileRecord.total_size_bytes,
          active_chunk: 1,
          total_chunks: fileRecord.total_chunks,
          speed_mbps: 0,
          worker_bot: 'Pool Dispatcher',
          is_upload: true,
        },
      },
      isDrawerOpen: true,
      isDrawerMinimized: false,
    }));

    // Refresh directory view
    loadDirectory();

    return fileRecord;
  },

  addActiveTransferFromRecord: (fileRecord: FileRecord, customName?: string) => {
    const now = Date.now();
    const fileName = customName || fileRecord.name;
    set((state) => ({
      isDrawerOpen: true,
      activeTransfers: {
        ...state.activeTransfers,
        [fileRecord.id]: {
          fileId: fileRecord.id,
          fileName,
          filePath: fileRecord.name,
          transferType: 'UPLOAD',
          totalSizeBytes: fileRecord.total_size_bytes,
          totalChunks: fileRecord.total_chunks,
          currentChunkIndex: 0,
          bytesTransferredFile: 0,
          bytesTransferredChunk: 0,
          totalChunkBytes:
            fileRecord.total_chunks > 1
              ? Math.floor(fileRecord.total_size_bytes / fileRecord.total_chunks)
              : fileRecord.total_size_bytes,
          speedBytesPerSec: 0,
          activeWorker: 'Uploading chunks via bot pool...',
          status: 'UPLOADING',
          error: null,
          startedAt: now,
          updatedAt: now,
        },
      },
      transfers: {
        ...state.transfers,
        [fileRecord.id]: {
          file_id: fileRecord.id,
          file_name: fileName,
          bytes_transferred: 0,
          total_bytes: fileRecord.total_size_bytes,
          active_chunk: 1,
          total_chunks: fileRecord.total_chunks,
          speed_mbps: 0,
          active_worker: 'Initializing...',
          worker_bot: 'Initializing...',
          is_upload: true,
          status: 'UPLOADING',
        },
      },
    }));
  },

  pauseFileUpload: async (fileId: string) => {
    const transfer = get().activeTransfers[fileId];
    if (!transfer || transfer.status === 'PAUSED' || transferActionsInFlight.has(fileId)) return;
    transferActionsInFlight.add(fileId);

    set((state) => {
      const existing = state.activeTransfers[fileId];
      if (!existing) return state;
      return {
        activeTransfers: {
          ...state.activeTransfers,
          [fileId]: {
            ...existing,
            status: 'PAUSED',
            speedBytesPerSec: 0,
            updatedAt: Date.now(),
          },
        },
      };
    });

    try {
      await invoke('pause_upload', { fileId });
    } catch (error) {
      console.error('Could not pause upload:', error);
      set((state) => {
        const current = state.activeTransfers[fileId];
        if (!current || current.status !== 'PAUSED') return state;
        return {
          activeTransfers: {
            ...state.activeTransfers,
            [fileId]: { ...current, status: transfer.status, error: transfer.error },
          },
        };
      });
    } finally {
      transferActionsInFlight.delete(fileId);
    }
  },

  resumeFileUpload: async (fileId: string) => {
    const transfer = get().activeTransfers[fileId];
    if (!transfer || transferActionsInFlight.has(fileId)) return;
    transferActionsInFlight.add(fileId);

    set((state) => {
      const existing = state.activeTransfers[fileId];
      if (!existing) return state;
      return {
        activeTransfers: {
          ...state.activeTransfers,
          [fileId]: {
            ...existing,
            status: 'UPLOADING',
            speedBytesPerSec: 0,
            activeWorker: 'Resuming upload...',
            error: null,
            updatedAt: Date.now(),
          },
        },
      };
    });

    try {
      await invoke('resume_upload', {
        fileId,
        filePath: transfer.filePath,
      });
    } catch (error) {
      console.error('Could not resume upload:', error);
      set((state) => {
        const current = state.activeTransfers[fileId];
        if (!current || current.status !== 'UPLOADING') return state;
        return {
          activeTransfers: {
            ...state.activeTransfers,
            [fileId]: { ...current, status: 'PAUSED', activeWorker: 'none', error: String(error) },
          },
        };
      });
    } finally {
      transferActionsInFlight.delete(fileId);
    }
  },

  cancelFileUpload: async (fileId: string) => {
    // 1. Immediately update UI to CANCELLED and speed to 0 for instant feedback
    set((state) => {
      const existing = state.activeTransfers[fileId];
      if (!existing) return state;
      return {
        activeTransfers: {
          ...state.activeTransfers,
          [fileId]: {
            ...existing,
            status: 'CANCELLED',
            speedBytesPerSec: 0,
            updatedAt: Date.now(),
          },
        },
      };
    });

    // 2. Abort backend upload tasks and remove from database
    try {
      await invoke('cancel_upload', { fileId });
    } catch (e) {
      console.error('Error invoking cancel_upload:', e);
    }

    get().loadDirectory();
  },

  startFileDownload: async (fileId: string, destinationPath: string, fileRecordItem?: { name?: string; total_size_bytes?: number; total_chunks?: number }) => {
    const { files } = get();
    const fileRecord = fileRecordItem || files.find((f) => f.id === fileId);

    const normalized = destinationPath.replace(/\\/g, '/');
    const fileName = fileRecord?.name || normalized.split('/').pop() || 'downloaded_file';
    const now = Date.now();

    // 1. Immediately show the transfer card so user gets instant visual confirmation!
    set((state) => ({
      isDrawerOpen: true,
      isDrawerMinimized: false,
      activeTransfers: {
        ...state.activeTransfers,
        [fileId]: {
          fileId,
          fileName,
          filePath: destinationPath,
          transferType: 'DOWNLOAD',
          totalSizeBytes: fileRecord?.total_size_bytes || 0,
          totalChunks: fileRecord?.total_chunks || 1,
          currentChunkIndex: 0,
          bytesTransferredFile: 0,
          bytesTransferredChunk: 0,
          totalChunkBytes:
            fileRecord && fileRecord.total_chunks && fileRecord.total_chunks > 1
              ? Math.floor((fileRecord.total_size_bytes || 0) / fileRecord.total_chunks)
              : fileRecord?.total_size_bytes || 0,
          speedBytesPerSec: 0,
          activeWorker: 'Connecting to Telegram storage...',
          status: 'DOWNLOADING',
          error: null,
          startedAt: now,
          updatedAt: now,
        },
      },
      transfers: {
        ...state.transfers,
        [fileId]: {
          file_id: fileId,
          file_name: fileName,
          bytes_transferred: 0,
          total_bytes: fileRecord?.total_size_bytes || 0,
          active_chunk: 1,
          total_chunks: fileRecord?.total_chunks || 1,
          speed_mbps: 0,
          worker_bot: 'Pool Dispatcher',
          is_upload: false,
        },
      },
    }));

    // 2. Trigger backend download command
    try {
      await invoke('start_download', {
        fileId,
        destinationPath,
      });
    } catch (err: unknown) {
      console.error('start_download failed:', err);
      const errObj = err as { message?: string };
      const errMsg = errObj?.message || String(err);
      set((state) => {
        const existing = state.activeTransfers[fileId];
        if (!existing) return state;
        return {
          activeTransfers: {
            ...state.activeTransfers,
            [fileId]: {
              ...existing,
              status: 'FAILED',
              error: errMsg,
            },
          },
        };
      });
      throw err;
    }
  },

  pauseFileDownload: async (fileId: string) => {
    const transfer = get().activeTransfers[fileId];
    if (!transfer || transfer.status === 'PAUSED' || transferActionsInFlight.has(fileId)) return;
    transferActionsInFlight.add(fileId);

    set((state) => {
      const existing = state.activeTransfers[fileId];
      if (!existing) return state;
      return {
        activeTransfers: {
          ...state.activeTransfers,
          [fileId]: {
            ...existing,
            status: 'PAUSED',
            speedBytesPerSec: 0,
            updatedAt: Date.now(),
          },
        },
      };
    });

    try {
      await invoke('pause_download', { fileId });
    } catch (error) {
      console.error('Could not pause download:', error);
      set((state) => {
        const current = state.activeTransfers[fileId];
        if (!current || current.status !== 'PAUSED') return state;
        return {
          activeTransfers: {
            ...state.activeTransfers,
            [fileId]: { ...current, status: transfer.status, error: transfer.error },
          },
        };
      });
    } finally {
      transferActionsInFlight.delete(fileId);
    }
  },

  resumeFileDownload: async (fileId: string) => {
    const transfer = get().activeTransfers[fileId];
    if (!transfer || transferActionsInFlight.has(fileId)) return;
    transferActionsInFlight.add(fileId);

    set((state) => {
      const existing = state.activeTransfers[fileId];
      if (!existing) return state;
      return {
        activeTransfers: {
          ...state.activeTransfers,
          [fileId]: {
            ...existing,
            status: 'DOWNLOADING',
            speedBytesPerSec: 0,
            activeWorker: 'Resuming download...',
            error: null,
            updatedAt: Date.now(),
          },
        },
      };
    });

    try {
      await invoke('resume_download', {
        fileId,
        destinationPath: transfer.filePath,
      });
    } catch (error) {
      console.error('Could not resume download:', error);
      set((state) => {
        const current = state.activeTransfers[fileId];
        if (!current || current.status !== 'DOWNLOADING') return state;
        return {
          activeTransfers: {
            ...state.activeTransfers,
            [fileId]: { ...current, status: 'PAUSED', activeWorker: 'none', error: String(error) },
          },
        };
      });
    } finally {
      transferActionsInFlight.delete(fileId);
    }
  },

  cancelFileDownload: async (fileId: string) => {
    // 1. Immediately update UI to CANCELLED and speed to 0
    set((state) => {
      const existing = state.activeTransfers[fileId];
      if (!existing) return state;
      return {
        activeTransfers: {
          ...state.activeTransfers,
          [fileId]: {
            ...existing,
            status: 'CANCELLED',
            speedBytesPerSec: 0,
            updatedAt: Date.now(),
          },
        },
      };
    });

    // 2. Abort backend download tasks and clean up destination file
    try {
      await invoke('cancel_download', { fileId });
    } catch (e) {
      console.error('Error invoking cancel_download:', e);
    }
  },

  handleProgressEvent: (payload: TransferProgressEvent) => {
    set((state) => {
      const existing = state.activeTransfers[payload.file_id];
      const now = Date.now();

      // A last in-flight progress packet can arrive after a pause was requested.
      // Keep the paused state until an explicit resume starts the transfer again.
      if (
        existing?.status === 'PAUSED' &&
        (payload.status === 'UPLOADING' || payload.status === 'DOWNLOADING')
      ) {
        return state;
      }

      // If user has cancelled this transfer, drop late in-flight progress packets
      if (existing?.status === 'CANCELLED' && payload.status !== 'CANCELLED') {
        return state;
      }

      const transferType =
        payload.status === 'DOWNLOADING'
          ? 'DOWNLOAD'
          : existing?.transferType || 'UPLOAD';

      const updated: ActiveTransfer = {
        fileId: payload.file_id,
        fileName: payload.file_name || existing?.fileName || 'File',
        filePath: existing?.filePath || '',
        transferType,
        totalSizeBytes: payload.total_file_bytes,
        totalChunks: payload.total_chunks,
        currentChunkIndex:
          payload.status === 'PAUSED' && existing
            ? Math.max(existing.currentChunkIndex, payload.chunk_index)
            : payload.chunk_index,
        bytesTransferredFile:
          payload.status === 'PAUSED' && existing
            ? Math.max(existing.bytesTransferredFile, payload.bytes_transferred_file)
            : payload.bytes_transferred_file,
        bytesTransferredChunk:
          payload.status === 'PAUSED' && existing
            ? Math.max(existing.bytesTransferredChunk, payload.bytes_transferred_chunk)
            : payload.bytes_transferred_chunk,
        totalChunkBytes: payload.total_chunk_bytes,
        speedBytesPerSec: payload.speed_bytes_per_sec,
        activeWorker: payload.active_worker,
        status: payload.status,
        error: payload.error,
        startedAt: existing?.startedAt || now,
        updatedAt: now,
      };

      const updatedProgress: TransferProgress = {
        file_id: payload.file_id,
        file_name: payload.file_name || existing?.fileName || 'File',
        bytes_transferred:
          payload.status === 'PAUSED' && existing
            ? Math.max(existing.bytesTransferredFile, payload.bytes_transferred_file)
            : payload.bytes_transferred_file,
        total_bytes: payload.total_file_bytes,
        active_chunk: payload.chunk_index + 1,
        total_chunks: payload.total_chunks,
        speed_mbps: payload.status === 'PAUSED' ? 0 : parseFloat((payload.speed_bytes_per_sec / (1024 * 1024)).toFixed(2)),
        worker_bot: payload.status === 'PAUSED' ? 'none' : payload.active_worker,
        is_upload: transferType === 'UPLOAD',
      };

      // If status changed to completed, refresh directory contents
      if (payload.status === 'COMPLETED' && existing?.status !== 'COMPLETED') {
        setTimeout(() => get().loadDirectory(), 500);
      }

      const shouldOpenDrawer =
        state.isDrawerOpen ||
        (!existing && (payload.status === 'UPLOADING' || payload.status === 'DOWNLOADING'));

      return {
        activeTransfers: {
          ...state.activeTransfers,
          [payload.file_id]: updated,
        },
        transfers: {
          ...state.transfers,
          [payload.file_id]: updatedProgress,
        },
        // Auto-open drawer only when a new active transfer is initialized
        isDrawerOpen: shouldOpenDrawer,
      };
    });
  },

  initEventListener: async () => {
    const pendingProgress = new Map<string, TransferProgressEvent>();
    let animationFrame: number | undefined;
    let hiddenTimer: number | undefined;

    const flushProgress = () => {
      if (animationFrame !== undefined) {
        cancelAnimationFrame(animationFrame);
        animationFrame = undefined;
      }
      if (hiddenTimer !== undefined) {
        window.clearTimeout(hiddenTimer);
        hiddenTimer = undefined;
      }

      const events = Array.from(pendingProgress.values());
      pendingProgress.clear();
      for (const payload of events) {
        get().handleProgressEvent(payload);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        flushProgress();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const queueProgress = (payload: TransferProgressEvent) => {
      pendingProgress.set(payload.file_id, payload);

      // Status changes need immediate controls, while in-progress updates can
      // wait for the next paint (or one low-cost batch while hidden).
      if (terminalTransferStates.has(payload.status)) {
        flushProgress();
      } else if (document.visibilityState === 'hidden') {
        if (hiddenTimer === undefined) {
          hiddenTimer = window.setTimeout(flushProgress, 1000);
        }
      } else if (animationFrame === undefined) {
        animationFrame = requestAnimationFrame(flushProgress);
      }
    };

    const unlisten: UnlistenFn = await listen<TransferProgressEvent>(
      'transfer://progress',
      (event) => {
        queueProgress(event.payload);
      }
    );
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      flushProgress();
      unlisten();
    };
  },
}));

// Export alias for backward-compatibility with components importing useVfsStore
export const useVfsStore = useVFSStore;
