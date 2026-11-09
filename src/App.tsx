import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { SetupWizard } from './components/SetupWizard';
import { SettingsModal } from './components/SettingsModal';
import { FeedbackModal } from './components/FeedbackModal';
import { FileExplorer } from './components/FileExplorer';
import { TransferDrawer } from './components/TransferDrawer';
import { IntroSplash } from './components/IntroSplash';
import { UpdateModal } from './components/UpdateModal';
import { checkForUpdate, UpdateCheckResult } from './services/updateService';
import { useVFSStore } from './store/vfsStore';
import { SetupStatus, TelegramUserProfile } from './types/vfs';

export const App: React.FC = () => {
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [profile, setProfile] = useState<TelegramUserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [feedbackOpen, setFeedbackOpen] = useState<boolean>(false);
  const [availableUpdate, setAvailableUpdate] = useState<UpdateCheckResult | null>(null);
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    return !sessionStorage.getItem('telegram_drive_intro_shown');
  });

  const setCurrentFolder = useVFSStore((state) => state.setCurrentFolder);
  const initEventListener = useVFSStore((state) => state.initEventListener);

  const fetchStatus = async (isInitial: boolean = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      }

      // 1. Instant local keystore & session status check (< 5ms)
      const status = await invoke<SetupStatus>('check_setup_status');
      setSetupStatus(status);

      if (status.is_configured && status.has_session) {
        // 2. Immediately load local SQLite directory root without waiting for network calls
        await setCurrentFolder(null);

        // 3. Mark app as loaded immediately to eliminate any perceived UI lag!
        setLoading(false);

        // 4. Non-blocking background fetch for user profile
        invoke<TelegramUserProfile>('get_telegram_me')
          .then((user) => setProfile(user))
          .catch((e) => console.warn('Could not fetch user profile:', e));

        // 5. Non-blocking background sync with Telegram Cloud Channel
        invoke<boolean>('pull_vfs_index', { force: false })
          .then((updated) => {
            if (updated) {
              // Silently refresh current directory if remote cloud had newer files/bots
              useVFSStore.getState().loadDirectory();
            }
          })
          .catch((e) => console.warn('Auto cloud sync pull notice:', e));
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to load setup status:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reveal window smoothly once the dark UI frame has painted (eliminates any white flash)
    requestAnimationFrame(() => {
      invoke('show_main_window').catch(() => {});
    });

    fetchStatus(true);

    // Initialize Tauri transfer progress listener
    let disposed = false;
    let unlistenFn: (() => void) | undefined;
    initEventListener()
      .then((unlisten) => {
        if (disposed) {
          unlisten();
        } else {
          unlistenFn = unlisten;
        }
      })
      .catch((err) => {
        console.error('Failed to initialize transfer progress listener:', err);
      });

    // Listen for real-time cloud VFS sync changes from other devices or local mutations
    let unlistenVfs: (() => void) | undefined;
    listen('vfs-changed', () => {
      console.log('Real-time sync: VFS index updated, refreshing directory view...');
      useVFSStore.getState().loadDirectory();
    }).then((unlisten) => {
      if (disposed) {
        unlisten();
      } else {
        unlistenVfs = unlisten;
      }
    }).catch((e) => console.warn('vfs-changed listener registration notice:', e));

    // Non-blocking auto update check on launch (honors user preferences)
    let updateTimer: ReturnType<typeof setTimeout> | undefined;
    const autoUpdateEnabled = localStorage.getItem('telecloud_auto_update_check') !== 'false';
    if (autoUpdateEnabled) {
      updateTimer = setTimeout(() => {
        handleCheckUpdates(false);
      }, 3500);
    }

    return () => {
      disposed = true;
      if (unlistenFn) {
        unlistenFn();
      }
      if (unlistenVfs) {
        unlistenVfs();
      }
      if (updateTimer) {
        clearTimeout(updateTimer);
      }
    };
  }, []);

  const handleCheckUpdates = async (manual = true) => {
    try {
      const res = await checkForUpdate('1.2.3');
      if (res.updateAvailable) {
        setAvailableUpdate(res);
      } else if (manual) {
        alert('You are already running the latest version of TeleCloud (v1.2.3)!');
      }
    } catch (err: unknown) {
      console.error('Update check failed:', err);
      if (manual) {
        const msg = err instanceof Error ? err.message : String(err);
        alert(`Could not check for updates: ${msg}`);
      }
    }
  };

  const handleWipeVault = async () => {
    if (confirm('Are you sure you want to wipe credentials and reset setup?')) {
      await invoke('wipe_vault');
      fetchStatus(true);
    }
  };

  const handleIntroComplete = () => {
    sessionStorage.setItem('telegram_drive_intro_shown', 'true');
    setShowIntro(false);
  };

  // Render Splash Animation if not yet dismissed for this session
  if (showIntro) {
    return <IntroSplash onComplete={handleIntroComplete} />;
  }

  // Fast skeleton / subtle loader if still checking initial state
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#06090e] text-slate-100">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center">
            <span className="w-4 h-4 rounded-full bg-cyan-400 animate-ping" />
          </div>
          <span className="text-xs font-mono text-cyan-300 tracking-wider">
            Loading TeleCloud...
          </span>
        </div>
      </div>
    );
  }

  // If not configured, render Setup Wizard at Step 1
  if (!setupStatus || !setupStatus.is_configured) {
    return <SetupWizard onComplete={() => fetchStatus(false)} initialStep={1} />;
  }

  // If configured with API keys but not yet authenticated over MTProto OTP
  if (!setupStatus.has_session) {
    return <SetupWizard onComplete={() => fetchStatus(false)} initialStep={2} />;
  }

  // Authenticated Operational State with High-Class Glassmorphic UI
  return (
    <div className="h-full w-full min-h-0 min-w-0 overflow-hidden bg-[#06090e] text-slate-100 flex flex-col font-sans relative">
      <FileExplorer
        setupStatus={setupStatus}
        profile={profile}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenFeedback={() => setFeedbackOpen(true)}
        onWipeVault={handleWipeVault}
        onRefreshStatus={() => fetchStatus(false)}
        onCheckUpdates={() => handleCheckUpdates(true)}
      />

      {/* Floating Transfer Drawer */}
      <TransferDrawer />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenFeedback={() => {
          setSettingsOpen(false);
          setFeedbackOpen(true);
        }}
        onBotsUpdated={() => fetchStatus(false)}
        onCheckUpdates={() => handleCheckUpdates(true)}
      />

      {/* Feedback & Bug Report Modal */}
      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />

      {/* User-Permitted Auto-Update Modal */}
      {availableUpdate && (
        <UpdateModal
          updateInfo={availableUpdate}
          onClose={() => setAvailableUpdate(null)}
        />
      )}
    </div>
  );
};

export default App;
