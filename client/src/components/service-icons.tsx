import { Brain, Heart } from "lucide-react";

interface IconProps {
  className?: string;
}

export const PgxSwabIcon = ({ className }: IconProps) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className} 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M17 3v13a5 5 0 0 1-10 0V3" />
    <path d="M17 3H7" />
    <line x1="12" y1="3" x2="12" y2="12" />
    <ellipse cx="12" cy="13.5" rx="1.5" ry="2.5" fill="currentColor" opacity="0.5" />
  </svg>
);

export const UltrasoundProbeIcon = ({ className }: IconProps) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M8 2h8v3q-1.5 3 0 6v1H8v-1q1.5-3 0-6V2Z" />
    <rect x="6" y="12" width="12" height="5" rx="1" />
    <path d="M8 19q4 3 8 0" opacity="0.6" />
    <path d="M6 21q6 3 12 0" />
  </svg>
);

export const BrainWaveIcon = Brain;
export const VitalWaveIcon = Heart;

export const serviceConfig = {
  brainwave: {
    name: "BrainWave",
    Icon: Brain,
    gradient: "from-[#4c1d95]/40 to-[#7c3aed]/40",
    bgColor: "bg-[#4c1d95]",
    textColor: "text-violet-300",
    badgeClass: "bg-violet-500/20 text-violet-300 border-violet-400/30",
    lightBg: "bg-violet-50",
    lightHover: "hover:bg-violet-100",
    lightText: "text-violet-700",
    lightBorder: "border-violet-200",
    borderActive: "border-violet-600",
  },
  vitalwave: {
    name: "VitalWave",
    Icon: Heart,
    gradient: "from-red-700/40 to-rose-500/40",
    bgColor: "bg-red-700",
    textColor: "text-red-300",
    badgeClass: "bg-red-500/20 text-red-300 border-red-400/30",
    lightBg: "bg-red-50",
    lightHover: "hover:bg-red-100",
    lightText: "text-red-700",
    lightBorder: "border-red-200",
    borderActive: "border-red-600",
  },
  ultrasound: {
    name: "Ultrasound",
    Icon: UltrasoundProbeIcon,
    gradient: "from-blue-400/40 to-cyan-500/40",
    bgColor: "bg-blue-600",
    textColor: "text-blue-300",
    badgeClass: "bg-blue-500/20 text-blue-300 border-blue-400/30",
    lightBg: "bg-blue-50",
    lightHover: "hover:bg-blue-100",
    lightText: "text-blue-700",
    lightBorder: "border-blue-200",
    borderActive: "border-blue-600",
  },
  pgx: {
    name: "PGX",
    Icon: PgxSwabIcon,
    gradient: "from-teal-400/40 to-cyan-500/40",
    bgColor: "bg-teal-600",
    textColor: "text-teal-300",
    badgeClass: "bg-teal-500/20 text-teal-300 border-teal-400/30",
    lightBg: "bg-teal-50",
    lightHover: "hover:bg-teal-100",
    lightText: "text-teal-700",
    lightBorder: "border-teal-200",
    borderActive: "border-teal-600",
  },
} as const;

export type ServiceType = keyof typeof serviceConfig;

export function getServiceIcon(service: ServiceType) {
  return serviceConfig[service]?.Icon;
}

export function getServiceConfig(service: ServiceType) {
  return serviceConfig[service];
}
