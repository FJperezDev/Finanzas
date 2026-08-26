import React from "react";

export function MyIcon({ className }: { className?: string }) {
  return (
    <svg
      style={{ width: "100%", height: "100%" }} // <-- ESTO ES LA CLAVE
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1000 500"
      role="img"
      aria-labelledby="title desc"
    >
      <title id="title">FJ Dev — Personal Brand</title>
      <desc id="desc">
        Modern FJ monogram with a dark, warm and golden visual identity.
      </desc>
      <defs>
        <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F4B72B" />
          <stop offset="50%" stopColor="#FCCB43" />
          <stop offset="100%" stopColor="#FFE7A3" />
        </linearGradient>
        <linearGradient id="goldDev" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F7B92F" />
          <stop offset="45%" stopColor="#FFD45E" />
          <stop offset="100%" stopColor="#FFF1C7" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="12"
            stdDeviation="14"
            floodColor="#F4B72B"
            floodOpacity="0.12"
          />
        </filter>
      </defs>
      <g transform="translate(70 55)" filter="url(#shadow)">
        <path
          fill="#F1F1F1"
          d="M55 355 V45 H285 L250 105 H125 V170 H235 L205 225 H125 V355 Z"
        />
        <path
          fill="url(#gold)"
          d="M355 45 H465 V250 C465 330 415 375 330 375 C265 375 220 345 195 300 L245 260 C263 295 290 315 330 315 C375 315 395 290 395 245 V105 H335 Z"
        />
      </g>
      <text
        x="535"
        y="365"
        fill="url(#goldDev)"
        fontFamily="Inter, Helvetica, Arial, sans-serif"
        fontSize="210"
        fontWeight="800"
        letterSpacing="-10"
      >
        dev
      </text>
      <rect
        x="550"
        y="405"
        width="310"
        height="5"
        rx="2.5"
        fill="url(#gold)"
        opacity="0.9"
      />
    </svg>
  );
}
