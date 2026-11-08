import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { FileRecord, FileItem } from '../types/vfs';
import { formatBytes } from './TransferDrawer';
import { getFileCategory, getCategoryBadge, FileCategory } from '../utils/fileTypes';
import { isAndroid } from '../hooks/useMobile';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import { cacheThumbnail } from '../utils/thumbnailQueue';
import {
  X,
  Download,
  Eye,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw as RotateIcon,
  Copy,
  Check,
  WrapText,
  FileText,
  Loader2,
  AlertCircle,
  HardDrive,
  Tv,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
} from 'lucide-react';

export interface MediaProbe {
  container: string;
  video_codec?: string;
  audio_codec?: string;
  width?: number;
  height?: number;
  duration_secs?: number;
  moov_at_end: boolean;
  moov_offset?: number;
  moov_size?: number;
  webview_likely_playable: boolean;
  reason: string;
}

export interface PreviewStatusEvent {
  file_id: string;
  stage: string;
  message: string;
  cached_bytes: number;
  total_bytes: number;
  speed_bps: number;
}

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface FilePreviewModalProps {
  file: FileRecord | FileItem;
  onClose: () => void;
  onDownload: (file: FileRecord | FileItem) => void;
  onInspectChunks?: (file: FileRecord) => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  onClose,
  onDownload,
  onInspectChunks,
}) => {
  const category = getFileCategory(file.name, file.mime_type);
  const badge = getCategoryBadge(category);

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  // Keyboard escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Warm up preview stream on mount and cancel on unmount
  useEffect(() => {
    invoke('prepare_preview', { fileId: file.id }).catch(() => {});
    return () => {
      invoke('cancel_preview', { fileId: file.id }).catch(() => {});
    };
  }, [file.id]);

  // Retrieve stream URL from local loopback server
  useEffect(() => {
    let isMounted = true;
    invoke<string>('get_preview_stream_url', { fileId: file.id })
      .then((url) => {
        if (isMounted) {
          setStreamUrl(url);
          setLoadingUrl(false);
        }
      })
      .catch((err) => {
        console.error('Failed to get preview stream url:', err);
        if (isMounted) setLoadingUrl(false);
      });

    return () => {
      isMounted = false;
    };
  }, [file.id]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      modalContainerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in select-none">
      <div
        ref={modalContainerRef}
        className={`relative w-full flex flex-col bg-slate-950 border-0 sm:border sm:border-slate-800 rounded-none sm:rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? 'w-screen h-screen rounded-none border-none'
            : 'w-full h-full sm:max-w-5xl sm:h-[88vh] sm:max-h-[900px]'
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3.5 pt-[max(0.625rem,env(safe-area-inset-top))] border-b border-slate-800/80 bg-slate-900/80 backdrop-blur shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
            <span
              className={`px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase rounded border shrink-0 ${badge.color}`}
            >
              {badge.label}
            </span>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-base font-semibold text-slate-100 truncate" title={file.name}>
                {file.name}
              </h3>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-400 font-mono">
                <span>{formatBytes(file.total_size_bytes)}</span>
                <span>•</span>
                <span className="text-cyan-400">{file.total_chunks} {file.total_chunks === 1 ? 'Chunk' : 'Chunks'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              onClick={() => onDownload(file)}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold transition active:scale-95"
              title="Download File to Disk"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {onInspectChunks && (
              <button
                onClick={() => onInspectChunks(file as FileRecord)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-semibold transition active:scale-95"
                title="Inspect Telegram MTProto Chunks"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Chunks</span>
              </button>
            )}

            <button
              onClick={toggleFullscreen}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close Preview (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 bg-slate-950/90 relative overflow-hidden flex items-center justify-center">
          {loadingUrl ? (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-sm font-mono">Initializing preview stream...</p>
            </div>
          ) : !streamUrl ? (
            <div className="flex flex-col items-center gap-3 text-red-400">
              <AlertCircle className="w-8 h-8" />
              <p className="text-sm">Unable to connect to local streaming service.</p>
            </div>
          ) : (
            <ViewerSelector file={file} category={category} streamUrl={streamUrl} onDownload={() => onDownload(file)} />
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// VIEWER SELECTOR
// ============================================================================
const ViewerSelector: React.FC<{
  file: FileRecord | FileItem;
  category: FileCategory;
  streamUrl: string;
  onDownload: () => void;
}> = ({ file, category, streamUrl, onDownload }) => {
  switch (category) {
    case 'video':
      return (
        <VideoStreamPlayer
          streamUrl={streamUrl}
          fileId={file.id}
          fileName={file.name}
          fileMime={file.mime_type}
          onDownload={onDownload}
        />
      );
    case 'pdf':
      return <PdfViewer streamUrl={streamUrl} fileName={file.name} />;
    case 'image':
      return <ImageViewer streamUrl={streamUrl} fileName={file.name} />;
    case 'audio':
      return <AudioPlayer streamUrl={streamUrl} fileName={file.name} />;
    case 'text':
    case 'code':
    case 'markdown':
    case 'spreadsheet':
      return <TextViewer fileId={file.id} fileName={file.name} category={category} streamUrl={streamUrl} />;
    case 'document':
      return <DocxViewer streamUrl={streamUrl} fileName={file.name} onDownload={onDownload} />;
    default:
      return <GenericFileCard file={file} onDownload={onDownload} />;
  }
};

// ============================================================================
// 1. VIDEO STREAM PLAYER (WITH CHUNK SEEKING & CUSTOM CONTROLS)
// ============================================================================
const VideoStreamPlayer: React.FC<{
  streamUrl: string;
  fileId?: string;
  fileName?: string;
  fileMime?: string;
  onDownload: () => void;
}> = ({ streamUrl, fileId, fileName: _fileName, fileMime, onDownload }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const thumbnailCapturedRef = useRef(false);
  const [currentSrc, setCurrentSrc] = useState(streamUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isBuffering, setIsBuffering] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorCode, setErrorCode] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [probe, setProbe] = useState<MediaProbe | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Initializing stream...');
  const [stage, setStage] = useState<string>('resolving');
  const [showDetails, setShowDetails] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [retryNotice, setRetryNotice] = useState<string | null>(null);
  const [showStallNotice, setShowStallNotice] = useState(false);
  const onAndroid = isAndroid();

  // Listen to backend MTProto preview status events
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<PreviewStatusEvent>('preview://status', (event) => {
      if (fileId && event.payload.file_id === fileId) {
        setStatusMessage(event.payload.message);
        setStage(event.payload.stage);
        if (event.payload.stage === 'ready') {
          setIsBuffering(false);
        }
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [fileId]);

  // Run media probe on mount
  useEffect(() => {
    if (!fileId) return;
    invoke<MediaProbe>('probe_media', { fileId })
      .then((p) => {
        setProbe(p);
        // On Android, if webview cannot play this codec (HEVC/MKV/AC3), auto-route to native player
        if (onAndroid && !p.webview_likely_playable) {
          invoke('open_native_player', { fileId }).catch(() => {});
        }
      })
      .catch((err) => {
        console.warn('[VideoPlayer] Media probe notice:', err);
      });
  }, [fileId, onAndroid]);

  // Stall watchdog: if buffering exceeds 10s without playback
  useEffect(() => {
    if (!isPlaying && !hasError && isBuffering) {
      const timer = setTimeout(() => {
        setShowStallNotice(true);
        // On Android, auto fallback to native player if stalled for 10s
        if (onAndroid && fileId) {
          invoke('open_native_player', { fileId }).catch(() => {});
        }
      }, 10000);
      return () => clearTimeout(timer);
    }
    setShowStallNotice(false);
  }, [isPlaying, hasError, isBuffering, onAndroid, fileId]);

  const captureThumbnailFromLivePlayer = () => {
    if (thumbnailCapturedRef.current || !fileId || !videoRef.current) return;
    try {
      const v = videoRef.current;
      if (!v.videoWidth || !v.videoHeight) return;
      const canvas = document.createElement('canvas');
      const maxDim = 280;
      let width = v.videoWidth;
      let height = v.videoHeight;
      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      thumbnailCapturedRef.current = true;
      cacheThumbnail(fileId, dataUrl);
      invoke('save_file_thumbnail', { fileId, base64Data: dataUrl }).catch(() => {});
    } catch (_e) {}
  };

  const handleLaunchNativePlayer = () => {
    if (!fileId) return;
    invoke('open_native_player', { fileId }).catch((err) => {
      console.error('Failed to open native player:', err);
    });
  };

  const handleLaunchExternalPlayer = () => {
    if (!fileId) return;
    invoke('open_external_player', { fileId }).catch((err) => {
      console.error('Failed to open external player:', err);
    });
  };

  const handleManualRetry = () => {
    setHasError(false);
    setIsBuffering(true);
    setRetryNotice(null);
    const sep = streamUrl.includes('?') ? '&' : '?';
    const newSrc = `${streamUrl}${sep}r=${Date.now()}`;
    setCurrentSrc(newSrc);
    if (videoRef.current) {
      videoRef.current.src = newSrc;
      videoRef.current.load();
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  };

  const skipTime = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
  };

  const changeRate = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const updateBuffer = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    if (v.buffered.length > 0 && v.duration > 0) {
      const end = v.buffered.end(v.buffered.length - 1);
      setBufferedPercent((end / v.duration) * 100);
    }
  };

  if (hasError) {
    const isCodecError = errorCode === 3 || errorCode === 4 || (probe && !probe.webview_likely_playable);
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto animate-fade-in overflow-y-auto max-h-full">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4 shrink-0 shadow-lg shadow-amber-500/10">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h4 className="text-lg font-semibold text-slate-100 mb-2">Video Playback Notice</h4>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed max-w-sm">
          {isCodecError
            ? probe?.reason || 'The system WebView could not decode this video track directly. ExoPlayer Native Player or VLC can play this video.'
            : 'Telegram connection timed out or was interrupted while buffering. You can retry or play externally.'}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2.5 w-full justify-center mb-4">
          {onAndroid && (
            <button
              onClick={handleLaunchNativePlayer}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              <Tv className="w-4 h-4" />
              <span>Open in Native Player</span>
            </button>
          )}

          <button
            onClick={handleLaunchExternalPlayer}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 font-semibold text-xs border border-indigo-500/40 transition active:scale-95"
            title="Stream in VLC or MX Player"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in External Player</span>
          </button>

          <button
            onClick={handleManualRetry}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Preview</span>
          </button>

          <button
            onClick={onDownload}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold text-xs border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>

        {/* Secondary options */}
        <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
          <button
            onClick={() => {
              navigator.clipboard?.writeText(streamUrl);
              setCopiedLink(true);
              setTimeout(() => setCopiedLink(false), 2500);
            }}
            className="flex items-center gap-1.5 hover:text-slate-200 transition"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Stream Link Copied!' : 'Copy Stream Link'}</span>
          </button>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition font-mono"
          >
            <Info className="w-3.5 h-3.5" />
            <span>{showDetails ? 'Hide Diagnostics' : 'Details'}</span>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Collapsible Diagnostics Section */}
        {showDetails && (
          <div className="w-full text-left bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 text-[11px] font-mono text-slate-300 space-y-1.5 animate-fade-in">
            <div className="flex justify-between border-b border-slate-800 pb-1 text-slate-400 font-semibold">
              <span>Diagnostic Parameter</span>
              <span>Value</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Error Code:</span>
              <span className="text-amber-400">{errorCode} ({errorCode === 2 ? 'NETWORK_ERR' : errorCode === 3 ? 'DECODE_ERR' : errorCode === 4 ? 'SRC_NOT_SUPPORTED' : 'UNKNOWN'})</span>
            </div>
            {errorMessage && (
              <div className="flex justify-between">
                <span className="text-slate-400">Error Message:</span>
                <span className="text-rose-400 truncate max-w-[240px]">{errorMessage}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Container:</span>
              <span className="text-cyan-300 uppercase">{probe?.container || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Video Track:</span>
              <span className="text-slate-200">{probe?.video_codec || 'None'} {probe?.width && probe?.height ? `(${probe.width}x${probe.height})` : ''}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Audio Track:</span>
              <span className="text-slate-200">{probe?.audio_codec || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">MIME / canPlay:</span>
              <span className="text-slate-200">{fileMime || 'video/mp4'} ({videoRef.current?.canPlayType(fileMime || 'video/mp4') || 'no'})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Moov at End:</span>
              <span className="text-slate-200">{probe?.moov_at_end ? 'Yes (OBS/Phone style)' : 'No (FastStart)'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">WebView Likely Playable:</span>
              <span className={probe?.webview_likely_playable ? 'text-emerald-400' : 'text-rose-400'}>{probe?.webview_likely_playable ? 'Yes' : 'No'}</span>
            </div>
            {probe?.reason && (
              <div className="pt-1 text-[10px] text-slate-400 border-t border-slate-800/80">
                <span className="font-semibold text-slate-300">Analysis: </span>
                {probe.reason}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-black group select-none">
      {/* Top Stall Notice Banner */}
      {showStallNotice && (
        <div className="absolute top-3 inset-x-3 sm:inset-x-6 z-20 flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 backdrop-blur-md text-amber-200 text-xs shadow-lg animate-fade-in">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">Buffering is taking a moment... You can switch to the high-performance native player.</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onAndroid && (
              <button
                onClick={handleLaunchNativePlayer}
                className="px-2.5 py-1 rounded-lg bg-amber-500/30 hover:bg-amber-500/40 text-amber-200 font-semibold border border-amber-500/40 transition text-[11px]"
              >
                Native Player
              </button>
            )}
            <button
              onClick={handleLaunchExternalPlayer}
              className="px-2.5 py-1 rounded-lg bg-indigo-500/30 hover:bg-indigo-500/40 text-indigo-200 font-semibold border border-indigo-500/40 transition text-[11px]"
            >
              External
            </button>
          </div>
        </div>
      )}

      {/* Network Retry Toast */}
      {retryNotice && (
        <div className="absolute top-3 z-20 px-3.5 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 text-xs font-mono backdrop-blur-md animate-fade-in flex items-center gap-2 shadow-lg">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
          <span>{retryNotice}</span>
        </div>
      )}

      <video
        ref={videoRef}
        src={currentSrc}
        preload="metadata"
        crossOrigin="anonymous"
        playsInline
        onClick={togglePlay}
        onPlay={() => {
          setIsPlaying(true);
          captureThumbnailFromLivePlayer();
        }}
        onPause={() => setIsPlaying(false)}
        onLoadedData={() => {
          captureThumbnailFromLivePlayer();
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
          }
          setIsBuffering(false);
          captureThumbnailFromLivePlayer();
          // Start auto playback safely once metadata is confirmed loaded
          videoRef.current?.play().catch(() => {});
        }}
        onTimeUpdate={() => {
          if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            updateBuffer();
            captureThumbnailFromLivePlayer();
          }
        }}
        onDurationChange={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
          }
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          captureThumbnailFromLivePlayer();
        }}
        onCanPlay={() => {
          setIsBuffering(false);
          captureThumbnailFromLivePlayer();
        }}
        onError={() => {
          const v = videoRef.current;
          const err = v?.error;
          const code = err?.code ?? 0;
          const msg = err?.message ?? '';
          console.error('[VideoPlayer] Media error encountered: code=', code, msg);

          // Handle network errors with automatic backoff retry
          if (code === 2) {
            if (retryCount < 3) {
              const nextAttempt = retryCount + 1;
              setRetryCount(nextAttempt);
              setRetryNotice(`Network stalled, reconnecting (${nextAttempt}/3)...`);
              setTimeout(() => {
                const sep = streamUrl.includes('?') ? '&' : '?';
                const retrySrc = `${streamUrl}${sep}r=${Date.now()}`;
                setCurrentSrc(retrySrc);
                if (videoRef.current) {
                  videoRef.current.src = retrySrc;
                  videoRef.current.load();
                }
              }, 1200 * nextAttempt);
              return;
            }
          }

          // If decode error on Android, auto fallback to native player
          if (onAndroid && (code === 3 || code === 4 || !probe?.webview_likely_playable)) {
            invoke('open_native_player', { fileId }).catch(() => {});
          }

          setErrorCode(code);
          setErrorMessage(msg);
          setHasError(true);
        }}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Buffering Spinner with Backend MTProto Stages */}
      {isBuffering && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none bg-black/40 backdrop-blur-[1px] z-10">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-3" />
          <span className="text-xs font-mono text-cyan-200 bg-slate-900/90 px-3.5 py-1.5 rounded-full border border-cyan-500/30 shadow-lg">
            {statusMessage || 'Buffering media stream...'}
          </span>
          <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-slate-400">
            <span className={stage === 'resolving' ? 'text-cyan-400 font-bold' : ''}>1. Resolving</span>
            <span>•</span>
            <span className={stage === 'connecting' ? 'text-cyan-400 font-bold' : ''}>2. Connecting</span>
            <span>•</span>
            <span className={stage === 'fetching_header' ? 'text-cyan-400 font-bold' : ''}>3. Indexing</span>
            <span>•</span>
            <span className={stage === 'buffering' || stage === 'ready' ? 'text-cyan-400 font-bold' : ''}>4. Playing</span>
          </div>
        </div>
      )}

      {/* Big Play Button Overlay on Pause */}
      {!isPlaying && !isBuffering && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer pointer-events-auto"
        >
          <div className="w-16 h-16 rounded-full bg-cyan-500/90 text-slate-950 flex items-center justify-center shadow-xl shadow-cyan-500/30 hover:scale-110 transition-transform">
            <Play className="w-8 h-8 fill-current ml-1" />
          </div>
        </div>
      )}

      {/* Video Control Bar */}
      <div className="absolute bottom-0 inset-x-0 p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-black/95 via-black/75 to-transparent flex flex-col gap-2 transition-opacity duration-300 opacity-90 hover:opacity-100">
        {/* Scrubber Bar */}
        <div className="relative w-full flex items-center group/scrubber cursor-pointer">
          {/* Track background */}
          <div className="w-full h-1.5 bg-slate-700/60 rounded-full overflow-hidden relative group-hover/scrubber:h-2.5 transition-all">
            {/* Buffered progress */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-slate-500/50 rounded-full transition-all duration-150"
              style={{ width: `${bufferedPercent}%` }}
            />
            {/* Played progress */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-cyan-400 rounded-full transition-all duration-75"
              style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-2 text-white">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg hover:bg-white/10 text-cyan-400 hover:text-cyan-300 transition"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            <button
              onClick={() => skipTime(-10)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition"
              title="Skip -10s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => skipTime(10)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition"
              title="Skip +10s"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Time Display */}
            <div className="text-xs font-mono text-slate-300 select-none ml-1">
              <span>{formatTime(currentTime)}</span>
              <span className="text-slate-500 mx-1">/</span>
              <span className="text-slate-400">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Speed Selector */}
            <div className="flex items-center gap-1 text-xs font-mono text-slate-300">
              {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => changeRate(rate)}
                  className={`px-1.5 py-0.5 rounded text-[11px] transition ${
                    playbackRate === rate
                      ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Volume Control */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button onClick={toggleMute} className="p-1 hover:text-cyan-400 text-slate-300 transition">
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-slate-700 rounded-lg accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. PDF VIEWER (STREAMING VIA PDF.JS WITH ZOOM & PAGE NAVIGATION)
// ============================================================================
const PdfViewer: React.FC<{
  streamUrl: string;
  fileName?: string;
}> = ({ streamUrl, fileName: _fileName }) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const task = pdfjsLib.getDocument({
      url: streamUrl,
      disableRange: false,
      disableStream: false,
    });

    task.promise
      .then((pdf) => {
        if (!isMounted) return;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('PDF load error:', err);
        setError('Failed to load PDF document.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
      task.destroy();
    };
  }, [streamUrl]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }

    pdfDoc.getPage(currentPage).then((page: any) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const viewport = page.getViewport({ scale });
      const pixelRatio = window.devicePixelRatio || 1;

      canvas.width = viewport.width * pixelRatio;
      canvas.height = viewport.height * pixelRatio;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const renderContext = {
        canvasContext: ctx,
        viewport,
        canvas,
      };

      const renderTask = page.render(renderContext as any);
      renderTaskRef.current = renderTask;
      renderTask.promise.catch(() => {});
    });
  }, [pdfDoc, currentPage, scale]);

  const changePage = (delta: number) => {
    setCurrentPage((prev) => Math.max(1, Math.min(totalPages, prev + delta)));
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 select-none">
      {/* PDF Controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800 text-slate-300 text-xs shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => changePage(-1)}
            disabled={currentPage <= 1}
            className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono">
            Page {currentPage} of {totalPages || 1}
          </span>
          <button
            onClick={() => changePage(1)}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
            className="p-1.5 rounded hover:bg-slate-800"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-mono text-cyan-400">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale((s) => Math.min(3.0, s + 0.2))}
            className="p-1.5 rounded hover:bg-slate-800"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setScale(1.0)}
            className="px-2 py-1 rounded hover:bg-slate-800 text-[11px]"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            <span className="text-xs font-mono">Loading PDF stream...</span>
          </div>
        ) : error ? (
          <div className="text-xs text-red-400">{error}</div>
        ) : (
          <div className="shadow-2xl rounded border border-slate-700/80 bg-white">
            <canvas ref={canvasRef} />
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 3. IMAGE VIEWER (PAN, ZOOM, ROTATE)
// ============================================================================
const ImageViewer: React.FC<{
  streamUrl: string;
  fileName: string;
}> = ({ streamUrl, fileName }) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const rotate = () => setRotation((r) => (r + 90) % 360);
  const zoomIn = () => setScale((s) => Math.min(5, s + 0.25));
  const zoomOut = () => setScale((s) => Math.max(0.2, s - 0.25));
  const reset = () => {
    setScale(1);
    setRotation(0);
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 select-none">
      <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-slate-800 bg-slate-900/60 text-slate-300 shrink-0">
        <button onClick={zoomOut} className="p-1.5 rounded hover:bg-slate-800" title="Zoom Out">
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono text-cyan-400">{Math.round(scale * 100)}%</span>
        <button onClick={zoomIn} className="p-1.5 rounded hover:bg-slate-800" title="Zoom In">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={rotate} className="p-1.5 rounded hover:bg-slate-800" title="Rotate 90°">
          <RotateIcon className="w-4 h-4" />
        </button>
        <button onClick={reset} className="px-2 py-1 rounded hover:bg-slate-800 text-xs text-slate-300">
          Reset
        </button>
      </div>

      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <img
          src={streamUrl}
          alt={fileName}
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transition: 'transform 0.15s ease-out',
          }}
          className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
        />
      </div>
    </div>
  );
};

// ============================================================================
// 4. AUDIO PLAYER
// ============================================================================
const AudioPlayer: React.FC<{
  streamUrl: string;
  fileName: string;
}> = ({ streamUrl, fileName }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 w-full max-w-md mx-auto">
      <div className="w-24 h-24 rounded-3xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mb-6 shadow-xl shadow-pink-500/10">
        <Play className="w-10 h-10 ml-1 fill-current" />
      </div>
      <h4 className="text-base font-semibold text-slate-200 mb-6 text-center truncate max-w-xs">{fileName}</h4>
      <audio controls src={streamUrl} autoPlay className="w-full rounded-xl" />
    </div>
  );
};

// ============================================================================
// 5. TEXT & CODE & MARKDOWN & CSV VIEWER
// ============================================================================
const TextViewer: React.FC<{
  fileId: string;
  fileName?: string;
  category: FileCategory;
  streamUrl?: string;
}> = ({ fileId, fileName: _fileName, category, streamUrl: _streamUrl }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isWrap, setIsWrap] = useState(true);
  const [viewMode, setViewMode] = useState<'raw' | 'rendered'>(category === 'markdown' ? 'rendered' : 'raw');

  useEffect(() => {
    invoke<string>('get_file_preview_text', { fileId, maxBytes: 512 * 1024 })
      .then((txt) => {
        setContent(txt);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load text preview:', err);
        setLoading(false);
      });
  }, [fileId]);

  const copyContent = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = content.split('\n');

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-200 select-text">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/60 shrink-0">
        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
          <span>{lines.length} lines</span>
          <span>•</span>
          <span>{content.length.toLocaleString()} chars</span>
        </div>

        <div className="flex items-center gap-2">
          {category === 'markdown' && (
            <button
              onClick={() => setViewMode(viewMode === 'raw' ? 'rendered' : 'raw')}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-medium"
            >
              {viewMode === 'raw' ? 'Render Markdown' : 'View Source'}
            </button>
          )}

          <button
            onClick={() => setIsWrap(!isWrap)}
            className={`p-1.5 rounded hover:bg-slate-800 transition ${isWrap ? 'text-cyan-400' : 'text-slate-400'}`}
            title="Toggle Word Wrap"
          >
            <WrapText className="w-4 h-4" />
          </button>

          <button
            onClick={copyContent}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
            title="Copy All"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
            <span>Loading text...</span>
          </div>
        ) : viewMode === 'rendered' && category === 'markdown' ? (
          <div className="prose prose-invert max-w-3xl mx-auto py-4 whitespace-pre-wrap font-sans">
            {content}
          </div>
        ) : (
          <div className="flex gap-4">
            {/* Line numbers */}
            <div className="text-slate-600 text-right select-none pr-2 border-r border-slate-800 shrink-0 font-mono">
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            {/* Text lines */}
            <pre className={`flex-1 overflow-x-auto text-slate-300 ${isWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}`}>
              {content}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 6. DOCX VIEWER (MAMMOTH CONVERTED)
// ============================================================================
const DocxViewer: React.FC<{
  streamUrl: string;
  fileName?: string;
  onDownload: () => void;
}> = ({ streamUrl, fileName: _fileName, onDownload }) => {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(streamUrl)
      .then((res) => res.arrayBuffer())
      .then((buf) => mammoth.convertToHtml({ arrayBuffer: buf }))
      .then((res) => {
        setHtml(res.value);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Docx render error:', err);
        setError(true);
        setLoading(false);
      });
  }, [streamUrl]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
        <FileText className="w-12 h-12 text-blue-400 mb-4" />
        <h4 className="text-base font-semibold text-slate-200 mb-2">Word Document Preview</h4>
        <p className="text-xs text-slate-400 mb-6">Download this document to view with formatting intact in Microsoft Word or LibreOffice.</p>
        <button
          onClick={onDownload}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-semibold text-sm shadow-lg shadow-cyan-500/20"
        >
          <Download className="w-4 h-4" />
          <span>Download Document</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto p-6 sm:p-10 bg-slate-900 select-text flex justify-center">
      {loading ? (
        <div className="flex items-center justify-center h-full gap-2 text-slate-400 font-mono text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
          <span>Converting document...</span>
        </div>
      ) : (
        <div
          className="w-full max-w-3xl bg-slate-950 p-8 rounded-xl border border-slate-800 shadow-xl prose prose-invert prose-cyan text-slate-200 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
};

// ============================================================================
// 7. GENERIC FILE / BINARY CARD
// ============================================================================
const GenericFileCard: React.FC<{
  file: FileRecord | FileItem;
  onDownload: () => void;
}> = ({ file, onDownload }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
      <div className="w-20 h-20 rounded-3xl bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center justify-center mb-6 shadow-xl shadow-cyan-500/5">
        <HardDrive className="w-10 h-10 text-cyan-400" />
      </div>

      <h4 className="text-lg font-bold text-slate-100 mb-1 truncate max-w-xs">{file.name}</h4>
      <p className="text-xs font-mono text-slate-400 mb-6">{file.mime_type || 'application/octet-stream'}</p>

      <div className="w-full grid grid-cols-2 gap-3 mb-6 text-left">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] font-mono uppercase text-slate-500">File Size</span>
          <p className="text-sm font-semibold text-slate-200">{formatBytes(file.total_size_bytes)}</p>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] font-mono uppercase text-slate-500">Telegram Chunks</span>
          <p className="text-sm font-semibold text-cyan-400">{file.total_chunks}</p>
        </div>
      </div>

      <button
        onClick={onDownload}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-cyan-500/20 active:scale-95"
      >
        <Download className="w-4 h-4" />
        <span>Download File ({formatBytes(file.total_size_bytes)})</span>
      </button>
    </div>
  );
};
