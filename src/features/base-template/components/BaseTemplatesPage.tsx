import React, { useEffect } from 'react';
import { Button, Card, Input, Popconfirm, Space, Tabs, Typography } from 'antd';
import { PlusOutlined, FolderOutlined } from '@ant-design/icons';
import { BaseTemplateGallery } from './BaseTemplateGallery';
import { CategoryModal } from './CategoryModal';
import { useCategoryStore } from '../stores';
import { useBaseTemplateActions, useBaseTemplateCategoriesListing } from '../hooks';
import { BaseProps } from '@/types/props';
import { useBaseTemplateCategoriesListingStore } from '@/stores/list/baseTemplateCategoriesListing.store';
import { useDebouncedCallback } from '@/lib/hooks';
import { useSyncGenericContext } from '@/lib/hooks/use-sync-generic-context';
import type { TableProps } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import SharedTemplateTable from '@/components/common/shared-table';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../types';

interface BaseTemplatesPageProps extends Partial<BaseProps> {
  onCreateTemplate?: () => void;
}

export const BaseTemplatesPage: React.FC<BaseTemplatesPageProps> = ({
  apiClient,
  navigate,
  accountDetails,
  authProvider,
  shoppers,
  accounts,
  onCreateTemplate,
}) => {
  useSyncGenericContext({
    apiClient,
    navigate,
    accountDetails,
    authProvider,
    shoppers,
    accounts,
  });

  const { actions: categoryActions } = useCategoryStore();
  const {
    loading: actionsLoading,
    loadTemplates,
    createCategory,
    deleteTemplate,
    updateTemplateStatus,
    editTemplate,
    previewTemplate,
  } = useBaseTemplateActions();

  const {
    loading: categoriesLoading,
    getCategories,
    deleteCategory,
  } = useBaseTemplateCategoriesListing();

  const {
    categories: categoryRows,
    pagination: categoriesPagination,
    filters: categoriesFilters,
    sorter: categoriesSorter,
    actions: categoriesListingActions,
  } = useBaseTemplateCategoriesListingStore();

  useEffect(() => {
    loadTemplates();
  }, []);

  const debouncedFetchCategories = useDebouncedCallback(
    () => getCategories(),
    500
  );

  useEffect(() => {
    if (categoriesFilters.search !== undefined) {
      debouncedFetchCategories();
    } else {
      getCategories();
    }
  }, [
    categoriesPagination.current,
    categoriesPagination.pageSize,
    categoriesFilters,
    categoriesSorter,
  ]);

  const handleCreateTemplate = () => {
    if (onCreateTemplate) {
      onCreateTemplate();
    } else if (navigate) {
      navigate('/popup-builder/base-templates/create');
    }
  };

  const handleEditTemplate = (template: any) => {
    editTemplate(template, navigate);
  };

  const handleCategoryTableChange: TableProps<Category>['onChange'] = (
    newPagination,
    _,
    newSorter
  ) => {
    const sorterResult = newSorter as SorterResult<Category>;
    const sortColumn = sorterResult.field as string | undefined;
    const sortDirection = sorterResult.order as 'ascend' | 'descend' | undefined;

    categoriesListingActions.setPagination(newPagination);
    categoriesListingActions.setSorter({
      sortColumn,
      sortDirection,
    });
  };

  const handleCategorySearch = (value: string | null) => {
    categoriesListingActions.setFilters(value, 'search');
    categoriesListingActions.setPagination({ ...categoriesPagination, current: 1 });
  };

  const handleResetCategoryFilters = () => {
    categoriesListingActions.resetFilters();
    categoriesListingActions.setPagination({ ...categoriesPagination, current: 1 });
  };

  const categoryColumns: TableProps<Category>['columns'] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (text: string) => <Typography.Text strong>{text}</Typography.Text>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      sorter: true,
      render: (text: string | null) => (
        <div style={{ maxWidth: 400 }}>{text || '-'}</div>
      ),
    },
    {
      title: 'Display Order',
      dataIndex: 'display_order',
      key: 'display_order',
      sorter: true,
      width: 130,
    },
    {
      title: 'Icon URL',
      dataIndex: 'icon_url',
      key: 'icon_url',
      render: (text: string | null | undefined) =>
        text ? (
          <Typography.Link href={text} target="_blank">
            View
          </Typography.Link>
        ) : (
          '-'
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_: any, record: Category) => (
        <Space size="middle">
          <Button type="link" onClick={() => categoryActions.openModal(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete Category"
            description="Are you sure you want to delete this category?"
            onConfirm={() => deleteCategory(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleCategorySubmit = async (
    data: CreateCategoryInput | UpdateCategoryInput
  ) => {
    await createCategory(data);
    await getCategories();
  };

  return (
    <>
      <Tabs
        defaultActiveKey="templates"
        items={[
          {
            key: 'templates',
            label: 'Templates',
            children: (
              <BaseTemplateGallery
                onCreateTemplate={handleCreateTemplate}
                onEditTemplate={handleEditTemplate}
                onPreviewTemplate={previewTemplate}
                onDeleteTemplate={deleteTemplate}
                onUpdateStatus={updateTemplateStatus}
                onLoadTemplates={loadTemplates}
                loading={actionsLoading}
                navigate={navigate}
              />
            ),
          },
          {
            key: 'categories',
            label: 'Categories',
            children: (
              <Card>
                <SharedTemplateTable<Category>
                  columns={categoryColumns}
                  rowKey="id"
                  dataSource={categoryRows}
                  pagination={categoriesPagination}
                  loading={categoriesLoading}
                  onChange={handleCategoryTableChange}
                  onResetFilters={handleResetCategoryFilters}
                  search={
                    <Input.Search
                      placeholder="Search categories by name/description"
                      allowClear
                      onSearch={(value) => handleCategorySearch(value || null)}
                      onChange={(e) =>
                        handleCategorySearch(e.target.value || null)
                      }
                      value={categoriesFilters.search}
                      style={{ width: '400px' }}
                    />
                  }
                  actionButtons={
                    <Button
                      icon={<FolderOutlined />}
                      onClick={() => categoryActions.openModal()}
                    >
                      Create Category
                    </Button>
                  }
                />
              </Card>
            ),
          },
        ]}
      />

      <CategoryModal
        onSubmit={handleCategorySubmit}
        loading={actionsLoading || categoriesLoading}
      />
    </>
  );
};

export const BaseTemplatesPageActions = () => {
  const { actions: categoryActions } = useCategoryStore();

  return [
    <Button
      key="category"
      icon={<FolderOutlined />}
      onClick={() => categoryActions.openModal()}
    >
      Create Category
    </Button>,
    <Button
      key="template"
      type="primary"
      icon={<PlusOutlined />}
      onClick={() => {}}
    >
      Create Template
    </Button>,
  ];
};
