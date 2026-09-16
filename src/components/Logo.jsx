export default function Logo({ size = 56, withGlow = true }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={withGlow ? 'drop-shadow-[0_0_18px_rgba(168,85,247,0.45)]' : ''}
    >
      <defs>
        <linearGradient id="nexus-g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a855f7" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="52" height="52" rx="15" fill="url(#nexus-g)" fillOpacity="0.14" />
      <rect x="6" y="6" width="52" height="52" rx="15" stroke="url(#nexus-g)" strokeWidth="2.5" />
      <path d="M36 8 L20 38 h10 L26 56 L46 22 h-11 Z" fill="url(#nexus-g)" />
    </svg>
  )
}
