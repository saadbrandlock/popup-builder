import React, { useEffect } from 'react';
import { Row, Col, Alert } from 'antd';
import { BaseProps } from '../../../types/props';
import { useClientFlowStore } from '../../../stores/clientFlowStore';
import { useSyncGenericContext } from '@/lib/hooks/use-sync-generic-context';
import { useClientFlow } from '../hooks/use-client-flow';
import { useLoadingStore } from '@/stores/common/loading.store';
import CouponOnboardingNotReady from '../components/coupon-onboarding-not-ready';
import { OnboardingSteps } from '../components/OnboardingSteps';
import { DesktopReview } from './DesktopReview';
import { MobileReview } from './MobileReview';
import { CopyReview } from './CopyReview';
import { ReviewScreen } from './ReviewScreen';

interface OnboardingPreviewProps extends BaseProps {
  className?: string;
}

export const OnboardingPreview: React.FC<OnboardingPreviewProps> = ({
  apiClient,
  navigate,
  shoppers,
  accountDetails,
  authProvider,
  accounts,
  className = '',
}) => {
  // Sync first so apiClient and context are in store before useClientFlow etc.
  useSyncGenericContext({
    accountDetails,
    authProvider,
    shoppers,
    navigate,
    accounts,
    apiClient,
  });

  const {
    clientData,
    currentStep,
    desktopReview,
    mobileReview,
    finalReview,
    actions,
    error,
    contentFields,
  } = useClientFlowStore();
  const { getClientTemplatesData, getContentFieldsWithContent } = useClientFlow();
  const { clientTemplateDetailsLoading } = useLoadingStore();

  useEffect(() => {
    if (accountDetails && !clientData) {
      getClientTemplatesData(accountDetails.id);
    }
    if (!contentFields.length && accountDetails) {
      getContentFieldsWithContent(accountDetails.id);
    }
  }, [accountDetails]);

  // Render current step content (apiClient and context from generic store)
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

  if (!clientData || clientData.length === 0) {
    return (
      <div className={`onboarding-preview-container ${className}`}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={6}>
            <OnboardingSteps accountName={accountDetails?.name} />
          </Col>
          <Col xs={24} md={18}>
            <CouponOnboardingNotReady
              accountName={accountDetails?.name}
              domain={accountDetails?.domain}
              onRefresh={() => {
                if (accountDetails) {
                  getClientTemplatesData(accountDetails.id);
                }
              }}
              loading={clientTemplateDetailsLoading}
            />
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <Row className={`onboarding-preview-container ${className}`} gutter={[16, 16]}>
      <Col xs={24} md={6}>
        <div className="bg-gray-50/80 rounded-xl p-4">
          <OnboardingSteps accountName={accountDetails?.name} />
        </div>
      </Col>
      <Col xs={24} md={18}>
        {/* Global Error Display */}
        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            closable
            onClose={() => actions.clearError()}
            className="mb-6"
          />
        )}

        {/* Step Content */}
        <div className="step-content">{renderStepContent()}</div>
      </Col>
    </Row>
  );
};
