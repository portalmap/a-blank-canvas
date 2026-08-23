import { useTheme } from 'next-themes';
import mapLogoDark from '@/assets/logo-map-dark.png.asset.json';
import mapLogoLight from '@/assets/logo-map-light.png.asset.json';

interface ThemeLogoProps {
  className?: string;
  forceDark?: boolean;
}

export function ThemeLogo({ className = 'h-16 w-16', forceDark = false }: ThemeLogoProps) {
  const { resolvedTheme } = useTheme();
  const logo = forceDark || resolvedTheme === 'dark' ? mapLogoDark.url : mapLogoLight.url;

  return <img src={logo} alt="MAP Flow" className={className} />;
}
