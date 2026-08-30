import React from "react";
import {
  Target,
  Rocket,
  Dumbbell,
  Book,
  Plane,
  Coins,
  Activity,
  Trophy,
  User,
  Palette,
  Flame,
  Zap,
  Brain,
  Droplet,
  Shield,
  Sparkles,
  PartyPopper,
  CheckCircle,
  Clock,
  Heart,
  Star,
  Sprout,
  Sun
} from "lucide-react";

export const ICONS = [
  "target",
  "rocket",
  "dumbbell",
  "book",
  "plane",
  "coins",
  "activity",
  "trophy",
  "user",
  "palette",
  "flame",
  "zap",
  "brain",
  "droplet",
  "shield",
  "sparkles",
  "party-popper",
  "check-circle",
  "clock",
  "heart",
  "star"
];

const iconMap: Record<string, React.ElementType> = {
  target: Target,
  rocket: Rocket,
  dumbbell: Dumbbell,
  book: Book,
  plane: Plane,
  coins: Coins,
  activity: Activity,
  trophy: Trophy,
  user: User,
  palette: Palette,
  flame: Flame,
  zap: Zap,
  brain: Brain,
  droplet: Droplet,
  shield: Shield,
  sparkles: Sparkles,
  "party-popper": PartyPopper,
  "check-circle": CheckCircle,
  clock: Clock,
  heart: Heart,
  star: Star,
  sprout: Sprout,
  sun: Sun
};

// Fallback logic for old emojis saved in DB
const emojiFallbackMap: Record<string, string> = {
  "🎯": "target",
  "🚀": "rocket",
  "💪": "dumbbell",
  "📚": "book",
  "✈️": "plane",
  "💰": "coins",
  "🏃": "activity",
  "🏆": "trophy",
  "🧘": "user",
  "🎨": "palette",
  "🔥": "flame",
  "⚡": "zap",
  "🧠": "brain",
  "💧": "droplet",
  "🛡️": "shield",
  "✨": "sparkles",
  "🎉": "party-popper",
  "🌱": "sprout",
  "☀️": "sun"
};

interface DynamicIconProps extends React.SVGProps<SVGSVGElement> {
  name: string;
  size?: number | string;
  className?: string;
}

export function DynamicIcon({ name, size = 16, className = "", ...props }: DynamicIconProps) {
  // If the passed name is an old emoji, map it to the new icon name
  const iconKey = emojiFallbackMap[name] || name;
  const IconComponent = iconMap[iconKey] || Star; // fallback to Star if not found
  
  return <IconComponent size={size} className={className} {...props} />;
}
