import React, { useState, useEffect } from 'react';
import {
  submitFeedback,
  getClientMetadata,
  getFeedbackRelayUrl,
  setFeedbackRelayUrl,
  isRelayUrlConfigured,
  DEFAULT_FEEDBACK_RELAY_URL,
  FeedbackCategory,
  ClientMetadata,
  FeedbackResponse,
} from '../services/feedbackService';
import {
  X,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Bug,
  MessageCircle,
  Zap,
  HelpCircle,
  Sliders,
  Mail,
  Laptop,
} from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: {
  id: FeedbackCategory;
  label: string;
  icon: React.ReactNode;
  placeholderSubject: string;
  placeholderMessage: string;
}[] = [
  {
    id: 'feature',
    label: 'Feature Request',
    icon: <Lightbulb className="w-3.5 h-3.5 text-amber-400" />,
    placeholderSubject: 'e.g. Add dark/light mode toggle or file search filter',
    placeholderMessage: 'Explain the feature you would love to see, why it would be helpful, and how you imagine it working...',
  },
  {
    id: 'bug',
    label: 'Bug Report',
    icon: <Bug className="w-3.5 h-3.5 text-rose-400" />,
    placeholderSubject: 'e.g. Upload paused unexpectedly at chunk 4',
    placeholderMessage: 'What were you doing when the bug occurred? What did you expect to happen versus what actually happened?',
  },
  {
    id: 'feedback',
    label: 'General Feedback',
    icon: <MessageCircle className="w-3.5 h-3.5 text-cyan-400" />,
    placeholderSubject: 'e.g. My thoughts after 1 week of using TeleCloud',
    placeholderMessage: 'Tell us about your experience using TeleCloud, what you enjoy, or what felt confusing or rough...',
  },
  {
    id: 'performance',
    label: 'Performance / Sync',
    icon: <Zap className="w-3.5 h-3.5 text-indigo-400" />,
    placeholderSubject: 'e.g. Directory listing sync latency with 10k files',
    placeholderMessage: 'Describe any performance bottlenecks, slow downloads/uploads, or cloud synchronization issues you noticed...',
  },
  {
    id: 'question',
    label: 'Question',
    icon: <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />,
    placeholderSubject: 'e.g. How does virtual chunk slicing protect privacy?',
    placeholderMessage: 'Ask any question about using TeleCloud, bot pools, or MTProto channel configurations...',
  },
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [category, setCategory] = useState<FeedbackCategory>('feedback');
  const [topic, setTopic] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState<boolean>(true);
  const [showDiagnosticsPreview, setShowDiagnosticsPreview] = useState<boolean>(false);

  // Relay Configuration toggle & input
  const [relayUrl, setRelayUrl] = useState<string>('');
  const [showRelaySettings, setShowRelaySettings] = useState<boolean>(false);
  const [customRelayInput, setCustomRelayInput] = useState<string>('');

  // Submission State
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<FeedbackResponse | null>(null);

  // Diagnostics preview data
  const [diagnostics, setDiagnostics] = useState<ClientMetadata | null>(null);

  useEffect(() => {
    if (isOpen) {
      const activeUrl = getFeedbackRelayUrl();
      setRelayUrl(activeUrl);
      setCustomRelayInput(activeUrl);
      setDiagnostics(getClientMetadata());
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeCategory = CATEGORIES.find((c) => c.id === category) || CATEGORIES[2];

  const handleSaveRelayUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackRelayUrl(customRelayInput.trim());
    const updated = getFeedbackRelayUrl();
    setRelayUrl(updated);
    setCustomRelayInput(updated);
    setShowRelaySettings(false);
    setError(null);
  };

  const handleResetDefaultRelay = () => {
    setFeedbackRelayUrl(null);
    const updated = getFeedbackRelayUrl();
    setRelayUrl(updated);
    setCustomRelayInput(updated);
    setShowRelaySettings(false);
    setError(null);
  };

  const handleResetForm = () => {
    setMessage('');
    setTopic('');
    setEmail('');
    setError(null);
    setSuccessResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedMsg = message.trim();
    if (!trimmedMsg) {
      setError('Please provide feedback or a message before submitting.');
      return;
    }
    if (trimmedMsg.length < 5) {
      setError('Feedback message must be at least 5 characters long.');
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address or leave the field blank.');
      return;
    }

    setLoading(true);

    try {
      const response = await submitFeedback({
        topic: topic.trim() || undefined,
        message: trimmedMsg,
        email: email.trim() || undefined,
        category,
        includeDiagnostics,
      });

      setSuccessResult(response);
    } catch (err: any) {
      console.error('Feedback submission failed:', err);
      setError(err?.message || 'Failed to submit feedback. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-2xl max-h-[92vh] bg-vault-900 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden animate-scaleUp">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-vault-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Feedback & Comments
                </h2>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  GitHub Issue Relay
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Send feedback, feature ideas, or bug reports straight to the developers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-300 text-xs">
          {/* SUCCESS STATE */}
          {successResult ? (
            <div className="py-8 sm:py-12 flex flex-col items-center text-center space-y-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20 animate-scaleUp">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1.5 max-w-md">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Thank You for Your Feedback!
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your feedback was securely relayed and created as a new issue on GitHub under the{' '}
                  <span className="font-mono text-cyan-300 font-semibold">user-feedback</span> label.
                </p>
              </div>

              {successResult.issue_url && (
                <a
                  href={successResult.issue_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 border border-slate-700 text-xs font-semibold shadow transition"
                >
                  <span>View Issue #{successResult.issue_number || ''} on GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              <div className="pt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                >
                  Send Another Feedback
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 transition"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Unconfigured Relay Warning & Quick Setup */}
              {!isRelayUrlConfigured() && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <div className="font-bold text-amber-300 flex items-center justify-between">
                        <span>Relay Worker URL Not Configured</span>
                        <button
                          type="button"
                          onClick={() => setShowRelaySettings(!showRelaySettings)}
                          className="text-[11px] underline text-amber-400 hover:text-amber-300 font-normal"
                        >
                          {showRelaySettings ? 'Hide Config' : 'Configure Relay URL'}
                        </button>
                      </div>
                      <p className="text-[11px] text-amber-200/80 leading-relaxed">
                        To forward submissions to GitHub, deploy the included Cloudflare Worker in{' '}
                        <code className="text-amber-300 font-mono">feedback-relay-worker/</code> and set{' '}
                        <code className="text-amber-300 font-mono">VITE_FEEDBACK_RELAY_URL</code> or enter the URL below.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Collapsible Relay Settings Drawer */}
              {showRelaySettings && (
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-xs flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      Custom Feedback Relay Endpoint
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowRelaySettings(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={customRelayInput}
                      onChange={(e) => setCustomRelayInput(e.target.value)}
                      placeholder={DEFAULT_FEEDBACK_RELAY_URL}
                      className="flex-1 bg-vault-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleSaveRelayUrl}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"
                    >
                      Save
                    </button>
                    {relayUrl !== DEFAULT_FEEDBACK_RELAY_URL && (
                      <button
                        type="button"
                        onClick={handleResetDefaultRelay}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
                        title="Reset to default official relay"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>Saved in local client storage.</span>
                    <span className="font-mono text-cyan-400 truncate max-w-[220px]">
                      {relayUrl ? `Active: ${relayUrl}` : 'No relay URL configured'}
                    </span>
                  </div>
                </div>
              )}

              {/* Category Chips */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  What kind of feedback is this?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all text-left ${
                        category === cat.id
                          ? 'bg-cyan-500/15 border-cyan-500/50 text-white shadow-sm shadow-cyan-500/10'
                          : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`}
                    >
                      {cat.icon}
                      <span className="truncate">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic / Subject (Optional) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="feedback-topic" className="block text-xs font-semibold text-slate-300">
                    Topic / Subject <span className="text-slate-500 font-normal">(optional)</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-500">{topic.length}/100</span>
                </div>
                <input
                  id="feedback-topic"
                  type="text"
                  maxLength={100}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={activeCategory.placeholderSubject}
                  className="w-full bg-vault-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40 transition"
                />
              </div>

              {/* Feedback Message (Required) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="feedback-message" className="block text-xs font-semibold text-slate-300">
                    Message / Feedback <span className="text-cyan-400">*</span>
                  </label>
                  <span
                    className={`text-[10px] font-mono ${
                      message.length > 4000 ? 'text-amber-400' : 'text-slate-500'
                    }`}
                  >
                    {message.length} / 5000
                  </span>
                </div>
                <textarea
                  id="feedback-message"
                  required
                  rows={5}
                  maxLength={5000}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={activeCategory.placeholderMessage}
                  className="w-full bg-vault-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40 transition resize-y leading-relaxed"
                />
              </div>

              {/* Email Address (Optional) */}
              <div className="space-y-1.5">
                <label htmlFor="feedback-email" className="block text-xs font-semibold text-slate-300">
                  Email Address <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="feedback-email"
                    type="email"
                    maxLength={150}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com (if you'd like a response or follow-up)"
                    className="w-full bg-vault-950/80 border border-slate-700/80 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40 transition"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  We will never share your email address. It will only be visible in the repository issue for follow-ups.
                </p>
              </div>

              {/* Privacy & System Diagnostics Checkbox */}
              <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeDiagnostics}
                      onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-cyan-500/30 w-3.5 h-3.5"
                    />
                    <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Laptop className="w-3.5 h-3.5 text-cyan-400" />
                      Include Client Diagnostics
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowDiagnosticsPreview(!showDiagnosticsPreview)}
                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <span>{showDiagnosticsPreview ? 'Hide Details' : 'Preview Metadata'}</span>
                    {showDiagnosticsPreview ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {showDiagnosticsPreview && diagnostics && (
                  <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 animate-fadeIn">
                    <div>
                      <span className="text-slate-500">App Version:</span> {diagnostics.appVersion}
                    </div>
                    <div>
                      <span className="text-slate-500">Platform:</span> {diagnostics.platform}
                    </div>
                    <div>
                      <span className="text-slate-500">OS:</span> {diagnostics.os} ({diagnostics.arch})
                    </div>
                    <div>
                      <span className="text-slate-500">Display:</span> {diagnostics.screen}
                    </div>
                    <div className="col-span-2 text-[9px] text-slate-500 font-sans flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                      No personal credentials, keys, or file contents are ever transmitted.
                    </div>
                  </div>
                )}
              </div>

              {/* ERROR STATE */}
              {error && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="font-semibold text-red-300">Unable to submit feedback</div>
                    <p className="text-[11px] leading-relaxed text-red-200/90">{error}</p>
                    {!isRelayUrlConfigured() && (
                      <button
                        type="button"
                        onClick={() => setShowRelaySettings(true)}
                        className="text-[10px] underline text-cyan-300 hover:text-cyan-200"
                      >
                        Click here to configure relay endpoint URL
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowRelaySettings(!showRelaySettings)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition text-[11px] flex items-center gap-1"
                  title="Configure Relay Endpoint"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Relay Settings</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="px-4 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/60 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={loading || !message.trim()}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending to Relay...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Feedback</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
