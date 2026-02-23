import { ReminderTabConfig } from '@/features/builder/types';
import { MergeOptions, TemplateData } from '@/types';
import { getFontAwesomeUnicodeIcon, getAntdUnicodeIcon } from '@/lib/constants/iconMappings';

class DynamicHTMLMerger {
  generateHTML(config: ReminderTabConfig): string {
    return `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reminder Tab</title>
      <!-- Using Unicode icons - no external dependencies -->
      ${this.generateCSS(config)}
  </head>
  <body>
      ${this.generateHTMLStructure(config)}
      ${this.generateJavaScript(config)}
  </body>
  </html>`;
  }

  private generateCSS(config: ReminderTabConfig): string {
    const desktopConfig = config.desktop || config;
    const mobileConfig = config.mobile;
    const animationConfig = config.animations;
    
    // Check which devices are enabled
    const desktopEnabled = desktopConfig?.enabled && config.enabled;
    const mobileEnabled = mobileConfig?.enabled && config.enabled;
    
    return `<style>
          /* Entrance Animations */
          ${this.generateEntranceAnimations(animationConfig)}

          /* Wrapper for positioning - inner tab has entrance animation */
          .reminder-tab-wrapper {
              left: 0;
              right: 0;
              pointer-events: none;
          }
          .reminder-tab-wrapper > .reminder-tab {
              pointer-events: auto;
              position: relative;
              top: auto;
              left: auto;
              right: auto;
          }
          .reminder-tab-wrapper.position-left { left: 0; right: auto; }
          .reminder-tab-wrapper.position-right { left: auto; right: 0; }
          .reminder-tab-wrapper.position-left > .reminder-tab { left: 0; right: auto; }
          .reminder-tab-wrapper.position-right > .reminder-tab { left: auto; right: 0; }

          /* Desktop Reminder Tab Styles */
          .reminder-tab {
              position: fixed;
              z-index: 1000;
              color: ${desktopConfig?.styling?.colors?.textColor || '#FFFFFF'};
              cursor: pointer;
              user-select: none;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              transition: all 0.3s ease;
              font-family: ${desktopConfig?.styling?.typography?.fontFamily || 'Arial, sans-serif'};
              font-weight: ${desktopConfig?.styling?.typography?.fontWeight || 'bold'};
              display: ${desktopEnabled ? 'flex' : 'none'};
              align-items: center;
              justify-content: center;
              width: ${desktopConfig?.styling?.dimensions?.width || 80}px;
              height: ${desktopConfig?.styling?.dimensions?.height || 160}px;
              overflow: hidden;
          }
  
          .reminder-tab-text {
              font-size: ${desktopConfig?.styling?.typography?.fontSize || 14}px;
              letter-spacing: ${desktopConfig?.styling?.typography?.letterSpacing || '1px'};
              white-space: nowrap;
              flex: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, ${desktopConfig?.styling?.colors?.primary || '#8B0000'}, ${desktopConfig?.styling?.colors?.secondary || '#DC143C'});
              height: 100%;
          }
  
          .reminder-tab-dragger {
              background: ${desktopConfig?.styling?.colors?.draggerColor || '#666666'};
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 8px 0;
          }
  
          .reminder-tab.position-left {
              left: 0;
              border-radius: 0 8px 8px 0;
              flex-direction: row-reverse;
          }
  
          .reminder-tab.position-left .reminder-tab-text {
              writing-mode: vertical-lr;
              text-orientation: mixed;
          }
  
          .reminder-tab.position-right {
              right: 0;
              border-radius: 8px 0 0 8px;
          }
  
          .reminder-tab.position-right .reminder-tab-text {
              writing-mode: vertical-rl;
              text-orientation: mixed;
          }
  
          .tab-dots {
              display: grid;
              grid-template-columns: repeat(2, 6px);
              gap: 4px;
              cursor: move;
              padding: 0 6px;
          }
  
          .dot {
              width: 6px;
              height: 6px;
              background: ${desktopConfig?.styling?.colors?.dotColor || 'rgba(255, 255, 255, 0.8)'};
              border-radius: 50%;
          }
  
          .reminder-tab:hover {
              box-shadow: 0 6px 20px rgba(0,0,0,0.4);
              transform: scale(1.05);
          }
  
          .reminder-tab.dragging {
              opacity: 0.8;
              z-index: 1001;
          }

          /* Mobile Floating Button Styles */
          .mobile-floating-button {
              position: fixed;
              bottom: ${mobileConfig?.position?.bottom || 24}px;
              right: ${mobileConfig?.position?.right || 24}px;
              width: ${mobileConfig?.styling?.size || 56}px;
              height: ${mobileConfig?.styling?.size || 56}px;
              background-color: ${mobileConfig?.styling?.backgroundColor || '#8B0000'};
              border: ${mobileConfig?.styling?.borderWidth || 2}px solid ${mobileConfig?.styling?.borderColor || '#DC143C'};
              border-radius: 50%;
              display: ${mobileEnabled ? 'flex' : 'none'};
              align-items: center;
              justify-content: center;
              cursor: pointer;
              z-index: 1000;
              box-shadow: ${mobileConfig?.styling?.boxShadow || '0 4px 12px rgba(0,0,0,0.3)'};
              transition: all 0.3s ease;
          }

          .mobile-floating-button:hover {
              transform: scale(${mobileConfig?.animations?.hover?.enabled ? (mobileConfig?.animations?.hover?.scale || 1.1) : 1});
          }

          .mobile-floating-button i {
              font-size: ${mobileConfig?.icon?.size || 24}px;
              color: ${mobileConfig?.icon?.color || '#FFFFFF'};
          }

          .mobile-floating-button .emoji-icon {
              font-size: ${mobileConfig?.icon?.size || 24}px;
          }

          /* Responsive Media Queries */
          @media (max-width: 768px) {
              .reminder-tab {
                  display: none !important;
              }
              .mobile-floating-button {
                  display: ${mobileEnabled ? 'flex' : 'none'} !important;
              }
          }

          @media (min-width: 769px) {
              .mobile-floating-button {
                  display: none !important;
              }
              .reminder-tab {
                  display: ${desktopEnabled ? 'flex' : 'none'} !important;
              }
          }

          /* Apply entrance animations */
          ${desktopEnabled && animationConfig?.entrance ? this.generateDesktopAnimationCSS(animationConfig.entrance) : ''}
          ${mobileEnabled && mobileConfig?.animations?.entrance ? this.generateMobileAnimationCSS(mobileConfig.animations.entrance) : ''}
      </style>`;
  }

  private generateEntranceAnimations(animationConfig: any): string {
    if (!animationConfig?.entrance) return '';
    
    const animationType = animationConfig.entrance.type;
    const duration = animationConfig.entrance.duration || '0.3s';

    const animations = {
      slideIn: `
        @keyframes slideInLeft {
          0% { transform: translateX(-100%); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInRight {
          0% { transform: translateX(100%); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInUp {
          0% { transform: translateY(100%); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }`,
      fadeIn: `
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }`,
      bounceIn: `
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }`,
      zoomIn: `
        @keyframes zoomIn {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }`,
      none: ''
    };

    return animations[animationType as keyof typeof animations] || '';
  }

  private generateDesktopAnimationCSS(entranceConfig: any): string {
    if (!entranceConfig || entranceConfig.type === 'none') return '';
    
    const animationType = entranceConfig.type;
    const duration = entranceConfig.duration || '0.3s';

    switch (animationType) {
      case 'slideIn':
        return `
          .reminder-tab.position-left {
            animation: slideInLeft ${duration} ease-out forwards;
          }
          .reminder-tab.position-right {
            animation: slideInRight ${duration} ease-out forwards;
          }`;
      case 'fadeIn':
        return `.reminder-tab { animation: fadeIn ${duration} ease-out forwards; }`;
      case 'bounceIn':
        return `.reminder-tab { animation: bounceIn ${duration} ease-out forwards; }`;
      case 'zoomIn':
        return `.reminder-tab { animation: zoomIn ${duration} ease-out forwards; }`;
      default:
        return '';
    }
  }

  private generateMobileAnimationCSS(entranceConfig: any): string {
    if (!entranceConfig || entranceConfig.type === 'none') return '';
    
    const animationType = entranceConfig.type;
    const duration = entranceConfig.duration || '0.3s';

    switch (animationType) {
      case 'slideIn':
        return `.mobile-floating-button { animation: slideInUp ${duration} ease-out forwards; }`;
      case 'fadeIn':
        return `.mobile-floating-button { animation: fadeIn ${duration} ease-out forwards; }`;
      case 'bounceIn':
        return `.mobile-floating-button { animation: bounceIn ${duration} ease-out forwards; }`;
      case 'zoomIn':
        return `.mobile-floating-button { animation: zoomIn ${duration} ease-out forwards; }`;
      default:
        return '';
    }
  }

  private generateHTMLStructure(config: ReminderTabConfig): string {
    const desktopConfig = config.desktop || config;
    const mobileConfig = config.mobile;
    
    const desktopEnabled = desktopConfig?.enabled && config.enabled;
    const mobileEnabled = mobileConfig?.enabled && config.enabled;

    // Use wrapper for vertical centering so inline transform doesn't override entrance animation.
    // The inner tab has the animation; the wrapper handles top/transform for positioning.
    const tabHeight = desktopConfig?.styling?.dimensions?.height || 160;
    const topVal = desktopConfig.display?.initialPosition?.top || '50%';
    const transformVal = desktopConfig.display?.initialPosition?.transform || 'translateY(-50%)';
    const isPercentTop = String(topVal).includes('%');
    const marginTop = isPercentTop ? `margin-top: -${tabHeight / 2}px;` : '';

    const position = desktopConfig.display?.position || 'right';
    const desktopTab = desktopEnabled ? 
      `<div id="reminderTabWrapper" class="reminder-tab-wrapper position-${position}" style="position:fixed;top:${topVal};${marginTop}${transformVal ? `transform:${transformVal};` : ''}z-index:1000;">
          <div id="reminderTab" class="reminder-tab position-${position}">
          <div class="reminder-tab-text">${this.escapeHTML(desktopConfig.display?.text || 'Special Offer!')}</div>
          ${desktopConfig.interactions?.dragging?.enabled ? this.generateDragger() : ''}
      </div></div>` : '';

    const mobileButton = mobileEnabled ? 
      `<div id="mobileFloatingButton" class="mobile-floating-button">
          ${this.generateMobileIcon(mobileConfig.icon)}
      </div>` : '';

    return desktopTab + mobileButton;
  }

  private generateDragger(): string {
    return `<div class="reminder-tab-dragger">
              <div class="tab-dots">
                  <div class="dot"></div>
                  <div class="dot"></div>
                  <div class="dot"></div>
                  <div class="dot"></div>
                  <div class="dot"></div>
                  <div class="dot"></div>
              </div>
          </div>`;
  }

  private generateMobileIcon(iconConfig: any): string {
    if (!iconConfig) return '<i class="fas fa-gift"></i>';
    
    const iconType = iconConfig.type || 'fontawesome';
    const iconValue = iconConfig.value || 'fas fa-gift';
    
    if (iconType === 'fontawesome') {
      const unicodeIcon = getFontAwesomeUnicodeIcon(iconValue);
      return `<span class="unicode-icon">${unicodeIcon}</span>`;
    } else if (iconType === 'emoji') {
      return `<span class="emoji-icon">${iconValue}</span>`;
    } else if (iconType === 'antd') {
      const unicodeIcon = getAntdUnicodeIcon(iconValue);
      return `<span class="unicode-icon">${unicodeIcon}</span>`;
    }
    
    return '<span class="unicode-icon">🎁</span>';
  }

  private generateJavaScript(config: ReminderTabConfig): string {
    const desktopConfig = config.desktop || config;
    const mobileConfig = config.mobile;
    
    const hasDesktop = desktopConfig?.enabled && config.enabled;
    const hasMobile = mobileConfig?.enabled && config.enabled;
    
    return `<script>
  (function(){
    if(window.__reminderTabScriptLoaded)return;
    window.__reminderTabScriptLoaded=true;
  ${hasDesktop ? `const ReminderTab=class{constructor(){this.tab=document.getElementById("reminderTab"),this.wrapper=document.getElementById("reminderTabWrapper"),this.dragEl=this.wrapper||this.tab,this.dragger=this.tab?.querySelector(".reminder-tab-dragger"),this.isDragging=!1,this.currentPosition="${desktopConfig?.display?.position || 'right'}",this.dragTimeout=null,this.init()}init(){if(!this.tab)return;${desktopConfig?.interactions?.clicking?.enabled !== false ? 'this.tab.addEventListener("click",t=>{this.isDragging||t.target===this.dragger||this.openPopup()});' : ''}${desktopConfig?.interactions?.dragging?.enabled ? 'this.addDragListeners();' : ''}}${desktopConfig?.interactions?.dragging?.enabled ? `addDragListeners(){if(!this.dragger)return;this.dragger.addEventListener("mousedown",t=>{t.stopPropagation(),t.preventDefault(),this.startDrag()}),this.dragger.addEventListener("touchstart",t=>{t.stopPropagation(),t.preventDefault(),this.startDrag()},{passive:!1}),document.addEventListener("mousemove",t=>this.drag(t)),document.addEventListener("mouseup",()=>this.endDrag()),document.addEventListener("touchmove",t=>this.drag(t.touches[0]),{passive:!1}),document.addEventListener("touchend",()=>this.endDrag())}startDrag(){this.isDragging=!0,this.tab.classList.add("dragging"),this.dragEl.classList.add("dragging"),document.body.style.userSelect="none"}drag(t){if(!this.isDragging)return;const e=t.clientX,i=t.clientY,s=window.innerWidth,n=window.innerHeight,r=this.tab.offsetHeight;let o=i-r/2;o=Math.max(0,Math.min(o,n-r));const a=e<s/2?"left":"right";a!==this.currentPosition&&this.updatePosition(a),this.dragEl.style.top=o+"px",this.dragEl.style.transform="none"}endDrag(){this.isDragging&&(this.isDragging=!1,this.tab.classList.remove("dragging"),this.dragEl.classList.remove("dragging"),document.body.style.userSelect="",clearTimeout(this.dragTimeout),this.dragTimeout=setTimeout(()=>{this.isDragging=!1},150))}updatePosition(t){this.tab.classList.remove("position-left","position-right"),this.tab.classList.add(\`position-\${t}\`),this.wrapper&&(this.wrapper.classList.remove("position-left","position-right"),this.wrapper.classList.add(\`position-\${t}\`)),this.currentPosition=t}` : ''}openPopup(){const t=new CustomEvent("openReminderPopup",{detail:{source:"reminderTab"}});document.dispatchEvent(t),"function"==typeof window.openReminderPopup&&window.openReminderPopup()}setText(t){const e=this.tab?.querySelector(".reminder-tab-text");e&&(e.textContent=t)}setPosition(t){"left"!==t&&"right"!==t||this.updatePosition(t)}show(){this.tab&&(this.tab.style.display="flex");this.wrapper&&(this.wrapper.style.display="block")}hide(){this.tab&&(this.tab.style.display="none");this.wrapper&&(this.wrapper.style.display="none")}getPosition(){return this.currentPosition}}` : ''}

  ${hasMobile ? `const MobileFloatingButton=class{constructor(){this.button=document.getElementById("mobileFloatingButton"),this.init()}init(){this.button&&this.button.addEventListener("click",()=>{this.openPopup()})}openPopup(){const t=new CustomEvent("openReminderPopup",{detail:{source:"mobileButton"}});document.dispatchEvent(t),"function"==typeof window.openReminderPopup&&window.openReminderPopup()}show(){this.button&&(this.button.style.display="flex")}hide(){this.button&&(this.button.style.display="none")}}` : ''}

  document.addEventListener("DOMContentLoaded",function(){
    ${hasDesktop ? 'window.reminderTab=new ReminderTab;' : ''}
    ${hasMobile ? 'window.mobileFloatingButton=new MobileFloatingButton;' : ''}
  });
  })();
  </script>`;
  }

  private escapeHTML(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    '/': '&#x2F;',
    };
    return String(text).replace(/[&<>"'\/]/g, (char) => map[char]);
  }
}

/**
 * Optimized HTML Merger
 * Merges template HTML with dynamically generated reminder tab
 */
export class OptimizedHTMLMerger {
  private reminderGenerator: DynamicHTMLMerger;
  private parser: DOMParser;

  constructor() {
    this.reminderGenerator = new DynamicHTMLMerger();
    this.parser = new DOMParser();
  }

  /**
   * Main merge method - accepts either JSON config or HTML for reminder tab
   */
  public merge(
    reminderInput: ReminderTabConfig | string,
    templateHtml: string,
    options: MergeOptions = {}
  ): string {
    // Generate reminder HTML from JSON if config provided
    const reminderHtml =
      typeof reminderInput === 'string'
        ? reminderInput
        : this.reminderGenerator.generateHTML(reminderInput);

    // Extract popupTriggerType from reminder config when available
    const popupTriggerType =
      typeof reminderInput === 'object' && reminderInput?.animations?.popupTrigger?.type
        ? reminderInput.animations.popupTrigger.type
        : options.popupTriggerType;

    const config: Required<MergeOptions> = {
      popupSelector: '.u-popup-container',
      triggerSelector: '#reminderTab, #mobileFloatingButton',
      closeSelectors: [
        '.u-close-button',
        '.u-popup-overlay',
        '[data-close]',
        '.close',
        '.btn-close',
      ],
      enableAnimations: true,
      animationDuration: '0.3s',
      autoOpenPopup: false,
      disableCloseButtons: false,
      hideReminderTab: false,
      popupTriggerType: 'modal',
      autoOpenDelay: 100,
      ...options,
      ...(popupTriggerType && { popupTriggerType }),
    };

    return this.buildMergedHTML(reminderHtml, templateHtml, config);
  }

  /**
   * Merge from database record
   */
  public mergeFromRecord(
    record: TemplateData,
    options: MergeOptions = {}
  ): string {
    // Prefer JSON config over HTML
    if (record.reminder_tab_state_json) {
      return this.merge(
        record.reminder_tab_state_json,
        record.template_html,
        options
      );
    } else if (record.reminder_tab_html) {
      return this.merge(
        record.reminder_tab_html,
        record.template_html,
        options
      );
    } else {
      throw new Error('No reminder tab data found in record');
    }
  }

  private buildMergedHTML(
    reminderHtml: string,
    templateHtml: string,
    config: Required<MergeOptions>
  ): string {
    // Parse reminder HTML to extract components
    const reminderDoc = this.parser.parseFromString(reminderHtml, 'text/html');

    // Extract styles, body, and scripts
    const reminderStyles = Array.from(reminderDoc.querySelectorAll('style'))
      .map((style) => style.outerHTML)
      .join('\n');

    let reminderBody = reminderDoc.body ? reminderDoc.body.innerHTML : '';

    // When hideReminderTab is true, remove tab/button from DOM so they never render
    if (config.hideReminderTab) {
      const bodyDoc = this.parser.parseFromString(
        `<!DOCTYPE html><html><body>${reminderBody}</body></html>`,
        'text/html'
      );
      bodyDoc.getElementById('reminderTabWrapper')?.remove();
      bodyDoc.getElementById('reminderTab')?.remove();
      bodyDoc.getElementById('mobileFloatingButton')?.remove();
      reminderBody = bodyDoc.body ? bodyDoc.body.innerHTML : '';
    }

    const reminderScripts = Array.from(reminderDoc.querySelectorAll('script'))
      .map((script) => script.outerHTML)
      .join('\n');

    return `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Popup Preview</title>
      
      <!-- Using Unicode icons - no external dependencies -->
      
      <!-- Reminder Tab Styles -->
      ${reminderStyles}
      
      <!-- Enhanced Popup Animation Styles -->
      ${this.generatePopupAnimationStyles(config)}
  </head>
  <body>
      <!-- Reminder Tab -->
      ${reminderBody}
      
      <!-- Popup Template -->
      ${templateHtml}
      
      <!-- Reminder Tab Scripts -->
      ${reminderScripts}
      
      <!-- Enhanced Connection Script -->
      ${this.generateConnectionScript(config)}
  </body>
  </html>`;
  }

  private generatePopupAnimationStyles(config: Required<MergeOptions>): string {
    const hideReminderCSS = config.hideReminderTab ? `
          /* Hide reminder tab components */
          #reminderTab,
          #mobileFloatingButton {
              display: none !important;
              visibility: hidden !important;
          }
    ` : `
          /* Ensure reminder components are visible */
          #reminderTab,
          #mobileFloatingButton {
              opacity: 1 !important;
              visibility: visible !important;
          }
    `;

    return `<style>
          /* Popup container initial state */
          .u-popup-container {
              display: none;
              position: fixed;
              left: 0;
              right: 0;
              bottom: 0;
              top: 0;
              z-index: 9999;
              padding: 2rem;
              opacity: 0;
              transition: opacity ${config.animationDuration} ease;
          }
          
          /* Active state with animation */
          .u-popup-container.active {
              display: flex;
              flex-direction: column;
              opacity: 1;
          }
          
          /* Popup main content with different trigger animations */
          .u-popup-main {
              transform: scale(0.7);
              opacity: 0;
              transition: all ${config.animationDuration} cubic-bezier(0.68, -0.55, 0.265, 1.55);
          }
          
          .u-popup-container.active .u-popup-main {
              transform: scale(1);
              opacity: 1;
          }
          
          /* Modal trigger animation */
          .u-popup-container.trigger-modal .u-popup-main {
              transform: scale(0.7);
          }
          
          .u-popup-container.trigger-modal.active .u-popup-main {
              transform: scale(1);
          }
          
          /* Slide trigger animation */
          .u-popup-container.trigger-slide .u-popup-main {
              transform: translateY(100%);
          }
          
          .u-popup-container.trigger-slide.active .u-popup-main {
              transform: translateY(0);
          }
          
          /* Fade trigger animation */
          .u-popup-container.trigger-fade .u-popup-main {
              opacity: 0;
              transform: none;
          }
          
          .u-popup-container.trigger-fade.active .u-popup-main {
              opacity: 1;
          }
          
          /* Zoom trigger animation */
          .u-popup-container.trigger-zoom .u-popup-main {
              transform: scale(0);
          }
          
          .u-popup-container.trigger-zoom.active .u-popup-main {
              transform: scale(1);
          }
          
          /* Overlay fade animation */
          .u-popup-overlay {
              opacity: 0;
              transition: opacity ${config.animationDuration} ease;
          }
          
          .u-popup-container.active .u-popup-overlay {
              opacity: 1;
          }
          
          ${hideReminderCSS}
          
          body {
              margin: 0;
              padding: 0;
              overflow-x: hidden;
          }
      </style>`;
  }

  private generateConnectionScript(config: Required<MergeOptions>): string {
    return `<script>
      (function() {
          let popupElement = null;
          let triggerElements = [];
          let isAnimating = false;
          const autoOpen = ${config.autoOpenPopup || false};
          
          function findElements() {
              popupElement = document.querySelector('${config.popupSelector}');
              
              // Find all trigger elements
              triggerElements = [];
              const reminderTab = document.getElementById('reminderTab');
              const mobileButton = document.getElementById('mobileFloatingButton');
              
              if (reminderTab) triggerElements.push(reminderTab);
              if (mobileButton) triggerElements.push(mobileButton);
          }
          
          function getTriggerAnimationType() {
              // Use popupTriggerType from merger config (injected from reminder_tab_state_json)
              return ${JSON.stringify(config.popupTriggerType || 'modal')};
          }
          
          function showPopup() {
              if (!popupElement || isAnimating) return;
              
              isAnimating = true;
              const triggerType = getTriggerAnimationType();
              
              // Add trigger-specific class
              popupElement.className = popupElement.className.replace(/trigger-\\w+/g, '') + ' trigger-' + triggerType;
              
              popupElement.style.display = 'flex';
              
              // Force reflow so browser applies initial state before transition
              void popupElement.offsetWidth;
              
              // Use rAF to ensure initial state is painted before adding active (enables transition)
              requestAnimationFrame(function() {
                  popupElement.classList.add('active');
              });
              popupElement.setAttribute('aria-hidden', 'false');
              
              setTimeout(() => {
                  isAnimating = false;
                  popupElement.dispatchEvent(new CustomEvent('popup:shown', { detail: { trigger: triggerType } }));
              }, ${parseFloat(config.animationDuration) * 1000});
          }
          
          function hidePopup() {
              if (!popupElement || isAnimating) return;
              
              isAnimating = true;
              popupElement.classList.remove('active');
              popupElement.setAttribute('aria-hidden', 'true');
              
              setTimeout(() => {
                  popupElement.style.display = 'none';
                  isAnimating = false;
                  popupElement.dispatchEvent(new CustomEvent('popup:hidden'));
              }, ${parseFloat(config.animationDuration) * 1000});
          }
          
          function connectElements() {
              findElements();
              
              // Connect trigger elements
              triggerElements.forEach(trigger => {
                  if (trigger) {
                      trigger.addEventListener('click', function(e) {
                          // Don't trigger on drag handles
                          if (e.target.closest('.reminder-tab-dragger, .drag-handle, [data-drag]')) {
                              return;
                          }
                          showPopup();
                      });
                  }
              });
              
              // Connect close buttons (unless disabled)
              ${config.disableCloseButtons ? '// Close buttons disabled' : `
              const closeSelectors = ${JSON.stringify(config.closeSelectors)};
              closeSelectors.forEach(selector => {
                  document.querySelectorAll(selector).forEach(btn => {
                      btn.addEventListener('click', function(e) {
                          e.preventDefault();
                          e.stopPropagation();
                          hidePopup();
                      });
                  });
              });
              
              // Overlay and outside click handlers
              if (popupElement) {
                  const overlay = popupElement.querySelector('.u-popup-overlay');
                  if (overlay) {
                      overlay.addEventListener('click', hidePopup);
                  }
                  
                  popupElement.addEventListener('click', function(e) {
                      if (e.target === popupElement) {
                          hidePopup();
                      }
                  });
              }
              
              // ESC key to close
              document.addEventListener('keydown', function(e) {
                  if (e.key === 'Escape' && popupElement && popupElement.classList.contains('active')) {
                      hidePopup();
                  }
              });
              `}
              
              
              // Listen for custom events
              document.addEventListener('openReminderPopup', showPopup);
              document.addEventListener('closeReminderPopup', hidePopup);
              
              // Auto-open popup if enabled
              if (autoOpen && popupElement) {
                  // Delay allows reminder tab entrance animation to complete first
                  const delay = ${config.autoOpenDelay ?? 100};
                  setTimeout(() => {
                      showPopup();
                  }, delay);
              }
          }
          
          // Initialize
          if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', connectElements);
          } else {
              connectElements();
          }
          
          // Expose enhanced merger API
          window.popupMerger = {
              show: showPopup,
              hide: hidePopup,
              toggle: function() {
                  if (popupElement && popupElement.classList.contains('active')) {
                      hidePopup();
                  } else {
                      showPopup();
                  }
              },
              refresh: connectElements,
              isOpen: function() {
                  return popupElement && popupElement.classList.contains('active');
              }
          };
      })();
      </script>`;
  }
}