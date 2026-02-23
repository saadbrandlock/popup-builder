import React, { useState, useMemo } from 'react';
import { Tabs, Typography } from 'antd';
import { MonitorSpeaker, Smartphone, Eye } from 'lucide-react';
import { PopupOnlyView } from '../index';
import { ClientFlowData } from '@/types';
import { getTemplatesForDevice, getTemplatesForDeviceAndShopper } from '@/features/client-flow/utils/template-filters';

const { Title } = Typography;

interface PopupPreviewTabsProps {
  clientData: ClientFlowData[] | null;
  /** When set, desktop/mobile tabs show the template for this shopper group; otherwise first template per device. */
  activeShopperId?: number | null;
  className?: string;
  /** Enhanced mode with sync indicator and dark background */
  enhanced?: boolean;
  /** Skip staging_status visibility filter — use for admin previews where any status should be shown */
  bypassStatusFilter?: boolean;
}

const PopupPreviewTabsBase: React.FC<PopupPreviewTabsProps> = ({
  clientData,
  activeShopperId = null,
  className = '',
  enhanced = false,
  bypassStatusFilter = false,
}) => {
  const [activeTab, setActiveTab] = useState<'desktop' | 'mobile'>('desktop');

  const getByDevice = (deviceType: 'desktop' | 'mobile') => {
    if (!clientData?.length) return [];
    if (bypassStatusFilter) {
      return clientData.filter((t) =>
        t.devices?.some((d) => d.device_type.toLowerCase() === deviceType)
      );
    }
    return getTemplatesForDevice(clientData, deviceType);
  };

  const desktopTemplate = useMemo(() => {
    if (!clientData?.length) return null;
    const byDevice = getByDevice('desktop');
    if (bypassStatusFilter) return byDevice[0] ?? null;
    const byShopper = getTemplatesForDeviceAndShopper(clientData, 'desktop', activeShopperId ?? undefined);
    return byShopper[0] ?? byDevice[0] ?? null;
  }, [clientData, activeShopperId, bypassStatusFilter]);

  const mobileTemplate = useMemo(() => {
    if (!clientData?.length) return null;
    const byDevice = getByDevice('mobile');
    if (bypassStatusFilter) return byDevice[0] ?? null;
    const byShopper = getTemplatesForDeviceAndShopper(clientData, 'mobile', activeShopperId ?? undefined);
    return byShopper[0] ?? byDevice[0] ?? null;
  }, [clientData, activeShopperId, bypassStatusFilter]);

  const tabItems = [
    {
      key: 'desktop',
      label: (
        <span className="flex items-center gap-2">
          <MonitorSpeaker size={16} />
          Desktop Preview
        </span>
      ),
      children: desktopTemplate ? (
        <div className={enhanced ? "dark-preview-bg" : "!w-full flex justify-center p-4"}>
          {enhanced ? (
            <div className="!w-full flex justify-center">
              <PopupOnlyView
                viewport="desktop"
                popupTemplate={[desktopTemplate]}
                showViewportLabel={false}
                compact={true}
              />
            </div>
          ) : (
            <PopupOnlyView
              viewport="desktop"
              popupTemplate={[desktopTemplate]}
              showViewportLabel={false}
            />
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-96">
          <Typography.Text type="secondary">No desktop template available</Typography.Text>
        </div>
      ),
    },
    {
      key: 'mobile',
      label: (
        <span className="flex items-center gap-2">
          <Smartphone size={16} />
          Mobile Preview
        </span>
      ),
      children: mobileTemplate ? (
        <div className={enhanced ? "dark-preview-bg" : "w-full flex justify-center"}>
          {enhanced ? (
            <div className="w-full flex justify-center">
              <PopupOnlyView
                viewport="mobile"
                popupTemplate={[mobileTemplate]}
                showViewportLabel={false}
                compact={true}
              />
            </div>
          ) : (
            <PopupOnlyView
              viewport="mobile"
              popupTemplate={[mobileTemplate]}
              showViewportLabel={false}
            />
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-96">
          <Typography.Text type="secondary">No mobile template available</Typography.Text>
        </div>
      ),
    },
  ];

  return (
    <div className={className}>
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye size={18} className="text-blue-600" />
            <Title level={4} className="mb-0">
              Live Preview
            </Title>
          </div>
          {enhanced && (
            <div className="synced-indicator">
              Synced
            </div>
          )}
        </div>
        {!enhanced && (
          <Typography.Text type="secondary" className="block mt-1">
            Preview your popup design across devices
          </Typography.Text>
        )}
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'desktop' | 'mobile')}
        items={tabItems}
        size="large"
        className="popup-preview-tabs"
      />
    </div>
  );
};

export const PopupPreviewTabs = React.memo(PopupPreviewTabsBase);
