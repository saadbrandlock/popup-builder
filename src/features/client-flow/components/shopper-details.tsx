import React, { useEffect, useState, useMemo } from 'react';
import { useClientFlow } from '../hooks/use-client-flow';
import { useGenericStore } from '@/stores/generic.store';
import { useClientFlowStore } from '@/stores/clientFlowStore';
import { useLoadingStore } from '@/stores/common/loading.store';
import { Card, Typography, Button, Divider, Tooltip, Collapse } from 'antd';

import { shopperDetailsDummyData } from '../utils/shopper-details-dummy-data';
import { ShopperDescriptionSkeleton } from '@/components/skeletons';
import ShopperDetailsModal from './ShopperDetailsModal';
import { Users, AlertCircle, CheckCircle, Eye, FileText, Activity, Lightbulb } from 'lucide-react';

const { Text, Title, Paragraph } = Typography;

interface ShopperDetailsProps {
  compact?: boolean;
  displayMode?: 'compact' | 'full' | 'legacy';
}

const ShopperDetails: React.FC<ShopperDetailsProps> = ({ compact = false, displayMode }) => {
  const { getShopperDetails } = useClientFlow();
  const accountDetails = useGenericStore((s) => s.accountDetails);

  const { activeContentShopper, shopperDetailsCache } = useClientFlowStore();
  const { shopperDetailsLoading } = useLoadingStore();

  const shopperDetails = shopperDetailsCache[activeContentShopper?.content?.id ?? ''] ?? null;
  const shopperDetailsData = useMemo(
    () => shopperDetails ?? shopperDetailsDummyData.data[0],
    [shopperDetails]
  );
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalActiveTab, setModalActiveTab] = useState('overview');

  useEffect(() => {
    const shopperId = activeContentShopper?.content?.id;
    if (shopperId && accountDetails?.id && accountDetails?.company_id) {
      getShopperDetails({
        account_id: +accountDetails.id,
        company_id: +accountDetails.company_id,
        shopper_id: +shopperId,
        shopper_name: activeContentShopper.content.name ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContentShopper?.content?.id, accountDetails?.id]);

  if (shopperDetailsLoading) {
    return (
      <Card>
        <ShopperDescriptionSkeleton />
      </Card>
    );
  }

  // Determine which mode to use
  const mode = displayMode || (compact ? 'compact' : 'legacy');

  if (mode === 'full') {
    // Full content card version for CopyReview - Collapsible
    return (
      <>
        <Collapse
          items={[
            {
              key: '1',
              label: (
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-blue-500" />
                  <span style={{ fontSize: '16px', fontWeight: 500 }}>
                    {activeContentShopper?.content?.name || 'Shopper Group'} Details
                  </span>
                </div>
              ),
              children: (
                <div>
                  {shopperDetailsData?.ui_template.props.data.overview.map((item, idx) => (
                    <div key={item.header} className="mb-4">
                      <div className="flex items-start gap-2">
                        {idx === 0 && <Users size={18} className="text-blue-500 mt-1" />}
                        {idx === 1 && <AlertCircle size={18} className="text-orange-500 mt-1" />}
                        {idx === 2 && <CheckCircle size={18} className="text-green-500 mt-1" />}
                        <Title level={5} className="mb-0">{item.header}</Title>
                      </div>
                      <Paragraph className="!text-justify ml-7" style={{ fontSize: '14px' }}>
                        {item.description}
                      </Paragraph>
                    </div>
                  ))}

                  <Divider />

                  {/* Action buttons at bottom */}
                  <div className="flex justify-between items-center">
                      <Button
                        type="text"
                        size="large"
                        className='w-full !rounded-none'
                        icon={<Activity size={14} />}
                        onClick={() => {
                          setModalActiveTab('behavior');
                          setIsModalVisible(true);
                        }}
                      >Behavior</Button>
                      <Button
                        type="text"
                        size="large"
                        className='w-full !rounded-none'
                        icon={<Lightbulb size={14} />}
                        onClick={() => {
                          setModalActiveTab('solution');
                          setIsModalVisible(true);
                        }}
                      >Solution</Button>
                  </div>
                </div>
              ),
            },
          ]}
          accordion
        />

        <ShopperDetailsModal
          open={isModalVisible}
          onClose={() => setIsModalVisible(false)}
          shopperName={activeContentShopper?.content?.name}
          activeKey={modalActiveTab}
          onChange={setModalActiveTab}
          shopperDetailsData={shopperDetailsData}
          includeOverview={false}
        />
      </>
    );
  }

  if (mode === 'compact') {
    // Compact sidebar version
    return (
      <>
        <Card
          title={
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-blue-500" />
              <span style={{ fontSize: '14px' }}>Shopper Info</span>
            </div>
          }
          styles={{ body: { padding: '12px' } }}
          actions={[
            <Tooltip title="View Full Details" key="view-details">
              <Button
                type="text"
                size="small"
                icon={<Eye size={14} />}
                onClick={() => {
                  setModalActiveTab('overview');
                  setIsModalVisible(true);
                }}
              />
            </Tooltip>,
            <Tooltip title={shopperDetailsData?.ui_template.props.primaryBtnText || 'Shopper Behavior'} key="behavior">
              <Button
                type="text"
                size="small"
                icon={<Activity size={14} />}
                onClick={() => {
                  setModalActiveTab('behavior');
                  setIsModalVisible(true);
                }}
              />
            </Tooltip>,
            <Tooltip title={shopperDetailsData?.ui_template.props.outlinedBtnText || 'View Solutions'} key="solutions">
              <Button
                type="text"
                size="small"
                icon={<Lightbulb size={14} />}
                onClick={() => {
                  setModalActiveTab('solution');
                  setIsModalVisible(true);
                }}
              />
            </Tooltip>
          ]}
        >

          {/* Compact sections */}
          {shopperDetailsData?.ui_template.props.data.overview.map((item, idx) => (
            <div key={item.header} className="mb-3">
              <div className="flex items-start gap-2 mb-1">
                {idx === 0 && <Users size={14} className="text-blue-500 mt-0.5" />}
                {idx === 1 && <AlertCircle size={14} className="text-orange-500 mt-0.5" />}
                {idx === 2 && <CheckCircle size={14} className="text-green-500 mt-0.5" />}
                <Text strong style={{ fontSize: '13px' }}>
                  {item.header}
                </Text>
              </div>
              <Paragraph
                ellipsis={{ rows: 2, expandable: false }}
                style={{ fontSize: '12px', marginBottom: 0, color: '#666' }}
              >
                {item.description}
              </Paragraph>
            </div>
          ))}
        </Card>

        <ShopperDetailsModal
          open={isModalVisible}
          onClose={() => setIsModalVisible(false)}
          shopperName={activeContentShopper?.content?.name}
          activeKey={modalActiveTab}
          onChange={setModalActiveTab}
          shopperDetailsData={shopperDetailsData}
          includeOverview={true}
        />
      </>
    );
  }

  // Legacy full-width version (fallback)
  return (
    <>
      <Card>
        {shopperDetailsData?.ui_template.props.data.overview.map((item, idx) => (
          <div
            key={item.header}
            className={
              idx === shopperDetailsData?.ui_template.props.data.overview.length - 1
                ? 'mb-0'
                : 'mb-4'
            }
          >
            <Title level={4}>{item.header}</Title>
            <Text className="!text-justify">{item.description}</Text>
          </div>
        ))}
        <div className="text-end mt-4">
          <Button
            type="primary"
            size="large"
            className="mr-4"
            onClick={() => {
              setModalActiveTab('behavior');
              setIsModalVisible(true);
            }}
          >
            {shopperDetailsData?.ui_template.props.primaryBtnText ||
              `${activeContentShopper?.content?.name || 'Shopper'} Behavior`}
          </Button>
          <Button
            size="large"
            onClick={() => {
              setModalActiveTab('solution');
              setIsModalVisible(true);
            }}
          >
            {shopperDetailsData?.ui_template.props.outlinedBtnText || 'Solutions'}
          </Button>
        </div>
      </Card>

      <ShopperDetailsModal
        open={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        shopperName={activeContentShopper?.content?.name}
        activeKey={modalActiveTab}
        onChange={setModalActiveTab}
        shopperDetailsData={shopperDetailsData}
        includeOverview={false}
      />
    </>
  );
};

export default React.memo(ShopperDetails);
