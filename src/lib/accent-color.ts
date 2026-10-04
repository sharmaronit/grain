export type HsvColor = { h: number; s: number; v: number };

export function hsvToHex({ h, s, v }: HsvColor): string {
  const channel = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round(255 * v * (1 - s * Math.max(0, Math.min(k, 4 - k, 1))))
      .toString(16).padStart(2, "0");
  };
  return `#${channel(5)}${channel(3)}${channel(1)}`;
}

export function hexToHsv(hex: string): HsvColor {
  const [r, g, b] = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  const hue = delta === 0 ? 0 : max === r ? ((g - b) / delta + 6) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return { h: hue * 60, s: max === 0 ? 0 : delta / max, v: max };
}

export function normalizeHex(value: string): string | null {
  const input = value.trim().replace(/^#/, "");
  if (/^[\da-f]{3}$/i.test(input)) return `#${input.split("").map(char => char + char).join("").toLowerCase()}`;
  return /^[\da-f]{6}$/i.test(input) ? `#${input.toLowerCase()}` : null;
}
