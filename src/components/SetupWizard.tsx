import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { TelegramDriveLogo } from './TelegramDriveLogo';
import {
  Key,
  Phone,
  AlertCircle,
  Loader2,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  KeyRound,
  Cloud,
  Bot,
} from 'lucide-react';
import {
  InitialCredentialsPayload,
  RequestCodeResponse,
  SignInResponse,
  StorageChannelInfo,
} from '../types/vfs';

interface SetupWizardProps {
  onComplete: () => void;
  initialStep?: 1 | 2 | 3;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete, initialStep = 1 }) => {
  const [step, setStep] = useState<1 | 2 | 3>(initialStep);

  // Form states
  const [apiId, setApiId] = useState<string>('');
  const [apiHash, setApiHash] = useState<string>('');
  const [phone, setPhone] = useState<string>('');

  // Auth flow states
  const [otpCode, setOtpCode] = useState<string>('');
  const [password2Fa, setPassword2Fa] = useState<string>('');
  const [isPasswordNeeded, setIsPasswordNeeded] = useState<boolean>(false);
  const [passwordHint, setPasswordHint] = useState<string | null>(null);
  const [codeRequested, setCodeRequested] = useState<boolean>(false);
  const [storageChannel, setStorageChannel] = useState<StorageChannelInfo | null>(null);

  // UI status
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Validation Helpers
  // ---------------------------------------------------------------------------
  const validateStep1 = (): boolean => {
    setError(null);
    const parsedId = parseInt(apiId.trim(), 10);
    if (isNaN(parsedId) || parsedId <= 0) {
      setError('Please enter a valid numeric Telegram API_ID.');
      return false;
    }
    if (apiHash.trim().length < 16) {
      setError('Please enter a valid 32-character Telegram API_HASH.');
      return false;
    }
    const cleanPhone = phone.trim();
    if (!cleanPhone.startsWith('+') || cleanPhone.length < 8) {
      setError('Please enter a valid phone number with international country code (e.g., +1234567890).');
      return false;
    }
    return true;
  };

  // ---------------------------------------------------------------------------
  // Step 1 Submission: Save credentials into Encrypted Keystore
  // ---------------------------------------------------------------------------
  const handleSaveCredentials = async () => {
    if (!validateStep1()) return;

    setError(null);
    setLoading(true);

    try {
      const parsedId = parseInt(apiId.trim(), 10);
      const payload: InitialCredentialsPayload = {
        api_id: parsedId,
        api_hash: apiHash.trim(),
        phone: phone.trim(),
        worker_bot_tokens: [],
      };

      await invoke('save_initial_credentials', { payload });
      setStep(2); // Proceed to OTP verification
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj?.message || 'Failed to save credentials into encrypted keystore.');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Step 2: MTProto OTP Request
  // ---------------------------------------------------------------------------
  const handleRequestCode = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await invoke<RequestCodeResponse>('request_login_code', {
        phone: phone.trim(),
      });
      if (res.code_sent) {
        setCodeRequested(true);
      } else {
        setError('Failed to request login code from Telegram.');
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj?.message || 'Network error while contacting Telegram MTProto gateway.');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Step 2 Submission: Submit OTP Code
  // ---------------------------------------------------------------------------
  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setError('Please enter the verification code sent to your Telegram account.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await invoke<SignInResponse>('submit_login_code', {
        code: otpCode.trim(),
      });

      if (res.password_required) {
        setIsPasswordNeeded(true);
        setPasswordHint(res.hint || null);
        return;
      }

      if (res.success) {
        // Automatically verify/provision user storage node channel & sync
        const channel = await invoke<StorageChannelInfo>('provision_channel');
        setStorageChannel(channel);
        try {
          // Automatically restore files, folders, and worker bots from cloud channel
          await invoke('pull_vfs_index', { force: true });
        } catch (e) {
          console.warn('Initial cloud sync pull:', e);
        }
        setStep(3);
      } else {
        setError('Authentication failed. Check your verification code.');
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj?.message || 'Error occurred while verifying code.');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Step 2 Submission: Submit 2FA Cloud Password
  // ---------------------------------------------------------------------------
  const handleSubmit2Fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password2Fa) {
      setError('Please enter your 2FA cloud password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await invoke<SignInResponse>('submit_password_2fa', {
        password: password2Fa,
      });

      if (res.success) {
        const channel = await invoke<StorageChannelInfo>('provision_channel');
        setStorageChannel(channel);
        try {
          // Automatically restore files, folders, and worker bots from cloud channel
          await invoke('pull_vfs_index', { force: true });
        } catch (e) {
          console.warn('Initial cloud sync pull:', e);
        }
        setStep(3);
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj?.message || 'Incorrect 2FA password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-3 sm:p-6 bg-gradient-to-br from-vault-950 via-vault-900 to-slate-950 text-slate-100 pt-safe pb-safe pl-safe pr-safe">
      <div className="w-full max-w-2xl bg-vault-900/90 border border-slate-800/80 rounded-2xl sm:rounded-3xl shadow-2xl backdrop-blur-xl flex flex-col max-h-[92vh] overflow-y-auto scrollbar-none animate-scaleUp">
        {/* Top Header */}
        <div className="p-4 sm:p-7 border-b border-slate-800/60 bg-gradient-to-r from-vault-850/80 to-vault-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <TelegramDriveLogo size="sm" showText subtitle="Unlimited Cloud Storage on MTProto" className="sm:hidden" />
          <TelegramDriveLogo size="md" showText subtitle="Decentralized Unlimited Cloud Storage on Telegram MTProto" animated className="hidden sm:flex" />

          {/* Stepper Indicator (3 Clean Steps) */}
          <div className="flex items-center space-x-2 text-xs font-semibold self-end sm:self-center">
            {[1, 2, 3].map((s, idx) => (
              <React.Fragment key={s}>
                <span
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs transition-all ${
                    step >= s
                      ? 'bg-cyan-500 text-vault-950 font-bold shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {s}
                </span>
                {idx < 2 && (
                  <div
                    className={`w-4 sm:w-5 h-0.5 ${step > s ? 'bg-cyan-500' : 'bg-slate-800'}`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div className="mx-4 sm:mx-8 mt-4 sm:mt-6 p-3.5 sm:p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs sm:text-sm flex items-start gap-3 animate-fadeIn">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-8 flex-1">
          {/* STEP 1: Telegram API Credentials */}
          {step === 1 && (
            <div className="space-y-4 sm:space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 shrink-0" />
                  <span>Telegram MTProto API Credentials</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  TeleCloud communicates directly with Telegram servers over high-speed MTProto binary sockets, enabling raw 2 GB uploads with flat RAM usage.
                </p>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span>
                  Don&apos;t have an API_ID and API_HASH yet? Get them free from Telegram.
                </span>
                <a
                  href="https://my.telegram.org"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition flex items-center justify-center gap-1 font-medium text-xs shrink-0 self-start sm:self-auto"
                >
                  my.telegram.org
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    Telegram API_ID
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 29384751"
                    value={apiId}
                    onChange={(e) => setApiId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-vault-850 border border-slate-700/80 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm text-white placeholder-slate-500 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    Telegram API_HASH
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="e.g. 7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c"
                    value={apiHash}
                    onChange={(e) => setApiHash(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-vault-850 border border-slate-700/80 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm text-white placeholder-slate-500 transition font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  Your Telegram Phone Number (International Format)
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="+1234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-vault-850 border border-slate-700/80 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm text-white placeholder-slate-500 transition"
                />
                <p className="text-[11px] text-slate-500">
                  Used in Step 2 to receive the Telegram login OTP code directly inside your Telegram app.
                </p>
              </div>

              <div className="pt-2 sm:pt-4 flex justify-end">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSaveCredentials}
                  className="w-full sm:w-auto px-6 py-3 sm:py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-vault-950 font-semibold text-sm transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving Credentials...
                    </>
                  ) : (
                    <>
                      Save & Proceed to Login
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: MTProto OTP Verification & 2FA */}
          {step === 2 && (
            <div className="space-y-4 sm:space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 shrink-0" />
                  <span>Telegram MTProto Authentication</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Authenticate your Telegram account over secure MTProto direct binary sockets.
                </p>
              </div>

              {!codeRequested ? (
                <div className="p-5 sm:p-6 rounded-2xl bg-vault-850 border border-slate-800 text-center space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Send Verification Code</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Telegram will send a login code directly to your Telegram app on{' '}
                      <span className="font-mono text-cyan-300">{phone}</span>.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleRequestCode}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-vault-950 font-bold text-xs transition shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Connecting to Telegram DC...
                        </span>
                      ) : (
                        'Send Code to Telegram'
                      )}
                    </button>
                  </div>
                </div>
              ) : isPasswordNeeded ? (
                // 2FA Password Form
                <form onSubmit={handleSubmit2Fa} className="space-y-4">
                  <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200">
                    <div className="font-semibold flex items-center gap-1.5 text-amber-300">
                      <KeyRound className="w-4 h-4 shrink-0" />
                      Two-Step Verification Active
                    </div>
                    <p className="mt-1 text-slate-300">
                      Your Telegram account has cloud password protection enabled.
                      {passwordHint && (
                        <span className="block mt-1 font-mono text-amber-300">
                          Password Hint: {passwordHint}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Enter 2FA Password
                    </label>
                    <input
                      type="password"
                      placeholder="Your Telegram cloud password"
                      value={password2Fa}
                      onChange={(e) => setPassword2Fa(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-vault-850 border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm text-white"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !password2Fa}
                    className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-vault-950 font-bold text-xs transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying Password & Provisioning Node...
                      </>
                    ) : (
                      'Verify 2FA & Provision Vault'
                    )}
                  </button>
                </form>
              ) : (
                // OTP Code Form
                <form onSubmit={handleSubmitCode} className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-300">
                        Enter Verification Code
                      </label>
                      <button
                        type="button"
                        onClick={handleRequestCode}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 py-1"
                      >
                        Resend Code
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. 12345"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-vault-850 border border-slate-700 focus:border-cyan-500 focus:outline-none text-center font-mono text-lg tracking-widest text-white"
                      autoFocus
                    />
                    <p className="text-[11px] text-slate-500 text-center">
                      Check your official Telegram app on your phone or desktop for the login code.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !otpCode.trim()}
                    className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-vault-950 font-bold text-xs transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Authorizing & Provisioning Storage Node...
                      </>
                    ) : (
                      'Confirm Code & Connect'
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* STEP 3: Vault Channel Provisioned */}
          {step === 3 && (
            <div className="text-center py-4 sm:py-6 space-y-4 sm:space-y-6 animate-fadeIn">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                <Cloud className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  TeleCloud Storage Node Active!
                </h2>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Your private storage channel <span className="font-mono text-cyan-300 font-semibold">&quot;TeleCloud_Vault_Node&quot;</span> has been verified and bound to your local encrypted SQLite VFS.
                </p>
              </div>

              {storageChannel && (
                <div className="max-w-xs mx-auto p-3.5 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left text-xs space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span>Node Channel:</span>
                    <span className="font-mono text-cyan-300 font-semibold">{storageChannel.title}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Channel ID:</span>
                    <span className="font-mono text-slate-200">{storageChannel.channel_id}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Status:</span>
                    <span className="text-emerald-400 font-medium">
                      {storageChannel.is_newly_created ? 'Newly Provisioned' : 'Linked Existing'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Protocol:</span>
                    <span className="text-cyan-400 font-medium">MTProto Socket Stream</span>
                  </div>
                </div>
              )}

              {/* Centralized Bot Info Note */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-slate-300 text-left space-y-1.5 max-w-md mx-auto">
                <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-cyan-400 shrink-0" />
                  Worker Bots Centralized in Settings
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  You can add and manage your 5 worker bots anytime under <span className="text-slate-200 font-semibold">Settings → Worker Bots</span> for high-speed multi-part uploads with zero rate limit interruptions.
                </p>
              </div>

              <button
                type="button"
                onClick={onComplete}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-vault-950 font-bold text-sm transition shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              >
                Enter TeleCloud
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
