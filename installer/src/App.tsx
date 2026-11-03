import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  Folder, 
  Minus, 
  X, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  HardDrive, 
  AlertCircle,
  Sparkles,
  Rocket
} from "lucide-react";

type InstallStep = "configure" | "installing" | "complete" | "error";

export default function App() {
  const [step, setStep] = useState<InstallStep>("configure");
  const [installPath, setInstallPath] = useState("C:\\Program Files\\TeleCloud");
  const [createDesktopShortcut, setCreateDesktopShortcut] = useState(true);
  const [createStartMenuShortcut, setCreateStartMenuShortcut] = useState(true);
  const [launchAfterInstall, setLaunchAfterInstall] = useState(true);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Ready to install");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // Reveal window smoothly as soon as the dark UI frame has painted (eliminates blank window)
    requestAnimationFrame(() => {
      invoke("show_installer_window").catch(() => {});
    });

    // Query default install path from backend
    invoke<string>("get_default_target_dir")
      .then((path) => {
        if (path) setInstallPath(path);
      })
      .catch((err) => {
        console.warn("Could not fetch default target dir:", err);
      });
  }, []);

  const handleMinimize = () => {
    invoke("minimize_installer").catch(() => {});
  };

  const handleClose = () => {
    invoke("close_installer").catch(() => {});
  };

  const handleBrowseFolder = async () => {
    try {
      const selected = await invoke<string | null>("select_folder_dialog", { currentPath: installPath });
      if (selected) {
        setInstallPath(selected);
      }
    } catch (e) {
      console.warn("Directory dialog error:", e);
    }
  };

  const startInstallation = async () => {
    setStep("installing");
    setProgress(5);
    setStatusText("Verifying system permissions & directory...");

    try {
      // Step 1: Pre-check & prep
      await new Promise((r) => setTimeout(r, 400));
      setProgress(20);
      setStatusText("Preparing target directory in Program Files...");

      // Step 2: Invoke native Rust extraction & setup
      await new Promise((r) => setTimeout(r, 400));
      setProgress(40);
      setStatusText("Extracting TeleCloud core binaries & assets...");

      await invoke("perform_install", {
        targetDir: installPath,
        createDesktop: createDesktopShortcut,
        createStartMenu: createStartMenuShortcut,
      });

      setProgress(75);
      setStatusText("Creating Start Menu and Desktop shortcuts...");
      await new Promise((r) => setTimeout(r, 450));

      setProgress(90);
      setStatusText("Registering authentic Windows system keys (HKLM)...");
      await new Promise((r) => setTimeout(r, 400));

      setProgress(100);
      setStatusText("Installation completed successfully!");
      await new Promise((r) => setTimeout(r, 300));

      setStep("complete");
    } catch (err: any) {
      console.error("Installation failed:", err);
      setErrorMessage(typeof err === "string" ? err : err?.message || "Failed to complete installation");
      setStep("error");
    }
  };

  const handleLaunchApp = async () => {
    try {
      await invoke("launch_installed_app", { targetDir: installPath });
      handleClose();
    } catch (err) {
      console.error("Failed to launch app:", err);
      handleClose();
    }
  };

  return (
    <div className="relative flex flex-col w-[640px] h-[440px] rounded-2xl overflow-hidden bg-vault-950/95 border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.18)] select-none text-slate-100">
      
      {/* Draggable Custom Frameless Titlebar */}
      <div 
        data-tauri-drag-region 
        className="h-10 flex items-center justify-between px-4 bg-vault-900/80 border-b border-cyan-950/60 cursor-grab active:cursor-grabbing z-50"
      >
        <div className="flex items-center space-x-2 pointer-events-none">
          <img src="/logo.png" alt="Icon" className="w-5 h-5 object-contain" />
          <span className="text-xs font-semibold tracking-wide text-cyan-400">TeleCloud Setup</span>
          <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-vault-800 border border-slate-800">v1.0.0</span>
        </div>

        <div className="flex items-center space-x-1">
          <button 
            onClick={handleMinimize} 
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-vault-800 transition-colors"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={handleClose} 
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative flex-1 flex flex-col p-6 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* STEP 1: CONFIGURE */}
        {step === "configure" && (
          <div className="flex-1 flex flex-col justify-between animate-fadeIn">
            {/* Header / Branding */}
            <div className="flex items-center space-x-4">
              <div className="relative w-16 h-16 flex-shrink-0 animate-floatSlow">
                <img 
                  src="/logo.png" 
                  alt="TeleCloud Logo" 
                  className="w-full h-full object-contain animate-pulseGlow" 
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400">
                  Install TeleCloud
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Unlimited, encrypted cloud storage powered by Telegram MTProto.
                </p>
              </div>
            </div>

            {/* Installation Directory Selector */}
            <div className="mt-4 p-3.5 rounded-xl bg-vault-900/90 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-medium flex items-center space-x-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Installation Directory</span>
                </span>
                <span className="text-[11px] text-cyan-400/90 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Admin Elevation (Program Files)</span>
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={installPath}
                  onChange={(e) => setInstallPath(e.target.value)}
                  className="flex-1 bg-vault-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
                />
                <button
                  type="button"
                  onClick={handleBrowseFolder}
                  className="px-3 py-1.5 bg-vault-800 hover:bg-vault-700 border border-slate-700 rounded-lg text-xs text-slate-300 hover:text-white flex items-center space-x-1.5 transition-colors"
                >
                  <Folder className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Browse</span>
                </button>
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
              <label className="flex items-center space-x-2 p-2 rounded-lg bg-vault-900/40 border border-slate-800/60 cursor-pointer hover:bg-vault-900/80 transition-colors">
                <input
                  type="checkbox"
                  checked={createDesktopShortcut}
                  onChange={(e) => setCreateDesktopShortcut(e.target.checked)}
                  className="rounded border-slate-700 bg-vault-950 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span>Create Desktop Shortcut</span>
              </label>

              <label className="flex items-center space-x-2 p-2 rounded-lg bg-vault-900/40 border border-slate-800/60 cursor-pointer hover:bg-vault-900/80 transition-colors">
                <input
                  type="checkbox"
                  checked={createStartMenuShortcut}
                  onChange={(e) => setCreateStartMenuShortcut(e.target.checked)}
                  className="rounded border-slate-700 bg-vault-950 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span>Add to Start Menu</span>
              </label>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800/70">
              <div className="text-[11px] text-slate-400">
                Space required: <span className="text-cyan-400 font-medium">~35 MB</span>
              </div>

              <button
                type="button"
                onClick={startInstallation}
                className="group relative px-6 py-2.5 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_28px_rgba(6,182,212,0.6)] flex items-center space-x-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Install TeleCloud</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: INSTALLING */}
        {step === "installing" && (
          <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6 animate-fadeIn px-6">
            <div className="relative w-20 h-20 animate-floatSlow">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="w-full h-full object-contain animate-pulseGlow" 
              />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center justify-center space-x-2">
                <span>Installing TeleCloud...</span>
                <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
              </h2>
              <p className="text-xs text-cyan-400/80 font-mono">{statusText}</p>
            </div>

            {/* Sleek Neon Progress Bar */}
            <div className="w-full space-y-2">
              <div className="relative w-full h-3 bg-vault-900 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-500 transition-all duration-300 rounded-full relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-shimmer" />
                </div>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Extracting & Configuring</span>
                <span className="text-cyan-400 font-semibold">{progress}%</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: COMPLETE */}
        {step === "complete" && (
          <div className="flex-1 flex flex-col justify-between animate-fadeIn text-center">
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3)] animate-scaleUp">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-sky-300">
                  Installation Complete!
                </h2>
                <p className="text-xs text-slate-400 max-w-sm">
                  TeleCloud has been installed to <span className="text-slate-200 font-mono text-[11px]">{installPath}</span> with full administrative system integration.
                </p>
              </div>

              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={launchAfterInstall}
                  onChange={(e) => setLaunchAfterInstall(e.target.checked)}
                  className="rounded border-slate-700 bg-vault-950 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span>Launch TeleCloud now</span>
              </label>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800/70">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-vault-800 hover:bg-vault-700 text-xs text-slate-300 hover:text-white rounded-xl transition-colors"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  if (launchAfterInstall) {
                    handleLaunchApp();
                  } else {
                    handleClose();
                  }
                }}
                className="px-6 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center space-x-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Rocket className="w-3.5 h-3.5" />
                <span>Finish</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: ERROR */}
        {step === "error" && (
          <div className="flex-1 flex flex-col justify-between animate-fadeIn text-center">
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/40 flex items-center justify-center text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.3)] animate-scaleUp">
                <AlertCircle className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-bold text-red-400">Installation Failed</h2>
                <p className="text-xs text-slate-400 max-w-md bg-vault-900 p-2.5 rounded-lg border border-red-900/30 text-left font-mono">
                  {errorMessage}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800/70">
              <button
                type="button"
                onClick={() => setStep("configure")}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-xs text-white font-medium rounded-xl transition-colors"
              >
                Back & Retry
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-vault-800 hover:bg-vault-700 text-xs text-slate-300 hover:text-white rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
