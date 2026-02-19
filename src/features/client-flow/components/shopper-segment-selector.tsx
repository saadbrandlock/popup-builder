import { useClientFlowStore } from '@/stores/clientFlowStore';
import { useGenericStore } from '@/stores/generic.store';
import { Select } from 'antd';
import React, { useEffect, useMemo } from 'react';
import { Check } from 'lucide-react';

interface ShopperSegmentSelectorProps {
  compact?: boolean;
  listStyle?: boolean;
}

const ShopperSegmentSelector: React.FC<ShopperSegmentSelectorProps> = ({ compact = false, listStyle = false }) => {
  const { shoppers } = useGenericStore();
  const { actions, clientData, activeContentShopper } = useClientFlowStore();

  const templateShopperGroups = useMemo(() => {
    if (!clientData?.length || !shoppers.length) return [];
    const mainShopperIds = new Set(shoppers.map((s) => s.id));
    return Array.from(
      clientData
        .flatMap((template) => template.shoppers)
        .reduce((map, shopper) => map.set(shopper.id, shopper), new Map())
        .values()
    ).filter((shopper) => mainShopperIds.has(shopper.id));
  }, [clientData, shoppers]);

  const defaultShopper = templateShopperGroups.length > 0
    ? { label: templateShopperGroups[0].name, value: templateShopperGroups[0].id }
    : null;

  // Initialize active shopper on first load
  useEffect(() => {
    if (templateShopperGroups.length > 0 && !activeContentShopper?.content?.id) {
      actions.setActiveContentShopper({
        content: {
          name: templateShopperGroups[0].name,
          id: templateShopperGroups[0].id.toString(),
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateShopperGroups]);

  const onChangeShopper = (value: number) => {
    const selectedShopper = templateShopperGroups.find(
      (shopper) => shopper.id === value
    );

    if (selectedShopper) {
      actions.setActiveContentShopper({
        content: {
          name: selectedShopper.name,
          id: selectedShopper.id.toString(),
        },
      });
    }
  };

  // List style rendering - vertical cards
  if (listStyle) {
    // A shopper is "completed" if any template in clientData has that shopper with a content preset assigned
    const isShopperCompleted = (shopperId: number): boolean =>
      clientData?.some((t) => t.shoppers.some((s) => s.id === shopperId && s.content_preset_id != null)) ?? false;

    return (
      <div>
        {templateShopperGroups.map((shopper, index) => {
          const isActive = activeContentShopper?.content?.id === shopper.id.toString();
          const isCompleted = isShopperCompleted(shopper.id);
          const stepLabel = `3${String.fromCharCode(65 + index)}`; // 3A, 3B, 3C...

          return (
            <div
              key={shopper.id}
              className={`shopper-list-item ${isActive ? 'active' : ''} ${isCompleted && !isActive ? 'completed' : ''}`}
              onClick={() => onChangeShopper(shopper.id)}
            >
              <div className="step-indicator">
                {isCompleted || isActive ? <Check size={16} /> : stepLabel}
              </div>
              <div className="shopper-info">
                <p className="shopper-name">{shopper.name}</p>
                <p className="shopper-desc">{isCompleted ? 'Content configured' : 'Template/Content variant for this group'}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (compact) {
    return (defaultShopper && (
      <div>
        <Select
          showSearch
          placeholder="Select a Shopper..."
          optionFilterProp="label"
          options={templateShopperGroups.map((shopper) => ({
            label: shopper.name,
            value: shopper.id,
          }))}
          onChange={onChangeShopper}
          defaultValue={defaultShopper.value}
          size="middle"
          className='w-full'
        />
      </div>
    )
    );
  }

  return (
    <>

      {defaultShopper && (
        <div>
          <Select
            showSearch
            placeholder="Select a Shopper..."
            optionFilterProp="label"
            options={templateShopperGroups.map((shopper) => ({
              label: shopper.name,
              value: shopper.id,
            }))}
              onChange={onChangeShopper}
            defaultValue={defaultShopper.value}
            size="large"
            className='w-full'
          />
        </div>
      )}
    </>
  );
};

export default ShopperSegmentSelector;
