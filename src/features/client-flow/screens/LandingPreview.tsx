import React, { useEffect } from 'react';
import { Card, Button, Alert, Row, Col, Steps, Spin } from 'antd';
import { BaseProps } from '../../../types/props';
import {
  BrowserPreview,
  BrowserPreviewSkeleton,
} from '../../../components/common';
import { useClientFlowStore } from '../../../stores/clientFlowStore';
import type { ViewportType } from '../types/clientFlow';
import { ALargeSmall, Computer, TabletSmartphone } from 'lucide-react';
import CouponBuilderFeatureCards from '../components/coupon-builder-feature-cards';
import { clientReviewSteps } from '../utils/helpers';
import { useSyncGenericContext } from '@/lib/hooks/use-sync-generic-context';
import { Highlighter } from '@/components/magicui/highlighter';
import { InteractiveHoverButton } from '@/components/magicui/interactive-hover-button';
import { useClientFlow } from '../hooks/use-client-flow';
import { useLoadingStore } from '@/stores/common/loading.store';
import CouponModuleNotReady from '../components/coupon-module-not-ready';

/**
 * LandingPreview - Initial screen showing template preview in browser context
 * Shows hero section with preview area and template selection
 * Now extends BaseProps for consistency with project patterns
 */
interface LandingPreviewProps extends BaseProps {
  goToReview: () => void;
}

export const LandingPreview: React.FC<LandingPreviewProps> = ({
  apiClient,
  navigate,
  shoppers,
  authProvider,
  accounts,
  accountDetails,
  goToReview
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

  const { actions, error, clientData } = useClientFlowStore();
  const { getClientTemplatesData } = useClientFlow();
  const { clientTemplateDetailsLoading } = useLoadingStore();

  // Fixed desktop preview for landing page
  const viewport: ViewportType = 'desktop';

  const getPreviewTemplate = () => {
    if (clientData && clientData.length) {
      return clientData.filter((template) =>
        template.devices.find((device) => device.device_type === viewport)
      );
    } else {
      return [];
    }
  };

  useEffect(() => {
    if (accountDetails && !clientData) {
      getClientTemplatesData(accountDetails.id);
    }
  }, [accountDetails]);


  // Show "not ready" component when no client data is available
  if (!clientData || clientData.length === 0) {
    return (
      <CouponModuleNotReady
        accountName={accountDetails?.name}
        domain={accountDetails?.domain}
        onRefresh={() => {
          if (accountDetails) {
            getClientTemplatesData(accountDetails.id);
          }
        }}
        loading={clientTemplateDetailsLoading}
      />
    );
  }

  return (
    <div className="landing-preview-screen min-h-screen px-6 py-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
            <span>
              Your{' '}
              <Highlighter action="highlight" color="#3eb0f7">
                <span className="text-white">Coupon Module</span>
              </Highlighter>
            </span>
            <br />
            <span>Is Ready for Review</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto inline-block w-[95%] lg:w-[60%]">
            We've created a customized coupon popup using your website’s colors
            and fonts. Review and approve the design to proceed with
            implementation across all shopper groups.
          </p>
        </div>

        {/* Error Alert */}
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

        <Row gutter={[16, 16]}>
          {/* Left: Feature cards and steps */}
          <Col xs={24}>
            <CouponBuilderFeatureCards />
          </Col>

          <Col xs={24} md={6}>
            <div className="space-y-4">
              <Card title="Next Steps" className="shadow-md">
                <Steps
                  direction="vertical"
                  items={[
                    {
                      title: (
                        <span className="text-sm font-semibold">
                          {clientReviewSteps.stepOne.title}
                        </span>
                      ),
                      description: clientReviewSteps.stepOne.description,
                      status: 'finish',
                      icon: (
                        <span className="!text-slate-500 flex justify-center">
                          <Computer />
                        </span>
                      ),
                    },
                    {
                      title: (
                        <span className="text-sm font-semibold">
                          {clientReviewSteps.stepTwo.title}
                        </span>
                      ),
                      description: clientReviewSteps.stepTwo.description,
                      status: 'finish',
                      icon: (
                        <span className="!text-slate-500 flex justify-center">
                          <TabletSmartphone />
                        </span>
                      ),
                    },
                    {
                      title: (
                        <span className="text-sm font-semibold">
                          {clientReviewSteps.stepThree.title}
                        </span>
                      ),
                      description: clientReviewSteps.stepThree.description,
                      status: 'finish',
                      icon: (
                        <span className="!text-slate-500 flex justify-center">
                          <ALargeSmall />
                        </span>
                      ),
                    },
                  ]}
                />

                {/* CTA */}
                <div className="mt-4 flex justify-center">
                  <InteractiveHoverButton onClick={() => goToReview()}>
                    Let's Get Started
                  </InteractiveHoverButton>
                </div>
              </Card>
            </div>
          </Col>

          {/* Right: Live Preview only */}
          <Col xs={24} md={18}>
            <div>
              <div className="mb-3">
                <div className="text-xl font-medium text-gray-900">
                  Live Preview
                </div>
                <div className="text-md text-gray-500">
                  See how your coupon popup looks on your website
                </div>
              </div>

              <div className="w-full">
                {accountDetails && !clientTemplateDetailsLoading ? (
                  <BrowserPreview
                    className="shadow-md"
                    viewport={viewport}
                    websiteBackground={{
                      backgroundImage: {
                        desktop:
                          'https://debuficgraftb.cloudfront.net/dev-staging/KP_1739628284.604344.png',
                        mobile:
                          'https://debuficgraftb.cloudfront.net/dev-staging/KP_1739628284.604344.png',
                      },
                      websiteUrl: accountDetails.domain,
                      companyName: accountDetails.name,
                      category: accountDetails.category,
                      clientId: accountDetails.id.toString(),
                      id: accountDetails.id.toString(),
                    }}
                    popupTemplate={getPreviewTemplate()}
                    showBrowserChrome={true}
                    interactive={false}
                    scale={0.9}
                    onPopupInteraction={(action) => {
                    }}
                  />
                ) : (
                  <BrowserPreviewSkeleton viewport={viewport} />
                )}
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
};
