import { useEffect, useState, useCallback, useRef } from 'react';
import { Button, Select } from 'antd';
import { Tag, Plus } from 'lucide-react';
import { useGenericStore } from '@/stores/generic.store';
import { useClientFlowStore } from '@/stores/clientFlowStore';
import { createAPI } from '@/api';
import { AddCouponDrawer } from './add-coupon-drawer';
import type { CouponListItem } from '@/api/services/CouponAPI';
import type { ShopperCouponItem } from '@/types/api';

export interface AssignCouponsSectionProps {
  activeShopperId: number | null;
  selectedCoupons: number[];
  onSelectionChange: (couponIds: number[]) => void;
  /** Pre-loaded coupon IDs from client-review API (shopper.coupon_ids or shopper.coupons) */
  initialCouponIdsFromClient?: number[];
  /** Coupon display data from API (for template preview when using initialCouponIdsFromClient) */
  couponsFromApi?: ShopperCouponItem[] | null;
}

export const AssignCouponsSection = ({
  activeShopperId,
  selectedCoupons,
  onSelectionChange,
  initialCouponIdsFromClient,
  couponsFromApi,
}: AssignCouponsSectionProps) => {
  const PAGE_SIZE = 100;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [coupons, setCoupons] = useState<CouponListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [couponOffset, setCouponOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const lastInitializedShopperRef = useRef<number | null>(null);
  const fetchedRef = useRef(false);

  const accountDetails = useGenericStore((s) => s.accountDetails);
  const apiClient = useGenericStore((s) => s.apiClient);
  const { setSelectedCouponsData, setHasCouponSelectionChanged } = useClientFlowStore(
    (s) => s.actions
  );

  const fetchCoupons = useCallback(async (offset = 0, append = false) => {
    if (!accountDetails || !apiClient) return;
    const siteId = accountDetails.legacy_account_id || accountDetails.id;
    setLoading(true);
    try {
      const api = createAPI(apiClient);
      const list = await api.coupons.getCouponsList(siteId, {
        is_active: 'true',
        limit: PAGE_SIZE,
        offset,
      });
      setCoupons((prev) => (append ? [...prev, ...list] : list));
      setHasMore(list.length === PAGE_SIZE);
      setCouponOffset(offset + list.length);
    } catch {
      if (!append) setCoupons([]);
    } finally {
      setLoading(false);
    }
  }, [accountDetails, apiClient]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchCoupons(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeShopperId) {
      lastInitializedShopperRef.current = null;
      setHasCouponSelectionChanged(false);
      onSelectionChange([]);
      return;
    }
    if (lastInitializedShopperRef.current === activeShopperId) return;
    lastInitializedShopperRef.current = activeShopperId;
    setHasCouponSelectionChanged(false);

    // Prefer coupon IDs from client-review API when available
    if (initialCouponIdsFromClient && initialCouponIdsFromClient.length > 0) {
      onSelectionChange(initialCouponIdsFromClient);
      return;
    }

    // Fallback: derive from coupons list by persona_ids
    if (!coupons.length) return;
    const assigned = coupons
      .filter((c) => {
        const ids = (c.persona_ids || '')
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n));
        return ids.includes(activeShopperId);
      })
      .map((c) => c.promo_code_id);
    onSelectionChange(assigned);
  }, [activeShopperId, coupons, initialCouponIdsFromClient, onSelectionChange, setHasCouponSelectionChanged]);

  // Sync selected coupons to store for template preview (offerText, subtext)
  useEffect(() => {
    if (!activeShopperId) {
      setSelectedCouponsData([]);
      return;
    }
    if (selectedCoupons.length === 0) {
      setSelectedCouponsData([]);
      return;
    }
    const displayData = couponsFromApi?.length
      ? selectedCoupons
          .map((id) => couponsFromApi.find((c) => c.promo_code_id === id))
          .filter(Boolean)
          .map((c) => ({
            offerText: c!.offer_heading,
            subtext: c!.offer_sub_heading ?? c!.code,
          }))
      : selectedCoupons
          .map((id) => coupons.find((c) => c.promo_code_id === id))
          .filter(Boolean)
          .map((c) => ({
            offerText: c!.offer_heading,
            subtext: c!.offer_sub_heading ?? c!.code,
          }));
    setSelectedCouponsData(displayData);
  }, [activeShopperId, selectedCoupons, coupons, couponsFromApi, setSelectedCouponsData]);

  const handleAddSuccess = (newCouponId: number) => {
    fetchCoupons(0, false);
    setHasCouponSelectionChanged(true);
    const next = [...new Set([...selectedCoupons, newCouponId])];
    onSelectionChange(next);
  };

  const options = coupons.map((c) => ({
    label: `${c.code} - ${c.offer_heading}`,
    value: c.promo_code_id,
  }));

  return (
    <>
      <div className="coupon-assignment-card">
        <div className="section-header">
          <Tag size={16} />
          <span>Assign Coupons</span>
        </div>
        <div className="ant-form-item">
          <div className="ant-form-item-control-input">
            <Select
              mode="multiple"
              placeholder="Select coupons..."
              value={selectedCoupons}
              onChange={(vals) => {
                onSelectionChange(vals);
                setHasCouponSelectionChanged(true);
              }}
              size="large"
              className="w-full"
              loading={loading}
              options={options}
              tagRender={(props) => (
                <span className="coupon-tag">
                  <Tag size={12} />
                  {props.label}
                </span>
              )}
            />
          </div>
          <div className="ant-form-item-explain">
            <span className="field-helper-text">
              Select applicable coupons for this shopper group
            </span>
          </div>
        </div>
        {hasMore && !loading && (
          <Button
            type="link"
            size="small"
            className="mt-1 !p-0"
            onClick={() => fetchCoupons(couponOffset, true)}
          >
            Load more coupons
          </Button>
        )}
        <Button
          type="dashed"
          icon={<Plus size={14} />}
          size="small"
          className="mt-2"
          onClick={() => setDrawerOpen(true)}
        >
          Add New Coupon
        </Button>
      </div>

      <AddCouponDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeShopperId={activeShopperId}
        onSuccess={handleAddSuccess}
      />
    </>
  );
};
