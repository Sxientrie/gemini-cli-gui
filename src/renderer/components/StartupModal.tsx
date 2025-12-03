import React from 'react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { GeminiStatus, AppError, AppErrorCode } from '../../shared/types';

// startup modal component
// displays initialization status and errors.

interface StartupModalProps {
  status: GeminiStatus;
  version: string | null;
  error: AppError | null;
}

export function StartupModal({ status, version, error }: StartupModalProps) {
  // don't render anything if we are ready or active
  if (status === 'ready' || status === 'active') return null;

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
      <div className="max-w-md w-full flex flex-col items-center text-center space-y-6">
        
        {/* logo / icon area */}
        <div className="relative">
          <div className={clsx(
            "w-24 h-24 rounded-2xl flex items-center justify-center transition-colors duration-500",
            status === 'error' ? "bg-red-500/10" : "bg-zinc-900"
          )}>
            {status === 'checking' && (
              <Loader2 className="w-12 h-12 text-zinc-400 animate-spin" />
            )}
            {status === 'error' && (
              <AlertTriangle className="w-12 h-12 text-red-500" />
            )}
          </div>
          
          {/* glow effect */}
          <div className={clsx(
            "absolute inset-0 blur-2xl -z-10 transition-opacity duration-1000",
            status === 'checking' ? "bg-zinc-500/10 opacity-50" : 
            status === 'error' ? "bg-red-500/20 opacity-50" : "opacity-0"
          )} />
        </div>

        {/* text content */}
        <div className="space-y-2">
          <h1 className="text-xl font-medium tracking-tight text-zinc-200">
            {status === 'checking' ? 'Initializing...' : (
              error?.code === AppErrorCode.AUTH_FAILED ? 'Authentication Failed' :
              error?.code === AppErrorCode.CLI_NOT_FOUND ? 'CLI Not Found' :
              error?.code === AppErrorCode.RATE_LIMITED ? 'Rate Limited' :
              'Connection Failed'
            )}
          </h1>
          <p className="text-zinc-500 text-sm">
            {status === 'checking' 
              ? 'Verifying Gemini CLI installation and environment configuration.' 
              : (error?.message || 'The Gemini CLI could not be found or failed to start.')}
          </p>
          {version && (
             <p className="text-xs font-mono text-zinc-600 pt-2">
               v{version}
             </p>
          )}
        </div>

        {/* actions */}
        {status === 'error' && (
          <div className="pt-4">
             {error?.code === AppErrorCode.CLI_NOT_FOUND && (
               <p className="text-xs text-zinc-600 mb-4 bg-zinc-900/50 p-3 rounded border border-zinc-800 font-mono">
                  npm install -g @google/gemini-cli
               </p>
             )}
             <button 
               onClick={() => window.location.reload()}
               className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg hover:bg-zinc-200 transition-colors font-medium text-sm"
             >
               <RefreshCw size={16} />
               Retry Connection
             </button>
          </div>
        )}
      </div>
      
      {/* footer */}
      <div className="absolute bottom-8 text-zinc-700 text-xs font-mono">
        GEMINI ELECTRON GUI v0.1.0
      </div>
    </div>
  );
}
