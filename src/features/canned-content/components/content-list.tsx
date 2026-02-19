import React, { useState, useEffect } from 'react';
import {
  Select,
  Button,
  Space,
  Typography,
  Input,
  Popconfirm,
  message,
  Card,
  Tag,
  Table,
  Row,
  Col,
} from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import { CBCannedContentGroup, CreateContentGroupRequest } from '@/types';
import { useContentListingStore } from '@/stores/list/contentListing';
import { useContent } from '../hooks/use-content';
import { BaseProps } from '@/types/props';
import { useDebouncedCallback } from '@/lib/hooks';
import { TimeDisplay } from '@/components/common';
import SharedTemplateTable, {
  FilterComponent,
} from '@/components/common/shared-table';
import { useLoadingStore } from '@/stores/common/loading.store';
import CannedContentForm from './content-form';
import { useGenericStore } from '@/stores/generic.store';
import { useSyncGenericContext } from '@/lib/hooks/use-sync-generic-context';
import { splitByAndCapitalize } from '@/lib/utils/helper';

const { Search } = Input;
const { Text, Paragraph } = Typography;

export interface CannedContentListProps extends BaseProps {}

const CannedContentList: React.FC<CannedContentListProps> = ({
  apiClient,
  navigate,
  shoppers,
  accountDetails,
  authProvider,
  accounts,
}) => {
  useSyncGenericContext({
    apiClient,
    navigate,
    accountDetails,
    authProvider,
    shoppers,
    accounts,
  });

  const [isFormVisible, setIsFormVisible] = useState(false);

  const { actions, pagination, filters, sorter, industries, contentGroups, selectedGroup } =
    useContentListingStore();

  const { contentSubDataLoading, contentListingLoading, actions: loadingActions } = useLoadingStore();

  const genericActions = useGenericStore((s) => s.actions);
  const genericAccountDetails = useGenericStore((s) => s.accountDetails);
  const genericShoppers = useGenericStore((s) => s.shoppers);
  const genericAuthProvider = useGenericStore((s) => s.authProvider);
  const genericNavigate = useGenericStore((s) => s.navigate);

  const {
    getContentGroups,
    deleteContentGroup,
    updateContentGroup,
    createContentGroup,
    getFields,
    getIndustries,
  } = useContent();

  const handleTableChange: TableProps<CBCannedContentGroup>['onChange'] = (
    newPagination,
    _,
    newSorter
  ) => {
    const sorterResult = newSorter as SorterResult<CBCannedContentGroup>;
    const newSortColumn = sorterResult.field as string;
    const newSortDirection = sorterResult.order as 'ascend' | 'descend';

    actions.setPagination(newPagination);
    actions.setSorter({
      sortColumn: newSortColumn,
      sortDirection: newSortDirection,
    });
  };

  const handleFilterChange = (
    filterType: 'industry' | 'field' | 'search' | 'shopper_ids',
    value: string | number[] | null
  ) => {
    actions.setFilters(value, filterType);
    actions.setPagination({ ...pagination, current: 1 });
  };

  const handleResetFilters = () => {
    const searchValue = filters.search;
    actions.resetFilters();
    actions.setFilters(searchValue as string, 'search');
    actions.setPagination({ ...pagination, current: 1 });
  };

  const handleEdit = (group: CBCannedContentGroup) => {
    actions.setSelectedGroup(group);
    setIsFormVisible(true);
  };

  const handleDelete = async (headingId: number) => {
    try {
      await deleteContentGroup(headingId);
      message.success('Content group deleted successfully');
    } catch (error) {
      message.error('Failed to delete content group');
      console.error('Error deleting content group:', error);
    }
  };

  const handleFormSubmit = async (values: CreateContentGroupRequest) => {
    loadingActions.setContentSubmitLoading(true);
    try {
      if (selectedGroup) {
        await updateContentGroup(selectedGroup.parent.id, values);
        message.success('Content group updated successfully');
      } else {
        await createContentGroup(values);
        message.success('Content group created successfully');
      }
      setIsFormVisible(false);
      actions.setSelectedGroup(null);
    } catch (error) {
    } finally {
      loadingActions.setContentSubmitLoading(false);
    }
  };

  useEffect(() => {
    getIndustries();
    getFields();
  }, []);

  const debouncedFetchGroups = useDebouncedCallback(
    () => getContentGroups(),
    500
  );

  useEffect(() => {
    if (filters.search !== undefined) {
      debouncedFetchGroups();
    } else {
      getContentGroups();
    }
  }, [pagination.current, pagination.pageSize, filters, sorter]);

  // Parent row columns (Table.EXPAND_COLUMN first to avoid expandIconColumnIndex deprecation)
  const columns: TableProps<CBCannedContentGroup>['columns'] = [
    Table.EXPAND_COLUMN,
    {
      title: 'Content Set Name',
      dataIndex: ['parent', 'group_label'],
      key: 'group_label',
      sorter: true,
      width: 200,
      fixed: 'left',
      render: (text, record) => {
        return (
           <Space>
            <FolderOutlined style={{ color: '#1890ff' }} />
              <strong>{text}</strong>
            </Space>
        );
      },
    },
    {
      title: 'Industry',
      dataIndex: ['parent', 'industry'],
      key: 'industry',
      sorter: true,
      width: 150,
      render: (text) => (text ? splitByAndCapitalize(text, '_') : '-'),
    },
    {
      title: 'Heading Preview',
      dataIndex: ['parent', 'content'],
      key: 'heading_content',
      width: 300,
      render: (text) => (
        <Text ellipsis={{ tooltip: text }} style={{ maxWidth: 280 }}>
          {text || '-'}
        </Text>
      ),
    },
    {
      title: 'Shopper Segments',
      dataIndex: ['parent', 'shopper_ids'],
      key: 'shoppers',
      width: 200,
      render: (shopperIds: number[]) => {
        if (!shopperIds?.length) return '-';
        return (
          <Space size={4} wrap>
            {shopperIds.slice(0, 2).map((id) => {
              const shopper = shoppers.find((s) => s.id === id);
              return shopper ? <Tag key={id}>{shopper.name}</Tag> : null;
            })}
            {shopperIds.length > 2 && (
              <Tag>+{shopperIds.length - 2} more</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Last Updated',
      dataIndex: ['parent', 'updated_at'],
      key: 'updated_at',
      sorter: true,
      width: 150,
      render: (dateString) => (
        <TimeDisplay dateString={dateString} showIcon showRelative />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => {
        const groupLabel = record?.parent?.group_label ?? 'this content group';
        const fieldsCount = record?.children?.length ?? 0;
        const parentId = record?.parent?.id;

        return (
          <Space size="small">
            <Button type="link" size="small" onClick={() => handleEdit(record)}>
              Edit
            </Button>
            <Popconfirm
              title="Delete Content Group"
              description={`This will delete "${groupLabel}" and all ${fieldsCount} field(s). Continue?`}
              onConfirm={() => parentId && handleDelete(parentId)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" size="small" danger>
                Delete
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const filterComponents: FilterComponent[] = [
    {
      key: 'industry',
      component: (
        <Select
          value={filters.industry}
          allowClear
          style={{ width: '100%' }}
          placeholder="Filter by Industry"
          onChange={(value) => handleFilterChange('industry', value)}
          options={industries.map((i) => ({
            label: splitByAndCapitalize(i, '_'),
            value: i,
          }))}
          loading={contentSubDataLoading}
        />
      ),
    },
    {
      key: 'shoppers',
      component: (
        <Select
          value={filters.shopper_ids}
          allowClear
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="Filter by Shopper Segments"
          onChange={(value) => handleFilterChange('shopper_ids', value)}
          options={shoppers.map((s) => ({ label: s.name, value: s.id }))}
        />
      ),
    },
  ];

  const actionButtons = (
    <Space>
      <Button type="primary" onClick={() => setIsFormVisible(true)}>
        Add New Content Set
      </Button>
    </Space>
  );

  // Only show groups that have a valid parent and at least one child (avoid empty placeholder rows)
  const displayGroups = contentGroups.filter(
    (group) =>
      group?.parent?.id != null &&
      Array.isArray(group.children) &&
      group.children.length > 0
  );

  useEffect(() => {
    if (!genericAccountDetails && accountDetails) {
      genericActions.setAccount(accountDetails);
    }
    if (!genericAuthProvider && authProvider) {
      genericActions.setAuthProvider(authProvider);
    }
    if (!genericShoppers.length && shoppers) {
      genericActions.setShoppers(shoppers)
    }
    if (!genericNavigate && navigate) {
      genericActions.setNavigate(navigate)
    }
  }, [authProvider, accountDetails, shoppers, navigate]);

  return (
    <>
      <Card>
        <SharedTemplateTable<CBCannedContentGroup>
          columns={columns}
          rowKey={(_, index?: number) =>`row-${index ?? -1}`}
          dataSource={displayGroups}
          pagination={pagination}
          loading={contentListingLoading}
          onChange={handleTableChange}
          filters={filterComponents}
          search={
            <Search
              placeholder="Search content groups..."
              allowClear
              onSearch={(value) => handleFilterChange('search', value || null)}
              onChange={(e) =>
                handleFilterChange('search', e.target.value || null)
              }
              style={{ width: '400px' }}
            />
          }
          scroll={{ x: 1200 }}
          actionButtons={actionButtons}
          onResetFilters={handleResetFilters}
          expandable={{
            expandedRowRender: (group) => (
              <div className="py-4">
                <Row gutter={[16, 16]}>
                  {(group.children ?? []).map((child, index) => (
                    <Col
                      key={child?.id != null ? child.id : `child-${index}`}
                      xs={24}
                      sm={12}
                      lg={8}
                      xl={6}
                    >
                      <Card
                        size="small"
                        hoverable
                        className="h-full rounded-lg border-gray-200"
                        styles={{body: { padding: '12px 16px' }}}
                      >
                        <Space direction="vertical" size={8} className="w-full">
                          <Tag color="geekblue" className="mr-0">
                            {child?.field_name ? splitByAndCapitalize(child.field_name, '_') : '-'}
                          </Tag>

                          <Paragraph
                            ellipsis={{ tooltip: child?.content, rows: 2 }}
                            className="block text-gray-800 text-sm leading-relaxed min-h-[42px]"
                          >
                            {child?.content || '-'}
                          </Paragraph>

                          <div className="pt-1 border-t border-gray-100">
                            <TimeDisplay
                              dateString={child?.updated_at}
                              showRelative
                            />
                          </div>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            ),
            rowExpandable: (group) => !!group.children && group.children.length > 0,
          }}
        />
      </Card>
      <CannedContentForm
        visible={isFormVisible}
        onCancel={() => {
          setIsFormVisible(false);
          actions.setSelectedGroup(null);
        }}
        onSubmit={handleFormSubmit}
        editingGroup={selectedGroup}
        industries={industries}
      />
    </>
  );
};

export default CannedContentList;
