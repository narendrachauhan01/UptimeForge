import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getWaStatus, API_URL } from '../api';

export default function WhatsAppPage() {
  const [status, setStatus] = useState('connecting');
  const [qr, setQr] = useState(null);

  useEffect(() => {
    getWaStatus().then(r => {
      setStatus(r.data.status);
      setQr(r.data.qr);
    });

    const socket = io(API_URL);
    socket.on('wa:status', (data) => {
      setStatus(data.status);
      setQr(data.qr || null);
    });

    return () => socket.disconnect();
  }, []);

  const statusLabel = {
    ready: 'Connected & Ready',
    qr: 'Scan QR to Connect',
    connecting: 'Connecting...',
    disconnected: 'Disconnected',
  };

  return (
    <div className="pg-wrap">
      <div className="pg-header">
        <div>
          <h1 className="pg-title">WhatsApp Sender</h1>
          <p className="pg-sub">Connect WhatsApp to send site down alerts</p>
        </div>
      </div>

      <div className={`wa-status wa-${status}`}>
        <span style={{fontSize:20}}>
          {status === 'ready' ? '✅' : status === 'qr' ? '📱' : status === 'connecting' ? '⏳' : '❌'}
        </span>
        {statusLabel[status] || status}
      </div>

      <div className="card">
        {status === 'ready' && (
          <div style={{textAlign:'center', padding:30}}>
            <div style={{fontSize:64}}>✅</div>
            <h3 style={{marginTop:16, color:'#16a34a'}}>WhatsApp Connected!</h3>
            <p style={{color:'#555', marginTop:8}}>Alerts will be sent automatically when a server goes down.</p>
          </div>
        )}

        {status === 'qr' && qr && (
          <div className="qr-box">
            <img src={qr} alt="WhatsApp QR Code" />
            <p>Open WhatsApp on your phone → Linked Devices → Link a Device → Scan this QR</p>
          </div>
        )}

        {status === 'connecting' && (
          <div className="empty">Connecting to WhatsApp... please wait.</div>
        )}

        {status === 'disconnected' && (
          <div style={{textAlign:'center', padding:30}}>
            <div style={{fontSize:64}}>❌</div>
            <h3 style={{marginTop:16, color:'#dc2626'}}>Disconnected</h3>
            <p style={{color:'#555', marginTop:8}}>WhatsApp is disconnected. It will reconnect automatically in 10 seconds.</p>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{fontSize:15, marginBottom:12}}>How it works</h3>
        <ul style={{paddingLeft:20, fontSize:14, color:'#555', lineHeight:2}}>
          <li>One WhatsApp account is used as the sender (linked via QR code)</li>
          <li>When a server goes down, all active recipients get a WhatsApp alert</li>
          <li>When the server recovers, a recovery message is sent automatically</li>
          <li>Alerts have a 30-minute cooldown to prevent spam</li>
          <li>Session is saved — no need to scan QR again after restart</li>
        </ul>
      </div>
    </div>
  );
}
