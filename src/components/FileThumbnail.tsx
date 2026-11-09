import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FileItem } from '../types/vfs';
import { getFileCategory, FileCategory } from '../utils/fileTypes';
import {
  File,
  FileText,
  FileArchive,
  FileCode,
  FileVideo,
  FileAudio,
  FileImage,
  Play,
  Film,
  Loader2,
} from 'lucide-react';
import {
  requestThumbnailGeneration,
  getCachedThumbnail,
  cacheThumbnail,
  cancelThumbnailRequest,
} from '../utils/thumbnailQueue';
import { isAndroid } from '../hooks/useMobile';

interface FileThumbnailProps {
  file: FileItem;
  view?: 'grid' | 'list';
  className?: string;
}

export const FileThumbnail: React.FC<FileThumbnailProps> = ({
  file,
  view = 'grid',
  className = '',
}) => {
  const category = getFileCategory(file.name, file.mime_type);
  // Visual media formats eligible for thumbnail generation and display
  const isVisualMedia = category === 'image' || category === 'video' || (!isAndroid() && category === 'pdf');

  const [thumbSrc, setThumbSrc] = useState<string | null>(() => getCachedThumbnail(file.id) || null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(!thumbSrc && isVisualMedia);

  useEffect(() => {
    if (!isVisualMedia) return;

    const cached = getCachedThumbnail(file.id);
    if (cached) {
      setThumbSrc(cached);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadOrGenerate() {
      try {
        // 1. Direct IPC check: If thumbnail exists on disk, Rust returns base64 directly (0ms, 100% reliable on Android & Windows)
        const saved = await invoke<string | null>('get_file_thumbnail', { fileId: file.id });
        if (saved && isMounted) {
          cacheThumbnail(file.id, saved);
          setThumbSrc(saved);
          setIsLoading(false);
          return;
        }

        // 2. Otherwise request generation from stream
        const streamUrl = await invoke<string>('get_preview_stream_url', { fileId: file.id });
        if (!isMounted) return;

        const generated = await requestThumbnailGeneration(
          file.id,
          file.name,
          file.mime_type,
          streamUrl,
          file.total_size_bytes
        );
        if (isMounted) {
          if (generated) {
            setThumbSrc(generated);
          } else {
            setHasError(true);
          }
          setIsLoading(false);
        }
      } catch (_err) {
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    }

    loadOrGenerate();

    return () => {
      isMounted = false;
      cancelThumbnailRequest(file.id);
    };
  }, [file.id, file.name, file.mime_type, file.total_size_bytes, isVisualMedia]);

  // If not visual media or thumbnail failed, render standard category icon
  if (!isVisualMedia || (hasError && !thumbSrc)) {
    return <DefaultFileIcon category={category} name={file.name} view={view} className={className} />;
  }

  if (view === 'list') {
    return (
      <div className={`relative h-8 w-8 rounded-lg overflow-hidden shrink-0 border border-slate-700/60 bg-slate-800/80 flex items-center justify-center ${className}`}>
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={file.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-900/60">
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            ) : (
              <DefaultFileIcon category={category} name={file.name} view="list" />
            )}
          </div>
        )}
        {category === 'video' && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
            <Play className="w-2.5 h-2.5 text-white/90 fill-white/80" />
          </div>
        )}
        {category === 'pdf' && (
          <div className="absolute bottom-0 right-0 px-1 py-0.2 bg-red-600/90 text-[8px] font-bold text-white leading-none rounded-tl pointer-events-none">
            PDF
          </div>
        )}
      </div>
    );
  }

  // Grid view
  return (
    <div className={`relative w-full h-24 rounded-lg overflow-hidden border border-slate-800/80 bg-slate-950/60 flex items-center justify-center group-hover:border-slate-700 transition ${className}`}>
      {thumbSrc ? (
        <>
          <img
            src={thumbSrc}
            alt={file.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          {/* Subtle gradient vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/40">
          {isLoading ? (
            <div className="flex flex-col items-center gap-1.5 text-slate-500">
              <Loader2 className="w-5 h-5 text-cyan-400/80 animate-spin" />
              <span className="text-[10px] font-mono text-slate-500">Generating preview...</span>
            </div>
          ) : (
            <DefaultFileIcon category={category} name={file.name} view="grid" />
          )}
        </div>
      )}

      {/* Badges */}
      {category === 'video' && (
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-500/30 backdrop-blur-sm flex items-center gap-1 text-[10px] font-semibold text-purple-300 pointer-events-none">
          <Film className="w-2.5 h-2.5" />
          <span>VIDEO</span>
        </div>
      )}
      {category === 'pdf' && (
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-red-950/80 border border-red-500/30 backdrop-blur-sm text-[10px] font-bold text-red-300 pointer-events-none">
          PDF
        </div>
      )}
      {category === 'image' && (
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 backdrop-blur-sm text-[10px] font-semibold text-emerald-300 pointer-events-none">
          IMAGE
        </div>
      )}

      {/* Video Play Button Overlay */}
      {category === 'video' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition">
          <div className="w-8 h-8 rounded-full bg-cyan-500/80 hover:bg-cyan-400 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-500/20 transition-transform group-hover:scale-110">
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </div>
        </div>
      )}
    </div>
  );
};

export const DefaultFileIcon: React.FC<{
  category: FileCategory;
  name?: string;
  view?: 'grid' | 'list';
  className?: string;
}> = ({ category, name: _name, view = 'grid', className = '' }) => {
  const isGrid = view === 'grid';
  const iconSize = isGrid ? 'w-8 h-8' : 'w-4 h-4';

  switch (category) {
    case 'video':
      return (
        <div className={`rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 ${isGrid ? 'p-3' : 'p-1.5'} ${className}`}>
          <FileVideo className={iconSize} />
        </div>
      );
    case 'audio':
      return (
        <div className={`rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 ${isGrid ? 'p-3' : 'p-1.5'} ${className}`}>
          <FileAudio className={iconSize} />
        </div>
      );
    case 'image':
      return (
        <div className={`rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 ${isGrid ? 'p-3' : 'p-1.5'} ${className}`}>
          <FileImage className={iconSize} />
        </div>
      );
    case 'pdf':
      return (
        <div className={`rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 ${isGrid ? 'p-3' : 'p-1.5'} ${className}`}>
          <FileText className={iconSize} />
        </div>
      );
    case 'archive':
      return (
        <div className={`rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 ${isGrid ? 'p-3' : 'p-1.5'} ${className}`}>
          <FileArchive className={iconSize} />
        </div>
      );
    case 'code':
      return (
        <div className={`rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 ${isGrid ? 'p-3' : 'p-1.5'} ${className}`}>
          <FileCode className={iconSize} />
        </div>
      );
    case 'markdown':
    case 'document':
    case 'spreadsheet':
    case 'text':
      return (
        <div className={`rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 ${isGrid ? 'p-3' : 'p-1.5'} ${className}`}>
          <FileText className={iconSize} />
        </div>
      );
    default:
      return (
        <div className={`rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-400 ${isGrid ? 'p-3' : 'p-1.5'} ${className}`}>
          <File className={iconSize} />
        </div>
      );
  }
};
