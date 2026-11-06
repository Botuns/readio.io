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
          className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-control"
          aria-label="Readie Integrity Audit, go to campaign overview"
        >
          {/* Readie's own mark, as served on readie.io. */}
          <picture className="shrink-0">
            <source srcSet="/readie-mark.webp" type="image/webp" />
            <img src="/readie-mark.png" alt="" width={27} height={28} className="h-7 w-auto" />
          </picture>
          <span className="truncate text-sm font-semibold tracking-tight whitespace-nowrap text-ink">
            Readie <span className="font-normal text-muted">Integrity audit</span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5">
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
