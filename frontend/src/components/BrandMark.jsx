export default function BrandMark({
  size = 32,
  className = '',
  accent = '#E9B44B',
  ink = '#0B1A2F',
  radius = 2,
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="Parcel Point logo"
    >
      <rect x="0" y="0" width="32" height="32" rx={radius} fill={accent} />
      <path
        d="M7 11.5 16 7l9 4.5v9L16 25l-9-4.5z"
        fill="none"
        stroke={ink}
        strokeWidth="2"
        strokeLinejoin="miter"
      />
      <path
        d="M7 11.5 16 16l9-4.5M16 16v9"
        fill="none"
        stroke={ink}
        strokeWidth="2"
        strokeLinejoin="miter"
      />
    </svg>
  );
}
