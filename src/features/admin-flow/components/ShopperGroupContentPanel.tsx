import React from 'react';
import { Users, Pencil } from 'lucide-react';
import { Collapse } from 'antd';
import type { CollapseProps } from 'antd';
import type { ClientFlowData } from '@/types';
import { useGenericStore } from '@/stores/generic.store';

const normalizeDomainForParam = (d: string) =>
  (d || '').replace(/^https?:\/\//, '');

export interface ShopperGroupContentPanelProps {
  clientData: ClientFlowData[];
}

export const ShopperGroupContentPanel: React.FC<ShopperGroupContentPanelProps> = ({ clientData }) => {
  const { accountDetails, navigate } = useGenericStore();

  const uniqueShoppers = Array.from(
    new Map(
      clientData.flatMap((t) => t.shoppers ?? []).map((s) => [s.id, s])
    ).values()
  );

  const confirmedCount = uniqueShoppers.filter((s) => s.content_preset_id != null).length;
  const pendingCount = uniqueShoppers.filter((s) => s.content_preset_id == null).length;

  const header = (
    <div className="flex items-center gap-3">
      <Users size={16} className="text-gray-500" />
      <span className="text-sm font-semibold text-gray-800">Shopper Group Content</span>
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-[11px] font-semibold">
        {confirmedCount} Confirmed
      </span>
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold">
        {pendingCount} Pending
      </span>
    </div>
  );

  const editContentExtra =
    accountDetails?.domain && navigate ? (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          const domain = normalizeDomainForParam(accountDetails.domain);
          navigate(
            `/popup-builder/user-review?tab=copy-review&account=${encodeURIComponent(domain)}`, 
          );
        }}
        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
      >
        <Pencil size={12} />
        Edit Content
      </button>
    ) : undefined;

  const table =
    uniqueShoppers.length === 0 ? (
      <div className="px-5 py-6 text-center text-sm text-gray-400">No shopper data available</div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Group
              </th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Heading
              </th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {uniqueShoppers.map((shopper) => {
              const heading = shopper.content?.parent?.content ?? null;
              const isDefault = heading == null;
              const isConfirmed = shopper.content_preset_id != null;

              return (
                <tr key={shopper.id} className="hover:bg-gray-50/60 transition-colors">
                  {/* GROUP */}
                  <td className="px-5 py-3.5">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-800 leading-tight">
                        {shopper.name}
                      </div>
                      {shopper.content?.parent?.group_label && (
                        <div className="text-[11px] text-gray-400 leading-tight mt-0.5">
                          {shopper.content.parent.group_label}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* HEADING */}
                  <td className="px-4 py-3.5">
                    {isDefault ? (
                      <span className="text-sm text-gray-400 italic">Default content</span>
                    ) : (
                      <span className="text-sm text-gray-700">{heading}</span>
                    )}
                  </td>

                  {/* STATUS */}
                  <td className="px-4 py-3.5">
                    {isConfirmed ? (
                      <span className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                        Confirmed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-orange-500 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );

  const items: CollapseProps['items'] = [
    {
      key: '1',
      label: header,
      extra: editContentExtra,
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
