import {
  CarFront,
  CircleEllipsis,
  Construction,
  Droplets,
  Lightbulb,
  PawPrint,
  Trash2,
  Volume2,
  Waves,
  type LucideIcon,
} from "lucide-react";

/** Icon per backend category code. Unknown codes (new admin categories) fall back to "others". */
const ICONS: Record<string, LucideIcon> = {
  roads: Construction,
  flooding_drainage: Waves,
  garbage: Trash2,
  streetlights: Lightbulb,
  illegal_parking: CarFront,
  noise: Volume2,
  water_supply: Droplets,
  stray_animals: PawPrint,
  others: CircleEllipsis,
};

export function categoryIcon(code: string | undefined): LucideIcon {
  return (code && ICONS[code]) || CircleEllipsis;
}
