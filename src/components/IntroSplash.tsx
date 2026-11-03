import React, { useEffect, useState } from 'react';
import { TelegramDriveLogo } from './TelegramDriveLogo';
import { ShieldCheck, Zap, ArrowRight, Bot } from 'lucide-react';

interface IntroSplashProps {
  onComplete: () => void;
  statusText?: string;
}

export const IntroSplash: React.FC<IntroSplashProps> = ({
  onComplete,
  statusText = 'Initializing TeleCloud...',
}) => {
  const [progress, setProgress] = useState<number>(15);
  const [stageText, setStageText] = useState<string>(statusText);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  useEffect(() => {
    // Stage 1: Local Keystore & Database
    const timer1 = setTimeout(() => {
      setProgress(45);
      setStageText('Mounting Encrypted SQLite VFS...');
    }, 250);

    // Stage 2: MTProto Sockets & Bot Pool
    const timer2 = setTimeout(() => {
      setProgress(80);
      setStageText('Connecting High-Speed MTProto Sockets...');
    }, 600);

    // Stage 3: Ready
    const timer3 = setTimeout(() => {
      setProgress(100);
      setStageText('TeleCloud Operational');
    }, 950);

    // Stage 4: Trigger Fade Out & Callback
    const timer4 = setTimeout(() => {
      setIsFadingOut(true);
    }, 1250);

    const timer5 = setTimeout(() => {
      onComplete();
    }, 1600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#06090e] text-slate-100 transition-all duration-400 select-none pt-safe pb-safe pl-safe pr-safe ${
        isFadingOut ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Ambient Cyber Grid & Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[25%] -left-[10%] w-[600px] h-[600px] rounded-full bg-cyan-600/15 blur-[140px] animate-pulse" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[650px] h-[650px] rounded-full bg-blue-600/15 blur-[150px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full bg-indigo-500/10 blur-[120px]" />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Main Glass Card (Tuned for fluid mobile screens) */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md p-5 sm:p-8 mx-3 sm:mx-4 max-h-[92vh] overflow-y-auto scrollbar-none rounded-2xl sm:rounded-3xl bg-vault-900/90 border border-slate-800/90 backdrop-blur-3xl shadow-2xl shadow-cyan-950/40 flex flex-col items-center text-center animate-scaleUp">
        {/* TeleCloud Logo */}
        <div className="mb-4 sm:mb-6 relative flex items-center justify-center">
          <TelegramDriveLogo size="lg" className="sm:hidden" />
          <TelegramDriveLogo size="xl" className="hidden sm:flex" />
        </div>

        {/* Brand Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-1.5">
          <span>Tele</span>
          <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
            Cloud
          </span>
        </h1>

        <p className="text-[11px] sm:text-xs text-slate-400 mt-1.5 sm:mt-2 tracking-wide max-w-xs leading-relaxed">
          Unlimited Decentralized Cloud Storage backed by Telegram MTProto Binary Sockets
        </p>

        {/* Highlights Pills */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-4 sm:mt-5 text-[9px] sm:text-[10px] font-mono text-slate-300 flex-wrap">
          <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center gap-1.5 shadow-sm">
            <ShieldCheck className="w-3 h-3 text-cyan-400 shrink-0" />
            Zero Intermediary
          </span>
          <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center gap-1.5 shadow-sm">
            <Bot className="w-3 h-3 text-cyan-400 shrink-0" />
            5-Bot Turbo Pool
          </span>
          <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center gap-1.5 shadow-sm">
            <Zap className="w-3 h-3 text-amber-400 shrink-0" />
            Flat &lt;35MB RAM
          </span>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full mt-5 sm:mt-7 space-y-2">
          <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden border border-slate-700/40">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-500 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(6,182,212,0.6)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 font-mono">
            <span className="truncate text-left text-cyan-300/90">{stageText}</span>
            <span className="font-bold text-slate-300 ml-2">{progress}%</span>
          </div>
        </div>

        {/* Skip Button */}
        <button
          onClick={onComplete}
          className="mt-5 sm:mt-6 text-[10px] sm:text-[11px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition group py-1 px-2 rounded-lg hover:bg-slate-800/40"
        >
          <span>Skip directly to Workspace</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
