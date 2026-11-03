import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { WorkerBotInfo, SyncStatus, BotPoolHealth } from '../types/vfs';
import { TelegramDriveLogo } from './TelegramDriveLogo';
import { isRelayUrlConfigured } from '../services/feedbackService';
import {
  X,
  Bot,
  Plus,
  Trash2,
  CloudUpload,
  CloudDownload,
  CheckCircle,
  AlertCircle,
  Loader2,
  HardDrive,
  Clock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFeedback?: () => void;
  onBotsUpdated?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onOpenFeedback, onBotsUpdated }) => {
  const [activeTab, setActiveTab] = useState<'bots' | 'sync' | 'storage' | 'feedback'>('bots');
  const [bots, setBots] = useState<WorkerBotInfo[]>([]);
  const [poolHealth, setPoolHealth] = useState<BotPoolHealth | null>(null);
  const [loadingBots, setLoadingBots] = useState<boolean>(false);
  const [newBotToken, setNewBotToken] = useState<string>('');
  const [addingBot, setAddingBot] = useState<boolean>(false);
  const [botError, setBotError] = useState<string | null>(null);

  // Cloud Sync State
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Chunk Size State
  const [chunkSizeMb, setChunkSizeMb] = useState<number>(250);
  const [savingChunk, setSavingChunk] = useState<boolean>(false);

  const fetchBots = async () => {
    try {
      setLoadingBots(true);
      const list = await invoke<WorkerBotInfo[]>('list_worker_bots');
      setBots(list);
      try {
        const health = await invoke<BotPoolHealth>('get_bot_pool_health');
        setPoolHealth(health);
      } catch (e) {
        console.warn('Could not fetch bot pool health:', e);
      }
      onBotsUpdated?.();
    } catch (err) {
      console.error('Failed to load worker bots:', err);
    } finally {
      setLoadingBots(false);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const status = await invoke<SyncStatus>('get_sync_status');
      setSyncStatus(status);
    } catch (err) {
      console.error('Failed to load sync status:', err);
    }
  };

  const fetchChunkConfig = async () => {
    try {
      const bytesStr = await invoke<string | null>('get_vault_config', { key: 'chunk_size_bytes' });
      if (bytesStr) {
        const bytes = parseInt(bytesStr, 10);
        if (!isNaN(bytes) && bytes > 0) {
          setChunkSizeMb(Math.round(bytes / (1024 * 1024)));
        }
      }
    } catch (err) {
      console.error('Failed to load chunk size config:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBots();
      fetchSyncStatus();
      fetchChunkConfig();
    }
  }, [isOpen]);

  const handleAddBot = async (e: React.FormEvent) => {
    e.preventDefault();
    setBotError(null);
    const token = newBotToken.trim();
    if (!token) return;

    try {
      setAddingBot(true);
      await invoke('add_worker_bot', { token });
      setNewBotToken('');
      await fetchBots();
    } catch (err: any) {
      setBotError(err?.message || 'Failed to add bot token. Ensure bot exists and token is valid.');
    } finally {
      setAddingBot(false);
    }
  };

  const handleRemoveBot = async (botId: string) => {
    try {
      await invoke('remove_worker_bot', { botId });
      await fetchBots();
    } catch (err: any) {
      console.error('Failed to remove worker bot:', err);
    }
  };

  const handlePushSync = async () => {
    try {
      setSyncing(true);
      setSyncMessage(null);
      const msgId = await invoke<number>('push_vfs_index');
      setSyncMessage({
        text: `VFS snapshot pushed and pinned successfully (Message #${msgId})`,
        type: 'success',
      });
      await fetchSyncStatus();
    } catch (err: any) {
      setSyncMessage({
        text: err?.message || 'Failed to push VFS snapshot',
        type: 'error',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handlePullSync = async () => {
    try {
      setSyncing(true);
      setSyncMessage(null);
      const updated = await invoke<boolean>('pull_vfs_index', { force: true });
      if (updated) {
        setSyncMessage({
          text: 'VFS database updated with latest remote pinned snapshot!',
          type: 'success',
        });
      } else {
        setSyncMessage({
          text: 'Local database is already in sync with remote pinned snapshot.',
          type: 'success',
        });
      }
      await fetchSyncStatus();
    } catch (err: any) {
      setSyncMessage({
        text: err?.message || 'Failed to pull VFS snapshot',
        type: 'error',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveChunkSize = async (mb: number) => {
    setChunkSizeMb(mb);
    try {
      setSavingChunk(true);
      const bytes = mb * 1024 * 1024;
      await invoke('set_chunk_size', { chunkSizeBytes: bytes });
    } catch (err: any) {
      console.error('Failed to save chunk size:', err);
    } finally {
      setSavingChunk(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-vault-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-vault-950/50">
          <TelegramDriveLogo size="sm" showText subtitle="Preferences & Pool Management" />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex items-center border-b border-slate-800 px-4 sm:px-6 gap-3 sm:gap-6 text-xs font-semibold bg-vault-950/20 overflow-x-auto scrollbar-none shrink-0">
          <button
            onClick={() => setActiveTab('bots')}
            className={`py-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'bots'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4" />
            Worker Bots Pool ({bots.length})
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            className={`py-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'sync'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CloudUpload className="w-4 h-4" />
            VFS Cloud Sync (Pinned)
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`py-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'storage'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            Chunk Size Engine
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`py-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'feedback'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Feedback & Support
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* TAB 1: WORKER BOTS POOL */}
          {activeTab === 'bots' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-vault-850 border border-slate-800 space-y-2">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-cyan-400" />
                  Anti-Flood Bot Worker Rotation
                </h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Worker Bots are round-robin rotated across chunk uploads with randomized jitter (2.5s–4.5s).
                  When Telegram signals <span className="font-mono text-cyan-300">FLOOD_WAIT_X</span>, that bot enters cooling down for <span className="font-mono text-cyan-300">X + 2</span> seconds while uploads instantly continue on other healthy workers.
                </p>
              </div>

              {/* 5-Bot Rule Health Status */}
              <div
                className={`p-4 rounded-xl border space-y-1.5 ${
                  poolHealth?.min_rule_satisfied
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-amber-950/20 border-amber-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold flex items-center gap-1.5 ${
                      poolHealth?.min_rule_satisfied ? 'text-emerald-300' : 'text-amber-300'
                    }`}
                  >
                    {poolHealth?.min_rule_satisfied ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                    )}
                    5-Bot Minimum Rule Status
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                      poolHealth?.min_rule_satisfied
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {bots.length} / 5 Bots Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {poolHealth?.recommendation ||
                    'A minimum of 5 worker bots guarantees zero FLOOD_WAIT stalls and maximum streaming speeds.'}
                </p>
              </div>

              {/* Add Bot Form */}
              <form onSubmit={handleAddBot} className="space-y-3">
                <label className="text-xs font-semibold text-slate-300 block">
                  Add Bot Token from @BotFather:
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ..."
                    value={newBotToken}
                    onChange={(e) => setNewBotToken(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-vault-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition"
                  />
                  <button
                    type="submit"
                    disabled={addingBot || !newBotToken.trim()}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-vault-950 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 transition shrink-0"
                  >
                    {addingBot ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Add Bot
                  </button>
                </div>
                {botError && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-950/40 border border-red-500/30 text-[11px] text-red-300">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{botError}</span>
                  </div>
                )}
              </form>

              {/* Bot List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Configured Worker Bots ({bots.length})</span>
                  <button
                    onClick={fetchBots}
                    className="text-slate-400 hover:text-cyan-400 flex items-center gap-1 text-[11px] transition"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>

                {loadingBots ? (
                  <div className="p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    Loading bot pool...
                  </div>
                ) : bots.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                    No worker bots configured. The master account will be used directly as fallback.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-vault-950/60 overflow-hidden">
                    {bots.map((bot) => (
                      <div key={bot.bot_id} className="p-3.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 truncate">
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                            <Bot className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-semibold text-white truncate flex items-center gap-2">
                              @{bot.bot_username}
                              <span className="text-[10px] text-slate-500 font-mono">ID: {bot.bot_id}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>Uploaded: {(bot.total_uploaded_bytes / (1024 * 1024)).toFixed(1)} MB</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {bot.is_cooling_down ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Cooldown ({bot.remaining_cooldown_secs}s)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-medium flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Ready
                            </span>
                          )}

                          <button
                            onClick={() => handleRemoveBot(bot.bot_id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition"
                            title="Remove bot from pool"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: VFS CLOUD SYNC */}
          {activeTab === 'sync' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-vault-850 border border-slate-800 space-y-2">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CloudUpload className="w-4 h-4 text-emerald-400" />
                  Cross-Device Pinned Snapshot Synchronization
                </h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Your local SQLite VFS is periodically compressed with Gzip into <span className="font-mono text-cyan-300">&quot;vfs_index.db.gz&quot;</span> and pinned to your private Telegram storage channel. When you open TeleCloud on another PC or mobile device, the pinned snapshot automatically downloads and merges state atomically.
                </p>
              </div>

              {/* Current Sync Info */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-vault-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px]">Last Synced Message:</span>
                  <div className="font-mono font-semibold text-white">
                    {syncStatus?.last_synced_message_id ? `#${syncStatus.last_synced_message_id}` : 'Never synced'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-vault-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px]">Last Sync Timestamp:</span>
                  <div className="font-mono font-semibold text-white">
                    {syncStatus?.last_synced_at
                      ? new Date(syncStatus.last_synced_at * 1000).toLocaleString()
                      : 'None'}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handlePushSync}
                  disabled={syncing}
                  className="flex-1 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-vault-950 font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                  Push &amp; Pin VFS Snapshot
                </button>

                <button
                  onClick={handlePullSync}
                  disabled={syncing}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 border border-slate-700"
                >
                  {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
                  Pull &amp; Merge Remote Snapshot
                </button>
              </div>

              {syncMessage && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-xl text-xs ${
                    syncMessage.type === 'success'
                      ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                      : 'bg-red-950/40 border border-red-500/30 text-red-300'
                  }`}
                >
                  {syncMessage.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{syncMessage.text}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CHUNK ENGINE CONFIG */}
          {activeTab === 'storage' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-vault-850 border border-slate-800 space-y-2">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                  Virtual Slicing Chunk Size
                </h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  TeleCloud slices files virtually in-place using byte offsets and 8MB buffered streams without touching disk space. Recommended chunk size is <span className="font-semibold text-cyan-300">250 MB</span> for optimal throughput and anti-flood balance.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Chunk Size:</span>
                  <span className="font-mono text-cyan-400 text-sm font-bold">{chunkSizeMb} MB</span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[100, 200, 250, 500].map((size) => (
                    <button
                      key={size}
                      onClick={() => handleSaveChunkSize(size)}
                      disabled={savingChunk}
                      className={`py-2.5 rounded-xl text-xs font-semibold border transition ${
                        chunkSizeMb === size
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                          : 'bg-vault-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {size} MB {size === 250 && '(Default)'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FEEDBACK & SUPPORT */}
          {activeTab === 'feedback' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-vault-850 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                    Community Feedback & GitHub Issues
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                      isRelayUrlConfigured()
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {isRelayUrlConfigured() ? 'Relay Active' : 'Relay Pending Setup'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Have an idea for a new feature, a comment, or experienced an unexpected bug?
                  We log user submissions straight into GitHub Issues via an encrypted serverless relay.
                </p>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (onOpenFeedback) {
                        onOpenFeedback();
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 transition cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Open In-App Feedback Form</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-vault-950/60 border border-slate-800 space-y-1.5">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    Privacy & Security
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Zero GitHub tokens or Telegram credentials are ever exposed in this application. All submissions pass through your secured serverless Cloudflare Worker relay.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-vault-950/60 border border-slate-800 space-y-1.5">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Categorized Tracking
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Submissions are automatically tagged with <code className="text-cyan-300 font-mono">user-feedback</code>, <code className="text-amber-300 font-mono">enhancement</code>, or <code className="text-rose-300 font-mono">bug</code> for prompt team review.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
