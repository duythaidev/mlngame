// src/lib/avatars.ts
import avatarSoldier from "../assets/avatar-soldier.jpg";
import avatarVolunteer from "../assets/avatar-volunteer.jpg";
import avatarBuilder from "../assets/avatar-builder.svg";
import avatarScholar from "../assets/avatar-scholar.svg";

export interface PresetAvatar {
  id: string;
  name: string;
  src: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  { id: "soldier", name: "Chiến sĩ", src: avatarSoldier },
  { id: "volunteer", name: "Thanh niên", src: avatarVolunteer },
  { id: "builder", name: "Công nhân", src: avatarBuilder },
  { id: "scholar", name: "Sinh viên", src: avatarScholar },
];
