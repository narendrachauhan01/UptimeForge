import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Safely monkey-patch classList.remove to prevent transition race conditions in dark theme
if (typeof window !== 'undefined') {
  const originalRemove = document.body.classList.remove;
  document.body.classList.remove = function(...args) {
    if (args.includes('charts-dark-theme')) {
      const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
      const currentTheme = match ? match[1] : 'dark';
      if (currentTheme === 'dark') {
        const otherArgs = args.filter(a => a !== 'charts-dark-theme');
        if (otherArgs.length > 0) {
          originalRemove.apply(this, otherArgs);
        }
        return;
      }
    }
    originalRemove.apply(this, args);
  };
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
