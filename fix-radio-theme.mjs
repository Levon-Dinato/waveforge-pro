import { readFileSync, writeFileSync } from 'fs';

const p = 'src/layouts/RadioLayout.tsx';
let s = readFileSync(p, 'utf8');

// 1) Ajoute des fonds "chip" adaptés au thème
s = s.replace(
  "    card: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',\n",
  "    card: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',\n    chipBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',\n    chipBgStrong: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',\n"
);

// 2) Remplace les fonds statiques et les onMouseLeave
s = s.split("background: 'rgba(255,255,255,0.05)'").join("background: colors.chipBg");
s = s.split("background: 'rgba(255,255,255,0.08)'").join("background: colors.chipBgStrong");
s = s.split("e.currentTarget.style.background = 'rgba(255,255,255,0.05)'").join("e.currentTarget.style.background = colors.chipBg");

writeFileSync(p, s);
console.log('OK — fonds chip remplacés');
