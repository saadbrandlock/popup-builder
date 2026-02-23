import React from 'react';
import { Tag } from 'antd';
import { TCBTemplate } from '@/types';

interface StatusTagProps {
  status: TCBTemplate['status'];
  size?: 'default' | 'small';
}

export const StatusTag: React.FC<StatusTagProps> = ({ status }) => {
  const statusConfig: Record<string, { color: string; text: string }> = {
    draft: { color: 'default', text: 'Draft' },
    published: { color: 'success', text: 'Published' },
    archive: { color: 'warning', text: 'Archived' },
    'client-review': { color: 'processing', text: 'Client Review' },
    'admin-review': { color: 'processing', text: 'Admin Review' },
  };

  const config = status ? statusConfig[status] : undefined;

  return <Tag color={config?.color}>{config?.text ?? status ?? '—'}</Tag>;
};

export default StatusTag;
