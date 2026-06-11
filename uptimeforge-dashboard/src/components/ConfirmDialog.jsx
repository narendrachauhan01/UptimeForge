import React from 'react';

export default function ConfirmDialog({ open, title, message, confirmText = 'Confirm', cancelText = 'Cancel', danger = true, onConfirm, onCancel }) {
    if (!open) return null;
    return (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:99999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
            onClick={onCancel}>
            <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:400, padding:28, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ fontSize:32, marginBottom:12, textAlign:'center' }}>{danger ? '⚠️' : 'ℹ️'}</div>
                {title && <div style={{ fontSize:17, fontWeight:800, color:'#111827', textAlign:'center', marginBottom:8 }}>{title}</div>}
                <div style={{ fontSize:14, color:'#6B7280', textAlign:'center', lineHeight:1.6, marginBottom:24 }}>{message}</div>
                <div style={{ display:'flex', gap:10 }}>
                    <button onClick={onCancel} style={{ flex:1, padding:'11px', border:'1.5px solid #E5E7EB', borderRadius:10, background:'#fff', color:'#374151', fontWeight:600, fontSize:14, cursor:'pointer' }}>
                        {cancelText}
                    </button>
                    <button onClick={onConfirm} style={{ flex:1, padding:'11px', border:'none', borderRadius:10, background: danger ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer' }}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Hook for easy use
export function useConfirm() {
    const [state, setState] = React.useState({ open: false, resolve: null, title:'', message:'', confirmText:'Confirm', danger:true });

    const confirm = (message, { title = '', confirmText = 'Confirm', danger = true } = {}) => {
        return new Promise(resolve => {
            setState({ open:true, resolve, title, message, confirmText, danger });
        });
    };

    const handleConfirm = () => { state.resolve(true);  setState(s => ({ ...s, open:false })); };
    const handleCancel  = () => { state.resolve(false); setState(s => ({ ...s, open:false })); };

    const Dialog = () => (
        <ConfirmDialog open={state.open} title={state.title} message={state.message}
            confirmText={state.confirmText} danger={state.danger}
            onConfirm={handleConfirm} onCancel={handleCancel} />
    );

    return { confirm, Dialog };
}
