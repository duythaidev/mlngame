// src/components/illustrations/MilestonePortalCard.tsx
import React from "react";
import { ERAS_DATA } from "./erasData";

export interface MilestonePortalCardProps {
  currentEra: number;
  className?: string;
  onSelectEra?: (era: number) => void;
  id?: string;
}

const PORTAL_NAMES = [
  { id: 1, label: "Lv1: Cổng Làng Gạch Đỏ" },
  { id: 2, label: "Lv2: Cổng Nhà Máy Thép H" },
  { id: 3, label: "Lv3: Vòm Đá Quốc Hội" },
  { id: 4, label: "Lv4: Khung Thép Xanh Navy" },
  { id: 5, label: "Lv5: Cổng Hoàng Kim Mặt Trời" },
];

export const MilestonePortalCard: React.FC<MilestonePortalCardProps> = ({
  currentEra,
  className = "",
  onSelectEra,
  id,
}) => {
  const era = ERAS_DATA[currentEra] || ERAS_DATA[1];

  function renderPortalSVG() {
    if (currentEra === 1) {
      // Level 1: Cổng làng gạch đỏ, mái ngói cong, đèn lồng và cờ đỏ sao vàng
      return (
        <svg className="portal-svg-scene" viewBox="0 0 520 360" xmlns="http://www.w3.org/2000/svg">
          <rect width="520" height="360" fill="#EFE2C6" />
          <circle cx="260" cy="190" r="135" fill="#E3CE9E" opacity="0.6" />
          {/* 2 Trụ gạch đỏ cổ kính */}
          <rect x="95" y="135" width="66" height="215" fill="#A63A2B" stroke="#231811" strokeWidth="4" />
          <rect x="359" y="135" width="66" height="215" fill="#A63A2B" stroke="#231811" strokeWidth="4" />
          {/* Vân gạch */}
          <path d="M95 170H161 M95 210H161 M95 250H161 M95 290H161 M359 170H425 M359 210H425 M359 250H425 M359 290H425" stroke="#231811" strokeWidth="2.5" />
          {/* Vòm cổng làng */}
          <path d="M95 140 H425 V215 H359 C359 170 161 170 161 215 H95 Z" fill="#8C2D20" stroke="#231811" strokeWidth="4" />
          {/* Mái ngói đao cong truyền thống */}
          <path d="M48 142 Q95 135 135 96 L385 96 Q425 135 472 142 Z" fill="#4A3220" stroke="#231811" strokeWidth="4" />
          <path d="M82 98 Q120 92 150 64 L370 64 Q400 92 438 98 Z" fill="#633F26" stroke="#231811" strokeWidth="4" />
          {/* Cờ đỏ sao vàng trên đỉnh cổng */}
          <line x1="260" y1="16" x2="260" y2="66" stroke="#231811" strokeWidth="4" />
          <rect x="260" y="16" width="54" height="34" fill="#C62828" stroke="#231811" strokeWidth="3" />
          <polygon points="287,22 290,30 298,30 291,35 294,43 287,38 280,43 283,35 276,30 284,30" fill="#FFD700" />
          {/* 2 Đèn lồng đỏ treo hai bên */}
          <line x1="128" y1="142" x2="128" y2="168" stroke="#231811" strokeWidth="3" />
          <ellipse cx="128" cy="182" rx="18" ry="15" fill="#D32F2F" stroke="#231811" strokeWidth="3" />
          <line x1="392" y1="142" x2="392" y2="168" stroke="#231811" strokeWidth="3" />
          <ellipse cx="392" cy="182" rx="18" ry="15" fill="#D32F2F" stroke="#231811" strokeWidth="3" />
          {/* Bảng gỗ khắc nổi treo giữa cổng */}
          <rect x="155" y="120" width="210" height="64" rx="6" fill="#4A3220" stroke="#FFD54F" strokeWidth="4" />
          <text x="260" y="148" textAnchor="middle" fill="#FFD54F" fontFamily="Oswald, sans-serif" fontSize="24" fontWeight="700" letterSpacing="2">{era.portalYear}</text>
          <text x="260" y="172" textAnchor="middle" fill="#FFFDF7" fontFamily="Be Vietnam Pro, sans-serif" fontSize="13" fontWeight="800" letterSpacing="1.5">{era.portalSlogan}</text>
          <rect x="40" y="346" width="440" height="14" fill="#231811" />
        </svg>
      );
    } else if (currentEra === 2) {
      // Level 2: Cổng nhà máy bê tông xám, dầm thép chữ H, bóng đèn tròn công nghiệp
      return (
        <svg className="portal-svg-scene" viewBox="0 0 520 360" xmlns="http://www.w3.org/2000/svg">
          <rect width="520" height="360" fill="#DCE3E8" />
          <circle cx="260" cy="190" r="135" fill="#F4A77A" opacity="0.35" />
          {/* Trụ bê tông xám & Dầm thép chữ H */}
          <rect x="88" y="95" width="58" height="255" fill="#788A94" stroke="#231811" strokeWidth="4" />
          <rect x="374" y="95" width="58" height="255" fill="#788A94" stroke="#231811" strokeWidth="4" />
          {/* Dầm chữ H ngang */}
          <rect x="65" y="75" width="390" height="46" fill="#546E7A" stroke="#231811" strokeWidth="4" />
          <line x1="75" y1="86" x2="445" y2="86" stroke="#D9B84A" strokeWidth="3" strokeDasharray="12 8" />
          <line x1="75" y1="110" x2="445" y2="110" stroke="#D9B84A" strokeWidth="3" strokeDasharray="12 8" />
          {/* Bóng đèn tròn công nghiệp */}
          <circle cx="130" cy="136" r="11" fill="#FFE082" stroke="#231811" strokeWidth="3" />
          <circle cx="390" cy="136" r="11" fill="#FFE082" stroke="#231811" strokeWidth="3" />
          {/* Bảng năm công nghiệp */}
          <rect x="148" y="102" width="224" height="68" rx="4" fill="#A4533A" stroke="#231811" strokeWidth="4" />
          <rect x="154" y="108" width="212" height="56" fill="none" stroke="#D9B84A" strokeWidth="2" />
          <text x="260" y="134" textAnchor="middle" fill="#FFE082" fontFamily="Oswald, sans-serif" fontSize="24" fontWeight="700" letterSpacing="2">{era.portalYear}</text>
          <text x="260" y="156" textAnchor="middle" fill="#FFF" fontFamily="Be Vietnam Pro, sans-serif" fontSize="13" fontWeight="800" letterSpacing="1.5">{era.portalSlogan}</text>
          <rect x="40" y="346" width="440" height="14" fill="#231811" />
        </svg>
      );
    } else if (currentEra === 3) {
      // Level 3: Vòm đá cẩm thạch trắng phong cách Nhà Quốc hội
      return (
        <svg className="portal-svg-scene" viewBox="0 0 520 360" xmlns="http://www.w3.org/2000/svg">
          <rect width="520" height="360" fill="#E8F1EE" />
          {/* Vòm đá cẩm thạch trắng trang nghiêm */}
          <path d="M85 350 V110 L130 70 H390 L435 110 V350 H365 V195 A105 95 0 0 0 155 195 V350 Z" fill="#F8F9FA" stroke="#231811" strokeWidth="4" />
          {/* Đường chỉ ngọc bích */}
          <rect x="115" y="80" width="290" height="12" fill="#2E8B7A" stroke="#231811" strokeWidth="2.5" />
          {/* Bảng năm trung tâm */}
          <rect x="145" y="104" width="230" height="66" rx="6" fill="#1D5B4F" stroke="#D4A338" strokeWidth="4" />
          <text x="260" y="134" textAnchor="middle" fill="#FFD54F" fontFamily="Oswald, sans-serif" fontSize="24" fontWeight="700" letterSpacing="2">{era.portalYear}</text>
          <text x="260" y="156" textAnchor="middle" fill="#FFF" fontFamily="Be Vietnam Pro, sans-serif" fontSize="12" fontWeight="800" letterSpacing="1">{era.portalSlogan}</text>
          <rect x="40" y="346" width="440" height="14" fill="#231811" />
        </svg>
      );
    } else if (currentEra === 4) {
      // Level 4: Khung thép xanh navy viền vàng hiện đại
      return (
        <svg className="portal-svg-scene" viewBox="0 0 520 360" xmlns="http://www.w3.org/2000/svg">
          <rect width="520" height="360" fill="#E2E8F2" />
          {/* Khung thép xanh navy viền vàng kim */}
          <path d="M85 350 V75 H435 V350 H372 V145 H148 V350 Z" fill="#14305C" stroke="#231811" strokeWidth="4" />
          <rect x="95" y="85" width="330" height="48" fill="none" stroke="#D9A92B" strokeWidth="3" />
          {/* 3 Huy hiệu Lập pháp - Hành pháp - Tư pháp */}
          <circle cx="122" cy="210" r="16" fill="#C62828" stroke="#D9A92B" strokeWidth="3" />
          <circle cx="398" cy="210" r="16" fill="#C62828" stroke="#D9A92B" strokeWidth="3" />
          {/* Bảng năm Hiến định */}
          <rect x="145" y="102" width="230" height="68" rx="6" fill="#C62828" stroke="#FFD700" strokeWidth="4" />
          <text x="260" y="134" textAnchor="middle" fill="#FFD700" fontFamily="Oswald, sans-serif" fontSize="24" fontWeight="700" letterSpacing="2">{era.portalYear}</text>
          <text x="260" y="156" textAnchor="middle" fill="#FFF" fontFamily="Be Vietnam Pro, sans-serif" fontSize="13" fontWeight="800" letterSpacing="1.5">{era.portalSlogan}</text>
          <rect x="40" y="346" width="440" height="14" fill="#231811" />
        </svg>
      );
    } else {
      // Level 5: Cổng vàng hoàng kim chạm hoa văn mặt trời Đông Sơn
      return (
        <svg className="portal-svg-scene" viewBox="0 0 520 360" xmlns="http://www.w3.org/2000/svg">
          <rect width="520" height="360" fill="#FBF0D4" />
          {/* Hào quang mặt trời Đông Sơn */}
          <circle cx="260" cy="185" r="148" fill="#F28C38" opacity="0.22" />
          <circle cx="260" cy="185" r="110" fill="none" stroke="#E3B23C" strokeWidth="3" strokeDasharray="8 6" />
          {/* Cổng vàng hoàng kim */}
          <path d="M80 350 V85 L125 52 H395 L440 85 V350 H372 V175 H148 V350 Z" fill="#E3B23C" stroke="#231811" strokeWidth="4" />
          <path d="M92 345 V92 L130 64 H390 L428 92 V345" fill="none" stroke="#C8102E" strokeWidth="3" />
          {/* Mặt trời 12 cánh trên đỉnh */}
          <circle cx="260" cy="68" r="24" fill="#C8102E" stroke="#231811" strokeWidth="3" />
          <polygon points="260,52 264,63 276,63 266,70 270,81 260,74 250,81 254,70 244,63 256,63" fill="#FFD700" />
          {/* Bảng khẩu hiệu Kết luận */}
          <rect x="142" y="106" width="236" height="68" rx="8" fill="#7C131E" stroke="#FFD700" strokeWidth="4" />
          <text x="260" y="138" textAnchor="middle" fill="#FFD700" fontFamily="Oswald, sans-serif" fontSize="24" fontWeight="700" letterSpacing="2">{era.portalYear}</text>
          <text x="260" y="162" textAnchor="middle" fill="#FFFDF7" fontFamily="Be Vietnam Pro, sans-serif" fontSize="13" fontWeight="800" letterSpacing="1.2">{era.portalSlogan}</text>
          <rect x="40" y="346" width="440" height="14" fill="#231811" />
        </svg>
      );
    }
  }

  return (
    <div className={`ui-block-portal-card paper-texture ${className}`} id={id}>
      <div className="portal-stage-viewport">
        {renderPortalSVG()}
      </div>

      {/* Nút chuyển xem nhanh 5 kiến trúc cổng */}
      <div className="portal-mini-tabs">
        {PORTAL_NAMES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`portal-mini-btn ${item.id === currentEra ? "active" : ""}`}
            onClick={() => onSelectEra?.(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};
