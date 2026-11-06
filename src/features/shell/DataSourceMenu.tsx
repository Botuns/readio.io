import { useQueryClient } from '@tanstack/react-query';
import { Check, Database, FlaskConical } from 'lucide-react';
import { Popover } from 'radix-ui';
import { useState } from 'react';
import { Link } from 'react-router';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { cn } from '@/lib/cn';
import { getDataSource, switchDataSource, type DataSource } from '@/lib/dataSource';
import { campaignPath } from '@/lib/routes';
import { MOCK_SCENARIOS_CAMPAIGN_ID } from '@/mocks/constants';
import {
  getScenario,
  SCENARIO_LABELS,
  SCENARIOS,
  setScenario,
  type Scenario,
} from '@/mocks/scenarios';

const SOURCE_COPY: Record<DataSource, { label: string; hint: string }> = {
  live: { label: 'Live API', hint: 'Calls the Readie hackathon endpoint.' },
  mock: { label: 'Mock data', hint: 'Fixtures served by a service worker. Works offline.' },
};

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
      <Popover.Trigger className={buttonClassName({ size: 'sm' })} aria-label="Data source">
        <span className="btn-content">
          <Icon aria-hidden="true" className="size-3.5" />
          {SOURCE_COPY[source].label}
          {source === 'mock' && scenario !== 'default' && (
            <span className="text-muted">· {SCENARIO_LABELS[scenario]}</span>
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
                  if (option !== source) switchDataSource(option);
                }}
              />
            ))}
            <p className="px-3 pt-1 pb-2 text-xs text-muted">Switching reloads the page.</p>
          </div>

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
