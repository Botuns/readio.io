import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Hint } from '@/components/ui/Hint';
import { toggleTheme, useTheme } from '@/lib/theme';

export function ThemeToggle() {
  const theme = useTheme();
  const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  const Icon = theme === 'dark' ? Sun : Moon;

  return (
    <Hint label={label}>
      <Button variant="ghost" iconOnly aria-label={label} onClick={toggleTheme}>
        <Icon aria-hidden="true" className="size-4" />
      </Button>
    </Hint>
  );
}
