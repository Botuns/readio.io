import { useQueryClient } from '@tanstack/react-query';
import { Check, Database, FlaskConical, LogIn, LogOut } from 'lucide-react';
import { Popover } from 'radix-ui';
import { useState } from 'react';
import { Link } from 'react-router';
import { clearCredentials, useCredentials, type ApiCredentials } from '@/api/credentials';
import { Button } from '@/components/ui/Button';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { cn } from '@/lib/cn';
import { getDataSource, switchDataSource, type DataSource } from '@/lib/dataSource';
import { campaignPath } from '@/lib/routes';
import { openSignIn } from '@/lib/signIn';
import { MOCK_SCENARIOS_CAMPAIGN_ID } from '@/mocks/constants';
import {
  getScenario,
  SCENARIO_LABELS,
  SCENARIOS,
  setScenario,
  type Scenario,
} from '@/mocks/scenarios';

const SOURCE_COPY: Record<DataSource, { label: string; hint: string }> = {
  live: { label: 'Live API', hint: 'Calls the Readie hackathon endpoint. Needs a sign-in.' },
  mock: { label: 'Mock data', hint: 'Fixtures served by a service worker. Works offline.' },
};

function describeAccount(credentials: ApiCredentials | null): string {
  if (credentials === null) return 'Not signed in.';
  if (credentials.origin === 'environment')
    return 'Using the credentials from this build’s environment.';
  return credentials.username === null ? 'Signed in.' : `Signed in as ${credentials.username}.`;
}

interface OptionProps {
  selected: boolean;
  label: string;
  hint?: string;
  onSelect: () => void;
}

function Option({ selected, label, hint, onSelect }: OptionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex min-h-11 w-full items-center gap-3 rounded-control px-3 py-2 text-left transition-colors duration-150 hover:bg-sunken',
        selected && 'bg-sunken',
      )}
    >
      <span className="flex-1">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint !== undefined && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      {selected && <Check aria-hidden="true" className="size-4 shrink-0 text-accent" />}
    </button>
  );
}

/**
 * Switches between the live API and the offline mock layer, and in mock mode
 * forces each async state so every screen can be reviewed in seconds.
 */
export function DataSourceMenu() {
  const queryClient = useQueryClient();
  const source = getDataSource();
  const credentials = useCredentials();
  const [scenario, setActiveScenario] = useState<Scenario>(getScenario);
  const [open, setOpen] = useState(false);
  const Icon = source === 'mock' ? FlaskConical : Database;

  const chooseScenario = (next: Scenario) => {
    setScenario(next);
    setActiveScenario(next);
    // Drop cached data so each screen goes through its loading state again.
    void queryClient.resetQueries();
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className={buttonClassName({ size: 'sm' })}>
        <span className="btn-content">
          <Icon aria-hidden="true" className="size-3.5" />
          <span className="sr-only">Data source: </span>
          {SOURCE_COPY[source].label}
          {source === 'mock' && scenario !== 'default' && (
            <>
              <span className="hidden text-muted md:inline">· {SCENARIO_LABELS[scenario]}</span>
              <span aria-hidden="true" className="size-1.5 rounded-full bg-warning md:hidden" />
              <span className="sr-only md:hidden">, scenario: {SCENARIO_LABELS[scenario]}</span>
            </>
          )}
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 w-[min(20rem,calc(100vw-1.5rem))] rounded-card bg-surface p-2 shadow-overlay"
        >
          <div role="radiogroup" aria-label="Data source">
            <p className="eyebrow px-3 pt-2 pb-1">Data source</p>
            {(['live', 'mock'] as const).map((option) => (
              <Option
                key={option}
                selected={source === option}
                label={SOURCE_COPY[option].label}
                hint={SOURCE_COPY[option].hint}
                onSelect={() => {
                  if (option === source) return;
                  if (option === 'live' && credentials === null) {
                    // Nothing to send yet: ask for credentials first.
                    setOpen(false);
                    openSignIn();
                    return;
                  }
                  switchDataSource(option);
                }}
              />
            ))}
            <p className="px-3 pt-1 pb-2 text-xs text-muted">Switching reloads the page.</p>
          </div>

          {source === 'live' && (
            <div className="border-t border-line px-3 pt-3 pb-2">
              <p className="eyebrow">Account</p>
              <p className="mt-1.5 text-sm text-ink">{describeAccount(credentials)}</p>
              <div className="mt-2.5 flex gap-2">
                {credentials?.origin !== 'environment' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setOpen(false);
                      openSignIn();
                    }}
                  >
                    <LogIn aria-hidden="true" className="size-3.5" />
                    {credentials === null ? 'Sign in' : 'Switch account'}
                  </Button>
                )}
                {credentials?.origin === 'signed_in' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      clearCredentials();
                      setOpen(false);
                      void queryClient.resetQueries();
                    }}
                  >
                    <LogOut aria-hidden="true" className="size-3.5" />
                    Sign out
                  </Button>
                )}
              </div>
            </div>
          )}

          {source === 'mock' && (
            <div role="radiogroup" aria-label="Mock scenario" className="border-t border-line pt-1">
              <p className="eyebrow px-3 pt-2 pb-1">Mock scenario</p>
              {SCENARIOS.map((option) => (
                <Option
                  key={option}
                  selected={scenario === option}
                  label={SCENARIO_LABELS[option]}
                  onSelect={() => chooseScenario(option)}
                />
              ))}
              <Link
                to={campaignPath(MOCK_SCENARIOS_CAMPAIGN_ID)}
                onClick={() => setOpen(false)}
                className="mt-1 flex min-h-11 items-center rounded-control border-t border-line px-3 text-sm font-medium text-accent hover:bg-sunken"
              >
                Open mock campaign {MOCK_SCENARIOS_CAMPAIGN_ID} (every verdict)
              </Link>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
