import React, { useState, useEffect, useRef } from 'react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useVFSStore } from '../store/vfsStore';
import { useShallow } from 'zustand/react/shallow';
import { useMobile, isAndroid } from '../hooks/useMobile';
import {
  FileItem,
  FileRecord,
  FileChunkRecord,
  FolderItem,
  SetupStatus,
  TelegramUserProfile,
  WorkerBotInfo,
} from '../types/vfs';
import { formatBytes } from './TransferDrawer';
import { DesktopTransferBar, MobileTransfersNavButton, MobileTransfersPanel } from './TransferPanels';
import { TelegramDriveLogo } from './TelegramDriveLogo';
import { UserGuideModal } from './UserGuideModal';
import { AboutModal } from './AboutModal';
import { FileThumbnail } from './FileThumbnail';
import { FilePreviewModal } from './FilePreviewModal';
import {
  Folder,
  FolderPlus,
  File,
  FileText,
  FileArchive,
  FileCode,
  FileVideo,
  FileAudio,
  FileImage,
  ChevronRight,
  Search,
  LayoutGrid,
  List,
  UploadCloud,
  Plus,
  ShieldCheck,
  Trash2,
  Edit2,
  Download,
  Eye,
  Play,
  X,
  RefreshCw,
  Loader2,
  Sliders,
  CloudUpload,
  Copy,
  Scissors,
  Clipboard,
  CornerLeftUp,
  Check,
  Database,
  Shield,
  BookOpen,
  Sparkles,
  Hash,
  Info,
  MoreVertical,
  ArrowLeft,
  Bot,
  HardDrive,
  MessageSquare,
} from 'lucide-react';

interface FileExplorerProps {
  setupStatus?: SetupStatus | null;
  profile?: TelegramUserProfile | null;
  onOpenSettings?: () => void;
  onOpenFeedback?: () => void;
  onWipeVault?: () => void;
  onRefreshStatus?: () => void;
  onCheckUpdates?: () => void;
}

const FOLDER_COLORS = [
  '#3b82f6', // blue
  '#06b6d4', // cyan
  '#8b5cf6', // purple
  '#10b981', // emerald
  '#f59e0b', // amber
  '#f43f5e', // rose
];

export const FileExplorer: React.FC<FileExplorerProps> = ({
  setupStatus,
  profile,
  onOpenSettings,
  onOpenFeedback,
  onWipeVault,
  onRefreshStatus,
  onCheckUpdates,
}) => {
  const isMobile = useMobile(768);

  const {
    currentFolderId,
    breadcrumbs,
    folders,
    files,
    searchQuery,
    viewMode,
    selectedIds,
    loadingVfs,
    vfsError,
    inspectingFile,
    fileChunks,
    loadingChunks,
    previewFile,
    openPreview,
    closePreview,
    setCurrentFolder,
    createFolder,
    deleteItem,
    moveItem,
    renameFolder,
    renameFile,
    inspectFileChunks,
    setSearchQuery,
    setViewMode,
    toggleSelection,
    clearSelection,
    startFileUpload,
    startFileDownload,
    loadDirectory,
    setDrawerOpen,
    clipboard,
    copySelectionToClipboard,
    cutSelectionToClipboard,
    copyItemToClipboard,
    cutItemToClipboard,
    clearClipboard,
    pasteClipboard,
  } = useVFSStore(
    useShallow((state) => ({
      currentFolderId: state.currentFolderId,
      breadcrumbs: state.breadcrumbs,
      folders: state.folders,
      files: state.files,
      searchQuery: state.searchQuery,
      viewMode: state.viewMode,
      selectedIds: state.selectedIds,
      loadingVfs: state.loadingVfs,
      vfsError: state.vfsError,
      inspectingFile: state.inspectingFile,
      fileChunks: state.fileChunks,
      loadingChunks: state.loadingChunks,
      previewFile: state.previewFile,
      openPreview: state.openPreview,
      closePreview: state.closePreview,
      setCurrentFolder: state.setCurrentFolder,
      createFolder: state.createFolder,
      deleteItem: state.deleteItem,
      moveItem: state.moveItem,
      renameFolder: state.renameFolder,
      renameFile: state.renameFile,
      inspectFileChunks: state.inspectFileChunks,
      setSearchQuery: state.setSearchQuery,
      setViewMode: state.setViewMode,
      toggleSelection: state.toggleSelection,
      clearSelection: state.clearSelection,
      startFileUpload: state.startFileUpload,
      startFileDownload: state.startFileDownload,
      loadDirectory: state.loadDirectory,
      setDrawerOpen: state.setDrawerOpen,
      clipboard: state.clipboard,
      copySelectionToClipboard: state.copySelectionToClipboard,
      cutSelectionToClipboard: state.cutSelectionToClipboard,
      copyItemToClipboard: state.copyItemToClipboard,
      cutItemToClipboard: state.cutItemToClipboard,
      clearClipboard: state.clearClipboard,
      pasteClipboard: state.pasteClipboard,
      copyItem: state.copyItem,
    }))
  );


  // Local state
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0]);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Mobile navigation state (Google Drive / Telegram style)
  const [mobileTab, setMobileTab] = useState<'files' | 'transfers' | 'bots' | 'vault'>('files');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [actionSheetItem, setActionSheetItem] = useState<
    { type: 'file'; item: FileItem } | { type: 'folder'; item: FolderItem } | null
  >(null);

  // Mobile Bot Pool Tab State
  const [mobileBots, setMobileBots] = useState<WorkerBotInfo[]>([]);
  const [newBotToken, setNewBotToken] = useState('');
  const [isAddingBot, setIsAddingBot] = useState(false);
  const [botError, setBotError] = useState<string | null>(null);

  // Mobile Vault Tab State
  const [chunkSizeMb, setChunkSizeMb] = useState<number>(250);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Drag and drop state (desktop)
  const [draggedItem, setDraggedItem] = useState<{ id: string; isFolder: boolean } | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isOsDraggingOver, setIsOsDraggingOver] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const [clipboardToast, setClipboardToast] = useState<string | null>(null);
  const springTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSpringTimer = () => {
    if (springTimerRef.current) {
      clearTimeout(springTimerRef.current);
      springTimerRef.current = null;
    }
  };

  const scheduleSpringNavigation = (folderId: string | null) => {
    clearSpringTimer();
    springTimerRef.current = setTimeout(() => {
      setCurrentFolder(folderId);
    }, 650);
  };

  // Rename modal state
  const [renameItem, setRenameItem] = useState<{
    type: 'file' | 'folder';
    id: string;
    currentName: string;
  } | null>(null);
  const [renameNewName, setRenameNewName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Load mobile tab configs
  const loadMobileBots = async () => {
    try {
      const list = await invoke<WorkerBotInfo[]>('list_worker_bots');
      setMobileBots(list);
    } catch (e) {
      console.warn('Could not list worker bots on mobile:', e);
    }
  };

  const loadChunkConfig = async () => {
    try {
      const bytesStr = await invoke<string | null>('get_vault_config', { key: 'chunk_size_bytes' });
      if (bytesStr) {
        const bytes = parseInt(bytesStr, 10);
        if (!isNaN(bytes) && bytes > 0) {
          setChunkSizeMb(Math.round(bytes / (1024 * 1024)));
        }
      }
    } catch (e) {
      console.warn('Could not load chunk size on mobile:', e);
    }
  };

  useEffect(() => {
    if (mobileTab === 'bots') {
      loadMobileBots();
    } else if (mobileTab === 'vault') {
      loadChunkConfig();
    }
  }, [mobileTab]);

  const handleAddMobileBot = async (e: React.FormEvent) => {
    e.preventDefault();
    setBotError(null);
    const token = newBotToken.trim();
    if (!token) return;

    try {
      setIsAddingBot(true);
      await invoke('add_worker_bot', { token });
      setNewBotToken('');
      await loadMobileBots();
      if (onRefreshStatus) onRefreshStatus();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setBotError(errObj?.message || 'Failed to add worker bot.');
    } finally {
      setIsAddingBot(false);
    }
  };

  const handleDeleteMobileBot = async (botId: string) => {
    if (!confirm('Remove this worker bot from the pool?')) return;
    try {
      await invoke('remove_worker_bot', { botId });
      await loadMobileBots();
      if (onRefreshStatus) onRefreshStatus();
    } catch (err: unknown) {
      console.error('Failed to remove worker bot:', err);
    }
  };

  const handleSaveChunkSizeMobile = async (mb: number) => {
    setChunkSizeMb(mb);
    try {
      const bytes = mb * 1024 * 1024;
      await invoke('set_chunk_size', { chunkSizeBytes: bytes });
    } catch (err: unknown) {
      console.error('Failed to save chunk size:', err);
    }
  };

  const handleSyncVfsMobile = async (direction: 'push' | 'pull') => {
    try {
      setIsSyncingCloud(true);
      setSyncStatusMsg(null);
      if (direction === 'pull') {
        const updated = await invoke<boolean>('pull_vfs_index', { force: true });
        loadDirectory();
        setSyncStatusMsg({
          text: updated ? 'VFS synced from remote cloud snapshot!' : 'Local database already up to date.',
          type: 'success',
        });
      } else {
        await invoke('push_vfs_index');
        setSyncStatusMsg({
          text: 'VFS snapshot successfully pushed to Telegram channel!',
          type: 'success',
        });
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setSyncStatusMsg({
        text: errObj?.message || 'Cloud sync failed',
        type: 'error',
      });
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Unified upload trigger using native file picker (Storage Access Framework on Android, Open dialog on desktop)
  const handleUploadTrigger = async () => {
    try {
      const selected = await open({
        multiple: true,
        directory: false,
        title: 'Select Files to Upload to TeleCloud Vault',
      });

      if (selected) {
        const filePaths = Array.isArray(selected) ? selected : [selected];
        if (isMobile || isAndroid()) {
          setMobileTab('transfers');
        } else {
          setDrawerOpen(true);
        }
        for (const path of filePaths) {
          if (path) {
            await startFileUpload(path);
          }
        }
        if (isMobile || isAndroid()) {
          setMobileTab('transfers');
        }
      }
    } catch (err: unknown) {
      console.error('File picker error:', err);
      const errObj = err as { message?: string };
      alert(`File picker error: ${errObj?.message || String(err)}`);
    }
  };

  // Download handler: direct to Downloads folder on mobile / Android, save dialog on desktop
  const handleDownloadFile = async (file: FileItem) => {
    try {
      let destinationPath: string | null = null;
      if (isMobile || isAndroid()) {
        setMobileTab('transfers');
        // Automatically save to the mobile Downloads directory without breaking via desktop file picker
        const downloadDir = await invoke<string>('get_default_download_directory');
        const cleanDir = downloadDir.replace(/\\/g, '/').replace(/\/$/, '');
        destinationPath = `${cleanDir}/${file.name}`;
      } else {
        destinationPath = await save({
          defaultPath: file.name,
          title: `Save ${file.name} to...`,
        });
      }

      if (destinationPath) {
        if (!isMobile && !isAndroid()) setDrawerOpen(true);
        await startFileDownload(file.id, destinationPath, file);
        if (isMobile || isAndroid()) {
          setMobileTab('transfers');
        }
      }
    } catch (err: unknown) {
      console.error('Download error:', err);
      const errObj = err as { message?: string };
      alert(`Download failed: ${errObj?.message || String(err)}`);
    }
  };

  // Inline folder creation
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    try {
      setIsCreatingFolder(true);
      await createFolder(folderName.trim(), selectedColor);
      setFolderName('');
      setIsNewFolderOpen(false);
    } catch (err) {
      console.error('Create folder error:', err);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Rename submit
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameItem || !renameNewName.trim()) return;

    try {
      setIsRenaming(true);
      if (renameItem.type === 'folder') {
        await renameFolder(renameItem.id, renameNewName.trim());
      } else {
        await renameFile(renameItem.id, renameNewName.trim());
      }
      setRenameItem(null);
      setRenameNewName('');
    } catch (err) {
      console.error('Rename error:', err);
    } finally {
      setIsRenaming(false);
    }
  };

  // Drag and Drop handlers (desktop & nested forward/backward navigation)
  const handleDragStart = (id: string, isFolder: boolean) => {
    setDraggedItem({ id, isFolder });
  };

  const handleDropOnFolder = async (targetFolderId: string | null) => {
    clearSpringTimer();
    setDragOverFolderId(null);
    if (!draggedItem) return;
    if (draggedItem.id === targetFolderId) return;
    if (targetFolderId === currentFolderId) return;

    try {
      const itemsToMove = selectedIds.includes(draggedItem.id)
        ? selectedIds.map((id) => {
            const isF = folders.some((f) => f.id === id);
            return { id, isFolder: isF };
          })
        : [draggedItem];

      for (const item of itemsToMove) {
        if (item.id !== targetFolderId) {
          await moveItem(item.id, item.isFolder, targetFolderId);
        }
      }
      clearSelection();
    } catch (err) {
      console.error('Failed to move item:', err);
    } finally {
      setDraggedItem(null);
    }
  };

  const handlePaste = async (targetFolderId?: string | null) => {
    if (!clipboard || clipboard.items.length === 0) return;
    setIsPasting(true);
    try {
      await pasteClipboard(targetFolderId !== undefined ? targetFolderId : currentFolderId);
      setClipboardToast(`Pasted ${clipboard.items.length} item(s)`);
      setTimeout(() => setClipboardToast(null), 2500);
    } catch (err) {
      console.error('Paste error:', err);
    } finally {
      setIsPasting(false);
    }
  };

  // Keyboard Shortcuts: Ctrl+C (Copy), Ctrl+X (Cut), Ctrl+V (Paste)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd && e.key.toLowerCase() === 'c') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          copySelectionToClipboard();
          setClipboardToast(`Copied ${selectedIds.length} item(s) to clipboard`);
          setTimeout(() => setClipboardToast(null), 2500);
        }
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'x') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          cutSelectionToClipboard();
          setClipboardToast(`Cut ${selectedIds.length} item(s) to clipboard`);
          setTimeout(() => setClipboardToast(null), 2500);
        }
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'v') {
        if (clipboard && clipboard.items.length > 0) {
          e.preventDefault();
          handlePaste(currentFolderId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, clipboard, currentFolderId, copySelectionToClipboard, cutSelectionToClipboard, pasteClipboard]);

  // Batch deletion
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected item(s)?`)) return;

    for (const id of selectedIds) {
      const isFolder = folders.some((f) => f.id === id);
      await deleteItem(id, isFolder);
    }
    clearSelection();
  };

  // Filter items by search
  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Previous breadcrumb for mobile back navigation
  const previousCrumb = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2] : null;

  return (
    <div className="flex h-full w-full min-h-0 min-w-0 bg-[#090d16] text-slate-100 font-sans selection:bg-cyan-500/30 overflow-hidden relative">
      {/* ------------------------------------------------------------------ */}
      {/* DESKTOP SIDEBAR (Visible on Desktop / Tablet, Hidden on Phone)     */}
      {/* ------------------------------------------------------------------ */}
      <aside className={`${isMobile ? 'hidden' : 'flex'} w-52 lg:w-64 min-h-0 border-r border-slate-800/80 bg-[#0c1222]/60 backdrop-blur-xl flex-col justify-between p-3 lg:p-4 shrink-0 select-none`}>
        <div className="space-y-6 min-h-0">
          {/* Logo / Brand */}
          <div className="px-2 py-1">
            <TelegramDriveLogo size="md" showText subtitle="Unlimited Cloud VFS" animated />
          </div>

          {/* Quick Nav */}
          <nav className="space-y-1.5 overflow-y-auto min-h-0">
            <button
              onClick={() => setCurrentFolder(null)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverFolderId('root');
              }}
              onDragLeave={() => setDragOverFolderId(null)}
              onDrop={() => handleDropOnFolder(null)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                currentFolderId === null
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
              } ${dragOverFolderId === 'root' ? 'ring-2 ring-cyan-400 bg-cyan-950/40' : ''}`}
            >
              <Folder className="h-4 w-4" />
              <span>Root Directory</span>
            </button>

            {/* User Guidelines Navigation Link */}
            <button
              onClick={() => setIsGuideOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent hover:border-slate-800/60 transition-all group"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="h-4 w-4 text-cyan-400/90 group-hover:text-cyan-400 transition" />
                <span>User Guidelines</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 font-mono">
                Guide
              </span>
            </button>

            {/* In-App Feedback & Ideas Link */}
            {onOpenFeedback && (
              <button
                onClick={onOpenFeedback}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent hover:border-slate-800/60 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 text-cyan-400/90 group-hover:text-cyan-400 transition" />
                  <span>Feedback & Ideas</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                  Issues
                </span>
              </button>
            )}

            {/* System Health / Bot Pool Card */}
            <div className="pt-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Worker Bot Pool</span>
              <span className="text-[10px] text-cyan-400 font-normal hover:underline cursor-pointer" onClick={onOpenSettings}>
                Manage
              </span>
            </div>
            <div
              onClick={onOpenSettings}
              className="flex items-center justify-between px-3 py-2 text-xs text-slate-400 rounded-md bg-slate-900/50 border border-slate-800/50 hover:border-cyan-500/30 cursor-pointer transition"
              title="Click to manage Worker Bot Pool in Settings"
            >
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${setupStatus && setupStatus.bot_count >= 5 ? 'bg-emerald-400 animate-pulse' : setupStatus && setupStatus.bot_count > 0 ? 'bg-amber-400' : 'bg-cyan-400 animate-pulse'}`} />
                <span className="text-slate-300 font-medium">
                  {setupStatus ? `${setupStatus.bot_count} / 5 Bots` : '0 / 5 Bots'}
                </span>
              </span>
              <span className={`font-mono text-[10px] font-semibold ${setupStatus && setupStatus.bot_count >= 5 ? 'text-emerald-400' : setupStatus && setupStatus.bot_count > 0 ? 'text-amber-400' : 'text-cyan-400'}`}>
                {setupStatus && setupStatus.bot_count >= 5 ? 'HEALTHY' : setupStatus && setupStatus.bot_count > 0 ? 'ACTIVE' : '+ ADD BOTS'}
              </span>
            </div>

            {/* Telegram Storage Node Badge */}
            <div className="pt-2 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Storage Node
            </div>
            <div className="px-3 py-2 text-xs text-slate-400 rounded-md bg-slate-900/50 border border-slate-800/50">
              <div className="flex items-center gap-2 truncate">
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span className="font-mono text-[11px] text-cyan-300 truncate">
                  {setupStatus?.storage_channel_id || 'TeleCloud_Vault_Node'}
                </span>
              </div>
            </div>

            {/* User Profile */}
            {profile && (
              <div className="pt-2">
                <div className="px-3 py-2 text-xs text-slate-300 rounded-md bg-slate-900/40 border border-slate-800/40 truncate">
                  <div className="font-medium text-white truncate">
                    {profile.first_name || profile.username || 'Telegram User'}
                  </div>
                  {profile.phone && (
                    <div className="text-[10px] text-slate-500 font-mono">{profile.phone}</div>
                  )}
                </div>
              </div>
            )}
          </nav>
        </div>

        {/* Sidebar Footer Controls & Storage Stats */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/50 transition"
                title="Open Vault Settings"
              >
                <Sliders className="h-3.5 w-3.5 text-cyan-400" />
                <span>Settings</span>
              </button>
            )}

            <button
              onClick={() => setIsAboutOpen(true)}
              className="flex items-center justify-center p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white text-xs border border-slate-700/50 transition"
              title="About TeleCloud"
            >
              <Info className="h-3.5 w-3.5 text-cyan-400" />
            </button>

            {onOpenFeedback && (
              <button
                onClick={onOpenFeedback}
                className="flex items-center justify-center p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white text-xs border border-slate-700/50 transition"
                title="Send Feedback & Comments"
              >
                <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
              </button>
            )}

            {onWipeVault && (
              <button
                onClick={onWipeVault}
                className="flex items-center justify-center p-1.5 rounded-lg bg-red-950/20 hover:bg-red-900/40 text-red-400 text-xs border border-red-500/20 transition"
                title="Reset Credentials"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-gradient-to-b from-slate-800/40 to-slate-900/40 border border-slate-800/60 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-400">Total Synced</span>
              <span className="text-cyan-400 font-semibold font-mono">Unlimited</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full w-2/5 animate-pulse" />
            </div>
            <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-cyan-400" /> MTProto Encrypted Socket
            </p>
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* MAIN WORKSPACE (Full-width on mobile, desktop-adjusted on wider)  */}
      {/* ------------------------------------------------------------------ */}
      <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-radial from-slate-900/40 via-transparent to-transparent">
        {/* ============================================================== */}
        {/* DESKTOP NAVBAR (hidden on phone, visible on desktop & tablet) */}
        {/* ============================================================== */}
        <header className={`${isMobile ? 'hidden' : 'flex'} h-16 border-b border-slate-800/80 px-3 lg:px-6 items-center gap-2 lg:gap-4 backdrop-blur-md shrink-0 overflow-hidden`}>
          {/* Breadcrumbs with Drop-to-Move Target */}
          <div className="flex-1 min-w-0 flex items-center gap-1.5 text-sm overflow-x-auto py-2">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              const crumbKey = crumb.id ?? 'root';
              const isOver = dragOverFolderId === `crumb-${crumbKey}`;

              return (
                <React.Fragment key={crumbKey}>
                  <button
                    onClick={() => setCurrentFolder(crumb.id)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverFolderId(`crumb-${crumbKey}`);
                    }}
                    onDragLeave={() => setDragOverFolderId(null)}
                    onDrop={() => handleDropOnFolder(crumb.id)}
                    className={`hover:text-cyan-400 hover:bg-slate-800/40 transition-all duration-200 whitespace-nowrap font-medium px-2.5 py-1 rounded-lg ${
                      isLast ? 'text-white font-semibold' : 'text-slate-400'
                    } ${isOver ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400 scale-105' : ''}`}
                    title={crumb.id ? `Navigate or drop into ${crumb.name}` : 'Home / Root'}
                  >
                    {crumb.name}
                  </button>
                  {idx < breadcrumbs.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-slate-600 shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Action Bar */}
          <div className="flex shrink-0 items-center gap-1.5 lg:gap-3">
            <div className="relative w-36 xl:w-60">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 py-1.5 w-full rounded-lg bg-slate-900/70 border border-slate-800 text-sm focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600 text-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center border border-slate-800 rounded-lg p-0.5 bg-slate-900/50">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition ${
                  viewMode === 'grid'
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition ${
                  viewMode === 'list'
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title="List View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={() => setIsNewFolderOpen(!isNewFolderOpen)}
                className="flex items-center gap-2 px-2.5 lg:px-3 py-1.5 rounded-lg border border-slate-700/60 bg-slate-800/40 hover:bg-slate-800 text-slate-200 text-sm transition-all font-medium"
            >
              <Plus className="h-4 w-4 text-cyan-400" />
                <span className="hidden xl:inline">New Folder</span>
            </button>

            <button
              onClick={handleUploadTrigger}
                className="flex items-center gap-2 px-2.5 lg:px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-medium shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <UploadCloud className="h-4 w-4" />
                <span className="hidden lg:inline">Upload</span>
            </button>

            <button
              onClick={() => {
                loadDirectory();
                if (onRefreshStatus) onRefreshStatus();
              }}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Refresh VFS"
            >
              <RefreshCw className={`h-4 w-4 ${loadingVfs ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </header>

        {/* ============================================================== */}
        {/* MOBILE TOP APP BAR (Google Drive / Telegram Style)            */}
        {/* ============================================================== */}
        <header className={`${isMobile ? 'block' : 'hidden'} border-b border-slate-800/80 bg-[#070b14]/95 backdrop-blur-md pt-safe shrink-0 select-none`}>
          <div className="h-14 px-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <img src="/32x32.png" alt="TeleCloud" className="w-5 h-5 rounded-lg" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white tracking-tight truncate">
                  TeleCloud
                </span>
                <span className="text-[10px] font-mono text-cyan-400/90 truncate">
                  {setupStatus?.storage_channel_id ? 'Node Connected' : 'Unlimited VFS'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                className={`p-2 rounded-xl transition ${
                  isMobileSearchOpen || searchQuery
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Search"
              >
                <Search className="w-4 h-4" />
              </button>

              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 rounded-xl text-slate-400 hover:text-white"
                title={viewMode === 'grid' ? 'Switch to List' : 'Switch to Grid'}
              >
                {viewMode === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
              </button>

              <button
                onClick={() => {
                  loadDirectory();
                  if (onRefreshStatus) onRefreshStatus();
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loadingVfs ? 'animate-spin text-cyan-400' : ''}`} />
              </button>

              {onOpenFeedback && (
                <button
                  onClick={onOpenFeedback}
                  className="p-2 rounded-xl text-slate-400 hover:text-white transition"
                  title="Send Feedback"
                >
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                </button>
              )}
            </div>
          </div>

          {/* Expandable Mobile Search Bar */}
          {isMobileSearchOpen && (
            <div className="px-3 pb-2.5 animate-slideUp">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search in TeleCloud..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-900 border border-cyan-500/40 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Mobile Breadcrumb Navigation Strip (Only shown when inside subfolders) */}
          {mobileTab === 'files' && breadcrumbs.length > 1 && (
            <div className="px-3 py-2 bg-slate-950/60 border-t border-slate-800/40 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
              {previousCrumb && (
                <button
                  onClick={() => setCurrentFolder(previousCrumb.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/80 text-cyan-400 text-[11px] font-semibold shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}

              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={crumb.id ?? 'root'}>
                    <button
                      onClick={() => setCurrentFolder(crumb.id)}
                      className={`whitespace-nowrap font-medium px-2 py-0.5 rounded-md ${
                        isLast ? 'text-white font-bold bg-slate-800/50' : 'text-slate-400 hover:text-cyan-300'
                      }`}
                    >
                      {crumb.name}
                    </button>
                    {idx < breadcrumbs.length - 1 && (
                      <ChevronRight className="h-3 w-3 text-slate-600 shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </header>

        {/* ============================================================== */}
        {/* DYNAMIC WORKSPACE BODY                                        */}
        {/* ============================================================== */}
        <div
          className={`flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 transition-all ${
            isOsDraggingOver ? 'bg-cyan-950/10 ring-2 ring-cyan-500/50' : ''
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsOsDraggingOver(true);
          }}
          onDragLeave={() => setIsOsDraggingOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsOsDraggingOver(false);
          }}
        >
          {/* TAB 1: FILES BROWSER (Desktop default, or mobile Files tab) */}
          {(!isMobile || mobileTab === 'files') && (
            <>
              {/* Inline New Folder Form */}
              {isNewFolderOpen && (
                <form
                  onSubmit={handleCreateFolder}
                  className="p-3.5 sm:p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 flex flex-wrap items-center gap-3 backdrop-blur-md animate-in slide-in-from-top-2 duration-200"
                >
                  <Folder className="h-5 w-5 text-cyan-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Folder Name..."
                    autoFocus
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    className="bg-transparent border-b border-cyan-500/50 text-white text-sm focus:outline-none px-2 py-1 flex-1 sm:w-64 placeholder-slate-500"
                  />

                  {/* Color Selector */}
                  <div className="flex items-center gap-1.5 px-2">
                    {FOLDER_COLORS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setSelectedColor(col)}
                        className={`w-4 h-4 rounded-full transition-transform ${
                          selectedColor === col ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="submit"
                      disabled={isCreatingFolder || !folderName.trim()}
                      className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-lg transition disabled:opacity-50 flex items-center gap-1"
                    >
                      {isCreatingFolder && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span>Create</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsNewFolderOpen(false)}
                      className="px-3 py-1.5 text-slate-400 hover:text-white text-xs transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Batch Selection Action Bar */}
              {selectedIds.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex flex-wrap items-center justify-between gap-2 text-xs backdrop-blur-md shadow-lg sticky top-2 z-20 animate-slideUp">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-cyan-300">
                      {selectedIds.length} item(s) selected
                    </span>
                    <button
                      onClick={clearSelection}
                      className="text-slate-400 hover:text-white underline text-[11px]"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        copySelectionToClipboard();
                        setClipboardToast(`Copied ${selectedIds.length} item(s) to clipboard`);
                        setTimeout(() => setClipboardToast(null), 2500);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition flex items-center gap-1.5 active:scale-95"
                      title="Copy selected items (Ctrl+C)"
                    >
                      <Copy className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Copy</span>
                    </button>

                    <button
                      onClick={() => {
                        cutSelectionToClipboard();
                        setClipboardToast(`Cut ${selectedIds.length} item(s) to clipboard`);
                        setTimeout(() => setClipboardToast(null), 2500);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition flex items-center gap-1.5 active:scale-95"
                      title="Cut selected items (Ctrl+X)"
                    >
                      <Scissors className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cut</span>
                    </button>

                    <button
                      onClick={handleBatchDelete}
                      className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 font-medium transition flex items-center gap-1.5 active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Clipboard Active Action Banner */}
              {clipboard && clipboard.items.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 flex flex-wrap items-center justify-between gap-2 text-xs backdrop-blur-md shadow-lg sticky top-2 z-20 animate-fadeIn">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                      {clipboard.operation === 'cut' ? (
                        <Scissors className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <span className="text-amber-200">
                      <strong>{clipboard.items.length} item(s)</strong> {clipboard.operation === 'cut' ? 'cut' : 'copied'} to clipboard
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePaste(currentFolderId)}
                      disabled={isPasting}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition flex items-center gap-1.5 active:scale-95 shadow-md shadow-amber-500/20 disabled:opacity-50"
                    >
                      {isPasting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Clipboard className="w-3.5 h-3.5" />
                      )}
                      <span>Paste Here</span>
                    </button>

                    <button
                      onClick={clearClipboard}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title="Clear clipboard"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Toast Notification */}
              {clipboardToast && (
                <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-cyan-500/40 text-cyan-300 text-xs font-semibold shadow-2xl backdrop-blur-xl animate-fadeIn flex items-center gap-2 pointer-events-none">
                  <Check className="w-4 h-4 text-cyan-400" />
                  <span>{clipboardToast}</span>
                </div>
              )}

              {/* Loading or Error Banners */}
              {loadingVfs && folders.length === 0 && files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  <span className="text-xs font-medium">Reading SQLite VFS index...</span>
                </div>
              ) : vfsError ? (
                <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/40 text-red-300 text-xs text-center">
                  {vfsError}
                </div>
              ) : filteredFolders.length === 0 && filteredFiles.length === 0 ? (
                <EmptyFolderState
                  onUpload={handleUploadTrigger}
                  onCreateFolder={() => setIsNewFolderOpen(true)}
                  onOpenGuide={() => setIsGuideOpen(true)}
                />
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {/* Backward Parent Folder Navigation & Drop Target */}
                  {previousCrumb && (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverFolderId('parent-folder');
                        scheduleSpringNavigation(previousCrumb.id);
                      }}
                      onDragLeave={() => {
                        clearSpringTimer();
                        setDragOverFolderId(null);
                      }}
                      onDrop={() => handleDropOnFolder(previousCrumb.id)}
                      onClick={() => setCurrentFolder(previousCrumb.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer select-none transition-all duration-150 ${
                        dragOverFolderId === 'parent-folder'
                          ? 'ring-2 ring-cyan-400 bg-cyan-950/60 border-cyan-400 scale-[1.01]'
                          : 'bg-slate-900/40 hover:bg-slate-800/60 border-slate-800/80 text-slate-300 hover:border-cyan-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                          <CornerLeftUp className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col truncate">
                          <span className="text-xs sm:text-sm font-semibold text-slate-200 truncate">
                            .. Back to {previousCrumb.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Navigate backward or drop items here to move up
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-cyan-400/90 shrink-0 px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/60">
                        {dragOverFolderId === 'parent-folder' ? 'Drop backward here' : 'Parent Folder'}
                      </span>
                    </div>
                  )}

                  {/* Sub-Folders Section */}
                  {filteredFolders.length > 0 && (
                    <div>
                      <h2 className="text-xs uppercase font-semibold text-slate-500 tracking-wider mb-2.5">
                        Folders ({filteredFolders.length})
                      </h2>
                      <div className={`file-card-grid gap-2.5 sm:gap-3 ${isMobile ? 'file-card-grid-mobile' : ''}`}>
                        {filteredFolders.map((f) => {
                          const isOver = dragOverFolderId === f.id;
                          const isSelected = selectedIds.includes(f.id);

                          return (
                            <div
                              key={f.id}
                              draggable
                              onDragStart={() => handleDragStart(f.id, true)}
                              onDragOver={(e) => {
                                e.preventDefault();
                                setDragOverFolderId(f.id);
                                scheduleSpringNavigation(f.id);
                              }}
                              onDragLeave={() => {
                                clearSpringTimer();
                                setDragOverFolderId(null);
                              }}
                              onDrop={() => handleDropOnFolder(f.id)}
                              onClick={() => {
                                // Touch-friendly: single-tap opens folder immediately on mobile
                                setCurrentFolder(f.id);
                              }}
                              className={`group relative p-3 sm:p-3.5 rounded-xl border card-hover cursor-pointer flex items-center justify-between select-none ${
                                isSelected
                                  ? 'bg-cyan-950/40 border-cyan-500/50 shadow-sm'
                                  : 'bg-slate-900/40 hover:bg-slate-800/60 border-slate-800/80 hover:border-cyan-500/30'
                              } ${isOver ? 'ring-2 ring-cyan-400 bg-cyan-950/60 scale-[1.02]' : ''}`}
                            >
                              <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                                <Folder
                                  className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110"
                                  style={{ color: f.color || '#3b82f6' }}
                                />
                                <span className="text-xs sm:text-sm font-medium text-slate-200 truncate" title={f.name}>
                                  {f.name}
                                </span>
                              </div>

                              {/* Desktop Hover Actions */}
                              {!isMobile && !isAndroid() && (
                                <div className="hidden md:flex opacity-0 group-hover:opacity-100 items-center gap-1 transition-opacity">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyItemToClipboard(f.id, true, f.name);
                                      setClipboardToast(`Copied folder "${f.name}"`);
                                      setTimeout(() => setClipboardToast(null), 2500);
                                    }}
                                    className="p-1 hover:text-cyan-400 text-slate-500 transition"
                                    title="Copy Folder"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      cutItemToClipboard(f.id, true, f.name);
                                      setClipboardToast(`Cut folder "${f.name}"`);
                                      setTimeout(() => setClipboardToast(null), 2500);
                                    }}
                                    className="p-1 hover:text-amber-400 text-slate-500 transition"
                                    title="Cut Folder"
                                  >
                                    <Scissors className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRenameItem({
                                        type: 'folder',
                                        id: f.id,
                                        currentName: f.name,
                                      });
                                      setRenameNewName(f.name);
                                    }}
                                    className="p-1 hover:text-cyan-400 text-slate-500 transition"
                                    title="Rename"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm(`Delete folder "${f.name}"?`)) {
                                        deleteItem(f.id, true);
                                      }
                                    }}
                                    className="p-1 hover:text-red-400 text-slate-500 transition"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}

                              {/* Mobile 3-Dots Action Sheet Button */}
                              {(isMobile || isAndroid()) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionSheetItem({ type: 'folder', item: f });
                                  }}
                                  className="p-1.5 -mr-1 text-slate-400 active:text-white hover:text-white shrink-0 ml-1 rounded-lg active:bg-slate-800/60 transition"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Files Section */}
                  {filteredFiles.length > 0 && (
                    <div>
                      <h2 className="text-xs uppercase font-semibold text-slate-500 tracking-wider mb-2.5">
                        Files ({filteredFiles.length})
                      </h2>

                      {viewMode === 'grid' ? (
                        /* Grid View */
                        <div className={`file-card-grid gap-2.5 sm:gap-3 ${isMobile ? 'file-card-grid-mobile' : ''}`}>
                          {filteredFiles.map((file) => {
                            const isSelected = selectedIds.includes(file.id);

                            return (
                              <div
                                key={file.id}
                                draggable
                                onDragStart={() => handleDragStart(file.id, false)}
                                onClick={() => {
                                  if (isMobile) {
                                    setActionSheetItem({ type: 'file', item: file });
                                  } else {
                                    toggleSelection(file.id);
                                  }
                                }}
                                onDoubleClick={() => openPreview(file)}
                                className={`relative min-w-0 overflow-hidden p-2.5 sm:p-3 rounded-xl border card-hover group flex flex-col justify-between cursor-pointer select-none ${
                                  isSelected
                                    ? 'bg-cyan-950/30 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                                    : 'bg-slate-900/40 hover:bg-slate-800/50 border-slate-800/80 hover:border-slate-700'
                                }`}
                              >
                                {/* Top Header / Status Row */}
                                <div className="flex items-center justify-between mb-1.5 min-h-[24px]">
                                  {/* Selection Checkbox (Clean, only appears on hover, when selected, or in multi-select mode) */}
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSelection(file.id);
                                    }}
                                    className={`transition-all duration-200 p-0.5 rounded cursor-pointer ${
                                      isSelected
                                        ? 'opacity-100 scale-100'
                                        : selectedIds.length > 0
                                          ? 'opacity-70 hover:opacity-100 hover:scale-105'
                                          : 'opacity-0 group-hover:opacity-100 hover:scale-105'
                                    }`}
                                    title={isSelected ? 'Deselect item' : 'Select item'}
                                  >
                                    {isSelected ? (
                                      <div className="w-4 h-4 rounded bg-cyan-500 text-slate-950 flex items-center justify-center shadow-md shadow-cyan-500/25">
                                        <Check className="w-3 h-3 stroke-[3]" />
                                      </div>
                                    ) : (
                                      <div className="w-4 h-4 rounded border border-slate-500/60 bg-slate-900/80 hover:border-cyan-400 hover:bg-slate-800 transition-colors" />
                                    )}
                                  </div>

                                  <div className="relative flex items-center justify-end">
                                    {/* Normal Status Badge */}
                                    <div className={`flex items-center transition-opacity duration-150 ${!isMobile && !isAndroid() ? 'group-hover:opacity-0 group-hover:pointer-events-none' : ''}`}>
                                      <FileStatusBadge status={file.status} />
                                    </div>

                                    {/* Desktop Hover Action Capsule */}
                                    {!isMobile && !isAndroid() && (
                                      <div
                                        className="absolute right-0 top-0 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto flex items-center gap-1 transition-all duration-150 bg-slate-900/95 backdrop-blur-sm px-1.5 py-0.5 rounded-lg border border-slate-700/60 shadow-sm z-20"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <button
                                          onClick={() => openPreview(file)}
                                          className="p-1 rounded hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 transition-colors"
                                          title="Preview File"
                                        >
                                          <Play className="w-3.5 h-3.5 fill-current" />
                                        </button>
                                        <button
                                          onClick={() => handleDownloadFile(file)}
                                          className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                                          title="Download File"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => inspectFileChunks(file as unknown as FileRecord)}
                                          className="p-1 rounded hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 transition-colors"
                                          title="Inspect MTProto Chunks"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            copyItemToClipboard(file.id, false, file.name);
                                            setClipboardToast(`Copied "${file.name}"`);
                                            setTimeout(() => setClipboardToast(null), 2500);
                                          }}
                                          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition-colors"
                                          title="Copy File (Ctrl+C)"
                                        >
                                          <Copy className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            cutItemToClipboard(file.id, false, file.name);
                                            setClipboardToast(`Cut "${file.name}"`);
                                            setTimeout(() => setClipboardToast(null), 2500);
                                          }}
                                          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition-colors"
                                          title="Cut File (Ctrl+X)"
                                        >
                                          <Scissors className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setRenameItem({
                                              type: 'file',
                                              id: file.id,
                                              currentName: file.name,
                                            });
                                            setRenameNewName(file.name);
                                          }}
                                          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                                          title="Rename"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (confirm(`Delete file "${file.name}"?`)) {
                                              deleteItem(file.id, false);
                                            }
                                          }}
                                          className="p-1 rounded hover:bg-red-950/40 text-slate-400 hover:text-red-400 transition-colors"
                                          title="Delete"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}

                                    {/* Mobile 3-Dots Button */}
                                    {(isMobile || isAndroid()) && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActionSheetItem({ type: 'file', item: file });
                                        }}
                                        className="p-1 -mr-1 text-slate-400 active:text-white hover:text-white rounded-lg active:bg-slate-800/60 transition"
                                      >
                                        <MoreVertical className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Thumbnail Area */}
                                <div className="w-full mb-2">
                                  <FileThumbnail file={file} view="grid" />
                                </div>

                                <div>
                                  <p className="text-xs sm:text-sm font-medium text-slate-200 truncate" title={file.name}>
                                    {file.name}
                                  </p>
                                  <div className="flex items-center justify-between mt-1 text-[10px] sm:text-[11px] text-slate-500 font-mono">
                                    <span>{formatBytes(file.total_size_bytes)}</span>
                                    <span className="text-cyan-400/80">
                                      {file.total_chunks} {file.total_chunks === 1 ? 'Chunk' : 'Chunks'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        /* List View (Responsive on mobile) */
                        <div className="rounded-xl border border-slate-800/80 overflow-hidden bg-slate-900/30">
                          {/* Desktop Full Table */}
                          <div className={isMobile ? 'hidden' : 'block'}>
                            <table className="w-full text-left text-sm">
                              <thead className="bg-slate-900/60 text-slate-500 text-xs font-mono uppercase border-b border-slate-800">
                                <tr>
                                  <th className="p-3.5 w-10">
                                    <span className="sr-only">Select</span>
                                  </th>
                                  <th className="p-3.5">Name</th>
                                  <th className="p-3.5">Size</th>
                                  <th className="p-3.5">Chunks</th>
                                  <th className="p-3.5">Status</th>
                                  <th className="p-3.5 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                                {filteredFiles.map((file) => {
                                  const isSelected = selectedIds.includes(file.id);

                                  return (
                                    <tr
                                      key={file.id}
                                      draggable
                                      onDragStart={() => handleDragStart(file.id, false)}
                                      onClick={() => toggleSelection(file.id)}
                                      onDoubleClick={() => openPreview(file)}
                                      className={`hover:bg-slate-800/30 transition-colors cursor-pointer select-none ${
                                        isSelected ? 'bg-cyan-950/20' : ''
                                      }`}
                                    >
                                      <td className="p-3.5 w-10">
                                        <div
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleSelection(file.id);
                                          }}
                                          className={`transition-all duration-200 p-0.5 rounded cursor-pointer ${
                                            isSelected
                                              ? 'opacity-100'
                                              : selectedIds.length > 0
                                                ? 'opacity-70 hover:opacity-100'
                                                : 'opacity-20 group-hover:opacity-100'
                                          }`}
                                          title={isSelected ? 'Deselect item' : 'Select item'}
                                        >
                                          {isSelected ? (
                                            <div className="w-4 h-4 rounded bg-cyan-500 text-slate-950 flex items-center justify-center shadow-sm shadow-cyan-500/25">
                                              <Check className="w-3 h-3 stroke-[3]" />
                                            </div>
                                          ) : (
                                            <div className="w-4 h-4 rounded border border-slate-600/60 bg-slate-900/60 hover:border-cyan-400 transition-colors" />
                                          )}
                                        </div>
                                      </td>
                                      <td className="p-3.5 flex items-center gap-2.5 font-medium text-slate-200">
                                        <FileThumbnail file={file} view="list" />
                                        <span className="truncate max-w-xs">{file.name}</span>
                                      </td>
                                      <td className="p-3.5 text-xs font-mono text-slate-400">
                                        {formatBytes(file.total_size_bytes)}
                                      </td>
                                      <td className="p-3.5 text-xs font-mono text-cyan-400">
                                        {file.total_chunks}
                                      </td>
                                      <td className="p-3.5">
                                        <FileStatusBadge status={file.status} />
                                      </td>
                                      <td className="p-3.5 text-right">
                                        <div
                                          className="flex items-center justify-end gap-1.5"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <button
                                            onClick={() => openPreview(file)}
                                            className="p-1 hover:text-cyan-300 text-cyan-400 transition-colors"
                                            title="Preview File"
                                          >
                                            <Play className="h-4 w-4 fill-current" />
                                          </button>
                                          <button
                                            onClick={() => handleDownloadFile(file)}
                                            className="p-1 hover:text-cyan-400 text-slate-500 transition-colors"
                                            title="Download"
                                          >
                                            <Download className="h-4 w-4" />
                                          </button>
                                          <button
                                            onClick={() => inspectFileChunks(file as unknown as FileRecord)}
                                            className="p-1 hover:text-indigo-400 text-slate-500 transition-colors"
                                            title="Inspect Chunks"
                                          >
                                            <Eye className="h-4 w-4" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              copyItemToClipboard(file.id, false, file.name);
                                              setClipboardToast(`Copied "${file.name}"`);
                                              setTimeout(() => setClipboardToast(null), 2500);
                                            }}
                                            className="p-1 hover:text-cyan-400 text-slate-500 transition-colors"
                                            title="Copy File"
                                          >
                                            <Copy className="h-4 w-4" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              cutItemToClipboard(file.id, false, file.name);
                                              setClipboardToast(`Cut "${file.name}"`);
                                              setTimeout(() => setClipboardToast(null), 2500);
                                            }}
                                            className="p-1 hover:text-amber-400 text-slate-500 transition-colors"
                                            title="Cut File"
                                          >
                                            <Scissors className="h-4 w-4" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              setRenameItem({
                                                type: 'file',
                                                id: file.id,
                                                currentName: file.name,
                                              });
                                              setRenameNewName(file.name);
                                            }}
                                            className="p-1 hover:text-slate-200 text-slate-500 transition-colors"
                                            title="Rename"
                                          >
                                            <Edit2 className="h-4 w-4" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              if (confirm(`Delete file "${file.name}"?`)) {
                                                deleteItem(file.id, false);
                                              }
                                            }}
                                            className="p-1 hover:text-red-400 text-slate-500 transition-colors"
                                            title="Delete"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile Fluid Card List */}
                          <div className={`${isMobile ? 'block' : 'hidden'} divide-y divide-slate-800/60`}>
                            {filteredFiles.map((file) => (
                              <div
                                key={file.id}
                                onClick={() => setActionSheetItem({ type: 'file', item: file })}
                                className="p-3 flex items-center justify-between gap-3 active:bg-slate-800/40 select-none cursor-pointer"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <FileThumbnail file={file} view="list" className="w-9 h-9 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-slate-200 truncate">{file.name}</p>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                                      <span>{formatBytes(file.total_size_bytes)}</span>
                                      <span>•</span>
                                      <span className="text-cyan-400/80">{file.total_chunks} chunks</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <FileStatusBadge status={file.status} />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadFile(file);
                                    }}
                                    className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 active:scale-90 transition"
                                    title="Download File"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActionSheetItem({ type: 'file', item: file });
                                    }}
                                    className="p-1 text-slate-400 hover:text-white"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* TAB 2: MOBILE TRANSFERS VIEW (Google Drive Style) */}
          {isMobile && mobileTab === 'transfers' && (
              <MobileTransfersPanel />
          )}

          {/* TAB 3: MOBILE BOT POOL VIEW */}
          {isMobile && mobileTab === 'bots' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-vault-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Bot className="w-5 h-5 text-cyan-400" />
                    <span>5-Bot Turbo Worker Pool</span>
                  </h3>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {mobileBots.length} / 5 Active
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Worker Bots rotate round-robin across 2 GB chunk slices with randomized jitter. When Telegram signals <span className="font-mono text-cyan-300">FLOOD_WAIT</span>, that bot cools down while other workers continue uninterrupted.
                </p>
                <div className="pt-2 flex items-center gap-2 text-xs font-mono text-cyan-300">
                  <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Node: {setupStatus?.storage_channel_id || 'TeleCloud_Vault_Node'}</span>
                </div>
              </div>

              {/* Add Bot Form */}
              {mobileBots.length < 5 && (
                <form onSubmit={handleAddMobileBot} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Add Telegram Worker Bot Token
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                      value={newBotToken}
                      onChange={(e) => setNewBotToken(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                    <button
                      type="submit"
                      disabled={isAddingBot || !newBotToken.trim()}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition disabled:opacity-50 shrink-0 flex items-center gap-1"
                    >
                      {isAddingBot ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>Add</span>
                    </button>
                  </div>
                  {botError && (
                    <p className="text-[11px] text-red-400">{botError}</p>
                  )}
                </form>
              )}

              {/* Bot List */}
              <div className="space-y-2">
                {mobileBots.map((bot, idx) => (
                  <div
                    key={bot.bot_id}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold font-mono text-[11px]">
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">{bot.bot_username || `Worker Bot ${idx + 1}`}</p>
                        <p className="text-[10px] text-slate-500 font-mono">ID: {bot.bot_id}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteMobileBot(bot.bot_id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition"
                      title="Remove Bot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: MOBILE VAULT SETTINGS VIEW */}
          {isMobile && mobileTab === 'vault' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Chunk Size Engine */}
              <div className="p-4 rounded-2xl bg-vault-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-cyan-400" />
                    <span>Chunk Size Engine</span>
                  </h3>
                  <span className="text-xs font-mono text-cyan-300 font-bold">{chunkSizeMb} MB</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[250, 500, 1000, 2000].map((mb) => (
                    <button
                      key={mb}
                      onClick={() => handleSaveChunkSizeMobile(mb)}
                      className={`py-2 rounded-xl text-xs font-semibold font-mono transition ${
                        chunkSizeMb === mb
                          ? 'bg-cyan-500 text-vault-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                          : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {mb >= 1000 ? `${mb / 1000} GB` : `${mb} MB`}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">
                  Files larger than the chunk size are automatically split into streaming chunks with parallel worker uploads.
                </p>
              </div>

              {/* VFS Cloud Snapshot Pinned Sync */}
              <div className="p-4 rounded-2xl bg-vault-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CloudUpload className="w-4 h-4 text-indigo-400" />
                    <span>Cloud VFS Sync</span>
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Pinned
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Sync your encrypted SQLite folder structure and file indexes to your private Telegram storage channel.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={isSyncingCloud}
                    onClick={() => handleSyncVfsMobile('pull')}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition flex items-center justify-center gap-1.5"
                  >
                    {isSyncingCloud ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>Pull Remote</span>
                  </button>
                  <button
                    disabled={isSyncingCloud}
                    onClick={() => handleSyncVfsMobile('push')}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20"
                  >
                    {isSyncingCloud ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
                    <span>Push Local</span>
                  </button>
                </div>
                {syncStatusMsg && (
                  <p className={`text-[11px] ${syncStatusMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {syncStatusMsg.text}
                  </p>
                )}
              </div>

              {/* Documentation & Help links */}
              <div className="p-4 rounded-2xl bg-vault-900 border border-slate-800 space-y-2">
                <button
                  onClick={() => setIsGuideOpen(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 flex items-center justify-between text-xs text-slate-200 font-medium transition"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                    <span>User Guidelines & Architecture</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                <button
                  onClick={() => setIsAboutOpen(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 flex items-center justify-between text-xs text-slate-200 font-medium transition"
                >
                  <span className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-cyan-400" />
                    <span>About TeleCloud</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                {onOpenFeedback && (
                  <button
                    onClick={onOpenFeedback}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 flex items-center justify-between text-xs text-slate-200 font-medium transition"
                  >
                    <span className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-cyan-400" />
                      <span>Send Feedback & Ideas</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                )}
              </div>

              {/* Wipe Vault Reset */}
              {onWipeVault && (
                <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/20 space-y-2">
                  <h4 className="text-xs font-bold text-red-400">Danger Zone</h4>
                  <p className="text-[11px] text-slate-400">
                    Reset local session and credentials from this device. Files already uploaded to your Telegram channel remain safe.
                  </p>
                  <button
                    onClick={onWipeVault}
                    className="w-full py-2.5 rounded-xl bg-red-950/50 hover:bg-red-900/60 text-red-400 border border-red-500/30 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Wipe Vault Credentials</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* DESKTOP BOTTOM DRAWER BAR (visible on desktop & tablet)        */}
        {/* ============================================================== */}
        <DesktopTransferBar setupStatus={setupStatus} isMobile={isMobile} />

        {/* ============================================================== */}
        {/* MOBILE BOTTOM NAVIGATION BAR (Google Drive / Telegram Style)   */}
        {/* ============================================================== */}
        <nav className={`${isMobile ? 'flex' : 'hidden'} h-16 border-t border-slate-800/90 bg-[#070b14]/95 backdrop-blur-xl flex items-center justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shrink-0 z-40 select-none`}>
          <button
            onClick={() => setMobileTab('files')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
              mobileTab === 'files' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Folder className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">Files</span>
          </button>

          <MobileTransfersNavButton
            active={mobileTab === 'transfers'}
            onClick={() => setMobileTab('transfers')}
          />

          <button
            onClick={() => setMobileTab('bots')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
              mobileTab === 'bots' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <div className="relative">
              <Bot className="w-5 h-5 mb-0.5" />
              {setupStatus && setupStatus.bot_count > 0 && (
                <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </div>
            <span className="text-[10px] font-medium tracking-tight">Bot Pool</span>
          </button>

          <button
            onClick={() => setMobileTab('vault')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
              mobileTab === 'vault' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Sliders className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">Vault</span>
          </button>
        </nav>
      </main>

      {/* ============================================================== */}
      {/* CYBERPUNK FLOATING ACTION BUTTON (FAB) FOR MOBILE             */}
      {/* Only visible on 'files' tab and positioned safely above nav    */}
      {/* ============================================================== */}
      <div className={`${isMobile && mobileTab === 'files' ? 'flex' : 'hidden'} fixed bottom-24 right-5 z-40 flex-col items-end gap-2.5`}>
        {isFabOpen && (
          <div className="flex flex-col items-end gap-2.5 animate-slideUp">
            {clipboard && clipboard.items.length > 0 && (
              <button
                onClick={() => {
                  setIsFabOpen(false);
                  handlePaste(currentFolderId);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-amber-500 text-slate-950 text-xs font-bold shadow-xl shadow-amber-500/30 transition active:scale-95"
              >
                <Clipboard className="w-4 h-4" />
                <span>Paste ({clipboard.items.length} items)</span>
              </button>
            )}

            <button
              onClick={() => {
                setIsFabOpen(false);
                setIsNewFolderOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900 border border-slate-700 text-white text-xs font-semibold shadow-xl shadow-black/60 hover:bg-slate-800 transition"
            >
              <span>New Folder</span>
              <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <FolderPlus className="w-4 h-4" />
              </div>
            </button>
            <button
              onClick={() => {
                setIsFabOpen(false);
                handleUploadTrigger();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900 border border-slate-700 text-white text-xs font-semibold shadow-xl shadow-black/60 hover:bg-slate-800 transition"
            >
              <span>Upload Files</span>
              <div className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <UploadCloud className="w-4 h-4" />
              </div>
            </button>
          </div>
        )}
        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-[0_4px_24px_rgba(6,182,212,0.45)] transition-all duration-200 active:scale-95 ${
            isFabOpen ? 'rotate-45' : ''
          }`}
          title="New Action"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* ============================================================== */}
      {/* MOBILE BOTTOM ACTION SHEET (for 3-dots Item Options)           */}
      {/* ============================================================== */}
      {actionSheetItem && (
        <div
          className={`${isMobile ? 'flex' : 'hidden'} fixed inset-0 z-50 flex-col justify-end bg-black/75 backdrop-blur-sm animate-fadeIn`}
          onClick={() => setActionSheetItem(null)}
        >
          <div
            className="bg-vault-900 border-t border-slate-700/80 rounded-t-3xl p-5 pb-safe space-y-4 shadow-2xl animate-slideUp max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto" />

            {/* Header info */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                {actionSheetItem.type === 'folder' ? (
                  <Folder className="w-5 h-5" style={{ color: (actionSheetItem.item as FolderItem).color || '#3b82f6' }} />
                ) : (
                  <FileIcon name={actionSheetItem.item.name} mimeType={(actionSheetItem.item as FileItem).mime_type} className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-white truncate">{actionSheetItem.item.name}</h4>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {actionSheetItem.type === 'file' ? (
                    <span>{formatBytes((actionSheetItem.item as FileItem).total_size_bytes)} • {(actionSheetItem.item as FileItem).total_chunks} chunks</span>
                  ) : (
                    <span>Folder</span>
                  )}
                </div>
              </div>
              {actionSheetItem.type === 'file' && (
                <FileStatusBadge status={(actionSheetItem.item as FileItem).status} />
              )}
            </div>

            {/* Action buttons */}
            <div className="space-y-1">
              {actionSheetItem.type === 'file' && (
                <>
                  <button
                    onClick={() => {
                      const file = actionSheetItem.item as FileItem;
                      setActionSheetItem(null);
                      openPreview(file);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-bold text-sm border border-cyan-500/20 transition"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Preview File</span>
                  </button>

                  <button
                    onClick={() => {
                      const file = actionSheetItem.item as FileItem;
                      setActionSheetItem(null);
                      handleDownloadFile(file);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-cyan-400 font-medium text-sm transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File</span>
                  </button>

                  <button
                    onClick={() => {
                      const file = actionSheetItem.item as unknown as FileRecord;
                      setActionSheetItem(null);
                      inspectFileChunks(file);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-indigo-400 font-medium text-sm transition"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Inspect MTProto Chunks</span>
                  </button>
                </>
              )}

              <button
                onClick={() => {
                  const item = actionSheetItem.item;
                  const isFolder = actionSheetItem.type === 'folder';
                  setActionSheetItem(null);
                  copyItemToClipboard(item.id, isFolder, item.name);
                  setClipboardToast(`Copied ${isFolder ? 'folder' : 'file'} "${item.name}"`);
                  setTimeout(() => setClipboardToast(null), 2500);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-slate-200 font-medium text-sm transition"
              >
                <Copy className="w-4 h-4 text-cyan-400" />
                <span>Copy {actionSheetItem.type === 'folder' ? 'Folder' : 'File'}</span>
              </button>

              <button
                onClick={() => {
                  const item = actionSheetItem.item;
                  const isFolder = actionSheetItem.type === 'folder';
                  setActionSheetItem(null);
                  cutItemToClipboard(item.id, isFolder, item.name);
                  setClipboardToast(`Cut ${isFolder ? 'folder' : 'file'} "${item.name}"`);
                  setTimeout(() => setClipboardToast(null), 2500);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-slate-200 font-medium text-sm transition"
              >
                <Scissors className="w-4 h-4 text-amber-400" />
                <span>Cut {actionSheetItem.type === 'folder' ? 'Folder' : 'File'}</span>
              </button>

              <button
                onClick={() => {
                  const item = actionSheetItem.item;
                  const type = actionSheetItem.type;
                  setActionSheetItem(null);
                  setRenameItem({
                    type,
                    id: item.id,
                    currentName: item.name,
                  });
                  setRenameNewName(item.name);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-slate-200 font-medium text-sm transition"
              >
                <Edit2 className="w-4 h-4 text-slate-400" />
                <span>Rename {actionSheetItem.type === 'folder' ? 'Folder' : 'File'}</span>
              </button>

              <button
                onClick={() => {
                  const item = actionSheetItem.item;
                  const isFolder = actionSheetItem.type === 'folder';
                  setActionSheetItem(null);
                  if (confirm(`Delete ${actionSheetItem.type} "${item.name}"?`)) {
                    deleteItem(item.id, isFolder);
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-950/40 text-red-400 font-medium text-sm transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete {actionSheetItem.type === 'folder' ? 'Folder' : 'File'}</span>
              </button>
            </div>

            <button
              onClick={() => setActionSheetItem(null)}
              className="w-full py-3 rounded-xl bg-slate-800/80 text-slate-300 font-semibold text-xs transition text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODALS                                                         */}
      {/* ============================================================== */}
      {/* Rename Modal */}
      {renameItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 sm:p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-cyan-400" />
                Rename {renameItem.type === 'folder' ? 'Folder' : 'File'}
              </h3>
              <button onClick={() => setRenameItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  New Name
                </label>
                <input
                  type="text"
                  autoFocus
                  value={renameNewName}
                  onChange={(e) => setRenameNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenameItem(null)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRenaming || !renameNewName.trim()}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isRenaming && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Rename</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={closePreview}
          onDownload={(f) => handleDownloadFile(f)}
          onInspectChunks={(f) => inspectFileChunks(f as unknown as FileRecord)}
        />
      )}

      {/* Chunk Inspector Modal */}
      {inspectingFile && (
        <FileChunksModal
          file={inspectingFile}
          chunks={fileChunks}
          loading={loadingChunks}
          onClose={() => inspectFileChunks(null)}
        />
      )}

      {/* User Guidelines Documentation Modal */}
      <UserGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onOpenSettings={onOpenSettings}
      />

      {/* About Application Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        onCheckUpdates={onCheckUpdates}
      />
    </div>
  );
};

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

interface FileChunksModalProps {
  file: FileRecord;
  chunks: FileChunkRecord[];
  loading: boolean;
  onClose: () => void;
}

const FileChunksModal: React.FC<FileChunksModalProps> = ({ file, chunks, loading, onClose }) => {
  const [copiedSha, setCopiedSha] = useState(false);

  const handleCopySha = () => {
    if (file.full_sha256) {
      navigator.clipboard.writeText(file.full_sha256);
      setCopiedSha(true);
      setTimeout(() => setCopiedSha(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2.5 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Database className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>Chunk Stream Inspector</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                  {chunks.length} chunks
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate max-w-xs sm:max-w-md font-mono mt-0.5" title={file.name}>
                {file.name} • {formatBytes(file.total_size_bytes)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Master File Checksum */}
        <div className="px-4 sm:px-5 py-3 bg-slate-950/40 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 truncate max-w-xs sm:max-w-md">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-400 hidden sm:inline">Full SHA-256:</span>
            <span className="font-mono text-[11px] text-cyan-300 truncate">
              {file.full_sha256 || 'Pending verification'}
            </span>
            {file.full_sha256 && (
              <button
                onClick={handleCopySha}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                title="Copy SHA-256"
              >
                {copiedSha ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
          <FileStatusBadge status={file.status} />
        </div>

        {/* Chunks List */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-2.5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
              <span className="text-xs">Querying SQLite chunk mapping...</span>
            </div>
          ) : chunks.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No chunk slices recorded yet for this file.
            </div>
          ) : (
            chunks.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-cyan-500/10 border border-cyan-500/30 font-mono text-[11px] text-cyan-400 flex items-center justify-center font-bold">
                      #{c.chunk_index}
                    </span>
                    <span className="font-semibold text-white">
                      {formatBytes(c.byte_length)}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                      (offset {formatBytes(c.byte_offset)})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {c.telegram_message_id && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono border border-indigo-500/20">
                        Msg: {c.telegram_message_id}
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                        c.upload_status === 'UPLOADED' || c.upload_status === 'VERIFIED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : c.upload_status === 'UPLOADING'
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {c.upload_status}
                    </span>
                  </div>
                </div>

                {c.chunk_sha256 && (
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-900/60 p-1.5 rounded-lg font-mono">
                    <Hash className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">{c.chunk_sha256}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const EmptyFolderState: React.FC<{
  onUpload: () => void;
  onCreateFolder: () => void;
  onOpenGuide: () => void;
}> = ({ onUpload, onCreateFolder, onOpenGuide }) => (
  <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center space-y-4 sm:space-y-5 animate-fadeIn select-none px-4">
    <div className="relative">
      <TelegramDriveLogo size="lg" animated />
      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
        <Sparkles className="w-3 h-3" />
      </div>
    </div>

    <div className="space-y-1.5 max-w-md">
      <h3 className="text-base font-bold text-white tracking-tight">Your TeleCloud is Ready</h3>
      <p className="text-xs text-slate-400 leading-relaxed">
        Upload unlimited files of any size via direct MTProto binary socket streams, or create folders to organize your vault.
      </p>
    </div>

    <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 pt-2">
      <button
        onClick={onCreateFolder}
        className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 font-semibold transition flex items-center gap-2 hover:border-slate-600 shadow-sm"
      >
        <FolderPlus className="w-4 h-4 text-cyan-400" />
        <span>New Folder</span>
      </button>

      <button
        onClick={onUpload}
        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-cyan-500/25"
      >
        <UploadCloud className="w-4 h-4" />
        <span>Upload Files</span>
      </button>

      <button
        onClick={onOpenGuide}
        className="px-4 py-2.5 rounded-xl bg-cyan-950/30 hover:bg-cyan-900/40 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition flex items-center gap-2"
      >
        <BookOpen className="w-4 h-4 text-cyan-400" />
        <span>User Guidelines</span>
      </button>
    </div>
  </div>
);

const FileIcon: React.FC<{ mimeType?: string; name: string; className?: string }> = ({
  mimeType = '',
  name,
  className = 'w-4 h-4 text-blue-400 shrink-0',
}) => {
  const ext = name.split('.').pop()?.toLowerCase() || '';

  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext) || mimeType.startsWith('image/')) {
    return <FileImage className={className} />;
  }
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext) || mimeType.startsWith('video/')) {
    return <FileVideo className={className} />;
  }
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext) || mimeType.startsWith('audio/')) {
    return <FileAudio className={className} />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
    return <FileArchive className={className} />;
  }
  if (['rs', 'ts', 'tsx', 'js', 'jsx', 'json', 'html', 'css', 'py', 'c', 'cpp'].includes(ext)) {
    return <FileCode className={className} />;
  }
  if (['txt', 'md', 'pdf', 'doc', 'docx'].includes(ext) || mimeType.startsWith('text/')) {
    return <FileText className={className} />;
  }
  return <File className={className} />;
};

const FileStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'READY':
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium font-mono">
          Ready
        </span>
      );
    case 'UPLOADING':
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium font-mono flex items-center gap-1">
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
          Uploading
        </span>
      );
    case 'PENDING':
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium font-mono">
          Pending
        </span>
      );
    case 'CORRUPTED':
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium font-mono">
          Corrupted
        </span>
      );
    default:
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium font-mono">
          {status}
        </span>
      );
  }
};

export default FileExplorer;
