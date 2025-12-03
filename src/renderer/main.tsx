import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/index.css';

// renderer entry point
// mounts the react app into the dom.

console.log('renderer process starting...');

try {
  const root = document.getElementById('root');
  if (!root) throw new Error('root element not found');

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
} catch (err) {
  console.error('failed to mount react app:', err);
  document.body.innerHTML = `<div style="color: red; padding: 20px;">failed to mount app: ${err}</div>`;
}
