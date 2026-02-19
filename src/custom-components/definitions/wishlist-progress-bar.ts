import { registerComponent } from '../registry';

function escapePropsForAttribute(props: Record<string, unknown>): string {
  return JSON.stringify(props).replace(/'/g, "\\'");
}

function renderWishlistProgressBar(props: Record<string, unknown>): string {
  const {
    barColor = '#4285F4',
    trackColor = '#E0E0E0',
    bgColor = '#FFFFFF',
    textColor = '#1F2937',
    secondaryTextColor = '#6B7280',
    currency = '$',
    unlockLabel = 'savings',
    footerText = '',
  } = props as Record<string, number | string>;

  const html = `
    <style>
      .wpb-root { box-sizing: border-box; max-width: 100%; }
      .wpb-root * { box-sizing: border-box; }
      @media (max-width: 480px) {
        .wpb-root { padding: 16px !important; }
        .wpb-head { font-size: 14px !important; }
        .wpb-pill { font-size: 12px !important; padding: 4px 10px !important; }
        .wpb-circle { width: 44px !important; height: 44px !important; }
        .wpb-circle-text { font-size: 9px !important; }
      }
    </style>
    <div
      data-component="wishlist-progress-bar"
      data-props='${escapePropsForAttribute(props as Record<string, unknown>)}'
      id="wpb-root"
      class="wpb-root"
      style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:${bgColor}; padding:16px; border-radius:12px; max-width:100%;"
    >
      <!-- Heading -->
      <p
        id="wpb-head"
        data-field="heading"
        data-field-id="template__heading-main"
        class="wpb-head"
        style="margin:0 0 20px; color:${textColor}; font-size:15px; font-weight:600; text-align:center;"
      >Add ${currency}XXX more to unlock ${String(unlockLabel)}</p>

      <!-- Progress row: bar + circle side by side -->
      <div
        id="wpb-progress"
        data-field="progress-row"
        style="display:flex; align-items:center; gap:14px;"
      >
        <!-- Bar section (takes remaining space) -->
        <div
          id="wpb-bar-section"
          data-field="bar-section"
          style="flex:1; min-width:0; position:relative; padding-top:36px; padding-bottom:24px;"
        >
          <!-- Floating pill indicator -->
          <div
            id="wpb-pill-wrap"
            data-field="pill"
            style="position:absolute; left:40%; top:0; transform:translateX(-50%);"
          >
            <div
              id="wpb-pill"
              class="wpb-pill"
              style="background:${barColor}; color:#fff; padding:5px 14px; border-radius:999px; font-size:14px; font-weight:700; white-space:nowrap; box-shadow:0 2px 8px rgba(66,133,244,0.30);"
            >${currency}XXX</div>
            <div
              style="width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:6px solid ${barColor}; margin:0 auto;"
            ></div>
          </div>

          <!-- Track + fill -->
          <div
            id="wpb-track"
            data-field="track"
            style="background:${trackColor}; border-radius:999px; height:14px; overflow:hidden; width:100%;"
          >
            <div
              id="wpb-fill"
              data-field="fill"
              data-percent="40"
              style="width:40%; background:${barColor}; height:100%; border-radius:999px; min-width:4px;"
            ></div>
          </div>

          <!-- Target label below bar, right-aligned -->
          <p
            id="wpb-target"
            data-field="target-label"
            style="margin:6px 0 0; text-align:right; color:${secondaryTextColor}; font-size:13px; font-weight:600;"
          >${currency}XXX</p>
        </div>

        <!-- Discount circle (fixed size, never overlapped) -->
        <div
          id="wpb-circle"
          data-field="discount-circle"
          class="wpb-circle"
          style="flex-shrink:0; width:52px; height:52px; background:${barColor}; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(66,133,244,0.35);"
        >
          <span
            id="wpb-circle-text"
            data-field="discount-text"
            class="wpb-circle-text"
            style="color:#fff; font-size:11px; font-weight:800; text-align:center; line-height:1.2;"
          >XX% OFF</span>
        </div>
      </div>

      <!-- Footer text (optional) -->
      ${footerText ? `
      <p
        id="wpb-footer"
        data-field="footer"
        data-field-id="template__sub-heading-main"
        style="margin:16px 0 0; color:${secondaryTextColor}; font-size:13px; text-align:center; line-height:1.5;"
      >${String(footerText)}</p>` : ''}
    </div>
  `;
  return html.trim();
}

registerComponent({
  id: 'wishlist-progress-bar',
  name: 'Wishlist Progress Bar',
  description: 'Shows progress toward wishlist goal with discount incentive',
  category: 'engagement',
  icon: '🎯',
  props: [
    { name: 'currentAmount', label: 'Current Amount', type: 'text', defaultValue: 'XXX'},
    { name: 'targetAmount', label: 'Target Amount', type: 'text', defaultValue: 'XXX'},
    { name: 'discountText', label: 'Discount Text', type: 'text', defaultValue: 'XX% OFF' },
    { name: 'barColor', label: 'Accent Color', type: 'color', defaultValue: '#4285F4' },
    { name: 'trackColor', label: 'Track Color', type: 'color', defaultValue: '#E0E0E0' },
    { name: 'bgColor', label: 'Background Color', type: 'color', defaultValue: '#FFFFFF' },
    { name: 'textColor', label: 'Text Color', type: 'color', defaultValue: '#1F2937' },
    { name: 'secondaryTextColor', label: 'Secondary Text Color', type: 'color', defaultValue: '#6B7280' },
    { name: 'currency', label: 'Currency Symbol', type: 'text', defaultValue: '$' },
    { name: 'unlockLabel', label: 'Unlock Label', type: 'text', defaultValue: 'savings' },
    { name: 'footerText', label: 'Footer Text (optional)', type: 'text', defaultValue: '' },
  ],
  defaultProps: {
    currentAmount: 'XXX',
    targetAmount: 'XXX',
    discountText: 'XX% OFF',
    barColor: '#4285F4',
    trackColor: '#E0E0E0',
    bgColor: '#FFFFFF',
    textColor: '#1F2937',
    secondaryTextColor: '#6B7280',
    currency: '$',
    unlockLabel: 'savings',
    footerText: 'Make it yours—take 10% off and outfit your next voyage with confidence.',
  },
  render: renderWishlistProgressBar,
});