import React from 'react';

interface TelegramDriveLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  subtitle?: string;
  animated?: boolean;
  className?: string;
}

export const TelegramDriveLogo: React.FC<TelegramDriveLogoProps> = ({
  size = 'md',
  showText = false,
  subtitle = 'Unlimited Cloud Storage',
  animated = false,
  className = '',
}) => {
  const sizeMap = {
    xs: { box: 'w-6 h-6', text: 'text-xs', sub: 'text-[9px]' },
    sm: { box: 'w-8 h-8', text: 'text-sm', sub: 'text-[10px]' },
    md: { box: 'w-10 h-10', text: 'text-base', sub: 'text-[11px]' },
    lg: { box: 'w-14 h-14', text: 'text-xl', sub: 'text-xs' },
    xl: { box: 'w-24 h-24', text: 'text-2xl', sub: 'text-sm' },
  };

  const current = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* TeleCloud Icon Mark */}
      <div
        className={`relative ${current.box} rounded-2xl flex items-center justify-center shrink-0 group ${
          animated ? 'hover:scale-105 transition-transform duration-300' : ''
        }`}
      >
        {/* Master User Logo Image */}
        <img
          src="/icon.png"
          alt="TeleCloud Logo"
          className="w-full h-full object-cover rounded-2xl"
        />
      </div>

      {/* Typography */}
      {showText && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-bold tracking-tight text-white font-sans ${current.text}`}>
              Tele
            </span>
            <span className={`font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent ${current.text}`}>
              Cloud
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              v1.1.3
            </span>
          </div>
          {subtitle && (
            <span className={`text-slate-400 font-mono tracking-wider uppercase mt-1 ${current.sub}`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
