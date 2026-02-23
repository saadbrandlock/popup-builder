import React, { useEffect } from 'react';
import { Tabs, Typography } from 'antd';
import { AdminReviewQueue } from '../components/AdminReviewQueue';
import { PublishedTemplatesQueue } from '../components/PublishedTemplatesQueue';
import { AdminReviewScreen } from '../components/AdminReviewScreen';
import { BaseProps } from '@/types/props';
import { useSyncGenericContext } from '@/lib/hooks/use-sync-generic-context';
import { usePublishedTemplatesQueueStore } from '@/stores/list/publishedTemplatesQueue.store';

const { Title, Text } = Typography;

export interface AdminReviewProps extends BaseProps {
  /** When provided, shows the detail review screen for that account; otherwise shows the queue */
  accountId?: string | null;
}

/**
 * AdminReview - Entry screen for admin flow.
 * Renders tabbed queue when no accountId, or detail screen when accountId is provided.
 * Host app should pass accountId from route params (e.g. useParams).
 */
export const AdminReview: React.FC<AdminReviewProps> = (props) => {
  useSyncGenericContext({
    accountDetails: props.accountDetails,
    authProvider: props.authProvider,
    shoppers: props.shoppers,
    navigate: props.navigate,
    accounts: props.accounts,
    apiClient: props.apiClient,
  });

  const accountIdParam = props.accountId;
  const accountId = accountIdParam ? parseInt(accountIdParam, 10) : null;
  const accountName =
    accountId != null ? props.accounts?.find((a) => a.id === accountId)?.name : undefined;

  const viewOnly = usePublishedTemplatesQueueStore((s) => s.viewOnlyMode);

  // Reset viewOnlyMode when returning to the queue (accountId becomes null/undefined)
  useEffect(() => {
    if (accountId == null || isNaN(accountId)) {
      usePublishedTemplatesQueueStore.getState().actions.setViewOnlyMode(false);
    }
  }, [accountId]);

  if (accountId != null && !isNaN(accountId)) {
    return (
      <AdminReviewScreen
        accountId={accountId}
        accountName={accountName}
        viewOnly={viewOnly}
        onBackToQueue={() => props.navigate?.('/popup-builder/admin-review')}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex sm:items-center justify-between gap-4">
        <div>
          <Title level={2} className="mb-1!">
            Admin Review Queue
          </Title>
          <Text type="secondary">Review client popup submissions pending admin approval</Text>
        </div>
      </div>
      <Tabs defaultActiveKey="pending-review" size="large">
        <Tabs.TabPane key="pending-review" tab="Pending Review">
          <AdminReviewQueue {...props} />
        </Tabs.TabPane>
        <Tabs.TabPane key="published" tab="Published Templates">
          <PublishedTemplatesQueue {...props} />
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};
