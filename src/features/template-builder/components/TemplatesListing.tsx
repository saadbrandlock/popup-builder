import React, { useEffect, useState } from 'react';
import { AxiosInstance } from 'axios';
import {
  Typography,
  Input,
  Select,
  DatePicker,
  Button,
  Empty,
  Alert,
  message,
  Dropdown,
  Tag,
  TableProps,
  Space,
  Modal,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  MoreOutlined,
  EditOutlined,
  EyeOutlined,
  CheckOutlined,
  InboxOutlined,
  DeleteOutlined,
  SelectOutlined,
} from '@ant-design/icons';
import StatusTag from './common/StatusTag';
import DeviceTags from './common/DeviceTags';
import { SharedTemplateTable, ShopperSegmentTagGroup, TimeDisplay, PopupPreviewTabs } from '@/components/common';
import { FilterComponent } from '@/components/common/shared-table';
import { useTemplateListingStore } from '@/stores/list/templateListing.store';
import { useDevicesStore } from '@/stores/common/devices.store';
import { useLoadingStore } from '@/stores/common/loading.store';
import { SorterResult } from 'antd/es/table/interface';
import { BaseProps } from '@/types/props';
import { shopperLookup } from '@/lib/utils/helper';
import { useDebouncedCallback } from '@/lib/hooks/use-debounce';
import { useTemplateListing } from '../hooks/use-template-listing';
import { AccountDetails, CleanTemplateResponse, TCBTemplate } from '@/types';
import { useSyncGenericContext } from '@/lib/hooks/use-sync-generic-context';
import { useGenericStore } from '@/stores/generic.store';
import { Link } from 'lucide-react';
import LinkTemplateModal from './common/link-template-modal';
import { ChildTemplatesTable } from './index';
import { createAPI } from '@/api';
import { useActionConfirm } from '@/lib/hooks/use-action-confirm';
import { useTemplatePreviewData } from '@/lib/hooks';
import { convertUnlayerJsonToHtml, validateUnlayerDesign } from '@/lib/utils/unlayerHtmlConverter';

const { Title, Text } = Typography;
const { Search } = Input;

interface TemplatesListingProps extends BaseProps {}

export const TemplatesListing: React.FC<TemplatesListingProps> = ({
  apiClient,
  navigate,
  shoppers,
  accountDetails,
  authProvider,
  accounts,
}) => {
  // Sync first so apiClient and context are in store before useTemplateListing etc.
  useSyncGenericContext({
    accountDetails,
    authProvider,
    shoppers,
    navigate,
    accounts,
    apiClient,
  });

  const { handleAction, getTemplates, getDevices } = useTemplateListing();

  const { showConfirm, ConfirmModal } = useActionConfirm()

    // Preview modal (same flow as BaseTemplateCard: convert builder_state_json to HTML, then useTemplatePreviewData)
    const [previewModalVisible, setPreviewModalVisible] = useState(false);
    const [previewTemplate, setPreviewTemplate] = useState<CleanTemplateResponse | null>(null);
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);
    const [loadingConversion, setLoadingConversion] = useState(false);

  const apiClientFromStore = useGenericStore((s) => s.apiClient);
  const handleChildTemplateAction = async (
    action: 'edit' | 'delete' | 'archive',
    templateId: string
  ) => {
    try {
      if (!apiClientFromStore) {
        message.error('API client is required');
        return;
      }
      const api = createAPI(apiClientFromStore);
      if (action === 'edit') {
        navigate(`/coupon-builder-v2/popup-builder/${templateId}/edit`);
      } else if (action === 'delete') {
        await api.templates.deleteTemplate(templateId);
        message.success('Child template deleted successfully');
        getTemplates(); // Refresh the main templates list
      } else if (action === 'archive') {
        await api.templates.archiveTemplate(templateId);
        message.success('Child template archived successfully');
        getTemplates(); // Refresh the main templates list
      }
    } catch (error) {
      console.error(`Error ${action}ing child template:`, error);
    }
  };

  const { devices } = useDevicesStore();
  const { devicesLoading, templateListingLoading, templateListActionLoading } = useLoadingStore();
  const { templates, pagination, filters, sorter, error, actions } = useTemplateListingStore();

  const [linkTemplateModalVisible, setLinkTemplateModalVisible] = useState(false);
  const [selectedTemplateDetails, setSelectedTemplateDetails] = useState<{
    name: string;
    id: string;
    description: string;
    account_id: number;
  }>({
    description: '',
    id: '',
    name: '',
    account_id: -1,
  });
  const getActionMenuItems = (template: CleanTemplateResponse) => {
    const actionItems: { key: string; icon: React.ReactNode; label: string; onClick: () => void }[] = [
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Edit',
        onClick: () => handleAction('edit', template),
      },
      {
        key: 'preview',
        icon: <EyeOutlined />,
        label: 'Preview',
        onClick: () => openPreviewModal(template),
      },
    ];

    if (template.devices.some((device) => device.device_type === 'desktop')) {
      actionItems.push({
        key: 'link',
        icon: <Link size={16} />,
        label: 'Link Templates',
        onClick: () => {
          setLinkTemplateModalVisible(true);
          setSelectedTemplateDetails({
            description: template.description || '',
            id: template.id,
            name: template.name,
            account_id: template.account_details.id,
          });
        },
      });
    }

    const statusItems: { key: string; icon: React.ReactNode; label: string; onClick: () => void }[] = [];

    if (template.status === 'draft' || template.child_templates?.some((child: any) => child.status === 'draft')) {
      statusItems.push({
        key: 'client-review',
        icon: <CheckOutlined />,
        label: 'Push To Client Review',
        onClick: () => {
          const childCount = template.child_templates?.length || 0;
          const templateText =
            childCount > 0
              ? `this template and ${childCount} linked child template(s)`
              : 'this template';
          showConfirm({
            title: 'Push to Client Review',
            content: (
              <div className="space-y-3">
                <p>
                  You are about to push <strong>{templateText}</strong> to client review. Once
                  pushed, clients will be able to see and review the template(s).
                </p>
                <p className="text-amber-600 font-medium">
                  ⚠️ Have you completed designing all the template(s)? This action will make them
                  visible to clients.
                </p>
                {childCount > 0 && (
                  <p className="text-xs text-gray-700">
                    Reminder: this template is linked to other template(s). If you have made changes
                    here, double‑check whether the same updates are also needed in its linked
                    template(s) (parent/child) before pushing to client review.
                  </p>
                )}
              </div>
            ),
            onConfirm: async () => await handleAction('client-review', template),
          });
        },
      });
    }

    if (template.status !== 'archive') {
      statusItems.push({
        key: 'archive',
        icon: <InboxOutlined />,
        label: 'Archive',
        onClick: () =>
          showConfirm({
            title: 'Archive template',
            content: (
              <p>
                Are you sure you want to archive <strong>{template.name}</strong>? You can restore it
                later.
              </p>
            ),
            onConfirm: async () => await handleAction('archive', template),
          }),
      });
    }

    if (template.status === 'archive') {
      statusItems.push({
        key: 'restore-draft',
        icon: <SelectOutlined />,
        label: 'Restore to Draft',
        onClick: () =>
          showConfirm({
            title: 'Restore to Draft',
            content: (
              <p>
                Restore <strong>{template.name}</strong> as a draft? You can edit and push to client
                review again.
              </p>
            ),
            onConfirm: async () =>
              await handleAction('unarchive', template, { targetStatus: 'draft' }),
          }),
      });
      statusItems.push({
        key: 'restore-published',
        icon: <SelectOutlined />,
        label: 'Restore to Published',
        onClick: () =>
          showConfirm({
            title: 'Restore to Published',
            content: (
              <p>
                Restore <strong>{template.name}</strong> to published status? It will be visible to
                clients again.
              </p>
            ),
            onConfirm: async () =>
              await handleAction('unarchive', template, { targetStatus: 'published' }),
          }),
      });
    }

    if (template.status !== 'published') {
      statusItems.push({
        key: 'delete',
        icon: <DeleteOutlined />,
        label: 'Delete',
        onClick: () =>
          showConfirm({
            title: 'Delete template',
            content: (
              <p>
                Are you sure you want to delete <strong>{template.name}</strong>? This action cannot
                be undone.
              </p>
            ),
            onConfirm: async () => await handleAction('delete', template),
          }),
      });
    }

    return [
      { type: 'group' as const, label: 'Actions', children: actionItems },
      { type: 'group' as const, label: 'Status', children: statusItems },
    ];
  };

  const columns = [
    {
      title: 'Created For (Account)',
      dataIndex: 'account_details',
      key: 'account_details',
      sorter: true,
      fixed: 'left' as const,
      width: 150,
      render: (account_details: Pick<AccountDetails, 'id' | 'name' | 'domain'>) => (
        <Text strong>{account_details.name}</Text>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      fixed: 'left' as const,
      width: 160,
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Device',
      dataIndex: 'devices',
      key: 'devices',
      sorter: true,
      render: (devices: { device_type: string; id: number }[]) => (
        <DeviceTags devices={devices.map((device) => device.device_type.toLowerCase())} />
      ),
    },
    {
      title: 'Shopper Segments',
      dataIndex: 'shopper_ids',
      key: 'shopper_ids',
      width: 220,
      render: (shopper_ids: number[]) => {
        return (
          <ShopperSegmentTagGroup
            shopperIds={shopper_ids}
            shopperLookup={shopperLookup(shoppers)}
            maxVisible={2}
            showTooltip={true}
          />
        );
      },
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'generic' ? 'green' : 'orange'}>
          {type === 'generic' ? 'Generic' : 'Specific'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <StatusTag status={status as any} />,
    },
    {
      title: 'Last Updated',
      dataIndex: 'lastUpdated',
      sorter: true,
      key: 'lastUpdated',
      render: (dateString: string) => (
        <TimeDisplay dateString={dateString} showIcon={true} showRelative={true} />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, template: CleanTemplateResponse) => (
        <Dropdown
          menu={{ items: getActionMenuItems(template) }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button type="text" icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
        </Dropdown>
      ),
    },
  ];

  const filterComponents: FilterComponent[] = [
    {
      key: 'device',
      component: (
        <Select
          allowClear
          style={{ width: '100%' }}
          placeholder="Filter by Device"
          onChange={(value) => handleFilterChange('deviceId', value)}
          value={filters.deviceId}
          options={devices.map((device) => ({
            label: device.device_type,
            value: device.id,
          }))}
          loading={devicesLoading}
        />
      ),
    },
    {
      key: 'status',
      component: (
        <Select
          allowClear
          style={{ width: '100%' }}
          placeholder="Filter by Status"
          onChange={(value) => handleFilterChange('status', value)}
          value={filters.status}
          options={[
            { label: 'Draft', value: 'draft' },
            { label: 'Client Review', value: 'client-review' },
            { label: 'Active', value: 'active' },
            { label: 'Archived', value: 'archive' },
            { label: 'Published', value: 'published' },
          ]}
        />
      ),
    },
  ];

  const handleFilterChange = (
    filterType: 'deviceId' | 'status' | 'nameSearch',
    value: number | string | null
  ) => {
    actions.setFilters(value, filterType);
    actions.setPagination({ ...pagination, current: 1 });
  };

  const handleResetFilters = () => {
    actions.resetFilters();
    actions.setPagination({ ...pagination, current: 1 });
  };

  const handleTableChange: TableProps<CleanTemplateResponse>['onChange'] = (
    newPagination,
    tableFilters, // Antd table filters, not used directly here as we have separate state
    newSorter
  ) => {
    const sorterResult = newSorter as SorterResult<CleanTemplateResponse>;
    const fieldToColumn: Record<string, string> = {
      name: 'name',
      lastUpdated: 'updated_at',
      createdAt: 'created_at',
      status: 'status',
    };
    const backendField = sorterResult.field
      ? fieldToColumn[sorterResult.field as string] ?? sorterResult.field
      : 'name';
    const newSortColumn = `t.${backendField}`;
    const newSortDirection = sorterResult.order
      ? sorterResult.order === 'ascend'
        ? 'asc'
        : 'desc'
      : 'asc';

    actions.setPagination(newPagination);
    actions.setSorter({
      sortColumn: newSortColumn,
      sortDirection: newSortDirection === 'asc' ? 'ascend' : 'descend',
    });
  };

  const debouncedFetchTemplates = useDebouncedCallback(() => getTemplates(), 500);

  useEffect(() => {
    let cancelled = false;

    if (!previewModalVisible || !previewTemplate) {
      setPreviewHtml(null);
      setLoadingConversion(false);
      return () => {
        cancelled = true;
      };
    }

    const designJson = previewTemplate.builder_state_json;
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
  }, [previewModalVisible, previewTemplate?.id, previewTemplate?.builder_state_json]);

  const previewReady = previewModalVisible && !!previewTemplate && !!previewHtml;
  const { previewData, loading: loadingPreview } = useTemplatePreviewData({
    templateId: previewReady ? previewTemplate!.id : null,
    htmlContent: previewHtml || undefined,
    enabled: previewReady,
    template: previewTemplate || undefined,
  });

  const openPreviewModal = (template: CleanTemplateResponse) => {
    setPreviewTemplate(template);
    setPreviewModalVisible(true);
  };

  const closePreviewModal = () => {
    setPreviewModalVisible(false);
    setPreviewTemplate(null);
  };


  useEffect(() => {
    if (filters.nameSearch !== undefined) {
      debouncedFetchTemplates();
    } else {
      getTemplates();
    }
  }, [filters, pagination.current, pagination.pageSize, sorter]);

  useEffect(() => {
    getDevices();
  }, []);

  const renderError = () => (
    <div className="text-center py-12">
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <div>
            <Text type="danger">Error loading templates</Text>
            <br />
            <Text type="secondary" className="text-xs">
              {error}
            </Text>
          </div>
        }
      />
    </div>
  );

  if (error) {
    return renderError();
  }

  return (
    <div className={`space-y-6`}>
      {/* Header */}
      <div className="flex sm:items-center justify-between gap-4">
        <div>
          <Title level={2} className="mb-1!">
            Coupon Templates Listingg
          </Title>
          <Text type="secondary">Manage and organize your coupon templates</Text>
        </div>

        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/coupon-builder-v2/popup-builder')}
          >
            Create Template
          </Button>
          <Button
            icon={<EyeOutlined />}
            onClick={() => navigate('/coupon-builder-v2/base-templates')}
          >
            Manage Base Templates
          </Button>
        </Space>
      </div>

      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
      <SharedTemplateTable<CleanTemplateResponse>
        title=""
        columns={columns}
        rowKey="id"
        dataSource={templates}
        pagination={pagination}
        loading={templateListingLoading || templateListActionLoading}
        onChange={handleTableChange}
        filters={filterComponents}
        onResetFilters={handleResetFilters}
        scroll={{ x: 1200 }}
        search={
          <Search
            placeholder="Search by template name or account name"
            allowClear
            onSearch={(value) => handleFilterChange('nameSearch', value || null)}
            onChange={(e) => handleFilterChange('nameSearch', e.target.value || null)}
            value={filters.nameSearch ?? ''}
            style={{ width: '400px' }}
          />
        }
        expandable={{
          expandedRowRender: (record: CleanTemplateResponse | TCBTemplate) => (
            <ChildTemplatesTable
              childTemplates={(record.child_templates || []) as TCBTemplate[]}
              onChildAction={handleChildTemplateAction}
            />
          ),
          rowExpandable: (record: CleanTemplateResponse | TCBTemplate) =>
            !!(record.child_templates && record.child_templates.length > 0),
        }}
      />

      <LinkTemplateModal
        visible={!!selectedTemplateDetails.name}
        onCancel={() =>
          setSelectedTemplateDetails({
            description: '',
            id: '',
            name: '',
            account_id: -1,
          })
        }
        parentTemplateId={selectedTemplateDetails.id}
        parentTemplateName={selectedTemplateDetails.name}
        accountId={selectedTemplateDetails.account_id}
        onSuccess={() => {
          getTemplates();
          setLinkTemplateModalVisible(false);
        }}
      />

      <Modal
        open={previewModalVisible}
        onCancel={closePreviewModal}
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

      <ConfirmModal confirmLoading={templateListActionLoading} />
    </div>
  );
};

export default TemplatesListing;
