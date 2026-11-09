import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[TeleCloud ErrorBoundary] Caught unhandled React error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-cyan-500 selection:text-slate-950 font-sans">
          <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur text-center flex flex-col items-center animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/10">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-lg font-bold text-slate-100 mb-1">
              Application Error
            </h2>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              TeleCloud encountered an unexpected rendering error. You can reload the app to resume your session safely.
            </p>

            {this.state.error && (
              <div className="w-full text-left bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 mb-5 text-[11px] font-mono text-rose-300 overflow-x-auto max-h-36">
                <p className="font-semibold text-rose-400 mb-1">Error Message:</p>
                <p className="break-all">{this.state.error.message || String(this.state.error)}</p>
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
