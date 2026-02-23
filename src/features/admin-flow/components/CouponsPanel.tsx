import React from 'react';
import { CreditCard } from 'lucide-react';
import { Collapse, Tag } from 'antd';
import type { CollapseProps } from 'antd';
import type { ClientFlowData, ShopperCouponItem } from '@/types';

export interface CouponsPanelProps {
  clientData: ClientFlowData[];
}

export const CouponsPanel: React.FC<CouponsPanelProps> = ({ clientData }) => {
  const couponMap = clientData
    .flatMap((t) => t.shoppers ?? [])
    .reduce(
      (map, shopper) => {
        (shopper.coupons ?? []).forEach((c) => {
          if (!map.has(c.promo_code_id)) {
            map.set(c.promo_code_id, { coupon: c, shopperNames: new Set<string>() });
          }
          map.get(c.promo_code_id)!.shopperNames.add(shopper.name);
        });
        return map;
      },
      new Map<number, { coupon: ShopperCouponItem; shopperNames: Set<string> }>()
    );

  const rows = Array.from(couponMap.values());
  const activeCount = rows.filter((r) => r.coupon.is_active).length;

  const header = (
    <div className="flex items-center gap-3">
      <CreditCard size={16} className="text-gray-500" />
      <span className="text-sm font-semibold text-gray-800">Coupons</span>
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-[11px] font-semibold">
        {activeCount} Active
      </span>
    </div>
  );

  const table =
    rows.length === 0 ? (
      <div className="px-5 py-6 text-center text-sm text-gray-400">No coupon data available</div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Coupon
              </th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Code
              </th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Active
              </th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Assigned To
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(({ coupon, shopperNames }) => (
              <tr key={coupon.promo_code_id} className="hover:bg-gray-50/60 transition-colors">
                {/* COUPON */}
                <td className="px-5 py-3.5">
                  <div className="text-sm font-semibold text-gray-800 leading-tight">
                    {coupon.offer_heading}
                  </div>
                  {coupon.offer_sub_heading && (
                    <div className="text-[11px] text-gray-400 leading-tight mt-0.5">
                      {coupon.offer_sub_heading}
                    </div>
                  )}
                </td>

                {/* CODE */}
                <td className="px-4 py-3.5">
                  <code className="bg-gray-100 rounded px-1.5 py-0.5 text-xs font-mono text-gray-700">
                    {coupon.code}
                  </code>
                </td>

                {/* ACTIVE */}
                <td className="px-4 py-3.5">
                  {coupon.is_active ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-[11px] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-gray-400 text-[11px] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                      Inactive
                    </span>
                  )}
                </td>

                {/* ASSIGNED TO */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1 flex-wrap">
                    {Array.from(shopperNames).map((name) => (
                      <Tag key={name} className="text-[11px] m-0">
                        {name}
                      </Tag>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

  const items: CollapseProps['items'] = [
    {
      key: '1',
      label: header,
      children: table,
      style: { padding: 0 },
    },
  ];

  return (
    <Collapse
      defaultActiveKey={['1']}
      bordered={false}
      className="!bg-white !rounded-xl border border-gray-200 shadow-sm overflow-hidden"
      items={items}
    />
  );
};
