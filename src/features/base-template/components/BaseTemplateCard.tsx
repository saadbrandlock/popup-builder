import React, { useState, useEffect } from 'react';
import { Card, Tag, Space, Tooltip, Popconfirm, Dropdown, MenuProps, Modal, Spin } from 'antd';
import { EditOutlined, EyeOutlined, DeleteOutlined, FolderOutlined } from '@ant-design/icons';
import { BaseTemplate } from '../types';
import { Typography } from 'antd';
import { PopupPreviewTabs } from '@/components/common';
import { useTemplatePreviewData } from '@/lib/hooks';
import { convertUnlayerJsonToHtml, validateUnlayerDesign } from '@/lib/utils/unlayerHtmlConverter';
import { useLoadingStore } from '@/stores/common/loading.store';

const { Text } = Typography;

interface BaseTemplateCardProps {
  template: BaseTemplate;
  onEditTemplate: (template: BaseTemplate) => void;
  onPreviewTemplate: (template: BaseTemplate) => void;
  onDeleteTemplate: (template: BaseTemplate) => void;
  onUpdateStatus?: (template: BaseTemplate, status: 'archive' | 'active' | 'deleted') => Promise<void>;
  getStatusColor: (status: string) => string;
  getAvailableStatuses: (currentStatus: string) => Array<'archive' | 'active' | 'deleted'>;
}

export const BaseTemplateCard: React.FC<BaseTemplateCardProps> = ({
  template,
  onEditTemplate,
  onDeleteTemplate,
  onUpdateStatus,
  getStatusColor,
  getAvailableStatuses,
}) => {
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    newStatus: 'archive' | 'active' | 'deleted';
  } | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loadingConversion, setLoadingConversion] = useState(false);
  const { baseTemplateStatusUpdate } = useLoadingStore();

  // Convert builder_state_json to HTML when preview modal opens (same parser as template listing flow)
  useEffect(() => {
    let cancelled = false;

    if (!previewModalVisible) {
      setPreviewHtml(null);
      setLoadingConversion(false);
      return () => {
        cancelled = true;
      };
    }

    const designJson = template.builder_state_json;
    if (!designJson || !validateUnlayerDesign(designJson)) {
      setPreviewHtml(null);
      setLoadingConversion(false);
      return () => {
        cancelled = true;
      };
    }

    setLoadingConversion(true);
    convertUnlayerJsonToHtml(designJson)
      .then((html) => {
        if (!cancelled) {
          setPreviewHtml(html);
        }
      })
      .catch((err) => {
        console.error('Failed to convert builder_state_json to HTML for preview:', err);
        if (!cancelled) {
          setPreviewHtml(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingConversion(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [previewModalVisible, template.template_id, template.builder_state_json]);

  // Only pass templateId + htmlContent once preview HTML is ready so the hook never runs with null htmlContent
  const previewReady = previewModalVisible && !!previewHtml;
  const { previewData, loading: loadingPreview } = useTemplatePreviewData({
    templateId: previewReady ? template.template_id : null,
    htmlContent: previewHtml || undefined,
    enabled: previewReady,
    template: template
  });

  const handleStatusConfirm = async () => {
    if (pendingStatusChange && onUpdateStatus) {
      await onUpdateStatus(template, pendingStatusChange.newStatus);
      setPendingStatusChange(null);
    }
  };

  const getStatusMenuItems = (): MenuProps['items'] => {
    const availableStatuses = getAvailableStatuses(template.status);
    
    return availableStatuses.map((status) => ({
      key: status,
      label: status.charAt(0).toUpperCase() + status.slice(1),
      onClick: () => {
        setPendingStatusChange({ newStatus: status });
      },
    }));
  };
  return (
    <Card
      hoverable
      actions={[
        <Tooltip title="Edit" key="edit">
          <EditOutlined onClick={() => onEditTemplate(template)} />
        </Tooltip>,
        <Tooltip title="Preview" key="preview">
          <EyeOutlined onClick={() => setPreviewModalVisible(true)} />
        </Tooltip>,
        <Popconfirm
          key="delete"
          title="Delete Template"
          description={`Are you sure you want to delete "${template.name}"?`}
          onConfirm={() => onDeleteTemplate(template)}
          okText="Yes, Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
        >
          <Tooltip title="Delete">
            <DeleteOutlined style={{ color: '#ff4d4f' }} />
          </Tooltip>
        </Popconfirm>,
      ]}
    >
      <Card.Meta
        title={
          <Tooltip title={template.name}>
            <div
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {template.name}
            </div>
          </Tooltip>
        }
        description={
          <Space direction="vertical" style={{ width: '100%' }}>
            {template.description && (
              <Text
                type="secondary"
                style={{
                  fontSize: 12,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {template.description}
              </Text>
            )}
            <Space size="small">
              <Popconfirm
                title={`Change Status to ${pendingStatusChange?.newStatus ? pendingStatusChange.newStatus.charAt(0).toUpperCase() + pendingStatusChange.newStatus.slice(1) : ''}?`}
                description={`Are you sure you want to change the status of "${template.name}" to ${pendingStatusChange?.newStatus}?`}
                open={pendingStatusChange !== null}
                onConfirm={handleStatusConfirm}
                onCancel={() => setPendingStatusChange(null)}
                okText="Yes, Update"
                cancelText="Cancel"
                okButtonProps={{ danger: pendingStatusChange?.newStatus === 'deleted', loading: baseTemplateStatusUpdate }}
                placement="top"
              >
                <Dropdown
                  menu={{ items: getStatusMenuItems() }}
                  trigger={['click']}
                  disabled={!onUpdateStatus}
                >
                  <Tag
                    color={getStatusColor(template.status)}
                    style={{ cursor: onUpdateStatus ? 'pointer' : 'default' }}
                  >
                    {template.status.charAt(0).toUpperCase() + template.status.slice(1)}
                  </Tag>
                </Dropdown>
              </Popconfirm>
              {template.category && (
                <Tag icon={<FolderOutlined />}>
                  {template.category.name}
                </Tag>
              )}
            </Space>
          </Space>
        }
      />
      <Modal
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={null}
        width={1200}
        centered
        destroyOnHidden
      >
        <div className="py-4">
          {loadingConversion || loadingPreview ? (
            <div className="flex items-center justify-center h-96">
              <Spin size="large" />
            </div>
          ) : (
            <PopupPreviewTabs
              clientData={previewData}
              className="w-full"
            />
          )}
        </div>
      </Modal>
    </Card>
  );
};
