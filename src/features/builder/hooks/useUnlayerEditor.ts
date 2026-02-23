/**
 * useUnlayerEditor Hook
 * Main integration hook for React email editor with autosave and export features
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorRef } from 'react-email-editor';
import { useUnlayerStore } from '../stores/unlayerStore';
import { useTemplateFieldsStore } from '@/stores/common/template-fields.store';
import { useAutosave } from './useAutosave';
import { useUnlayerImageUpload } from './useUnlayerImageUpload';
import { createAPI } from '@/api';
import { sanitizeHtml } from '@/lib/utils/helper';
import { processTemplateFields } from '@/lib/utils/templateFieldProcessor';
import { useClientFlowStore } from '@/stores/clientFlowStore';
import { useBaseTemplateStore } from '@/features/base-template';
import { useBuilderStore } from '@/stores/builder.store';

export interface UseUnlayerEditorOptions {
  projectId: number;
  autoSave?: boolean;
  autoSaveInterval?: number;
  onDesignChange?: (design: any) => void;
  onSave?: (design: any) => Promise<void>;
  onError?: (error: Error) => void;
  // Image upload options
  apiClient?: any; // AxiosInstance
  templateId?: string;
  accountId?: string;
  enableCustomImageUpload?: boolean;
  saveMode?: 'staging' | 'base';
  // Template loading options
  loadTemplateOnReady?: boolean;
  onTemplateLoad?: (template: any) => void;
  onTemplateLoadError?: (error: Error) => void;
  /** Called at the end of onEditorReady; use to register custom blocks and design:updated handlers */
  extendEditorReady?: (unlayer: any) => void;
}

export interface UseUnlayerEditorReturn {
  // Editor ref
  editorRef: React.RefObject<EditorRef>;

  // Store state
  currentDesign: any;
  savedDesign: any;
  isReady: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isExporting: boolean;
  hasUnsavedChanges: boolean;
  error: string | null;

  // Export data
  lastExportedHtml: string | null;
  lastExportedJson: any;

  // Actions
  saveDesign: () => Promise<void>;
  loadDesign: (design: any) => void;
  exportHtml: () => Promise<string>;
  exportJson: () => Promise<any>;
  exportBoth: () => Promise<{ design: any; html: string }>;

  // Template loading
  loadTemplateById: (templateId: string) => Promise<void>;

  // Autosave
  lastAutoSave: Date | null;
  isAutoSaveEnabled: boolean;
  enableAutoSave: (interval?: number) => void;
  disableAutoSave: () => void;

  // History
  designHistory: any[];
  restoreFromHistory: (index: number) => void;
  clearHistory: () => void;

  // Editor ready handler
  onEditorReady: (unlayer: any) => void;

  // Utility
  clearError: () => void;
  reset: () => void;
}

/**
 * Decode HTML entities in Unlayer design data
 * Fixes issue where HTML content is encoded as &lt; &gt; etc. after save/load from API.
 * Decodes both 'text' and 'html' fields so custom component HTML renders instead of showing raw entities.
 */
const decodeHtmlEntitiesInDesign = (designData: any): any => {
  const decodeHtmlEntities = (str: string): string => {
    if (typeof str !== 'string') return str;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = str;
    return textarea.value;
  };

  const processObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(processObject);

    const processed: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if ((key === 'text' || key === 'html') && typeof value === 'string') {
        processed[key] = decodeHtmlEntities(value);
      } else if (typeof value === 'object') {
        processed[key] = processObject(value);
      } else {
        processed[key] = value;
      }
    }
    return processed;
  };

  return processObject(designData);
};

/**
 * Main hook for Unlayer editor integration
 */
export const useUnlayerEditor = (options: UseUnlayerEditorOptions): UseUnlayerEditorReturn => {
  const {
    projectId,
    autoSave = true,
    autoSaveInterval = 30000,
    onDesignChange,
    onSave,
    onError,
    apiClient,
    templateId,
    accountId,
    enableCustomImageUpload = true,
    saveMode = 'staging',
    loadTemplateOnReady = true,
    onTemplateLoad,
    onTemplateLoadError,
    extendEditorReady,
  } = options;

  // Editor ref
  const editorRef = useRef<EditorRef>(null);

  // Store
  const store = useUnlayerStore();
  const { actions } = store;
  const templateFieldsStore = useTemplateFieldsStore();
  const { templateFields } = templateFieldsStore;

  // Image upload hook (only if apiClient is provided)
  const imageUploadHook = apiClient
    ? useUnlayerImageUpload({
        apiClient,
        templateId,
        accountId,
        onUploadSuccess: (asset) => {
        },
        onUploadError: (error) => {
          console.error('❌ Unlayer image upload failed:', error);
          onError?.(error);
        },
      })
    : { setupImageUpload: () => {} };

  const { setupImageUpload } = imageUploadHook;

  // Autosave hook
  const {
    lastSave: lastAutoSave,
    isAutoSaveEnabled,
    enableAutoSave,
    disableAutoSave,
    performManualSave,
    triggerAutoSave,
  } = useAutosave(editorRef, {
    enabled: autoSave,
    interval: autoSaveInterval,
    onSave,
    onError,
    // API integration options
    apiClient,
    templateId,
    accountId,
    saveToAPI: enableCustomImageUpload && !!apiClient && !!templateId, // Use same condition as image upload
    saveMode,
  });

  // Refs for change-detection polling: avoid stale closures and ensure cleanup on unmount
  const changeDetectionCleanupRef = useRef<(() => void) | null>(null);
  const lastKnownDesignHashRef = useRef<string>('');
  const isPollingRef = useRef(false);
  const actionsRef = useRef(actions);
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  /**
   * Save current design
   */
  const saveDesign = useCallback(async (): Promise<void> => {
    await performManualSave();
  }, [performManualSave]);

  /**
   * Load design into editor
   */
  const loadDesign = useCallback(
    (design: any) => {
      if (!editorRef.current?.editor) {
        console.warn('Editor not ready, cannot load design');
        return;
      }

      try {
        const unlayer = editorRef.current.editor;
        const decodedDesign = decodeHtmlEntitiesInDesign(design);
        unlayer.loadDesign(decodedDesign);
        actions.loadDesign(decodedDesign);

      } catch (error) {
        console.error('❌ Failed to load design:', error);
        const err = error instanceof Error ? error : new Error('Failed to load design');
        actions.setError(err.message);
        onError?.(err);
      }
    },
    [actions, onError]
  );

  /**
   * Load template by ID and populate editor
   */
  const loadTemplateById = useCallback(
    async (templateId: string): Promise<void> => {
      if (!apiClient) {
        console.warn('Cannot load template - API client not provided');
        return;
      }

      try {
        actions.setLoading(true);
        const selectedTemplateClient = useClientFlowStore.getState().selectedTemplate;
        const selectedTemplateAdmin =
          saveMode === 'staging'
            ? useBuilderStore.getState().templateState
            : useBaseTemplateStore.getState().selectedTemplate;

        // Check if we're in template editing mode (from client review)
        if (selectedTemplateClient && selectedTemplateClient.template_id === templateId) {
          // Use selectedTemplate data directly (it's already a ClientFlowData)
          if (selectedTemplateClient.builder_state_json) {
            let designData = selectedTemplateClient.builder_state_json;

            if (typeof designData === 'string') {
              try {
                designData = JSON.parse(designData);
              } catch (error) {
                console.error(
                  '❌ Failed to parse selectedTemplate builder_state_json as JSON:',
                  error
                );

                if (designData.includes('<') && designData.includes('>')) {
                  onTemplateLoadError?.(
                    new Error('Template contains HTML content instead of Unlayer design JSON')
                  );
                  return;
                }
              }
            }

            if (designData && typeof designData === 'object') {
              if (!designData.body && !designData.counters) {
              } else {
                designData = decodeHtmlEntitiesInDesign(designData);
              }
            }

            loadDesign(designData);
            onTemplateLoad?.(selectedTemplateClient);
          } else {
            onTemplateLoad?.(selectedTemplateClient);
          }
        } else {
          // Normal template loading from API
          const api = createAPI(apiClient);

          const template = selectedTemplateAdmin?.id
            ? selectedTemplateAdmin
            : saveMode === 'staging'
              ? await api.templates.getTemplateById(templateId)
              : await api.templates.getBaseTemplateById(templateId);

          if (template.builder_state_json) {
            let designData = template.builder_state_json;
            if (typeof designData === 'string') {
              try {
                designData = JSON.parse(designData);
              } catch (error) {
                console.error('❌ Failed to parse API template builder_state_json as JSON:', error);

                if (designData.includes('<') && designData.includes('>')) {
                  onTemplateLoadError?.(
                    new Error('Template contains HTML content instead of Unlayer design JSON')
                  );
                  return;
                }
              }
            }

            if (designData && typeof designData === 'object') {
              if (!designData.body && !designData.counters) {
              } else {
                designData = decodeHtmlEntitiesInDesign(designData);
              }
            }
            loadDesign(designData);
            onTemplateLoad?.(template);
          } else {
            onTemplateLoad?.(template);
          }
        }
      } catch (error) {
        console.error('❌ Failed to load template:', error);
        const err = error instanceof Error ? error : new Error('Failed to load template');
        actions.setError(`Template load failed: ${err.message}`);
        onTemplateLoadError?.(err);
      } finally {
        actions.setLoading(false);
      }
    },
    [apiClient, loadDesign, actions, onTemplateLoad, onTemplateLoadError]
  );

  /**
   * Export HTML from current design
   */
  const exportHtml = useCallback(async (): Promise<string> => {
    if (!editorRef.current?.editor) {
      throw new Error('Editor not available');
    }

    return new Promise((resolve, reject) => {
      const unlayer = editorRef.current!.editor;

      actions.setExporting(true);

      unlayer?.exportHtml((data: any) => {
        try {
          const { html, design } = data;

          // Update store with HTML
          actions.exportHtml(html);
          actions.setCurrentDesign(design);
          actions.setExporting(false);

          resolve(sanitizeHtml(html));
        } catch (error) {
          const err = error instanceof Error ? error : new Error('HTML export failed');
          actions.setError(err.message);
          actions.setExporting(false);
          onError?.(err);
          reject(err);
        }
      });
    });
  }, [actions, onError]);

  /**
   * Export JSON design
   */
  const exportJson = useCallback(async (): Promise<any> => {
    if (!editorRef.current?.editor) {
      throw new Error('Editor not available');
    }

    return new Promise((resolve, reject) => {
      const unlayer = editorRef.current!.editor;

      actions.setExporting(true);

      unlayer?.saveDesign((design: any) => {
        try {
          // Process template fields before exporting
          const processedDesign =
            templateFields.length > 0 ? processTemplateFields(design, templateFields) : design;

          // Update store with processed design
          actions.exportJson(processedDesign);
          actions.setCurrentDesign(processedDesign);
          actions.setExporting(false);

          resolve(processedDesign);
        } catch (error) {
          const err = error instanceof Error ? error : new Error('JSON export failed');
          actions.setError(err.message);
          actions.setExporting(false);
          onError?.(err);
          reject(err);
        }
      });
    });
  }, [actions, onError]);

  /**
   * Export both HTML and JSON
   */
  const exportBoth = useCallback(async (): Promise<{
    design: any;
    html: string;
  }> => {
    if (!editorRef.current?.editor) {
      throw new Error('Editor not available');
    }

    actions.setExporting(true);

    try {
      // Get design first
      const design = await exportJson();

      // Export HTML
      const html = await new Promise<string>((resolve, reject) => {
        const unlayer = editorRef.current!.editor;
        unlayer?.exportHtml((data: any) => {
          try {
            resolve(sanitizeHtml(data.html));
          } catch (error) {
            reject(error);
          }
        });
      });

      // Update store with both HTML and design
      actions.exportBoth(design, html);
      actions.setExporting(false);

      return { design, html };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Export failed');
      actions.setError(err.message);
      actions.setExporting(false);
      onError?.(err);
      throw err;
    }
  }, [exportJson, actions, onError]);

  /**
   * Handle editor ready event
   */
  const onEditorReady = useCallback(
    (unlayer: any) => {

      // Set project ID and ready state
      actions.setProjectId(projectId);
      actions.setReady(true);

      if (enableCustomImageUpload && apiClient && templateId && accountId) {
        setupImageUpload(unlayer);
      }

      // Load template if templateId provided and loading enabled
      if (loadTemplateOnReady && templateId && apiClient) {
        loadTemplateById(templateId);
      }

      // Design change detection: primary events + polling fallback (Unlayer sometimes skips design:updated on same-element edits)

      const handleDesignChange = () => {
        unlayer.saveDesign((design: any) => {
          const hash = JSON.stringify(design);
          lastKnownDesignHashRef.current = hash;
          actionsRef.current.setCurrentDesign(design);
          actionsRef.current.markUnsavedChanges(true);
          onDesignChange?.(design);
        });
      };

      unlayer.addEventListener('design:updated', handleDesignChange);
      try {
        unlayer.addEventListener('design:changed', handleDesignChange);
      } catch {
        // design:changed may not exist in all Unlayer versions
      }

      // Fallback: poll every 3s so we catch changes when design:updated stops firing (e.g. consecutive same-element edits)
      const changeDetectionInterval = setInterval(() => {
        if (isPollingRef.current) return;
        isPollingRef.current = true;
        unlayer.saveDesign((currentDesign: any) => {
          isPollingRef.current = false;
          const hash = JSON.stringify(currentDesign);
          if (hash !== lastKnownDesignHashRef.current) {
            lastKnownDesignHashRef.current = hash;
            actionsRef.current.markUnsavedChanges(true);
          }
        });
      }, 3000);

      changeDetectionCleanupRef.current = () => {
        clearInterval(changeDetectionInterval);
      };

      extendEditorReady?.(unlayer);
    },
    [
      actions,
      projectId,
      onDesignChange,
      enableCustomImageUpload,
      apiClient,
      templateId,
      accountId,
      setupImageUpload,
      loadTemplateOnReady,
      loadTemplateById,
      extendEditorReady,
    ]
  );

  // Clear polling interval on unmount and reset isReady so that on re-mount
  // the false→true transition fires the useEffect([isReady]) in consumer components.
  // Without this reset, isReady stays true in the Zustand store across mounts, so the
  // effect never re-fires and allCustomComponents is never re-populated.
  useEffect(() => {
    return () => {
      changeDetectionCleanupRef.current?.();
      changeDetectionCleanupRef.current = null;
      actionsRef.current.setReady(false);
    };
  }, []);

  /**
   * Restore design from history
   */
  const restoreFromHistory = useCallback(
    (index: number) => {
      const design = store.designHistory[index];
      if (design) {
        loadDesign(design);
      }
    },
    [store.designHistory, loadDesign]
  );

  /**
   * Clear design history
   */
  const clearHistory = useCallback(() => {
    actions.clearHistory();
  }, [actions]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    actions.clearError();
  }, [actions]);

  /**
   * Reset store state
   */
  const reset = useCallback(() => {
    actions.reset();
  }, [actions]);

  return {
    // Editor ref
    editorRef,

    // Store state
    currentDesign: store.currentDesign,
    savedDesign: store.savedDesign,
    isReady: store.isReady,
    isLoading: store.isLoading,
    isSaving: store.isSaving,
    isExporting: store.isExporting,
    hasUnsavedChanges: store.hasUnsavedChanges,
    error: store.error,

    // Export data
    lastExportedHtml: store.lastExportedHtml,
    lastExportedJson: store.lastExportedJson,

    // Actions
    saveDesign,
    loadDesign,
    exportHtml,
    exportJson,
    exportBoth,

    // Template loading
    loadTemplateById,

    // Autosave
    lastAutoSave,
    isAutoSaveEnabled,
    enableAutoSave,
    disableAutoSave,

    // History
    designHistory: store.designHistory,
    restoreFromHistory,
    clearHistory,

    // Editor ready handler
    onEditorReady,

    // Utility
    clearError,
    reset,
  };
};
