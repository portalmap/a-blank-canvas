import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ThemeToggleProps {
  variant?: 'ghost' | 'outline';
  size?: 'icon' | 'default';
  className?: string;
}

export function ThemeToggle({ variant = 'ghost', size = 'icon', className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={className}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}
