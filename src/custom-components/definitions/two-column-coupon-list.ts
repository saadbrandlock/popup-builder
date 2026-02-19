import { registerComponent } from '../registry';

function escapePropsForAttribute(props: Record<string, unknown>): string {
  return JSON.stringify(props).replace(/'/g, "\\'");
}

interface CouponItem {
  offerText?: string;
  subtext?: string;
  code?: string;
  label?: string;
}

function renderTwoColumnCouponList(props: Record<string, unknown>): string {
  const {
    coupons = [
      { offerText: '10% Off', subtext: 'Ongoing Offer' },
    ],
    title = '',
    buttonColor = '#DC2626',
    buttonTextColor = '#FFFFFF',
    bgColor = '#FFFFFF',
    textColor = '#1F2937',
    subtextColor = '#6B7280',
    buttonLabel = 'SAVE',
    dividerColor = '#F3F4F6',
    itemPaddingV = 14,
    itemPaddingH = 0,
  } = props as Record<string, string | number | CouponItem[]>;

  const items = Array.isArray(coupons) ? coupons : [];
  const safeTitle = String(title || '');
  const padV = Number(itemPaddingV) || 14;
  const padH = Number(itemPaddingH) || 0;

  const couponRows = items
    .slice(0, 12)
    .map((c: CouponItem, i: number) => {
      const offer = String(c.offerText ?? c.code ?? 'Offer');
      const sub = String(c.subtext ?? c.label ?? '');
      const isLast = i === Math.min(items.length, 12) - 1;

      return `
      <div
        id="tcl-item-${i}"
        class="tcl-item"
        data-index="${i}"
        data-offer="${offer}"
        data-slot="coupon-item"
        style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:${padV}px ${padH}px;${!isLast ? ` border-bottom:1px solid ${dividerColor};` : ''} box-sizing:border-box;"
      >
        <!-- Offer text -->
        <div
          id="tcl-item-${i}-text"
          class="tcl-item-text"
          data-field="text-block"
          style="flex:1; min-width:0;"
        >
          <div
            id="tcl-item-${i}-offer"
            class="tcl-item-offer"
            data-field="offer"
            style="font-weight:700; font-size:16px; color:${textColor}; line-height:1.3;"
          >${offer}</div>
          ${sub ? `
          <div
            id="tcl-item-${i}-sub"
            class="tcl-item-sub"
            data-field="subtext"
            style="font-size:13px; color:${subtextColor}; font-weight:400; margin-top:2px; line-height:1.3;"
          >${sub}</div>` : ''}
        </div>

        <!-- Action button -->
        <a
          id="tcl-item-${i}-btn coupon_button"
          class="tcl-btn"
          data-field="cta"
          data-action="save-coupon"
          data-field-id="template__coupon-apply-button"
          data-coupon-index="${i}"
          href="#"
          style="flex-shrink:0; background:${buttonColor}; color:${buttonTextColor}; border:none; padding:10px 22px; border-radius:8px; font-size:13px; font-weight:700; text-align:center; text-decoration:none; letter-spacing:0.02em; line-height:1;"
        >${String(buttonLabel)}</a>
      </div>`;
    })
    .join('');

  const html = `
    <style>
      .tcl-root { box-sizing: border-box; max-width: 100%; }
      .tcl-root * { box-sizing: border-box; }
    </style>
    <div
      data-component="two-column-coupon-list"
      data-props='${escapePropsForAttribute(props as Record<string, unknown>)}'
      data-coupon-count="${items.length}"
      id="tcl-root"
      class="tcl-root"
      style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:${bgColor}; box-sizing:border-box; max-width:100%;"
    >
      ${safeTitle ? `
      <h3
        id="tcl-title"
        data-field="title"
        style="margin:0 0 12px; color:${textColor}; font-size:16px; font-weight:700;"
      >${safeTitle}</h3>` : ''}

      <!-- Coupon list — JS can append/replace items inside this slot -->
      <div
        id="tcl-list"
        class="tcl-list"
        data-slot="coupon-items"
        role="list"
      >
        ${couponRows || `
        <div
          id="tcl-empty"
          data-field="empty-state"
          style="color:#9CA3AF; font-size:13px; padding:20px 0; text-align:center;"
        >Coupons will appear here</div>`}
      </div>
    </div>
  `;
  return html.trim();
}

registerComponent({
  id: 'two-column-coupon-list',
  name: 'Two-Column Coupon List',
  description: 'List of offers with action buttons',
  category: 'commerce',
  icon: '🎟️',
  props: [
    { name: 'title', label: 'Section Title', type: 'text', defaultValue: '' },
    { name: 'buttonColor', label: 'Button Color', type: 'color', defaultValue: '#DC2626' },
    { name: 'buttonTextColor', label: 'Button Text Color', type: 'color', defaultValue: '#FFFFFF' },
    { name: 'bgColor', label: 'Background', type: 'color', defaultValue: '#FFFFFF' },
    { name: 'textColor', label: 'Offer Text Color', type: 'color', defaultValue: '#1F2937' },
    { name: 'subtextColor', label: 'Subtext Color', type: 'color', defaultValue: '#6B7280' },
    { name: 'dividerColor', label: 'Divider Color', type: 'color', defaultValue: '#F3F4F6' },
    { name: 'buttonLabel', label: 'Button Label', type: 'text', defaultValue: 'SAVE' },
  ],
  defaultProps: {
    title: '',
    coupons: [
      { offerText: '10% Off', subtext: 'Ongoing Offer' },
    ],
    buttonColor: '#DC2626',
    buttonTextColor: '#FFFFFF',
    bgColor: '#FFFFFF',
    textColor: '#1F2937',
    subtextColor: '#6B7280',
    dividerColor: '#F3F4F6',
    buttonLabel: 'SAVE',
  },
  render: renderTwoColumnCouponList,
});