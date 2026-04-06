export default function QuillSvg() {
  return (
    <svg
      viewBox="0 0 80 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M40 10 C55 30 70 60 65 90 C60 120 45 140 40 160 C35 140 20 120 15 90 C10 60 25 30 40 10Z"
        fill="url(#featherGrad)"
        opacity="0.9"
      />
      <line
        x1="40"
        y1="10"
        x2="40"
        y2="185"
        stroke="#8b6020"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M40 30 C32 35 22 42 18 52" stroke="#c8a060" strokeWidth="0.8" opacity="0.6" />
      <path d="M40 45 C31 50 20 58 16 68" stroke="#c8a060" strokeWidth="0.8" opacity="0.6" />
      <path d="M40 60 C31 65 20 73 16 83" stroke="#c8a060" strokeWidth="0.8" opacity="0.6" />
      <path d="M40 75 C32 79 22 87 19 96" stroke="#c8a060" strokeWidth="0.7" opacity="0.5" />
      <path d="M40 30 C48 35 58 42 62 52" stroke="#c8a060" strokeWidth="0.8" opacity="0.6" />
      <path d="M40 45 C49 50 60 58 64 68" stroke="#c8a060" strokeWidth="0.8" opacity="0.6" />
      <path d="M40 60 C49 65 60 73 64 83" stroke="#c8a060" strokeWidth="0.8" opacity="0.6" />
      <path d="M38 170 C36 178 35 183 40 190 C45 183 44 178 42 170 Z" fill="#2c1810" />
      <path d="M40 175 L40 188" stroke="#1a0f08" strokeWidth="0.8" />
      <defs>
        <linearGradient
          id="featherGrad"
          x1="0"
          y1="0"
          x2="80"
          y2="200"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#f5ede0" />
          <stop offset="40%" stopColor="#e8d8b8" />
          <stop offset="100%" stopColor="#c8a860" />
        </linearGradient>
      </defs>
    </svg>
  );
}
