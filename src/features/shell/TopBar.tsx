import { Keyboard } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Hint } from '@/components/ui/Hint';
import { campaignPath, DEFAULT_CAMPAIGN_ID } from '@/lib/routes';
import { DataSourceMenu } from './DataSourceMenu';
import { ThemeToggle } from './ThemeToggle';

interface TopBarProps {
  onOpenShortcuts: () => void;
}

export function TopBar({ onOpenShortcuts }: TopBarProps) {
  return (
    <header className="border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 safe-x">
        <Link
          to={campaignPath(DEFAULT_CAMPAIGN_ID)}
          className="flex min-h-11 items-center gap-2.5 rounded-control"
          aria-label="Readie Integrity Audit, go to campaign overview"
        >
          <svg viewBox="0 0 32 32" aria-hidden="true" className="size-7 shrink-0">
            <rect width="32" height="32" rx="8" className="fill-accent" />
            <path
              d="M10 23V9h7.2a4.6 4.6 0 0 1 1.5 8.95L22.4 23h-3.7l-3.2-4.6H13.2V23H10Zm3.2-7.4h3.7a1.8 1.8 0 0 0 0-3.6h-3.7v3.6Z"
              fill="#fff"
            />
          </svg>
          <span className="text-sm font-semibold tracking-tight text-ink">
            Readie <span className="font-normal text-muted">Integrity audit</span>
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          <DataSourceMenu />
          <Hint label="Keyboard shortcuts (?)">
            <Button
              variant="ghost"
              iconOnly
              aria-label="Keyboard shortcuts"
              onClick={onOpenShortcuts}
              className="hidden md:inline-flex"
            >
              <Keyboard aria-hidden="true" className="size-4" />
            </Button>
          </Hint>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
