import { Compass } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { campaignPath, DEFAULT_CAMPAIGN_ID } from '@/lib/routes';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className="mx-auto w-full max-w-6xl safe-x py-10">
      <div className="rounded-card border border-line bg-surface">
        <EmptyState
          Icon={Compass}
          title="This page does not exist"
          description="The address does not match a campaign or a room. Check the link, or start from the campaign overview."
          action={
            <ButtonLink variant="primary" to={campaignPath(DEFAULT_CAMPAIGN_ID)}>
              Go to campaign {DEFAULT_CAMPAIGN_ID}
            </ButtonLink>
          }
        />
      </div>
    </div>
  );
}
