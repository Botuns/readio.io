import { ChevronDown } from 'lucide-react';
import * as m from 'motion/react-m';
import { Link, useNavigate } from 'react-router';
import { cn } from '@/lib/cn';
import { getDataSource } from '@/lib/dataSource';
import { CAMPAIGN_IDS, campaignPath } from '@/lib/routes';
import { MOCK_SCENARIOS_CAMPAIGN_ID } from '@/mocks/constants';

interface CampaignSwitcherProps {
  campaignId: string;
}

function campaignOptions(current: string): string[] {
  const options: string[] = [...CAMPAIGN_IDS];
  if (getDataSource() === 'mock') options.push(MOCK_SCENARIOS_CAMPAIGN_ID);
  if (!options.includes(current)) options.push(current);
  return options;
}

/**
 * Segmented control on desktop, native select on mobile. Switching campaigns
 * is a navigation (history push), so Back returns to the previous campaign.
 */
export function CampaignSwitcher({ campaignId }: CampaignSwitcherProps) {
  const navigate = useNavigate();
  const options = campaignOptions(campaignId);

  return (
    <>
      <nav
        aria-label="Campaign"
        className="hidden rounded-control bg-sunken p-1 shadow-[inset_0_1px_2px_rgb(0_0_0/0.06)] md:flex"
      >
        {options.map((option) => {
          const active = option === campaignId;
          return (
            <Link
              key={option}
              to={campaignPath(option)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'tabular relative flex h-7 min-w-14 items-center justify-center rounded-chip px-3 text-13 font-medium transition-colors duration-150',
                active ? 'text-ink' : 'text-muted hover:text-ink',
              )}
            >
              {active && (
                <m.span
                  layoutId="campaign-switcher-thumb"
                  className="absolute inset-0 rounded-chip bg-(--btn-secondary-bg) shadow-(--btn-secondary-shadow)"
                />
              )}
              <span className="relative">{option}</span>
            </Link>
          );
        })}
      </nav>

      <label className="relative md:hidden">
        <span className="sr-only">Campaign</span>
        <select
          value={campaignId}
          onChange={(event) => void navigate(campaignPath(event.target.value))}
          className="tabular h-11 min-w-36 appearance-none rounded-control bg-(--btn-secondary-bg) pr-9 pl-3 text-base font-medium text-ink shadow-(--btn-secondary-shadow)"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              Campaign {option}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted"
        />
      </label>
    </>
  );
}
