import React, { useState, useEffect } from 'react';
import { Key, ExternalLink, Loader2, AlertCircle } from 'lucide-react';


interface AuthModalProps {
  isOpen: boolean;
  onAuthenticated: () => void;
  onCancel?: () => void;
  canCancel?: boolean;
}

export function AuthModal({ isOpen, onAuthenticated, onCancel, canCancel = false }: AuthModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await window.api.auth.saveKey(apiKey.trim());
      
      if (result.success) {
        setApiKey('');
        onAuthenticated();
      } else {
        setError(result.error || 'Failed to save API key');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/90 shadow-2xl backdrop-blur-xl">
        <div className="border-b border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-400">
              <Key size={20} />
            </div>
            <div>
              <h2 className="text-lg font-medium text-zinc-100">Authentication Required</h2>
              <p className="text-sm text-zinc-400">Enter your Gemini API key to continue</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-3 rounded-md border border-red-900/50 bg-red-900/20 p-3 text-sm text-red-200">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="apiKey" className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
                Gemini API Key
              </label>
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-700"
                autoFocus
              />
            </div>

            <div className="rounded-md bg-zinc-800/50 p-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-zinc-400">
                  <ExternalLink size={16} />
                </div>
                <div className="text-sm">
                  <p className="text-zinc-300">Don't have an API key?</p>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-zinc-400 underline decoration-zinc-600 underline-offset-2 hover:text-zinc-200"
                  >
                    Get one from Google AI Studio
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              {canCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-md px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {isSubmitting ? 'Saving...' : 'Save API Key'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
