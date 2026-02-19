import React, { useState } from 'react';
import { Table, Button, Popover, Space, Typography } from 'antd';
import { FilterOutlined, ClearOutlined } from '@ant-design/icons';
import type { TableProps, TablePaginationConfig } from 'antd';

const { Title } = Typography;

export interface FilterComponent {
  key: string;
  component: React.ReactNode;
}

interface SharedTemplateTableProps<T extends object> {
  columns: TableProps<T>['columns'];
  dataSource: T[];
  loading: boolean;
  pagination: TablePaginationConfig;
  rowKey: keyof T | string | ((record: T, index?: number) => string);
  onChange: TableProps<T>['onChange'];
  title?: string;
  filters?: FilterComponent[];
  actionButtons?: React.ReactNode;
  onResetFilters?: () => void;
  search?: React.ReactNode;
  scroll?: TableProps<T>['scroll'];
  expandable?: {
    expandedRowRender: (record: T) => React.ReactNode;
    rowExpandable: (record: T) => boolean;
  };
}

function SharedTemplateTable<T extends object>({
  columns,
  dataSource,
  loading,
  pagination,
  rowKey,
  onChange,
  title,
  filters,
  actionButtons,
  onResetFilters,
  search,
  scroll,
  expandable,
}: SharedTemplateTableProps<T>) {
  const [filtersVisible, setFiltersVisible] = useState(false);

  const handleResetFilters = () => {
    if (onResetFilters) {
      onResetFilters();
    }
    setFiltersVisible(false);
  };

  const filtersContent = filters && filters.length > 0 && (
    <div style={{ width: 300, padding: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>
          Filters
        </Title>
        {onResetFilters && (
          <Button 
            size="small" 
            icon={<ClearOutlined />} 
            onClick={handleResetFilters}
            type="text"
          >
            Reset
          </Button>
        )}
      </div>
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        {filters.map((filter) => (
          <div key={filter.key} style={{ width: '100%' }}>
            {filter.component}
          </div>
        ))}
      </Space>
    </div>
  );

  const tableTitle = (title || filters || actionButtons || search) && (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <div>
        {title && (
          <Title level={3} style={{ margin: 0 }}>
            {title}
          </Title>
        )}
        {
          search && (
            <div>
              {search}
            </div>
          )
        }
      </div>
      <div>
        <Space>
          {actionButtons}
          {filters && filters.length > 0 && (
            <Popover
              content={filtersContent}
              title={null}
              trigger="click"
              open={filtersVisible}
              onOpenChange={setFiltersVisible}
              placement="bottomRight"
            >
              <Button 
                icon={<FilterOutlined />} 
                type={filtersVisible ? 'primary' : 'default'}
              >
                Filters
              </Button>
            </Popover>
          )}
        </Space>
      </div>
    </div>
  );

  return (
    <div>
      {tableTitle}
      <Table<T>
        columns={columns}
        rowKey={rowKey as TableProps<T>['rowKey']}
        dataSource={dataSource}
        pagination={pagination}
        loading={loading}
        onChange={onChange}
        scroll={scroll}
        expandable={expandable}
      />
    </div>
  );
}

export default SharedTemplateTable; 