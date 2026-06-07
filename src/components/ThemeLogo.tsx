import { useTheme } from 'next-themes';
import mapLogo from '@/assets/map-logo.png';
import mapLogoLight from '@/assets/map-logo-light.png';

interface ThemeLogoProps {
  className?: string;
  forceDark?: boolean;
}

export function ThemeLogo({ className = 'h-16 w-16', forceDark = false }: ThemeLogoProps) {
  const { resolvedTheme } = useTheme();
  const logo = forceDark || resolvedTheme === 'dark' ? mapLogoLight : mapLogo;

  return <img src={logo} alt="MAP Flow" className={className} />;
}
