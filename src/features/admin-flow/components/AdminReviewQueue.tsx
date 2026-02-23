import React, { useEffect } from 'react';
import {
  Typography,
  Input,
  Select,
  Button,
  Alert,
  Table,
} from 'antd';
import StatusTag from '@/features/template-builder/components/common/StatusTag';
import DeviceTags from '@/features/template-builder/components/common/DeviceTags';
import {
  SharedTemplateTable,
  ShopperSegmentTagGroup,
  TimeDisplay,
} from '@/components/common';
import { FilterComponent } from '@/components/common/shared-table';
import { useAdminReviewQueueStore } from '@/stores/list/adminReviewQueue.store';
import { useDevicesStore } from '@/stores/common/devices.store';
import { useLoadingStore } from '@/stores/common/loading.store';
import { SorterResult } from 'antd/es/table/interface';
import { BaseProps } from '@/types/props';
import { shopperLookup } from '@/lib/utils/helper';
import { useDebouncedCallback } from '@/lib/hooks/use-debounce';
import { useAdminReviewListing } from '../hooks/use-admin-review-listing';
import { useSyncGenericContext } from '@/lib/hooks/use-sync-generic-context';
import type { TableProps } from 'antd';
import type {
  AdminReviewQueueItem,
  AdminReviewQueueTemplate,
  AdminReviewQueueChildTemplate,
} from '@/types/api';

const { Title, Text } = Typography;
const { Search } = Input;

interface AdminReviewQueueProps extends BaseProps {}

export const AdminReviewQueue: React.FC<AdminReviewQueueProps> = ({
  apiClient,
  navigate,
  shoppers,
  accountDetails,
  authProvider,
  accounts,
}) => {
  useSyncGenericContext({
    accountDetails,
    authProvider,
    shoppers,
    navigate,
    accounts,
    apiClient,
  });

  const { getQueueItems, getDevices, handleReview } = useAdminReviewListing();
  const { devices } = useDevicesStore();
  const { devicesLoading, templateListingLoading } = useLoadingStore();
  const { queueItems, pagination, filters, sorter, error, actions } =
    useAdminReviewQueueStore();

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
  ];

  const handleFilterChange = (
    filterType: 'deviceId' | 'nameSearch',
    value: number | string | null
  ) => {
    actions.setFilters(value, filterType);
    actions.setPagination({ ...pagination, current: 1 });
  };

  const handleResetFilters = () => {
    actions.resetFilters();
    actions.setPagination({ ...pagination, current: 1 });
  };

  const handleTableChange: TableProps<AdminReviewQueueItem>['onChange'] = (
    newPagination,
    _tableFilters,
    newSorter
  ) => {
    const sorterResult = newSorter as SorterResult<AdminReviewQueueItem>;
    const fieldToColumn: Record<string, string> = {
      account_name: 'account_name',
      latest_updated: 'latest_updated',
    };
    const backendField = sorterResult.field
      ? fieldToColumn[sorterResult.field as string] ?? sorterResult.field
      : 'account_name';
    const newSortColumn = backendField;
    const newSortDirection = sorterResult.order
      ? sorterResult.order === 'ascend'
        ? 'ascend'
        : 'descend'
      : 'ascend';

    actions.setPagination(newPagination);
    actions.setSorter({
      sortColumn: newSortColumn,
      sortDirection: newSortDirection,
    });
  };

  const debouncedFetchQueue = useDebouncedCallback(() => getQueueItems(), 500);

  useEffect(() => {
    if (filters.nameSearch !== undefined) {
      debouncedFetchQueue();
    } else {
      getQueueItems();
    }
  }, [filters, pagination.current, pagination.pageSize, sorter]);

  useEffect(() => {
    getDevices();
  }, []);

  const columns: TableProps<AdminReviewQueueItem>['columns'] = [
    {
      title: 'Account',
      dataIndex: 'account_name',
      key: 'account_name',
      sorter: true,
      fixed: 'left' as const,
      width: 180,
      render: (name: string, record: AdminReviewQueueItem) => (
        <div>
          <Text strong>{name}</Text>
          {record.account_domain && (
            <div className="mt-0.5">
              <Text type="secondary" className="text-xs">
                {record.account_domain}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Templates',
      dataIndex: 'template_count',
      key: 'template_count',
      width: 100,
      render: (count: number) => <Text>{count}</Text>,
    },
    {
      title: 'Devices',
      dataIndex: 'devices',
      key: 'devices',
      render: (devs: { device_type: string; id: number }[]) => (
        <DeviceTags
          devices={(devs || []).map((d) => d.device_type.toLowerCase())}
        />
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: () => <StatusTag status="admin-review" />,
    },

    {
      title: 'Last Updated',
      dataIndex: 'latest_updated',
      key: 'latest_updated',
      sorter: true,
      render: (dateString: string) => (
        <TimeDisplay dateString={dateString} showIcon={true} showRelative={true} />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
      render: (_: unknown, record: AdminReviewQueueItem) => (
        <Button
          type="primary"
          size="small"
          onClick={() => handleReview(record.account_id)}
        >
          Review
        </Button>
      ),
    },
  ];

  const expandedRowRender = (record: AdminReviewQueueItem) => {
    const templateColumns: TableProps<AdminReviewQueueTemplate>['columns'] = [
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        render: (name: string, tpl: AdminReviewQueueTemplate) => (
          <div className="pl-4">
            <Text strong>{name}</Text>
            {(tpl.child_templates?.length ?? 0) > 0 && (
              <Text type="secondary" className="ml-2 text-xs">
                ({tpl.child_templates!.length} child)
              </Text>
            )}
          </div>
        ),
      },
      {
        title: 'Devices',
        dataIndex: 'devices',
        key: 'devices',
        render: (devs: { device_type: string; id: number }[]) => (
          <DeviceTags
            devices={(devs || []).map((d) => d.device_type.toLowerCase())}
          />
        ),
      },
      {
        title: 'Shopper Segments',
        dataIndex: 'shopper_ids',
        key: 'shopper_ids',
        render: (shopper_ids: number[]) => (
          <ShopperSegmentTagGroup
            shopperIds={shopper_ids || []}
            shopperLookup={shopperLookup(shoppers)}
            maxVisible={2}
            showTooltip={true}
          />
        ),
      },
      {
        title: 'Last Updated',
        dataIndex: 'updated_at',
        key: 'updated_at',
        render: (dateString: string | null) =>
          dateString ? (
            <TimeDisplay
              dateString={dateString}
              showIcon={true}
              showRelative={true}
            />
          ) : (
            '-'
          ),
      },
    ];

    const childExpandedRowRender = (tpl: AdminReviewQueueTemplate) => {
      const children = tpl.child_templates ?? [];
      if (children.length === 0) return null;
      return (
        <div className="bg-gray-50 p-4 rounded-md ml-8">
          <Text strong className="text-sm mb-2 block">
            Child Templates ({children.length})
          </Text>
          <Table<AdminReviewQueueChildTemplate>
            columns={[
              {
                title: 'Name',
                dataIndex: 'name',
                key: 'name',
                render: (n: string) => <Text>{n}</Text>,
              },
              {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                render: (s: string | null) => (
                  <StatusTag status={(s ?? 'draft') as any} />
                ),
              },
              {
                title: 'Devices',
                dataIndex: 'devices',
                key: 'devices',
                render: (devs: { device_type: string; id: number }[]) => (
                  <DeviceTags
                    devices={(devs || []).map((d) => d.device_type.toLowerCase())}
                  />
                ),
              },
            ]}
            dataSource={children}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </div>
      );
    };

    const templatesWithExpand = record.templates.map((t) => ({
      ...t,
      _hasChildren: (t.child_templates?.length ?? 0) > 0,
    }));

    return (
      <div className="py-2">
        <Table<AdminReviewQueueTemplate & { _hasChildren?: boolean }>
          columns={templateColumns}
          dataSource={templatesWithExpand}
          rowKey="id"
          pagination={false}
          size="small"
          expandable={{
            expandedRowRender: (tpl) => childExpandedRowRender(tpl),
            rowExpandable: (tpl) => (tpl as any)._hasChildren === true,
          }}
        />
      </div>
    );
  };

  if (error) {
    return (
      <div className="space-y-6">
        <Alert message={error} type="error" showIcon />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SharedTemplateTable<AdminReviewQueueItem>
        title=""
        columns={columns}
        rowKey="account_id"
        dataSource={queueItems}
        pagination={pagination}
        loading={templateListingLoading}
        onChange={handleTableChange}
        filters={filterComponents}
        onResetFilters={handleResetFilters}
        scroll={{ x: 900 }}
        expandable={{
          expandedRowRender,
          rowExpandable: (record) => (record.templates?.length ?? 0) > 0,
        }}
        search={
          <Search
            placeholder="Search by template name or account name"
            allowClear
            onSearch={(value) => handleFilterChange('nameSearch', value || null)}
            onChange={(e) =>
              handleFilterChange('nameSearch', e.target.value || null)
            }
            value={filters.nameSearch ?? ''}
            style={{ width: '400px' }}
          />
        }
      />

    </div>
  );
};
