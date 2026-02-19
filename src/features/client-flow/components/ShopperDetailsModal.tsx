import React from 'react';
import { Modal, Tabs, Carousel, Image, Typography } from 'antd';

const { Text, Title } = Typography;

interface Screenshot {
  url: string;
  title?: string | null;
}

interface ShopperDetailsData {
  ui_template: {
    props: {
      primaryBtnText?: string | null;
      outlinedBtnText?: string | null;
      data: {
        overview: Array<{ header: string; description: string }>;
        problemSS?: Screenshot[];
        solutionSS?: Screenshot[];
      };
    };
  };
}

interface ShopperDetailsModalProps {
  open: boolean;
  onClose: () => void;
  shopperName: string | null | undefined;
  activeKey: string;
  onChange: (key: string) => void;
  shopperDetailsData: ShopperDetailsData | null | undefined;
  includeOverview?: boolean;
}

const ScreenshotCarousel: React.FC<{ screenshots: Screenshot[]; emptyText: string }> = ({
  screenshots,
  emptyText,
}) => {
  if (!screenshots || screenshots.length === 0) {
    return (
      <div className="text-center py-8">
        <Text type="secondary">{emptyText}</Text>
      </div>
    );
  }
  return (
    <Carousel
      arrows={screenshots.length > 1}
      dots={screenshots.length > 1}
      autoplay={screenshots.length > 1}
    >
      {screenshots.map((screenshot, index) => (
        <div key={index} className="text-center">
          <Image
            src={screenshot.url}
            alt={screenshot.title || `Screenshot ${index + 1}`}
            style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
            preview={false}
          />
          {screenshot.title && (
            <Text className="block mt-2 text-gray-600">{screenshot.title}</Text>
          )}
        </div>
      ))}
    </Carousel>
  );
};

const ShopperDetailsModal: React.FC<ShopperDetailsModalProps> = ({
  open,
  onClose,
  shopperName,
  activeKey,
  onChange,
  shopperDetailsData,
  includeOverview = false,
}) => {
  const tabItems = [
    ...(includeOverview
      ? [
          {
            key: 'overview',
            label: 'Overview',
            children: (
              <div className="p-4">
                {shopperDetailsData?.ui_template.props.data.overview.map((item) => (
                  <div key={item.header} className="mb-4">
                    <Title level={5}>{item.header}</Title>
                    <Text>{item.description}</Text>
                  </div>
                ))}
              </div>
            ),
          },
        ]
      : []),
    {
      key: 'behavior',
      label: shopperDetailsData?.ui_template.props.primaryBtnText || 'Behavior',
      children: (
        <div className="p-4">
          <ScreenshotCarousel
            screenshots={shopperDetailsData?.ui_template.props.data.problemSS ?? []}
            emptyText="No screenshots available for shopper behavior"
          />
        </div>
      ),
    },
    {
      key: 'solution',
      label: shopperDetailsData?.ui_template.props.outlinedBtnText || 'Solutions',
      children: (
        <div className="p-4">
          <ScreenshotCarousel
            screenshots={shopperDetailsData?.ui_template.props.data.solutionSS ?? []}
            emptyText="No screenshots available for solution"
          />
        </div>
      ),
    },
  ];

  return (
    <Modal
      title={`${shopperName || 'Shopper'} Details`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
      centered
    >
      <Tabs activeKey={activeKey} onChange={onChange} items={tabItems} />
    </Modal>
  );
};

export default ShopperDetailsModal;
