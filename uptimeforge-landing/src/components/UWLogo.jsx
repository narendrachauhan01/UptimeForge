
export default function UWLogo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="uw-blue" cx="38%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#64C8F5" />
          <stop offset="55%" stopColor="#2196F3" />
          <stop offset="100%" stopColor="#0D47A1" />
        </radialGradient>
        <linearGradient id="uw-ring" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#76C442" />
          <stop offset="100%" stopColor="#33691E" />
        </linearGradient>
        <filter id="uw-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Blue globe */}
      <circle cx="48" cy="50" r="38" fill="url(#uw-blue)" />

      {/* Globe grid lines */}
      <ellipse cx="48" cy="50" rx="38" ry="18" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2"/>
      <ellipse cx="48" cy="50" rx="20" ry="38" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2"/>
      <line x1="10" y1="50" x2="86" y2="50" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2"/>
      <line x1="48" y1="12" x2="48" y2="88" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2"/>

      {/* Clock tick marks */}
      <line x1="48" y1="18" x2="48" y2="24" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="48" y1="76" x2="48" y2="82" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="16" y1="50" x2="22" y2="50" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="74" y1="50" x2="80" y2="50" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>

      {/* Checkmark inside clock */}
      <path d="M32 50 L43 63 L66 36" stroke="white" strokeWidth="6" fill="none"
        strokeLinecap="round" strokeLinejoin="round" filter="url(#uw-glow)"/>

      {/* Green orbital ring — rotated ellipse */}
      <ellipse cx="50" cy="54" rx="52" ry="16"
        fill="none" stroke="url(#uw-ring)" strokeWidth="7"
        strokeLinecap="round"
        transform="rotate(-22 50 54)"
        opacity="0.95"/>

      {/* Green glowing ball on ring (top-right) */}
      <circle cx="88" cy="24" r="7" fill="#76C442" filter="url(#uw-glow)"/>
      <circle cx="88" cy="24" r="4" fill="#AEEA00"/>

      {/* Highlight on globe */}
      <ellipse cx="36" cy="34" rx="10" ry="6"
        fill="rgba(255,255,255,0.18)" transform="rotate(-30 36 34)"/>
    </svg>
  );
}
