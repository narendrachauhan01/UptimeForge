import React, { useEffect, useState } from 'react';
import { adminGetSettings, adminUpdateSettings } from '../api';

function Toggle({ checked, onChange, disabled }) {
    return (
        <button
            type="button"
            onClick={() => !disabled && onChange(!checked)}
            disabled={disabled}
            className={`switch-btn ${checked ? "checked" : ""}`}
            style={{ cursor: disabled ? "not-allowed" : "pointer" }}
        >
            <span className="switch-btn-circle" />
        </button>
    );
}

const IcoSSL = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IcoCharts = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
const IcoPing = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>;
const IcoTarget = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.8"><circle cx="12" cy="12" r="2" fill="#22c55e" stroke="none"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="10"/></svg>;
const IcoDns = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="4" rx="1"/><rect x="3" y="10" width="18" height="4" rx="1"/><rect x="3" y="16" width="18" height="4" rx="1"/><circle cx="6.5" cy="6" r="0.6" fill="#22c55e" stroke="none"/><circle cx="6.5" cy="12" r="0.6" fill="#22c55e" stroke="none"/><circle cx="6.5" cy="18" r="0.6" fill="#22c55e" stroke="none"/></svg>;
const IcoUdp = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/><path d="M10 10l-2 2 2 2M14 10l2 2-2 2"/></svg>;
const IcoApi = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="13" height="9" rx="2"/><path d="M19 9a4 4 0 0 1 0 8h-1"/><path d="M5 13v3a3 3 0 0 0 3 3h6"/></svg>;
const IcoWhatsApp = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.517 2.266 2.27 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.729-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.863-9.864.001-2.637-1.03-5.114-2.905-6.989-1.874-1.873-4.35-2.903-6.986-2.903-5.438 0-9.863 4.42-9.866 9.865-.002 1.95.518 3.854 1.506 5.551l-.988 3.605 3.708-.973zm11.394-4.887c-.314-.157-1.858-.917-2.142-1.02-.284-.103-.49-.155-.696.156-.206.31-.798 1.02-.978 1.225-.18.207-.36.23-.674.074-1.476-.738-2.546-1.306-3.41-2.793-.23-.396.23-.367.658-1.22.073-.153.036-.288-.018-.395-.055-.107-.49-1.18-.67-1.62-.177-.425-.357-.367-.49-.374-.127-.007-.272-.008-.418-.008-.145 0-.38.054-.58.273-.2.22-.76.742-.76 1.81 0 1.067.776 2.094.884 2.242.11.147 1.527 2.33 3.697 3.268.516.223.918.357 1.233.456.518.165.99.14 1.36.085.414-.06 1.858-.76 2.117-1.498.26-.737.26-1.37.18-1.5-.078-.124-.284-.207-.598-.364z"/></svg>;
const IcoTelegram = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="#0088cc"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.24-5.54 3.65-.52.36-.97.53-1.34.52-.41-.01-1.2-.23-1.79-.42-.72-.24-1.29-.36-1.24-.76.03-.2.31-.4.85-.62 3.32-1.44 5.53-2.4 6.63-2.87 3.16-1.35 3.82-1.59 4.25-1.59.09 0 .31.02.45.14.12.1.15.24.17.34-.02.1-.01.2-.02.26z"/></svg>;
const IcoWebhook = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
const IcoRocketChat = () => <svg width="22" height="22" viewBox="0 0 345 304" xmlns="http://www.w3.org/2000/svg"><g fillRule="nonzero" fill="none"><path d="M103.893 13.408c10.625 5.903 20.67 13.37 29.247 21.67 13.827-2.504 28.084-3.767 42.547-3.767 43.298 0 84.348 11.36 115.58 31.981 16.175 10.684 29.031 23.36 38.207 37.68 10.22 15.957 15.4 33.116 15.4 51.503 0 17.892-5.18 35.058-15.4 51.011-9.176 14.327-22.032 27-38.206 37.684-31.233 20.62-72.28 31.974-115.58 31.974-14.464 0-28.718-1.263-42.548-3.765-8.581 8.297-18.622 15.769-29.247 21.67-56.773 28.438-103.854.67-103.854.67s43.773-37.168 36.655-69.75c-19.586-20.077-30.197-44.291-30.197-69.982 0-25.207 10.615-49.42 30.197-69.5C43.811 49.913.054 12.752.039 12.74c.014-.009 47.09-27.768 103.854.668z" fill="#DB2323"/><path d="M69.964 208.766c-19.484-15.38-31.18-35.061-31.18-56.512 0-49.223 61.582-89.126 137.547-89.126s137.547 39.903 137.547 89.126c0 49.223-61.582 89.126-137.547 89.126-18.722 0-36.57-2.424-52.839-6.814l-11.894 11.49c-6.462 6.242-14.037 11.892-21.932 16.343-10.466 5.148-20.8 7.957-31.024 8.814.576-1.05 1.107-2.114 1.678-3.166 11.917-21.989 15.132-41.75 9.644-59.281z" fill="#FFF"/><path d="M110.528 172.151c-11.193 0-20.267-9.043-20.267-20.2 0-11.155 9.074-20.199 20.267-20.199s20.267 9.044 20.267 20.2c0 11.156-9.074 20.2-20.267 20.2v-.001zm65.25 0c-11.193 0-20.267-9.043-20.267-20.2 0-11.155 9.074-20.199 20.267-20.199s20.267 9.044 20.267 20.2c0 11.156-9.074 20.2-20.267 20.2v-.001zm65.25 0c-11.194 0-20.267-9.043-20.267-20.2 0-11.155 9.073-20.199 20.267-20.199 11.193 0 20.267 9.044 20.267 20.2 0 11.156-9.074 20.2-20.267 20.2v-.001z" fill="#DB2323"/></g></svg>;
const IcoSlackFA = () => <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#E01E5A"/><path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"/><path d="M5.042 8.834a2.527 2.527 0 0 1-2.52-2.521A2.527 2.527 0 0 1 5.042 3.79a2.527 2.527 0 0 1 2.521 2.522v2.521H5.042zm1.271 0a2.527 2.527 0 0 1 2.521-2.521h6.312a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.523H8.834A2.528 2.528 0 0 1 6.313 8.834z" fill="#2EB67D"/><path d="M15.165 18.956h-2.521v-2.521a2.527 2.527 0 0 1 2.521-2.522 2.528 2.528 0 0 1 2.523 2.522 2.528 2.528 0 0 1-2.523 2.521zm0-1.268H8.853a2.528 2.528 0 0 1-2.521-2.523 2.527 2.527 0 0 1 2.521-2.52h6.312a2.527 2.527 0 0 1 2.523 2.52 2.528 2.528 0 0 1-2.523 2.523z" fill="#36C5F0"/></svg>;
const IcoDiscordFA = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>;
const IcoReports = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;

const FEATURES = [
    { key: 'domainSsl',   label: 'Domain & SSL Monitoring', desc: 'View SSL certificate expiry and domain expiry dates', icon: <IcoSSL /> },
    { key: 'charts',      label: 'Performance Charts',       desc: 'View response time charts, uptime stats and alert history', icon: <IcoCharts /> },
    { key: 'pingMonitor',     label: 'Port Monitoring',          desc: 'Monitor connectivity for any host, IP or URL with live ping', icon: <IcoPing /> },
    { key: 'pingMonitorIcmp', label: 'Ping Monitoring',              desc: 'Make sure your server or any device in the network is always available', icon: <IcoTarget /> },
    { key: 'dnsMonitor',      label: 'DNS Monitoring',                desc: 'Monitor DNS servers and verify that DNS records resolve to expected values', icon: <IcoDns /> },
    { key: 'udpMonitor',      label: 'UDP Monitoring',                desc: 'Monitor UDP services on your server. Useful for DNS, SNMP and other services that accept and respond to UDP data', icon: <IcoUdp /> },
    { key: 'apiMonitor',      label: 'API Monitoring',                desc: 'Validate API responses with JSON assertions', icon: <IcoApi /> },
    { key: 'whatsapp',        label: 'WhatsApp Alerts',          desc: 'Send downtime and recovery alerts via WhatsApp', icon: <IcoWhatsApp /> },
    { key: 'telegram',        label: 'Telegram Alerts',          desc: 'Send downtime and recovery alerts via Telegram bot', icon: <IcoTelegram /> },
    { key: 'webhook',         label: 'Webhook Integration',      desc: 'Send alert payloads to custom webhook URLs', icon: <IcoWebhook /> },
    { key: 'rocketChat',      label: 'Rocket.Chat Integration',  desc: 'Send alerts to Rocket.Chat channels', icon: <IcoRocketChat /> },
    { key: 'slack',           label: 'Slack Integration',        desc: 'Send alerts to your Slack channel via incoming webhook', icon: <IcoSlackFA /> },
    { key: 'discord',         label: 'Discord Integration',      desc: 'Post status updates to your Discord server via webhook', icon: <IcoDiscordFA /> },
    { key: 'reports',         label: 'Weekly / Monthly Reports', desc: 'Generate and download automated monitoring reports', icon: <IcoReports /> },
];

const PLAN_FEATURES = [
    { key: 'pingMonitor',     label: 'Port Monitoring',          desc: 'Monitor connectivity for any host, IP or URL with live ping', icon: <IcoPing /> },
    { key: 'pingMonitorIcmp', label: 'Ping Monitoring',              desc: 'Make sure your server or any device in the network is always available', icon: <IcoTarget /> },
    { key: 'dnsMonitor',      label: 'DNS Monitoring',                desc: 'Monitor DNS servers and verify that DNS records resolve to expected values', icon: <IcoDns /> },
    { key: 'udpMonitor',      label: 'UDP Monitoring',                desc: 'Monitor UDP services on your server. Useful for DNS, SNMP and other services that accept and respond to UDP data', icon: <IcoUdp /> },
    { key: 'apiMonitor',      label: 'API Monitoring',                desc: 'Validate API responses with JSON assertions', icon: <IcoApi /> },
    { key: 'whatsapp',        label: 'WhatsApp Alerts',          desc: 'Send downtime and recovery alerts via WhatsApp', icon: <IcoWhatsApp /> },
    { key: 'telegram',        label: 'Telegram Alerts',          desc: 'Send downtime and recovery alerts via Telegram bot', icon: <IcoTelegram /> },
    { key: 'webhook',         label: 'Webhook Integration',      desc: 'Send alert payloads to custom webhook URLs', icon: <IcoWebhook /> },
    { key: 'rocketChat',      label: 'Rocket.Chat Integration',  desc: 'Send alerts to Rocket.Chat channels', icon: <IcoRocketChat /> },
    { key: 'slack',           label: 'Slack Integration',        desc: 'Send alerts to your Slack channel via incoming webhook', icon: <IcoSlackFA /> },
    { key: 'discord',         label: 'Discord Integration',      desc: 'Post status updates to your Discord server via webhook', icon: <IcoDiscordFA /> },
    { key: 'reports',         label: 'Weekly / Monthly Reports', desc: 'Generate and download automated monitoring reports', icon: <IcoReports /> },
];
const BRONZE_FEATURES = PLAN_FEATURES;
const SILVER_FEATURES = PLAN_FEATURES;
const GOLD_FEATURES   = PLAN_FEATURES;

const FEATURE_ACCESS_STYLES = `
  .perf-page-container {
    --primary: #7c3aed;
    --primary-hover: #6d28d9;
    --success: #10b981;
    --danger: #ef4444;
    --warning: #f59e0b;
    font-family: 'Plus Jakarta Sans', sans-serif;
    min-height: 100vh;
    background-color: var(--bg-primary);
    color: var(--text-main);
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  /* Light Theme Scope */
  .perf-page-container.light {
    --bg-primary: #f8fafc;
    --bg-card: #ffffff;
    --bg-input: #f1f5f9;
    --border-color: rgba(226, 232, 240, 0.8);
    --text-main: #0f172a;
    --text-muted: #64748b;
    --card-shadow: 0 4px 20px -2px rgba(148, 163, 184, 0.06), 0 2px 8px -1px rgba(148, 163, 184, 0.04);
    --card-hover-shadow: 0 12px 30px -4px rgba(148, 163, 184, 0.12), 0 4px 12px -2px rgba(148, 163, 184, 0.06);
    --hover-row-bg: rgba(124, 58, 237, 0.04);
    
    --allowed-bg: #eef2ff;
    --allowed-border: #c7d2fe;
    --allowed-text: #4f46e5;
    
    --blocked-bg: #f3f4f6;
    --blocked-border: #e5e7eb;
    --blocked-text: #6b7280;
    
    --table-header-bg: #f8fafc;
    
    --warning-card-bg: #fffbeb;
    --warning-card-border: #fde68a;
    --warning-card-text: #92400e;
    
    --bronze-badge-bg: #fef3c7;
    --bronze-badge-border: #fde68a;
    --bronze-badge-text: #b45309;
  }

  /* Dark Theme Scope */
  .perf-page-container.dark {
    --bg-primary: #0b0f19;
    --bg-card: #131a26;
    --bg-input: #1b2535;
    --border-color: rgba(255, 255, 255, 0.07);
    --text-main: #f8fafc;
    --text-muted: #94a3b8;
    --card-shadow: 0 4px 25px -2px rgba(0, 0, 0, 0.35), 0 2px 10px -1px rgba(0, 0, 0, 0.2);
    --card-hover-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.55), 0 6px 16px -2px rgba(0, 0, 0, 0.3);
    --hover-row-bg: rgba(124, 58, 237, 0.08);
    
    --allowed-bg: rgba(124, 58, 237, 0.08);
    --allowed-border: rgba(124, 58, 237, 0.25);
    --allowed-text: #a78bfa;
    
    --blocked-bg: rgba(255, 255, 255, 0.02);
    --blocked-border: rgba(255, 255, 255, 0.08);
    --blocked-text: #94a3b8;
    
    --table-header-bg: #101622;
    
    --warning-card-bg: rgba(245, 158, 11, 0.06);
    --warning-card-border: rgba(245, 158, 11, 0.15);
    --warning-card-text: #f59e0b;
    
    --bronze-badge-bg: rgba(180, 83, 9, 0.08);
    --bronze-badge-border: rgba(180, 83, 9, 0.2);
    --bronze-badge-text: #b45309;
  }

  body.charts-dark-theme {
    background-color: #0b0f19 !important;
  }
  body.charts-dark-theme .app-main,
  body.charts-dark-theme .content {
    background-color: #0b0f19 !important;
    transition: background-color 0.3s ease;
  }

  /* Layout and elements */
  .perf-page-container .pg-wrap {
    padding: 24px;
    background: transparent !important;
  }

  .perf-page-container .pg-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 28px;
    flex-wrap: wrap;
    gap: 16px;
  }
  
  .perf-page-container .pg-title {
    font-family: 'Outfit', sans-serif;
    font-size: 28px;
    font-weight: 900;
    color: var(--text-main);
    margin: 0;
  }
  
  .perf-page-container .pg-sub {
    font-size: 14px;
    color: var(--text-muted);
    margin: 4px 0 0 0;
    font-weight: 500;
  }

  .perf-page-container .form-card {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 20px;
    box-shadow: var(--card-shadow);
    overflow: hidden;
    margin-bottom: 24px;
  }
  
  .perf-page-container .form-card-title-row {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    padding: 14px 20px;
    background: var(--table-header-bg);
    border-bottom: 1px solid var(--border-color) !important;
  }
  
  .perf-page-container .form-card-title-lbl {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .perf-page-container .feature-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color) !important;
    gap: 16px;
    transition: background-color 0.15s ease;
  }
  
  .perf-page-container .feature-row:last-child {
    border-bottom: none !important;
  }
  
  .perf-page-container .feature-row:hover {
    background-color: var(--hover-row-bg) !important;
  }
  
  .perf-page-container .feature-icon-box {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
    transition: all 0.2s;
  }
  
  .perf-page-container .feature-label {
    font-weight: 700;
    font-size: 14.5px;
    color: var(--text-main);
    margin-bottom: 2px;
  }
  
  .perf-page-container .feature-desc {
    font-size: 13px;
    color: var(--text-muted);
  }
  
  .perf-page-container .status-badge {
    font-size: 11.5px;
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 20px;
    border-width: 1px;
    border-style: solid;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  
  .perf-page-container .warning-banner {
    padding: 14px 20px;
    background: var(--warning-card-bg) !important;
    border: 1px solid var(--warning-card-border) !important;
    border-radius: 14px;
    font-size: 13.5px;
    color: var(--warning-card-text) !important;
    line-height: 1.6;
    margin-top: 12px;
    font-weight: 500;
  }

  .perf-page-container .btn-primary {
    background: linear-gradient(135deg, #7c3aed, #6d28d9);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 10px 24px;
    font-weight: 700;
    font-size: 13.5px;
    cursor: pointer;
    font-family: inherit;
    box-shadow: 0 2px 8px rgba(124, 58, 237, 0.15);
    transition: all 0.2s ease;
  }
  
  .perf-page-container .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);
  }
  
  .perf-page-container .btn-primary:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }
  
  .perf-page-container .toast-box {
    border-radius: 10px;
    padding: 12px 18px;
    margin-bottom: 24px;
    font-weight: 700;
    font-size: 14px;
  }

  /* Custom toggle switch */
  .perf-page-container .switch-btn {
    width: 48px;
    height: 26px;
    border-radius: 13px;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s ease;
    position: relative;
    flex-shrink: 0;
  }
  .perf-page-container.light .switch-btn {
    background: #e2e8f0;
  }
  .perf-page-container.dark .switch-btn {
    background: #374151;
  }
  .perf-page-container .switch-btn.checked {
    background: var(--primary);
  }
  
  .perf-page-container .switch-btn-circle {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    transition: left 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  }
  .perf-page-container .switch-btn.checked .switch-btn-circle {
    left: 25px;
  }

  /* Read Only Badge */
  .perf-page-container .readonly-badge {
    font-size: 12px;
    font-weight: 700;
    border-radius: 8px;
    padding: 7px 14px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .perf-page-container.light .readonly-badge {
    color: #92400e;
    background: #fef3c7;
    border: 1px solid #fde68a;
  }
  .perf-page-container.dark .readonly-badge {
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.2);
  }
`;

export default function FeatureAccess({ readOnly = false }) {
    const DEFAULT_ACC = { pingMonitor: false, pingMonitorIcmp: false, dnsMonitor: false, udpMonitor: false, apiMonitor: false, whatsapp: false, telegram: false, webhook: false, rocketChat: false, slack: false, discord: false, reports: false };
    const [access,     setAccess]     = useState({ domainSsl: false, charts: false, ...DEFAULT_ACC });
    const [bronzeAcc,  setBronzeAcc]  = useState({ ...DEFAULT_ACC });
    const [silverAcc,  setSilverAcc]  = useState({ ...DEFAULT_ACC });
    const [goldAcc,    setGoldAcc]    = useState({ ...DEFAULT_ACC });
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');

    const [localTheme, setLocalTheme] = useState(() => {
        const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
        return match ? match[1] : 'dark';
    });

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    useEffect(() => {
        adminGetSettings().then(r => {
            if (r.data.freeTrialAccess) setAccess(prev => ({ ...prev, ...r.data.freeTrialAccess }));
            if (r.data.bronzeAccess)    setBronzeAcc(prev => ({ ...prev, ...r.data.bronzeAccess }));
            if (r.data.silverAccess)    setSilverAcc(prev => ({ ...prev, ...r.data.silverAccess }));
            if (r.data.goldAccess)      setGoldAcc(prev => ({ ...prev, ...r.data.goldAccess }));
        }).catch(() => showToast('Failed to load settings'));
    }, []);

    useEffect(() => {
        const checkThemeCookie = () => {
            const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
            const current = match ? match[1] : 'dark';
            if (current !== localTheme) {
                setLocalTheme(current);
            }
        };
        checkThemeCookie();
        const interval = setInterval(checkThemeCookie, 1000);
        return () => clearInterval(interval);
    }, [localTheme]);

    useEffect(() => {
        if (localTheme === 'dark') {
            document.body.classList.add('charts-dark-theme');
        } else {
            document.body.classList.remove('charts-dark-theme');
        }
        return () => {
            document.body.classList.remove('charts-dark-theme');
        };
    }, [localTheme]);

    const toggle       = (key) => { if (!readOnly) setAccess(prev => ({ ...prev, [key]: !prev[key] })); };
    const toggleBronze = (key) => { if (!readOnly) setBronzeAcc(prev => ({ ...prev, [key]: !prev[key] })); };
    const toggleSilver = (key) => { if (!readOnly) setSilverAcc(prev => ({ ...prev, [key]: !prev[key] })); };
    const toggleGold   = (key) => { if (!readOnly) setGoldAcc(prev => ({ ...prev, [key]: !prev[key] })); };

    const save = async () => {
        setSaving(true);
        try {
            await adminUpdateSettings({ freeTrialAccess: access, bronzeAccess: bronzeAcc, silverAccess: silverAcc, goldAccess: goldAcc });
            showToast('✅ Saved!');
        } catch { showToast('❌ Save failed'); }
        setSaving(false);
    };

    const isDark = localTheme === 'dark';
    const isSuccess = toast.startsWith('✅');

    const getToastStyle = () => {
        if (!toast) return {};
        if (isSuccess) {
            return isDark
                ? { background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#10B981' }
                : { background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D' };
        } else {
            return isDark
                ? { background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.25)', color: '#F43F5E' }
                : { background: '#FEF2F2', border: '1px solid #FECDD3', color: '#DC2626' };
        }
    };

    return (
        <div className={`perf-page-container ${localTheme}`}>
            <style>{FEATURE_ACCESS_STYLES}</style>
            
            <div className="pg-wrap">
                {/* Page Header */}
                <div className="pg-header">
                    <div>
                        <h1 className="pg-title">
                            Free Trial Feature Access <span style={{ color: 'var(--primary)' }}>.</span>
                        </h1>
                        <p className="pg-sub">
                            Control which features Free Trial users can access
                        </p>
                    </div>
                    {readOnly
                        ? <span className="readonly-badge">👁 Read Only</span>
                        : <button onClick={save} disabled={saving} className="btn-primary">
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                    }
                </div>

                {/* Toast */}
                {toast && (
                    <div className="toast-box" style={getToastStyle()}>
                        {toast}
                    </div>
                )}

                {/* Features table card */}
                <div className="form-card">
                    {/* Table header */}
                    <div className="form-card-title-row">
                        <span className="form-card-title-lbl">Feature</span>
                        <span className="form-card-title-lbl">Access</span>
                    </div>

                    {/* Feature rows */}
                    {FEATURES.map((f, i) => {
                        const allowed = !!access[f.key];
                        return (
                            <div key={f.key} className="feature-row">
                                {/* Icon + label */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <div 
                                        className="feature-icon-box"
                                        style={{
                                            background: allowed ? 'var(--allowed-bg)' : 'var(--blocked-bg)',
                                            border: `1px solid ${allowed ? 'var(--allowed-border)' : 'var(--blocked-border)'}`
                                        }}
                                    >
                                        {f.icon}
                                    </div>
                                    <div>
                                        <div className="feature-label">
                                            {f.label}
                                        </div>
                                        <div className="feature-desc">
                                            {f.desc}
                                        </div>
                                    </div>
                                </div>

                                {/* Status badge + toggle */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                                    <span 
                                        className="status-badge"
                                        style={{
                                            background: allowed ? 'var(--allowed-bg)' : 'var(--blocked-bg)',
                                            color: allowed ? 'var(--allowed-text)' : 'var(--blocked-text)',
                                            borderColor: allowed ? 'var(--allowed-border)' : 'var(--blocked-border)'
                                        }}
                                    >
                                        {allowed ? 'Allowed' : 'Blocked'}
                                    </span>
                                    <Toggle checked={allowed} onChange={() => toggle(f.key)} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Info note */}
                <div className="warning-banner">
                    Changes take effect immediately for all Free Trial users.
                </div>

                {/* ── Bronze Plan Access ── */}
                <div style={{ marginTop: 32 }}>
                    <div style={{ marginBottom: 16 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)', margin: '0 0 4px', fontFamily: 'Outfit, sans-serif' }}>
                            🥉 Bronze Plan Feature Access
                        </h2>
                        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>
                            Control which features Bronze plan users can access
                        </p>
                    </div>
                    
                    <div className="form-card">
                        <div className="form-card-title-row">
                            <span className="form-card-title-lbl">Feature</span>
                            <span className="form-card-title-lbl">Access</span>
                        </div>
                        {BRONZE_FEATURES.map((f, i) => {
                            const allowed = !!bronzeAcc[f.key];
                            return (
                                <div key={f.key} className="feature-row">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <div 
                                            className="feature-icon-box"
                                            style={{ 
                                                background: allowed ? 'var(--allowed-bg)' : 'var(--blocked-bg)', 
                                                border: `1px solid ${allowed ? 'var(--allowed-border)' : 'var(--blocked-border)'}` 
                                            }}
                                        >
                                            {f.icon}
                                        </div>
                                        <div>
                                            <div className="feature-label">{f.label}</div>
                                            <div className="feature-desc">{f.desc}</div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                                        <span 
                                            className="status-badge"
                                            style={{ 
                                                background: allowed ? 'var(--allowed-bg)' : 'var(--blocked-bg)', 
                                                color: allowed ? 'var(--allowed-text)' : 'var(--blocked-text)', 
                                                borderColor: allowed ? 'var(--allowed-border)' : 'var(--blocked-border)' 
                                            }}
                                        >
                                            {allowed ? 'Allowed' : 'Blocked'}
                                        </span>
                                        <Toggle checked={allowed} onChange={() => toggleBronze(f.key)} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    <div className="warning-banner">
                        Changes take effect immediately for all Bronze plan users.
                    </div>
                </div>

                {/* ── Silver Plan Access ── */}
                {[
                    { label: '🥈 Silver Plan Feature Access', sub: 'Control which features Silver plan users can access', acc: silverAcc, toggle: toggleSilver, banner: 'Changes take effect immediately for all Silver plan users.' },
                    { label: '🥇 Gold Plan Feature Access',   sub: 'Control which features Gold plan users can access',   acc: goldAcc,   toggle: toggleGold,   banner: 'Changes take effect immediately for all Gold plan users.' },
                ].map(({ label, sub, acc, toggle: tog, banner }) => (
                    <div key={label} style={{ marginTop: 32 }}>
                        <div style={{ marginBottom: 16 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)', margin: '0 0 4px', fontFamily: 'Outfit, sans-serif' }}>{label}</h2>
                            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>{sub}</p>
                        </div>
                        <div className="form-card">
                            <div className="form-card-title-row">
                                <span className="form-card-title-lbl">Feature</span>
                                <span className="form-card-title-lbl">Access</span>
                            </div>
                            {PLAN_FEATURES.map((f) => {
                                const allowed = !!acc[f.key];
                                return (
                                    <div key={f.key} className="feature-row">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                            <div className="feature-icon-box" style={{ background: allowed ? 'var(--allowed-bg)' : 'var(--blocked-bg)', border: `1px solid ${allowed ? 'var(--allowed-border)' : 'var(--blocked-border)'}` }}>
                                                {f.icon}
                                            </div>
                                            <div>
                                                <div className="feature-label">{f.label}</div>
                                                <div className="feature-desc">{f.desc}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                                            <span className="status-badge" style={{ background: allowed ? 'var(--allowed-bg)' : 'var(--blocked-bg)', color: allowed ? 'var(--allowed-text)' : 'var(--blocked-text)', borderColor: allowed ? 'var(--allowed-border)' : 'var(--blocked-border)' }}>
                                                {allowed ? 'Allowed' : 'Blocked'}
                                            </span>
                                            <Toggle checked={allowed} onChange={() => tog(f.key)} disabled={readOnly} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="warning-banner">{banner}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
