// src/components/illustrations/LinocutSceneSVG.tsx
import React from "react";

interface Props {
  sceneType?: string;
  eraId: number;
  yearText?: string;
  className?: string;
}

export const LinocutSceneSVG: React.FC<Props> = ({
  sceneType = "podium",
  eraId,
  yearText = "",
  className = "",
}) => {
  const palettes: Record<number, { bg: string; fg: string; red: string; gold: string }> = {
    1: { bg: "#E8D8B9", fg: "#4A3220", red: "#B5382A", gold: "#C9A24A" },
    2: { bg: "#D8E0E5", fg: "#2C3A42", red: "#A4533A", gold: "#D9B84A" },
    3: { bg: "#E4EFEA", fg: "#1D5B4F", red: "#C62828", gold: "#D4A338" },
    4: { bg: "#DCE3EE", fg: "#14305C", red: "#C62828", gold: "#D9A92B" },
    5: { bg: "#FBECC8", fg: "#7C131E", red: "#C8102E", gold: "#E3B23C" },
  };

  const p = palettes[eraId] || palettes[1];

  let centerArt = (
    <>
      <rect x="65" y="128" width="130" height="52" fill={p.red} stroke={p.fg} strokeWidth="4" />
      <rect x="92" y="96" width="76" height="32" fill={p.gold} stroke={p.fg} strokeWidth="3.5" />
      <polygon points="130,38 139,64 166,64 144,80 152,106 130,90 108,106 116,80 94,64 121,64" fill={p.red} stroke={p.fg} strokeWidth="3" />
    </>
  );

  if (sceneType === "ballot") {
    centerArt = (
      <>
        <rect x="75" y="105" width="110" height="75" fill={p.red} stroke={p.fg} strokeWidth="4" />
        <rect x="105" y="112" width="50" height="6" fill="#231811" />
        <polygon points="130,130 135,142 148,142 138,149 142,162 130,154 118,162 122,149 112,142 125,142" fill={p.gold} />
        <g transform="rotate(-14 130 85)">
          <rect x="110" y="45" width="42" height="58" fill="#FFFDF7" stroke={p.fg} strokeWidth="3.5" />
          <line x1="118" y1="62" x2="144" y2="62" stroke={p.red} strokeWidth="3" />
          <line x1="118" y1="74" x2="140" y2="74" stroke={p.fg} strokeWidth="2.5" />
        </g>
      </>
    );
  } else if (sceneType === "constitution") {
    centerArt = (
      <>
        <rect x="82" y="48" width="96" height="124" rx="6" fill={p.red} stroke={p.fg} strokeWidth="4" />
        <rect x="92" y="48" width="10" height="124" fill={p.fg} />
        <polygon points="136,76 142,92 158,92 145,101 150,117 136,107 122,117 127,101 114,92 130,92" fill={p.gold} />
        <rect x="112" y="132" width="48" height="10" fill={p.gold} />
      </>
    );
  } else if (sceneType === "gears") {
    centerArt = (
      <>
        <circle cx="98" cy="95" r="32" fill={p.fg} stroke="#FFFDF7" strokeWidth="3" strokeDasharray="10 5" />
        <circle cx="98" cy="95" r="14" fill={p.gold} />
        <circle cx="162" cy="95" r="32" fill={p.red} stroke="#FFFDF7" strokeWidth="3" strokeDasharray="10 5" />
        <circle cx="162" cy="95" r="14" fill={p.gold} />
        <circle cx="130" cy="145" r="28" fill={p.gold} stroke={p.fg} strokeWidth="3.5" strokeDasharray="8 4" />
        <circle cx="130" cy="145" r="11" fill={p.red} />
      </>
    );
  } else if (sceneType === "birds") {
    centerArt = (
      <>
        <path d="M55 135 L95 110 L82 142 L115 128 Z" fill="#FFFDF7" stroke={p.fg} strokeWidth="3" />
        <path d="M110 95 L165 62 L145 112 L185 88 Z" fill={p.gold} stroke={p.fg} strokeWidth="3.5" />
        <path d="M160 135 L210 105 L192 145 L220 128 Z" fill={p.red} stroke={p.fg} strokeWidth="3" />
      </>
    );
  } else if (sceneType === "scale") {
    centerArt = (
      <>
        <line x1="130" y1="42" x2="130" y2="168" stroke={p.fg} strokeWidth="6" />
        <rect x="90" y="164" width="80" height="12" fill={p.fg} />
        <line x1="72" y1="78" x2="188" y2="78" stroke={p.fg} strokeWidth="5" />
        <polygon points="72,80 52,126 92,126" fill={p.red} stroke={p.fg} strokeWidth="3" />
        <polygon points="188,80 168,126 208,126" fill={p.red} stroke={p.fg} strokeWidth="3" />
        <circle cx="130" cy="68" r="14" fill={p.gold} stroke={p.fg} strokeWidth="3" />
      </>
    );
  }

  return (
    <svg
      viewBox="0 0 260 210"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="260" height="210" fill={p.bg} />
      <g opacity="0.24" fill={p.gold}>
        <polygon points="130,115 0,0 45,0" />
        <polygon points="130,115 95,0 165,0" />
        <polygon points="130,115 215,0 260,0" />
        <polygon points="130,115 260,60 260,120" />
        <polygon points="130,115 0,60 0,120" />
      </g>
      <rect x="8" y="8" width="244" height="194" fill="none" stroke={p.fg} strokeWidth="3" />
      {centerArt}
      <rect x="8" y="176" width="244" height="26" fill={p.fg} />
      <text
        x="130"
        y="194"
        textAnchor="middle"
        fill="#FFFDF7"
        fontFamily="Oswald, sans-serif"
        fontSize="13"
        fontWeight="700"
        letterSpacing="2"
      >
        TRANH TƯ LIỆU · {yearText}
      </text>
    </svg>
  );
};
