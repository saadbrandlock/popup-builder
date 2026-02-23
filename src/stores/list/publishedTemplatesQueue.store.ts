import { AdminReviewQueueItem } from '@/types/api';
import { TablePaginationConfig } from 'antd';
import { create } from 'zustand';

type PublishedTemplatesQueueState = {
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
  viewOnlyMode: boolean;
};

type PublishedTemplatesQueueActions = {
  actions: {
    setQueueItems: (items: AdminReviewQueueItem[]) => void;
    setPagination: (pagination: TablePaginationConfig) => void;
    setFilters: (value: number | string | null, filterType: 'deviceId' | 'nameSearch') => void;
    resetFilters: () => void;
    setSorter: (sorter: PublishedTemplatesQueueState['sorter']) => void;
    setError: (error: string) => void;
    setViewOnlyMode: (value: boolean) => void;
  };
};

export const usePublishedTemplatesQueueStore = create<
  PublishedTemplatesQueueState & PublishedTemplatesQueueActions
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
  viewOnlyMode: false,
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
    setSorter: (sorter: PublishedTemplatesQueueState['sorter']) =>
      set((prev) => ({
        sorter: {
          ...prev.sorter,
          ...sorter,
        },
      })),
    setError: (error: string) => set({ error }),
    setViewOnlyMode: (viewOnlyMode: boolean) => set({ viewOnlyMode }),
  },
}));
