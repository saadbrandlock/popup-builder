import { AdminReviewQueueItem } from '@/types/api';
import { TablePaginationConfig } from 'antd';
import { create } from 'zustand';

type AdminReviewQueueState = {
  queueItems: AdminReviewQueueItem[];
  pagination: TablePaginationConfig;
  filters: {
    deviceId?: number;
    nameSearch?: string;
  };
  sorter: {
    sortColumn?: string;
    sortDirection?: 'ascend' | 'descend';
  };
  error?: string;
};

type AdminReviewQueueActions = {
  actions: {
    setQueueItems: (items: AdminReviewQueueItem[]) => void;
    setPagination: (pagination: TablePaginationConfig) => void;
    setFilters: (value: number | string | null, filterType: 'deviceId' | 'nameSearch') => void;
    resetFilters: () => void;
    setSorter: (sorter: AdminReviewQueueState['sorter']) => void;
    setError: (error: string) => void;
  };
};

export const useAdminReviewQueueStore = create<
  AdminReviewQueueState & AdminReviewQueueActions
>((set) => ({
  queueItems: [],
  pagination: {
    current: 1,
    pageSize: 5,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: ['5', '10', '20', '50'],
  },
  filters: {
    deviceId: undefined,
    nameSearch: undefined,
  },
  sorter: {
    sortColumn: 'account_name',
    sortDirection: 'ascend',
  },
  error: undefined,
  actions: {
    setQueueItems: (queueItems: AdminReviewQueueItem[]) => set({ queueItems }),
    setPagination: (pagination: TablePaginationConfig) => set({ pagination }),
    setFilters: (value: number | string | null, filterType: 'deviceId' | 'nameSearch') =>
      set((prev) => ({
        filters: {
          ...prev.filters,
          [filterType]: value,
        },
      })),
    resetFilters: () =>
      set(() => ({
        filters: {
          deviceId: undefined,
          nameSearch: undefined,
        },
      })),
    setSorter: (sorter: AdminReviewQueueState['sorter']) =>
      set((prev) => ({
        sorter: {
          ...prev.sorter,
          ...sorter,
        },
      })),
    setError: (error: string) => set({ error }),
  },
}));
