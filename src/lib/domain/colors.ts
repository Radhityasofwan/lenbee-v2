export const ACCENT_COLORS = [
  "violet",
  "sky",
  "emerald",
  "amber",
  "rose",
  "indigo",
  "teal",
  "orange",
  "pink",
  "cyan",
] as const;

export type AccentColor = (typeof ACCENT_COLORS)[number];

type AccentTokens = {
  label: string;
  hex: string;
  soft: string;
  solid: string;
  text: string;
  border: string;
  dot: string;
  /** Wash gradasi lembut untuk background hero/kartu — dari solid ke transparan. */
  gradient: string;
  /** Warna ring avatar. */
  ring: string;
};

const TOKENS: Record<AccentColor, AccentTokens> = {
  violet: {
    label: "Violet",
    hex: "#7c5cd6",
    soft: "bg-violet-100 dark:bg-violet-500/15",
    solid: "bg-violet-500",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-200 dark:border-violet-500/30",
    dot: "bg-violet-500",
    gradient: "from-violet-500/15 via-violet-500/5 to-transparent",
    ring: "ring-violet-200 dark:ring-violet-500/30",
  },
  sky: {
    label: "Biru",
    hex: "#2f8fd6",
    soft: "bg-sky-100 dark:bg-sky-500/15",
    solid: "bg-sky-500",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-200 dark:border-sky-500/30",
    dot: "bg-sky-500",
    gradient: "from-sky-500/15 via-sky-500/5 to-transparent",
    ring: "ring-sky-200 dark:ring-sky-500/30",
  },
  emerald: {
    label: "Hijau",
    hex: "#2f9e6b",
    soft: "bg-emerald-100 dark:bg-emerald-500/15",
    solid: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-500/30",
    dot: "bg-emerald-500",
    gradient: "from-emerald-500/15 via-emerald-500/5 to-transparent",
    ring: "ring-emerald-200 dark:ring-emerald-500/30",
  },
  amber: {
    label: "Kuning",
    hex: "#d3901f",
    soft: "bg-amber-100 dark:bg-amber-500/15",
    solid: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-500/30",
    dot: "bg-amber-500",
    gradient: "from-amber-500/15 via-amber-500/5 to-transparent",
    ring: "ring-amber-200 dark:ring-amber-500/30",
  },
  rose: {
    label: "Merah",
    hex: "#d05364",
    soft: "bg-rose-100 dark:bg-rose-500/15",
    solid: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-500/30",
    dot: "bg-rose-500",
    gradient: "from-rose-500/15 via-rose-500/5 to-transparent",
    ring: "ring-rose-200 dark:ring-rose-500/30",
  },
  indigo: {
    label: "Indigo",
    hex: "#5566d6",
    soft: "bg-indigo-100 dark:bg-indigo-500/15",
    solid: "bg-indigo-500",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200 dark:border-indigo-500/30",
    dot: "bg-indigo-500",
    gradient: "from-indigo-500/15 via-indigo-500/5 to-transparent",
    ring: "ring-indigo-200 dark:ring-indigo-500/30",
  },
  teal: {
    label: "Teal",
    hex: "#2c9a9a",
    soft: "bg-teal-100 dark:bg-teal-500/15",
    solid: "bg-teal-500",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200 dark:border-teal-500/30",
    dot: "bg-teal-500",
    gradient: "from-teal-500/15 via-teal-500/5 to-transparent",
    ring: "ring-teal-200 dark:ring-teal-500/30",
  },
  orange: {
    label: "Oranye",
    hex: "#d97a2b",
    soft: "bg-orange-100 dark:bg-orange-500/15",
    solid: "bg-orange-500",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-500/30",
    dot: "bg-orange-500",
    gradient: "from-orange-500/15 via-orange-500/5 to-transparent",
    ring: "ring-orange-200 dark:ring-orange-500/30",
  },
  pink: {
    label: "Pink",
    hex: "#cf5aa0",
    soft: "bg-pink-100 dark:bg-pink-500/15",
    solid: "bg-pink-500",
    text: "text-pink-700 dark:text-pink-300",
    border: "border-pink-200 dark:border-pink-500/30",
    dot: "bg-pink-500",
    gradient: "from-pink-500/15 via-pink-500/5 to-transparent",
    ring: "ring-pink-200 dark:ring-pink-500/30",
  },
  cyan: {
    label: "Cyan",
    hex: "#2a9ec4",
    soft: "bg-cyan-100 dark:bg-cyan-500/15",
    solid: "bg-cyan-500",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-200 dark:border-cyan-500/30",
    dot: "bg-cyan-500",
    gradient: "from-cyan-500/15 via-cyan-500/5 to-transparent",
    ring: "ring-cyan-200 dark:ring-cyan-500/30",
  },
};

export function accentOf(color: string | null | undefined): AccentTokens {
  if (color && color in TOKENS) return TOKENS[color as AccentColor];
  return TOKENS.violet;
}

export function accentTokenList() {
  return ACCENT_COLORS.map((name) => ({ name, ...TOKENS[name] }));
}
