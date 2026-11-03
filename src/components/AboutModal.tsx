import React from 'react';
import { TelegramDriveLogo } from './TelegramDriveLogo';
import {
  X,
  Cpu,
  ShieldCheck,
  Zap,
  FolderTree,
  Share2,
  Lock,
  Layers,
  CheckCircle2,
  Code2,
} from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-2xl max-h-[90vh] bg-vault-900/95 border border-slate-700/80 rounded-3xl shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-vault-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <TelegramDriveLogo size="md" showText subtitle="Unlimited Cloud Storage" />
          </div>

          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              v1.0.0 Stable
            </span>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 text-slate-300 text-xs">
          {/* Creator Attribution */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="text-slate-300">
              Made by <span className="text-slate-100 font-medium">J Daniel Wonderson</span> (Creator & Architect)
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              TeleCloud v1.0.0
            </span>
          </div>

          {/* Architecture / How It Is Made */}
          <div className="space-y-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Code2 className="w-4 h-4 text-cyan-400" />
              How It Is Made & Technical Architecture
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Rust Backend & Tauri Core</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Engineered in Rust 2021 for maximum execution speed, zero garbage collection pauses, and minimal system resource footprint.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pure MTProto Binary Sockets</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Direct TCP connections to Telegram Data Centers using <code className="text-cyan-300">grammers-client</code>. Zero HTTP Bot API payload restrictions or latency.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Virtual In-Place Slicing</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Files are streamed directly from disk byte offsets without creating temporary files on your hard drive. Memory stays bounded under 35 MB RAM.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <FolderTree className="w-3.5 h-3.5 text-emerald-400" />
                  <span>SQLite Virtual File System (VFS)</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Embedded SQLite in WAL mode supporting infinite folder nesting, instant breadcrumb resolution, and transactional ACID integrity.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Lock className="w-3.5 h-3.5 text-sky-400" />
                  <span>AES-256-GCM & SHA-256 Verification</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  End-to-end credential security and bit-by-bit cryptographic integrity validation for every uploaded and downloaded chunk.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Share2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>Cross-Device Cloud Snapshot Sync</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Directory trees and bot configurations sync automatically across computers and phones via compressed channel snapshots.
                </p>
              </div>
            </div>
          </div>

          {/* Key Capabilities */}
          <div className="space-y-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Core Features & Capabilities
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-vault-850 border border-slate-800/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong>Unlimited Cloud Storage:</strong> Private Telegram channel storage nodes with zero hosting bills.</span>
              </div>
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-vault-850 border border-slate-800/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong>5-Bot Parallel Pool:</strong> Concurrent chunk uploads with round-robin bot rotation.</span>
              </div>
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-vault-850 border border-slate-800/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong>Infinite Nested Folders:</strong> Full drag-and-drop file organization and dynamic breadcrumbs.</span>
              </div>
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-vault-850 border border-slate-800/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong>Resumable Transfers:</strong> Chunk-level pause, resume, and cancellation with speedometers.</span>
              </div>
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-vault-850 border border-slate-800/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong>Multi-Device Sync:</strong> Zero manual bot re-entry when switching to another device.</span>
              </div>
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-vault-850 border border-slate-800/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong>Zero Disk Duplication:</strong> Strict RAM usage under 35 MB even for 50 GB+ files.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-vault-950/70 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 font-mono">
            <span>© 2026 J Daniel Wonderson • All rights reserved</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-vault-950 font-bold text-xs transition shadow-md shadow-cyan-500/20"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
