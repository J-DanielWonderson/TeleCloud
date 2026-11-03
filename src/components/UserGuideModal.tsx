import React, { useState } from 'react';
import { TelegramDriveLogo } from './TelegramDriveLogo';
import {
  X,
  BookOpen,
  Bot,
  Zap,
  HardDrive,
  ShieldCheck,
  Share2,
  FolderTree,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
}

type GuideTab = 'overview' | 'bots' | 'files' | 'sync' | 'tips';

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
}) => {
  const [activeTab, setActiveTab] = useState<GuideTab>('overview');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-3xl max-h-[90vh] bg-vault-900 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-vault-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <TelegramDriveLogo size="sm" showText subtitle="User Guidelines & Architecture" />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Close Guide"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center border-b border-slate-800/80 bg-slate-900/40 px-4 overflow-x-auto scrollbar-none text-xs font-semibold gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3.5 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>How It Works</span>
          </button>

          <button
            onClick={() => setActiveTab('bots')}
            className={`py-3 px-3.5 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'bots'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4 text-cyan-400" />
            <span>5-Bot Turbo Rule</span>
          </button>

          <button
            onClick={() => setActiveTab('files')}
            className={`py-3 px-3.5 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'files'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-4 h-4 text-blue-400" />
            <span>Virtual Slicing</span>
          </button>

          <button
            onClick={() => setActiveTab('sync')}
            className={`py-3 px-3.5 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'sync'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Share2 className="w-4 h-4 text-emerald-400" />
            <span>Cross-Device Sync</span>
          </button>

          <button
            onClick={() => setActiveTab('tips')}
            className={`py-3 px-3.5 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'tips'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Pro Tips</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5 text-sm text-slate-300">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-slate-900 border border-cyan-500/30 flex items-start gap-3">
                <ShieldCheck className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-white text-sm">Decentralized & Serverless Storage</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    TeleCloud connects directly to Telegram Data Centers using pure binary MTProto TCP sockets.
                    There are <span className="text-cyan-300 font-semibold">no middleman web servers</span>, no third-party cloud hosting bills, and no arbitrary file size quotas.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs">
                    <FolderTree className="w-4 h-4 text-cyan-400" />
                    Infinite Nested Folders (VFS)
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Organize your files into unlimited nested folders with dynamic breadcrumbs, drag-and-drop hierarchy, instant renaming, and soft-delete trash protection.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs">
                    <HardDrive className="w-4 h-4 text-blue-400" />
                    Your Private Vault Channel
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    All chunks and encrypted snapshots are stored safely in your own private channel (<code className="text-cyan-300 font-mono text-[11px]">TeleCloud_Vault_Node</code>). Only your account and your worker bots have access.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-amber-300">Important Safety Rule:</span>
                  <p className="mt-0.5 text-slate-300 leading-relaxed">
                    Never manually delete or post messages in your <span className="font-mono text-cyan-300">TeleCloud_Vault_Node</span> channel through official Telegram clients. TeleCloud handles encryption, pinning, and indexing automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 5-BOT TURBO RULE */}
          {activeTab === 'bots' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-slate-900 border border-cyan-500/30">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <Bot className="w-5 h-5 text-cyan-400" />
                  Why 5 Bots are Recommended
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Telegram limits individual bot upload bandwidth to avoid network floods. With our <span className="font-semibold text-white">5-Bot Parallel Pool</span>, TeleCloud round-robin rotates across bots and uploads up to 2-3 chunks concurrently with randomized jitter, effectively doubling speeds while eliminating FLOOD_WAIT pauses.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider text-slate-400">
                  How to get 5 bot tokens in 2 minutes:
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      Open Telegram and search for <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-cyan-400 font-semibold underline inline-flex items-center gap-0.5">@BotFather <ExternalLink className="w-3 h-3 inline" /></a>.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      Send <code className="bg-slate-800 px-1.5 py-0.5 rounded text-cyan-300 font-mono">/newbot</code>, choose any name (e.g., <code className="text-slate-300">MyStorageBot1</code>) and username ending in <code className="text-cyan-300 font-mono">bot</code> (e.g., <code className="text-slate-300">mystorage1_bot</code>).
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      Copy the API token (format <code className="text-cyan-300 font-mono">123456789:ABC...</code>) and paste it into <span className="font-semibold text-white">Settings → Worker Bots</span>. Repeat 5 times.
                    </div>
                  </div>
                </div>

                {onOpenSettings && (
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        onClose();
                        onOpenSettings();
                      }}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-vault-950 font-bold text-xs transition flex items-center gap-2 shadow-md shadow-cyan-500/30"
                    >
                      <Bot className="w-4 h-4" />
                      <span>Configure Worker Bots in Settings</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: VIRTUAL SLICING */}
          {activeTab === 'files' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-semibold text-xs">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Virtual In-Place Slicing (Zero Disk Duplication)
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Unlike traditional cloud wrappers that split huge files into temporary <code className="text-cyan-300 font-mono">.part</code> files that eat up gigabytes of local storage, TeleCloud uses <span className="font-semibold text-white">virtual byte offset seeking</span>.
                  Files are streamed directly from their source byte offsets into 8 MB ring buffers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-vault-850 border border-slate-800 space-y-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Strict Flat RAM &lt; 35 MB
                  </span>
                  <p className="text-slate-400 leading-relaxed">
                    Even when uploading a 50 GB 4K video or downloading large archives, memory consumption stays strictly bounded under 35 MB.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-vault-850 border border-slate-800 space-y-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    SHA-256 Bit-by-Bit Verification
                  </span>
                  <p className="text-slate-400 leading-relaxed">
                    Every chunk is hashed on the fly. When reassembled during download, SHA-256 integrity verification guarantees exact byte-for-byte perfection.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CROSS-DEVICE SYNC */}
          {activeTab === 'sync' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/30 via-slate-900 to-cyan-950/30 border border-emerald-500/30">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-emerald-400" />
                  Automatic Multi-Device Synchronization
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  When you sign in on another computer, laptop, or mobile phone, you do <span className="font-semibold text-white underline">not</span> have to enter your 5 bot tokens or re-upload your files!
                </p>
              </div>

              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">Encrypted Cloud Snapshot:</span>
                    <p className="text-slate-400 mt-0.5">
                      Your local VFS directory tree and encrypted bot credentials are compressed into a compact snapshot (<code className="text-cyan-300 font-mono">vfs_index.db.gz</code>) and pinned to your private channel.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">Instant Device Restore:</span>
                    <p className="text-slate-400 mt-0.5">
                      The moment you log in on any device, the snapshot downloads automatically, binds to local SQLite, and authenticates all 5 bots in the background.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PRO TIPS */}
          {activeTab === 'tips' && (
            <div className="space-y-3 animate-fadeIn text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
                <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shrink-0">
                  📁
                </span>
                <div>
                  <span className="font-semibold text-white">Drag-and-Drop Everywhere</span>
                  <p className="text-slate-400 mt-0.5">
                    Drag files directly from your Windows Explorer or Desktop and drop them anywhere in the app to start uploading. Drag folders into subfolders to organize.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
                <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 shrink-0">
                  ⚡
                </span>
                <div>
                  <span className="font-semibold text-white">Transfer Drawer Controls</span>
                  <p className="text-slate-400 mt-0.5">
                    Click the floating transfer drawer in the bottom right to view live speeds, bot workers, chunk status, and to pause/resume any transfer.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
                  🔍
                </span>
                <div>
                  <span className="font-semibold text-white">Instant Search & Filter</span>
                  <p className="text-slate-400 mt-0.5">
                    Use the search bar in the top header to filter files instantly by filename or extension across your current view.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-vault-950/60 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400 font-mono">
            TeleCloud v1.0.0 • MTProto Protocol
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
          >
            Got it, Let&apos;s Go
          </button>
        </div>
      </div>
    </div>
  );
};
