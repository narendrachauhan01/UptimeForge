import React, { useEffect, useState, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { API_URL } from '../api';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const gb = bytes / (1024 ** 3);
  if (gb >= 1) return gb.toFixed(1) + ' GB';
  return (bytes / (1024 ** 2)).toFixed(0) + ' MB';
}

function formatUptime(seconds) {
  if (!seconds) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function pct(used, total) {
  return total ? Math.min(Math.round((used / total) * 100), 100) : 0;
}

function colorByPct(p) {
  return p >= 90 ? '#EF4444' : p >= 70 ? '#F59E0B' : '#10B981';
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="res-info-row">
      <span className="res-info-label">{label}</span>
      <span className={`res-info-val ${mono ? 'mono' : ''}`}>{value || '—'}</span>
    </div>
  );
}

const STYLES = `
  .res-page {
    --primary: #7c3aed;
    --primary-rgb: 124, 58, 237;
    --primary-hover: #6d28d9;
    --success: #10b981;
    --success-rgb: 16, 185, 129;
    --danger: #ef4444;
    --danger-rgb: 239, 68, 68;
    --warning: #f59e0b;
    --warning-rgb: 245, 158, 11;
    min-height: calc(100vh - 200px);
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    color: var(--text-main);
    transition: background-color 0.3s ease, color 0.3s ease;
  }
  
  .res-page.light {
    --bg-primary: #f8fafc;
    --bg-card: #ffffff;
    --bg-input: #f1f5f9;
    --border-color: rgba(226, 232, 240, 0.8);
    --text-main: #0f172a;
    --text-muted: #64748b;
    --text-muted-darker: #475569;
    --card-shadow: 0 4px 20px -2px rgba(148, 163, 184, 0.06), 0 2px 8px -1px rgba(148, 163, 184, 0.04);
    --card-hover-shadow: 0 16px 36px -4px rgba(148, 163, 184, 0.12), 0 4px 12px -2px rgba(148, 163, 184, 0.06);
    --table-header-bg: #f8fafc;
    --tooltip-bg: #ffffff;
    --tooltip-border: #e2e8f0;
    --recharts-grid: #e2e8f0;
    --recharts-text: #94a3b8;
    --hover-row-bg: rgba(124, 58, 237, 0.04);
    --terminal-bg: #0f172a;
    --terminal-text: #e2e8f0;
  }
  
  .res-page.dark {
    --bg-primary: #0b0f19;
    --bg-card: #131a26;
    --bg-input: #1b2535;
    --border-color: rgba(255, 255, 255, 0.07);
    --text-main: #f8fafc;
    --text-muted: #94a3b8;
    --text-muted-darker: #cbd5e1;
    --card-shadow: 0 4px 25px -2px rgba(0, 0, 0, 0.35), 0 2px 10px -1px rgba(0, 0, 0, 0.2);
    --card-hover-shadow: 0 16px 48px -4px rgba(0, 0, 0, 0.55), 0 6px 16px -2px rgba(0, 0, 0, 0.3);
    --table-header-bg: #101622;
    --tooltip-bg: #172130;
    --tooltip-border: rgba(255, 255, 255, 0.08);
    --recharts-grid: rgba(255, 255, 255, 0.05);
    --recharts-text: #64748b;
    --hover-row-bg: rgba(124, 58, 237, 0.08);
    --terminal-bg: #090d16;
    --terminal-text: #f8fafc;
  }

  body.charts-dark-theme { background-color: #0b0f19 !important; }
  body.charts-dark-theme .app-main, body.charts-dark-theme .content { background-color: #0b0f19 !important; }

  .res-wrap {
    padding: 10px 28px;
  }

  /* Header Design */
  .res-header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 28px;
    flex-wrap: wrap;
    gap: 16px;
  }
  .res-header-title {
    font-family: 'Outfit', sans-serif;
    font-size: 26px;
    font-weight: 800;
    color: var(--text-main);
    margin: 0;
    letter-spacing: -0.5px;
  }
  .res-header-subtitle {
    font-size: 13.5px;
    color: var(--text-muted);
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
  }
  .res-badge {
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .res-badge.primary {
    background: rgba(124, 58, 237, 0.1);
    color: var(--primary);
    border: 1px solid rgba(124, 58, 237, 0.2);
  }
  .res-badge.limit {
    background: rgba(239, 68, 68, 0.1);
    color: var(--danger);
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  .res-btn-add {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 22px;
    border-radius: 12px;
    font-size: 13.5px;
    font-weight: 700;
    cursor: pointer;
    border: none;
    background: linear-gradient(135deg, var(--primary), #4f46e5);
    color: #fff;
    box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35);
    transition: all 0.2s ease;
  }
  .res-btn-add:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(124, 58, 237, 0.45);
  }
  .res-btn-add:disabled {
    background: rgba(156, 163, 175, 0.15);
    color: var(--text-muted);
    box-shadow: none;
    cursor: not-allowed;
    opacity: 0.7;
  }

  /* Search Toolbar */
  .res-search-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 20px 0 24px;
    flex-wrap: wrap;
  }
  .res-search-input-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
    flex: 1;
    max-width: 380px;
    background: var(--bg-card);
    border: 2px solid var(--border-color);
    border-radius: 12px;
    padding: 8px 14px;
    transition: all 0.2s;
  }
  .res-search-input-wrap:focus-within {
    border-color: var(--primary);
    box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.12);
  }
  .res-search-input-wrap svg {
    color: var(--text-muted);
    margin-right: 10px;
    flex-shrink: 0;
  }
  .res-search-input {
    background: transparent;
    border: none;
    outline: none;
    width: 100%;
    color: var(--text-main);
    font-size: 13.5px;
    font-family: inherit;
    font-weight: 600;
  }
  .res-search-input::placeholder {
    color: var(--text-muted);
    font-weight: 400;
  }
  .res-search-count {
    font-size: 13px;
    color: var(--text-muted);
    font-weight: 600;
    margin-left: auto;
  }

  /* Server Grid & Cards */
  .res-server-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 20px;
  }
  .res-server-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    box-shadow: var(--card-shadow);
    overflow: hidden;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    display: flex;
    flex-direction: column;
    max-width: 380px;
  }
  .res-server-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--card-hover-shadow);
    border-color: rgba(124, 58, 237, 0.3);
  }
  .res-server-card-body {
    padding: 24px 22px 20px;
    flex: 1;
    cursor: pointer;
  }

  .res-server-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }
  .res-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .res-status-dot.online {
    background: var(--success);
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
  }
  .res-status-dot.offline {
    background: var(--danger);
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
  }
  .res-server-name {
    font-weight: 800;
    font-size: 15.5px;
    color: var(--text-main);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: 'Outfit', sans-serif;
  }
  .res-status-pill {
    padding: 2px 8px;
    border-radius: 20px;
    font-size: 10.5px;
    font-weight: 700;
    margin-left: auto;
    flex-shrink: 0;
  }
  .res-status-pill.online {
    background: rgba(16, 185, 129, 0.1);
    color: var(--success);
    border: 1px solid rgba(16, 185, 129, 0.2);
  }
  .res-status-pill.offline {
    background: rgba(239, 68, 68, 0.1);
    color: var(--danger);
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  .res-server-meta {
    font-size: 12.5px;
    color: var(--text-muted);
    font-family: monospace;
    margin-bottom: 6px;
    word-break: break-all;
  }
  .res-server-platform {
    font-size: 12.5px;
    color: var(--text-muted-darker);
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
  }
  .res-platform-tag {
    background: rgba(124, 58, 237, 0.08);
    color: var(--primary);
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    text-transform: capitalize;
  }

  /* Cockpit Metrics Dashboard */
  .res-metrics-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
    margin-top: 14px;
  }
  .res-metric-lbl {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .res-metric-val {
    font-size: 17px;
    font-weight: 800;
    margin-bottom: 5px;
    font-family: 'Outfit', sans-serif;
  }
  .res-metric-bar-track {
    height: 5px;
    border-radius: 10px;
    background: rgba(148, 163, 184, 0.12);
    overflow: hidden;
  }
  .res-metric-bar-fill {
    height: 100%;
    border-radius: 10px;
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Card footer actions */
  .res-card-footer {
    display: flex;
    align-items: center;
    border-top: 1px solid var(--border-color);
    background: transparent;
    padding: 0 14px;
  }
  .res-card-view-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 11px 0;
    background: transparent;
    border: none;
    color: var(--primary);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s ease;
  }
  .res-card-view-btn:hover {
    color: var(--primary-hover);
    background: rgba(124, 58, 237, 0.05);
  }
  .res-card-view-btn svg {
    transition: transform 0.2s ease;
  }
  .res-card-view-btn:hover svg {
    transform: translateX(4px);
  }
  .res-card-del-btn {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
    margin-left: 6px;
  }
  .res-card-del-btn:hover {
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.25);
    color: var(--danger);
  }

  /* Terminal Installation Card */
  .term-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    box-shadow: var(--card-shadow);
    margin-bottom: 24px;
    overflow: hidden;
    animation: fadeIn 0.3s ease;
  }
  .term-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
    background: linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(124, 58, 237, 0.02));
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .term-header-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 800;
    font-size: 14.5px;
    color: var(--text-main);
    font-family: 'Outfit', sans-serif;
  }
  .term-close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    font-size: 22px;
    line-height: 1;
    transition: color 0.2s;
  }
  .term-close-btn:hover {
    color: var(--danger);
  }
  .term-body {
    padding: 24px;
  }
  .term-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--text-muted);
    margin-bottom: 8px;
  }
  .term-input-field {
    width: 260px;
    padding: 10px 14px;
    border-radius: 10px;
    border: 2px solid var(--border-color);
    background: var(--bg-input);
    color: var(--text-main);
    font-size: 13.5px;
    font-family: inherit;
    font-weight: 600;
    outline: none;
    transition: all 0.2s;
  }
  .term-input-field:focus {
    border-color: var(--primary);
    background: var(--bg-card);
    box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.1);
  }
  .term-input-field::placeholder {
    color: var(--text-muted);
    font-weight: 400;
  }

  /* macOS Terminal Box */
  .mac-term-box {
    background: var(--terminal-bg);
    border: 1px solid var(--border-color);
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
    margin: 12px 0 20px;
  }
  .mac-term-titlebar {
    background: rgba(0,0,0,0.15);
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .mac-term-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }
  .mac-term-dot.red { background: #ff5f56; }
  .mac-term-dot.yellow { background: #ffbd2e; }
  .mac-term-dot.green { background: #27c93f; }
  .mac-term-text {
    margin-left: auto;
    font-family: monospace;
    font-size: 11px;
    color: var(--text-muted);
    opacity: 0.6;
  }

  .mac-term-content-wrap {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 18px 20px;
  }
  .mac-term-code {
    flex: 1;
    min-width: 0;
    font-family: 'JetBrains Mono', Fira Code, monospace;
    font-size: 13px;
    color: var(--terminal-text);
    white-space: pre-wrap;
    word-break: break-all;
    line-height: 1.6;
    margin: 0;
  }
  .mac-term-copy-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 9px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(255,255,255,0.05);
    color: var(--terminal-text);
    white-space: nowrap;
    transition: all 0.2s;
  }
  .mac-term-copy-btn:hover {
    border-color: var(--primary);
    background: rgba(124, 58, 237, 0.1);
    color: var(--primary);
  }

  .term-support-badge {
    background: rgba(16, 185, 129, 0.05);
    border: 1px solid rgba(16, 185, 129, 0.15);
    border-radius: 12px;
    padding: 12px 16px;
    margin-bottom: 20px;
    font-size: 12.5px;
    color: var(--text-muted-darker);
    line-height: 1.8;
  }

  .term-key-row {
    border-top: 1px solid var(--border-color);
    padding-top: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .term-key-code {
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 12.5px;
    color: var(--text-main);
    font-family: monospace;
    letter-spacing: 0.5px;
  }

  /* Empty state */
  .res-empty-box {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    box-shadow: var(--card-shadow);
    padding: 54px 32px;
    text-align: center;
    margin-top: 24px;
  }
  .res-empty-icon {
    font-size: 54px;
    margin-bottom: 16px;
    filter: drop-shadow(0 4px 10px rgba(124, 58, 237, 0.15));
  }
  .res-empty-title {
    font-size: 20px;
    fontWeight: 800;
    color: var(--text-main);
    margin-bottom: 8px;
    font-family: 'Outfit', sans-serif;
  }
  .res-empty-desc {
    font-size: 14px;
    color: var(--text-muted);
    margin-bottom: 32px;
  }

  /* Detail view back button */
  .res-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 18px;
    border-radius: 10px;
    border: 1.5px solid var(--border-color);
    background: var(--bg-card);
    color: var(--text-muted);
    font-size: 13.5px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 24px;
  }
  .res-back-btn:hover {
    border-color: var(--primary);
    color: var(--primary);
    transform: translateX(-2px);
  }

  /* Server info banner in details */
  .res-detail-header-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    box-shadow: var(--card-shadow);
    padding: 20px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 16px;
  }
  .res-detail-header-card .online-badge {
    padding: 6px 16px;
    font-size: 12.5px;
  }

  .res-offline-alert {
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.25);
    border-radius: 12px;
    padding: 12px 18px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--danger);
    font-size: 13.5px;
    font-weight: 600;
  }

  /* Details Grid */
  .res-detail-metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }
  .res-detail-metric-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 18px;
    box-shadow: var(--card-shadow);
    padding: 18px 20px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .res-detail-metric-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--card-hover-shadow);
  }
  .res-detail-metric-card-lbl {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--text-muted);
    margin-bottom: 8px;
  }
  .res-detail-metric-card-val {
    font-size: 24px;
    font-weight: 800;
    font-family: 'Outfit', sans-serif;
  }

  /* Info boxes grid */
  .res-info-boxes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
  }
  .res-info-box {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    box-shadow: var(--card-shadow);
    overflow: hidden;
  }
  .res-info-box-header {
    padding: 14px 20px;
    background: var(--table-header-bg);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--text-muted);
  }
  .res-info-box-body {
    padding: 16px 20px;
  }
  .res-info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid var(--border-color);
    gap: 12px;
  }
  .res-info-box-body .res-info-row:last-child {
    border-bottom: none;
  }
  .res-info-label {
    font-size: 13px;
    color: var(--text-muted);
    font-weight: 500;
    flex-shrink: 0;
  }
  .res-info-val {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-main);
    text-align: right;
    word-break: break-all;
  }
  .res-info-val.mono {
    font-family: monospace;
    font-size: 12.5px;
    color: var(--primary);
  }

  /* Tables inside details */
  .res-table-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    box-shadow: var(--card-shadow);
    overflow: hidden;
    margin-bottom: 24px;
  }
  .res-table-card-header {
    padding: 16px 20px;
    background: var(--table-header-bg);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .res-table-card-title {
    font-weight: 800;
    font-size: 15px;
    color: var(--text-main);
    font-family: 'Outfit', sans-serif;
  }
  .res-table-th {
    padding: 12px 18px;
    font-size: 11px;
    font-weight: 800;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    text-align: left;
    border-bottom: 1.5px solid var(--border-color);
    background: var(--table-header-bg);
  }
  .res-table-row {
    border-bottom: 1px solid var(--border-color);
    transition: background 0.15s;
  }
  .res-table-row:last-child {
    border-bottom: none;
  }
  .res-table-row:hover {
    background: var(--hover-row-bg);
  }
  .res-table-td {
    padding: 14px 18px;
    font-size: 13px;
    color: var(--text-main);
  }

  /* Recharts card */
  .res-chart-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    box-shadow: var(--card-shadow);
    padding: 24px;
    margin-bottom: 24px;
  }
  .res-chart-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 24px;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const STALE_MS = 90 * 1000;
const isServerOnline = (sv) => sv?.timestamp && (Date.now() - new Date(sv.timestamp).getTime()) < STALE_MS;

export default function Resources() {
  const [servers, setServers]       = useState([]);
  const [selected, setSelected]     = useState(null);
  const [history, setHistory]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const tickRef    = useRef(null);
  const selectedRef = useRef(null);
  selectedRef.current = selected;

  const [agentKey, setAgentKey]     = useState('');
  const [agentApiUrl, setAgentApiUrl] = useState('');
  const [agentLimit, setAgentLimit] = useState(0);
  const [showInstall, setShowInstall] = useState(false);
  const [serverName, setServerName] = useState('');
  const [copied, setCopied]         = useState(false);
  const [keyCopied, setKeyCopied]   = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting]     = useState(false);
  const [deletedInfo, setDeletedInfo]   = useState(null); // { serverName, serverId } after removal
  const [helpOpen, setHelpOpen]         = useState(false);
  const [cmdCopied, setCmdCopied]       = useState('');

  const [localTheme, setLocalTheme] = useState(() => {
    const m = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
    return m ? m[1] : 'dark';
  });

  useEffect(() => {
    const check = () => {
      const m = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
      const t = m ? m[1] : 'dark';
      if (t !== localTheme) setLocalTheme(t);
    };
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [localTheme]);

  useEffect(() => {
    if (localTheme === 'dark') document.body.classList.add('charts-dark-theme');
    else document.body.classList.remove('charts-dark-theme');
    return () => document.body.classList.remove('charts-dark-theme');
  }, [localTheme]);

  useEffect(() => {
    axios.get(`${API_URL}/api/agent/key`, { withCredentials: true })
      .then(r => { setAgentKey(r.data.agentKey); setAgentApiUrl(r.data.apiUrl); setAgentLimit(r.data.limit); })
      .catch(() => {});
  }, []);

  const loadLatest = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/metrics/latest`, { withCredentials: true });
      const real = res.data.filter(s => s.ramTotal > 0);
      setServers(real);
      setSecondsAgo(0);
      if (selectedRef.current) {
        const fresh = real.find(s => s.serverId === selectedRef.current.serverId);
        if (fresh) setSelected(fresh);
      }
    } catch (e) { console.error(e.message); }
    setLoading(false);
  }, []);

  const loadHistory = useCallback(async (serverId) => {
    try {
      const res = await axios.get(`${API_URL}/api/metrics/${serverId}/history`, { withCredentials: true });
      setHistory(res.data.map(h => ({
        time: new Date(h.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        cpu: h.cpu || 0,
        ram: pct(h.ramUsed, h.ramTotal),
        disk: pct(h.diskUsed, h.diskTotal),
      })));
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadLatest();
    const t = setInterval(loadLatest, 5000);
    return () => clearInterval(t);
  }, [loadLatest]);

  useEffect(() => {
    tickRef.current = setInterval(() => setSecondsAgo(s => s + 1), 1000);
    return () => clearInterval(tickRef.current);
  }, []);

  useEffect(() => {
    if (selected) loadHistory(selected.serverId);
  }, [selected, loadHistory]);

  const installCmd = agentKey && agentApiUrl
    ? `curl -fsSL "${agentApiUrl}/api/agent/install" | bash -s -- "${agentKey}" "${serverName || 'my-server'}"`
    : '';

  const handleCopy    = () => { if (!installCmd) return; navigator.clipboard.writeText(installCmd).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };
  const handleCopyKey = () => { navigator.clipboard.writeText(agentKey).then(() => { setKeyCopied(true); setTimeout(() => setKeyCopied(false), 2000); }); };

  const handleDeleteServer = async (serverId) => {
    const sv = servers.find(s => s.serverId === serverId);
    setDeleting(true);
    try {
      await axios.delete(`${API_URL}/api/metrics/${serverId}`, { withCredentials: true });
      setServers(prev => prev.filter(s => s.serverId !== serverId));
      if (selected?.serverId === serverId) { setSelected(null); setHistory([]); }
      setDeletedInfo({ serverName: sv?.serverName || serverId, serverId });
    } catch (_) {}
    setDeleteConfirm(null);
    setDeleting(false);
  };

  const copyCmd = (cmd, key) => {
    navigator.clipboard.writeText(cmd).then(() => { setCmdCopied(key); setTimeout(() => setCmdCopied(''), 2000); });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
        <p style={{ fontWeight: 800, color: 'var(--text-main)', marginBottom: 6, fontFamily: 'Outfit, sans-serif' }}>{label}</p>
        {payload.map((p, i) => <p key={i} style={{ color: p.color, margin: '3px 0', fontWeight: 600 }}>{p.name}: {p.value}%</p>)}
      </div>
    );
  };

  if (loading) return (
    <div className={`res-page ${localTheme}`}>
      <style>{STYLES}</style>
      <div className="res-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="inc-spinner-wrap" style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: '4px solid rgba(124,58,237,0.1)', borderTop: '4px solid var(--primary)', animation: 'spin 0.8s linear infinite' }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600 }}>Loading metrics...</p>
        </div>
      </div>
    </div>
  );

  const atLimit = agentLimit > 0 && servers.length >= agentLimit;

  const installPanel = (
    <div className="term-card">
      <div className="term-header">
        <div className="term-header-title">
          <span>Install Agent on Your Server</span>
        </div>
        {servers.length > 0 && (
          <button onClick={() => setShowInstall(false)} className="term-close-btn">&times;</button>
        )}
      </div>
      <div className="term-body">
        <div style={{ marginBottom: 20 }}>
          <div className="term-label">Step 1 — Name your server (optional)</div>
          <input
            className="term-input-field"
            type="text"
            placeholder="e.g. prod-web-01"
            value={serverName}
            onChange={e => setServerName(e.target.value)}
          />
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, fontWeight: 500 }}>Leave blank to use hostname</div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div className="term-label">Step 2 — Run on your Linux server</div>
          
          {/* macOS Style Terminal */}
          <div className="mac-term-box">
            <div className="mac-term-titlebar">
              <span className="mac-term-dot red"></span>
              <span className="mac-term-dot yellow"></span>
              <span className="mac-term-dot green"></span>
              <span className="mac-term-text">bash</span>
            </div>
            <div className="mac-term-content-wrap">
              <pre className="mac-term-code">{installCmd || 'Loading install command...'}</pre>
              <button className="mac-term-copy-btn" onClick={handleCopy}>
                {copied ? '✓ Copied!' : (
                  <>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ marginRight: 2 }}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        <div className="term-support-badge">
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', alignItems: 'start' }}>
            <span style={{ color: '#10B981', fontWeight: 700, fontSize: 13 }}>✓</span>
            <span><strong style={{ color: 'var(--text-main)' }}>Supported Linux distros:</strong> Ubuntu, Debian, RHEL, CentOS, Arch, Alpine, openSUSE</span>
            <span style={{ color: '#10B981', fontWeight: 700, fontSize: 13 }}>✓</span>
            <span>Agent appears in your dashboard within <strong style={{ color: 'var(--text-main)' }}>30 seconds</strong> after running the install command.</span>
            <span style={{ color: '#10B981', fontWeight: 700, fontSize: 13 }}>✓</span>
            <span>Run the command with <strong style={{ color: 'var(--text-main)' }}>sudo</strong> (root) or without it (regular user) — both work.</span>
          </div>
        </div>
        <div className="term-key-row">
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Your Unique Agent Key:</span>
          <code className="term-key-code">{agentKey || 'Loading unique key...'}</code>
        </div>

        {/* Step 3 — Useful commands */}
        <div style={{ borderTop: '1px solid var(--border-color)', padding: '20px 24px 4px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', marginBottom: 14 }}>Useful Commands — Run on your server</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>

            {/* Check status */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>Check Agent Status</div>
              {[
                { label: 'Root install', cmd: 'systemctl status uptimeforge-agent' },
                { label: 'User install', cmd: 'systemctl --user status uptimeforge-agent' },
                { label: 'Any method', cmd: 'ps aux | grep agent.js | grep -v grep' },
              ].map(({ label, cmd }) => (
                <div key={label} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '7px 10px' }}>
                    <code style={{ flex: 1, fontFamily: 'monospace', fontSize: 11.5, color: 'var(--text-main)', wordBreak: 'break-all' }}>{cmd}</code>
                    <button onClick={() => copyCmd(cmd, 's-' + label)} style={{ flexShrink: 0, padding: '2px 8px', borderRadius: 5, border: '1px solid var(--border-color)', background: cmdCopied === 's-' + label ? 'rgba(16,185,129,0.1)' : 'var(--bg-card)', color: cmdCopied === 's-' + label ? '#10B981' : 'var(--text-muted)', cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>
                      {cmdCopied === 's-' + label ? '✓' : 'Copy'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Uninstall */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>Uninstall Agent</div>
              {[
                { label: 'Root install (systemd)', cmd: 'systemctl stop uptimeforge-agent && systemctl disable uptimeforge-agent && rm -f /etc/systemd/system/uptimeforge-agent.service && systemctl daemon-reload && rm -rf /opt/uptimeforge-agent' },
                { label: 'User install (systemd)', cmd: 'systemctl --user stop uptimeforge-agent && systemctl --user disable uptimeforge-agent && rm -f ~/.config/systemd/user/uptimeforge-agent.service && systemctl --user daemon-reload && rm -rf ~/.uptimeforge-agent' },
                { label: 'Background process', cmd: 'pkill -f "uptimeforge-agent/agent.js" && rm -rf ~/.uptimeforge-agent' },
              ].map(({ label, cmd }) => (
                <div key={label} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '7px 10px' }}>
                    <code style={{ flex: 1, fontFamily: 'monospace', fontSize: 11, color: 'var(--text-main)', wordBreak: 'break-all', lineHeight: 1.6 }}>{cmd}</code>
                    <button onClick={() => copyCmd(cmd, 'd-' + label)} style={{ flexShrink: 0, padding: '2px 8px', borderRadius: 5, border: '1px solid var(--border-color)', background: cmdCopied === 'd-' + label ? 'rgba(16,185,129,0.1)' : 'var(--bg-card)', color: cmdCopied === 'd-' + label ? '#10B981' : 'var(--text-muted)', cursor: 'pointer', fontSize: 10, fontWeight: 700, marginTop: 2 }}>
                      {cmdCopied === 'd-' + label ? '✓' : 'Copy'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );

  const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
  const modalBox    = { background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 28, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' };
  const cmdBox = (cmd, key) => (
    <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 14px', fontFamily: 'monospace', fontSize: 12.5, color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
      <code style={{ flex: 1, wordBreak: 'break-all', lineHeight: 1.6 }}>{cmd}</code>
      <button onClick={() => copyCmd(cmd, key)} style={{ flexShrink: 0, padding: '4px 10px', borderRadius: 7, border: '1px solid var(--border-color)', background: cmdCopied === key ? 'rgba(16,185,129,0.1)' : 'var(--bg-card)', color: cmdCopied === key ? '#10B981' : 'var(--text-muted)', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
        {cmdCopied === key ? '✓' : 'Copy'}
      </button>
    </div>
  );

  const DeleteModal = () => {
    if (deleteConfirm) return (
      <div style={modalOverlay}>
        <div style={{ ...modalBox, maxWidth: 420 }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-main)', marginBottom: 10, fontFamily: 'Outfit, sans-serif' }}>Remove Server</div>
          <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.65 }}>
            Remove <strong style={{ color: 'var(--text-main)' }}>{servers.find(sv => sv.serverId === deleteConfirm)?.serverName || deleteConfirm}</strong> from dashboard? All historical data will be deleted permanently.
          </div>
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 22, fontSize: 12.5, color: '#F59E0B', lineHeight: 1.6 }}>
            ⚠️ This only removes the server from the dashboard. The agent will keep running on your server until you uninstall it manually.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setDeleteConfirm(null)} style={{ padding: '9px 20px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Cancel</button>
            <button onClick={() => handleDeleteServer(deleteConfirm)} disabled={deleting}
              style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: 'var(--danger)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 12px rgba(239,68,68,0.25)' }}>
              {deleting ? 'Removing...' : 'Remove Server'}
            </button>
          </div>
        </div>
      </div>
    );

    if (deletedInfo) return (
      <div style={modalOverlay}>
        <div style={{ ...modalBox, maxWidth: 520 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✓</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-main)', fontFamily: 'Outfit, sans-serif' }}>{deletedInfo.serverName} removed</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>Removed from dashboard successfully</div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 18, marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)', marginBottom: 12 }}>
              Stop & uninstall the agent on your server
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>If installed as root (systemd):</div>
            {cmdBox('systemctl stop uptimeforge-agent && systemctl disable uptimeforge-agent && rm -f /etc/systemd/system/uptimeforge-agent.service && systemctl daemon-reload && rm -rf /opt/uptimeforge-agent', 'root-stop')}

            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, marginTop: 14 }}>If installed as regular user (systemd --user):</div>
            {cmdBox('systemctl --user stop uptimeforge-agent && systemctl --user disable uptimeforge-agent && rm -f ~/.config/systemd/user/uptimeforge-agent.service && systemctl --user daemon-reload && rm -rf ~/.uptimeforge-agent', 'user-stop')}

            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, marginTop: 14 }}>If running as background process (nohup):</div>
            {cmdBox('pkill -f "uptimeforge-agent/agent.js" && rm -rf ~/.uptimeforge-agent', 'nohup-stop')}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setDeletedInfo(null)} style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Done</button>
          </div>
        </div>
      </div>
    );

    return null;
  };

  if (!selected) {
    return (
      <div className={`res-page ${localTheme}`}>
        <style>{STYLES}</style>
        <DeleteModal />
        <div className="res-wrap">

          {/* Header */}
          <div className="res-header-row">
            <div>
              <h1 className="res-header-title">
                Infra Monitor <span style={{ color: 'var(--primary)' }}>.</span>
              </h1>
              <p className="res-header-subtitle">
                Real-time server resource monitoring
                {agentLimit > 0 && (
                  <span className={`res-badge ${atLimit ? 'limit' : 'primary'}`}>
                    {servers.length}/{agentLimit} servers
                  </span>
                )}
              </p>
            </div>
            <button onClick={() => setShowInstall(o => !o)} disabled={atLimit} className="res-btn-add" title={atLimit ? `Plan limit reached (${agentLimit} servers)` : 'Add a new server'}>
              + Add Server
            </button>
          </div>

          {/* Install panel */}
          {showInstall && installPanel}

          {/* Empty state / Server grid */}
          {!showInstall && (servers.length === 0 ? (
            <div className="res-empty-box">
              <div className="res-empty-icon">🖥️</div>
              <div className="res-empty-title">No servers connected yet</div>
              <div className="res-empty-desc">Install the lightweight agent on any Linux server to get real-time CPU, RAM, and Disk metrics.</div>
              {installPanel}
            </div>
          ) : (() => {
            const filtered = servers.filter(sv => !searchQuery || sv.serverName?.toLowerCase().includes(searchQuery.toLowerCase()) || sv.hostname?.toLowerCase().includes(searchQuery.toLowerCase()));
            return (
              <>
                {/* Search toolbar */}
                <div className="res-search-bar">
                  <div className="res-search-input-wrap">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input className="res-search-input" type="text" placeholder="Search by name or hostname..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                  <span className="res-search-count">{filtered.length} of {servers.length} server{servers.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Server grid */}
                <div className="res-server-grid">
                  {filtered.map(sv => {
                    const online  = isServerOnline(sv);
                    const cpuPct  = sv.cpu || 0;
                    const ramPct  = pct(sv.ramUsed, sv.ramTotal);
                    const diskPct = pct(sv.diskUsed, sv.diskTotal);
                    const accent  = online ? '#10B981' : '#EF4444';
                    return (
                      <div key={sv.serverId} className="res-server-card" style={{ borderTop: `4px solid ${accent}` }}>
                        {/* Body */}
                        <div className="res-server-card-body" onClick={() => { setSelected(sv); loadHistory(sv.serverId); }}>
                          {/* Name row */}
                          <div className="res-server-header">
                            <div className={`res-status-dot ${online ? 'online' : 'offline'}`} />
                            <div className="res-server-name">{sv.serverName}</div>
                            <span className={`res-status-pill ${online ? 'online' : 'offline'}`}>{online ? 'Online' : 'Offline'}</span>
                          </div>

                          {/* Meta */}
                          <div className="res-server-meta">{sv.hostname}</div>
                          <div className="res-server-platform">
                            <span className="res-platform-tag">{sv.platform}</span>
                            <span>Up {formatUptime(sv.uptime)}</span>
                          </div>

                          {/* Metrics */}
                          <div className="res-metrics-row">
                            {[
                              { label: '⚡ CPU', val: cpuPct },
                              { label: '🧠 RAM', val: ramPct },
                              { label: '💾 Disk', val: diskPct },
                            ].map(m => {
                              const c = colorByPct(m.val);
                              return (
                                <div key={m.label}>
                                  <div className="res-metric-lbl">{m.label}</div>
                                  <div className="res-metric-val" style={{ color: c }}>{m.val}%</div>
                                  <div className="res-metric-bar-track">
                                    <div className="res-metric-bar-fill" style={{ width: `${m.val}%`, background: c }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="res-card-footer">
                          <button className="res-card-view-btn" onClick={() => { setSelected(sv); loadHistory(sv.serverId); }}>
                            <span>View Details</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                          </button>
                          <button className="res-card-del-btn" onClick={e => { e.stopPropagation(); setDeleteConfirm(sv.serverId); }} title="Remove server">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })())}

        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  // ── DETAIL VIEW (server selected) ────────────────────
  // ══════════════════════════════════════════════════════
  const s        = selected;
  const online   = isServerOnline(s);
  const dataAge  = Date.now() - new Date(s.timestamp).getTime();
  const ramPct   = pct(s.ramUsed, s.ramTotal);
  const diskPct  = pct(s.diskUsed, s.diskTotal);
  const swapPct  = pct(s.swapUsed, s.swapTotal);

  return (
    <div className={`res-page ${localTheme}`}>
      <style>{STYLES}</style>
      <DeleteModal />
      <div className="res-wrap">

        {/* Back + header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <button className="res-back-btn" onClick={() => { setSelected(null); setHistory([]); }}>
            ← All Servers
          </button>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {online && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981' }}>
                <span className="res-status-dot online" style={{ animation: 'spin 1.5s linear infinite' }} />
                Live {secondsAgo > 0 && `— ${secondsAgo}s ago`}
              </span>
            )}
          </div>
        </div>

        {/* Server header card */}
        <div className="res-detail-header-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className={`res-status-dot ${online ? 'online' : 'offline'}`} style={{ width: 12, height: 12 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--text-main)', fontFamily: 'Outfit, sans-serif' }}>{s.serverName}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{s.hostname} &bull; {s.platform} &bull; Up {formatUptime(s.uptime)}</div>
            </div>
          </div>
          <span className={`res-status-pill online-badge ${online ? 'online' : 'offline'}`}>{online ? 'Online' : 'Offline'}</span>
        </div>

        {/* Offline banner */}
        {!online && (
          <div className="res-offline-alert">
            🚨 Offline — Agent was last seen {dataAge < 60000 ? `${Math.round(dataAge/1000)}s` : `${Math.round(dataAge/60000)}m`} ago. Check your server's agent status.
          </div>
        )}

        {/* Metric cards */}
        {online && (
          <div className="res-detail-metrics-grid">
            {[
              { label: '⚡ CPU',       value: `${s.cpu || 0}%`, pctVal: s.cpu || 0 },
              { label: '🧠 RAM',       value: `${ramPct}%`,     pctVal: ramPct },
              { label: '💾 Disk',      value: `${diskPct}%`,    pctVal: diskPct },
              ...(s.swapTotal > 0 ? [{ label: '🔄 Swap', value: `${swapPct}%`, pctVal: swapPct }] : []),
              { label: '📈 Load (1m)', value: `${s.load1 || 0}`, fixed: true },
            ].map((m, idx) => {
              const color = m.fixed ? 'var(--primary)' : colorByPct(m.pctVal);
              return (
                <div key={idx} className="res-detail-metric-card" style={{ borderTop: `4px solid ${color}` }}>
                  <div className="res-detail-metric-card-lbl">{m.label}</div>
                  <div className="res-detail-metric-card-val" style={{ color }}>{m.value}</div>
                  {!m.fixed && (
                    <div className="res-metric-bar-track" style={{ marginTop: 8 }}><div style={{ width: `${m.pctVal}%`, height: '100%', background: color, borderRadius: 10, transition: 'width 0.5s' }} /></div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Info boxes */}
        {online && (
          <div className="res-info-boxes-grid">
            {[
              { icon: '🖥️', title: 'System', accent: '#7c3aed', rows: [
                { label: 'Hostname', value: s.hostname },
                { label: 'Platform', value: s.platform },
                { label: 'Uptime',   value: formatUptime(s.uptime) },
                { label: 'Last check', value: new Date(s.timestamp).toLocaleTimeString('en-IN') },
              ]},
              { icon: '⚙️', title: 'CPU', accent: '#7c3aed', rows: [
                { label: 'Usage',        value: `${s.cpu || 0}%` },
                { label: 'Cores',        value: s.cpuCores ? `${s.cpuCores} cores` : null },
                { label: 'Architecture', value: s.cpuArch },
                { label: 'Model',        value: s.cpuModel ? s.cpuModel.substring(0, 32) + '...' : null },
                { label: 'Load averages', value: s.load1 !== undefined ? `${s.load1} / ${s.load5} / ${s.load15}` : null },
              ]},
              { icon: '🧠', title: 'Memory', accent: '#10B981', rows: [
                { label: 'RAM Used',   value: formatBytes(s.ramUsed) },
                { label: 'RAM Free',   value: formatBytes(s.ramTotal - s.ramUsed) },
                { label: 'RAM Total',  value: formatBytes(s.ramTotal) },
                ...(s.swapTotal > 0 ? [{ label: 'Swap Used', value: formatBytes(s.swapUsed) }, { label: 'Swap Total', value: formatBytes(s.swapTotal) }] : []),
              ]},
              { icon: '💾', title: 'Storage', accent: '#06B6D4', rows: [
                { label: 'Disk Used', value: formatBytes(s.diskUsed) },
                { label: 'Disk Free', value: formatBytes(s.diskTotal - s.diskUsed) },
                { label: 'Disk Total', value: formatBytes(s.diskTotal) },
                { label: 'Disk Usage', value: `${diskPct}%` },
              ]},
              { icon: '🌐', title: 'Network', accent: '#F59E0B', rows: [
                { label: 'Local IP',  value: s.localIp,  mono: true },
                { label: 'Public IP', value: s.publicIp, mono: true },
              ]},
            ].map(box => (
              <div key={box.title} className="res-info-box">
                <div className="res-info-box-header" style={{ borderLeft: `3px solid ${box.accent}` }}>
                  <span style={{ fontSize: 16 }}>{box.icon}</span>&nbsp;&nbsp;{box.title}
                </div>
                <div className="res-info-box-body">
                  {box.rows.map(r => <InfoRow key={r.label} label={r.label} value={r.value} mono={r.mono} />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Active SSH Sessions */}
        {s.activeSessions && s.activeSessions.length > 0 && (
          <div className="res-table-card">
            <div className="res-table-card-header">
              <span style={{ fontSize: 16 }}>👥</span>
              <span className="res-table-card-title">Active SSH Sessions</span>
              <span className="res-status-pill online" style={{ marginLeft: 'auto' }}>{s.activeSessions.length} sessions active</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['User', 'TTY', 'IP Address', 'Login Time', 'Idle Time', 'Current command'].map(h => <th key={h} className="res-table-th">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {s.activeSessions.map((u, i) => (
                    <tr key={i} className="res-table-row">
                      <td className="res-table-td" style={{ fontWeight: 700, color: 'var(--primary)' }}>{u.user}</td>
                      <td className="res-table-td" style={{ color: 'var(--text-muted)' }}>{u.tty}</td>
                      <td className="res-table-td" style={{ fontFamily: 'monospace', color: '#10B981', fontWeight: 600 }}>{u.from}</td>
                      <td className="res-table-td" style={{ color: 'var(--text-muted)' }}>{u.loginTime}</td>
                      <td className="res-table-td" style={{ color: '#F59E0B', fontWeight: 700 }}>{u.idle}</td>
                      <td className="res-table-td" style={{ fontFamily: 'monospace', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{u.what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent SSH logins */}
        {s.lastSsh && s.lastSsh.length > 0 && (
          <div className="res-table-card">
            <div className="res-table-card-header" style={{ borderLeft: '3px solid #EF4444' }}>
              <span style={{ fontSize: 16 }}>🔐</span>
              <span className="res-table-card-title">Recent SSH Logins</span>
            </div>
            <div className="res-info-box-body">
              {s.lastSsh.slice(0, 5).map((l, i) => (
                <div key={i} className="res-info-row">
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{l.user}</span>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{l.ip}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 500 }}>{l.time}</span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    background: l.active ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)',
                    color: l.active ? '#10B981' : '#94a3b8',
                    border: `1px solid ${l.active ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`
                  }}>
                    {l.active ? 'Active' : 'Ended'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History Charts */}
        {history.length > 0 && (
          <div className="res-chart-card">
            <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 20, fontFamily: 'Outfit, sans-serif' }}>
              {s.serverName} &mdash; Resource History (Last 2 Hours)
            </div>
            <div className="res-chart-grid">
              {[{ key: 'cpu', name: 'CPU Usage', color: '#7c3aed' }, { key: 'ram', name: 'Memory Usage', color: '#10B981' }, { key: 'disk', name: 'Storage Usage', color: '#06B6D4' }].map(({ key, name, color }) => (
                <div key={key}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color, marginBottom: 12, fontFamily: 'Outfit, sans-serif' }}>{name}</div>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={history} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--recharts-grid)" />
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--recharts-text)' }} interval="preserveStartEnd" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--recharts-text)' }} unit="%" />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey={key} name={name} stroke={color} strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
