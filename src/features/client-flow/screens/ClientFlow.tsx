import React, { useEffect, useMemo, useRef } from 'react';
import { Alert } from 'antd';
import { BaseProps } from '../../../types/props';
import { useClientFlowStore } from '../../../stores/clientFlowStore';
import { DesktopReview } from './DesktopReview';
import { MobileReview } from './MobileReview';
import { CopyReview } from './CopyReview';
import { ReviewScreen } from './ReviewScreen';
import { clientReviewSteps } from '../utils/helpers';
import { useSyncGenericContext } from '@/lib/hooks/use-sync-generic-context';
import { useClientFlow } from '../hooks/use-client-flow';
import { ClientFlowErrorBoundary } from '../components/ClientFlowErrorBoundary';
import '../styles/client-flow.css';

/** URL tab param values for each step; use with ?tab= for persistent tabs on refresh */
export const CLIENT_FLOW_TAB_KEYS = ['desktop-design', 'mobile-design', 'copy-review', 'final-review'] as const;

/**
 * Unified ClientFlow component - Combines all client flow screens into a single stepper-based interface
 * Follows the BaseProps pattern used throughout the project for consistency
 */
interface ClientFlowProps extends BaseProps {
  className?: string;
  onComplete?: (reviewData: any) => void;
  initialStep?: number;
  /** Current tab from URL (e.g. from ?tab=desktop-design); step is synced from this on mount/change */
  tabFromUrl?: string;
  /** Called when user changes step; host can update URL (e.g. setSearchParams({ tab })) */
  onStepChange?: (step: number, tabKey: string) => void;
}

export const ClientFlow: React.FC<ClientFlowProps> = ({
  apiClient,
  navigate,
  shoppers,
  accountDetails,
  authProvider,
  className = '',
  onComplete,
  accounts,
  tabFromUrl,
  onStepChange,
}) => {
  useSyncGenericContext({
    accountDetails,
    authProvider,
    shoppers,
    navigate,
    accounts,
    apiClient,
  });

  const { currentStep, desktopReview, mobileReview, finalReview, actions, error, clientData, activeContentShopper, stepStatuses } =
    useClientFlowStore();
  const { getClientTemplatesData, getContentFieldsWithContent, loadContentPresets, fetchAllStepStatuses } = useClientFlow();
  const { contentFields } = useClientFlowStore();
  const stepStatusesFetchedRef = useRef(false);

  // Load template data + content fields in parallel on mount/account change
  useEffect(() => {
    if (accountDetails && !clientData) {
      Promise.all([
        getClientTemplatesData(accountDetails.id),
        getContentFieldsWithContent(accountDetails.id),
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountDetails?.id, clientData]);

  // Fetch step statuses once when clientData first becomes available (initial load only).
  // Subsequent refreshes (e.g. after step 3 content confirm) must NOT re-trigger this —
  // upsertStepApprovalForAllTemplates already calls fetchAllStepStatuses itself.
  useEffect(() => {
    if (clientData && clientData.length > 0 && !stepStatusesFetchedRef.current) {
      stepStatusesFetchedRef.current = true;
      fetchAllStepStatuses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientData]);

  // Load presets when shopper changes
  useEffect(() => {
    if (activeContentShopper?.content?.id && accountDetails) {
      const shopperIds = [Number(activeContentShopper.content.id)];
      const industry = accountDetails.industry || 'ecommerce';
      loadContentPresets(shopperIds, industry);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContentShopper?.content?.id, accountDetails?.industry]);

  // Sync step from URL tab param so tabs persist on refresh
  useEffect(() => {
    if (tabFromUrl == null) return;
    const step = CLIENT_FLOW_TAB_KEYS.indexOf(tabFromUrl as (typeof CLIENT_FLOW_TAB_KEYS)[number]);
    if (step >= 0) actions.setCurrentStep(step);
  }, [tabFromUrl, actions]);

  // Handle completion callback
  useEffect(() => {
    if (finalReview.status === 'approved' && onComplete) {
      const reviewData = {
        desktop: desktopReview,
        mobile: mobileReview,
        final: finalReview,
        completedAt: new Date().toISOString(),
      };
      onComplete(reviewData);
    }
  }, [
    finalReview.status,
    desktopReview,
    mobileReview,
    finalReview,
    onComplete,
  ]);

  // Pre-compute step approval state in a single pass
  const approvedSteps = useMemo(() => {
    if (!clientData?.length) return { desktopDesign: false, mobileDesign: false, templateCopy: false };
    const check = (key: string) =>
      clientData.every((t) => stepStatuses[t.template_id]?.stepStatus?.[key]?.status === 'approved');
    return {
      desktopDesign: check('desktopDesign'),
      mobileDesign: check('mobileDesign'),
      templateCopy: check('templateCopy'),
    };
  }, [clientData, stepStatuses]);

  // Step configuration with status / label content
  const steps = useMemo(
    () => {
      const allDesktopApproved = approvedSteps.desktopDesign;
      const allMobileApproved = approvedSteps.mobileDesign;
      const allCopyApproved = approvedSteps.templateCopy;

      return [
        {
          id: 0,
          title: clientReviewSteps.stepOne.title,
          subtitle:
            allDesktopApproved
              ? 'Completed'
              : desktopReview.status === 'rejected'
                ? 'Changes requested'
                : 'In progress',
          status:
            allDesktopApproved
              ? 'completed'
              : desktopReview.status === 'rejected'
                ? 'error'
                : currentStep === 0
                  ? 'active'
                  : currentStep > 0
                    ? 'completed'
                    : 'pending',
        },
        {
          id: 1,
          title: clientReviewSteps.stepTwo.title,
          subtitle:
            allMobileApproved
              ? 'Completed'
              : mobileReview.status === 'rejected'
                ? 'Changes requested'
                : currentStep > 0
                  ? 'In progress'
                  : 'Pending',
          status:
            allMobileApproved
              ? 'completed'
              : mobileReview.status === 'rejected'
                ? 'error'
                : currentStep === 1
                  ? 'active'
                  : currentStep > 1
                    ? 'completed'
                    : 'pending',
        },
        {
          id: 2,
          title: clientReviewSteps.stepThree.title,
          subtitle: allCopyApproved ? 'Completed' : currentStep >= 2 ? 'In progress' : 'Pending',
          status: allCopyApproved ? 'completed' : currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : 'pending',
        },
        {
          id: 3,
          title: 'Final Review',
          subtitle:
            finalReview.status === 'approved'
              ? 'Ready to launch'
              : finalReview.status === 'rejected'
                ? 'Changes requested'
                : 'Pending',
        status:
          finalReview.status === 'approved'
            ? 'completed'
            : finalReview.status === 'rejected'
              ? 'error'
              : currentStep === 3
                ? 'active'
                : 'pending',
      },
    ]},
    [currentStep, desktopReview.status, mobileReview.status, finalReview.status, approvedSteps]
  );

  const completedStepCount = steps.filter((s) => s.status === 'completed').length;
  const stepperProgressPercent = (completedStepCount / steps.length) * 100;

  // Render current step content (apiClient and other context from generic store)
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <DesktopReview />;
      case 1:
        return <MobileReview />;
      case 2:
        return <CopyReview />;
      case 3:
        return <ReviewScreen />;
      default:
        return (
          <div className="text-center py-12">
            <Alert
              message="Invalid Step"
              description="The current step is not recognized. Please restart the flow."
              type="error"
              showIcon
            />
          </div>
        );
    }
  };

  return (
    <div className={`client-flow-root ${className}`}>
      {/* Page header */}
      <header className="page-header">
        <div>
          <h1>Popup Builder Review</h1>
          <p>Review and approve your coupon module design across all devices</p>
        </div>
      </header>

      {/* Horizontal stepper */}
      <nav className="horizontal-stepper" style={{ position: 'relative' }}>
        <div
          className="stepper-progress"
          style={{ width: `${Math.max(0, Math.min(100, stepperProgressPercent))}%` }}
        />
        {steps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            className={[
              'h-step',
              step.status === 'completed' ? 'completed' : '',
              index === currentStep ? 'active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => {
              actions.setCurrentStep(index);
              const tabKey = CLIENT_FLOW_TAB_KEYS[index];
              if (tabKey != null && onStepChange) onStepChange(index, tabKey);
            }}
          >
            <div className="step-circle">{index + 1}</div>
            <div className="step-label">
              {step.title}
              <small>{step.subtitle}</small>
            </div>
          </button>
        ))}
      </nav>

      {/* Global Error Display */}
      {error && (
        <div style={{ padding: '16px 28px' }}>
          <Alert
            message="Error"
            description={error}
            type="error"
            closable
            onClose={() => actions.clearError()}
          />
        </div>
      )}

      {/* Main layout container – individual steps render their own panels (sidebar, center, feedback) */}
      <main className="main-layout">
        <ClientFlowErrorBoundary>{renderStepContent()}</ClientFlowErrorBoundary>
      </main>
    </div>
  );
};
