import { create } from 'zustand';
import type {
  ClientFlowState,
  ClientFlowActions,
  ReviewStatus,
  StepStatusMetadata,
} from '../features/client-flow/types/clientFlow';
import {
  CBTemplateFieldContentIdMappingWithContent,
  ClientFlowData,
  ShopperDetails,
  CBCannedContentGroup,
} from '@/types';

// Default state values
const defaultReviewStatus: ReviewStatus = {
  status: 'pending',
};

// Store implementation following existing pattern
export const useClientFlowStore = create<ClientFlowState & ClientFlowActions>(
  (set, get) => ({
    // ============================================================================
    // STATE
    // ============================================================================

    // Review Flow State
    currentStep: 0,

    // Client Data (API-ready)
    clientData: null,

    // Template Data (API-ready)
    selectedTemplate: null,

    // Review Data
    desktopReview: defaultReviewStatus,
    mobileReview: defaultReviewStatus,
    finalReview: defaultReviewStatus,

    // Error States
    error: null,

    // custom
    shopperDetailsCache: {} as Record<string, ShopperDetails>,
    activeContentShopper: {
      content: { name: null, id: null },
    },

    //content step
    contentFields: [],
    contentFormData: {} as { [key: string]: string },
    selectedDeviceId: null as number | null,
    availablePresets: [] as CBCannedContentGroup[],
    selectedPreset: null as CBCannedContentGroup | null,
    selectedCouponsData: [] as Array<{ offerText: string; subtext: string }>,
    hasCouponSelectionChanged: false,

    // feedback state
    feedbackData: {
      desktop: '',
      mobile: '',
    } as { [key: string]: string },

    // field highlighting state
    activeHighlightedField: null as string | null,
    highlightedFieldName: null as string | null,

    selectedReviewTemplateId: null as string | null,

    // Step approval statuses — keyed by templateId
    stepStatuses: {} as Record<string, StepStatusMetadata | null>,

    // Admin decision note — fetched once from feedbackForStep:'all', cached here
    adminDecisionNotes: null as string | null,

    // UI preferences
    componentsPanelOpen: true,

    // ============================================================================
    // ACTIONS (following existing store pattern)
    // ============================================================================

    actions: {
      // Navigation
      setCurrentStep: (step: number) => {
        set({ currentStep: step });
      },

      setShopperDetails: (shopperId: string, details: ShopperDetails) => {
        set((state) => ({
          shopperDetailsCache: { ...state.shopperDetailsCache, [shopperId]: details },
        }));
      },

      setActiveContentShopper: (shopper: {
        content?: { name: string; id: string };
      }) => {
        set((state) => ({
          activeContentShopper: {
            ...state.activeContentShopper,
            content: shopper.content || get().activeContentShopper.content,
          },
        }));
      },

      setClientData: (data: ClientFlowData[]) => {
        set({ clientData: data });
      },

      // Template Management (API-ready)
      setSelectedTemplate: (template: any) => {
        set({ selectedTemplate: template });
      },

      setSelectedReviewTemplateId: (id: string | null) => {
        set({ selectedReviewTemplateId: id });
      },

      // content step
      setContentFields: (fields: CBTemplateFieldContentIdMappingWithContent[]) => {
        set({ contentFields: fields });
      },

      setContentFormData: (data: { [key: string]: string }) => {
        set({ contentFormData: data });
      },

      setSelectedDeviceId: (deviceId: number | null) => {
        set({ selectedDeviceId: deviceId });
      },

      setSelectedCouponsData: (data: Array<{ offerText: string; subtext: string }>) => {
        set({ selectedCouponsData: data });
      },

      setHasCouponSelectionChanged: (value: boolean) => {
        set({ hasCouponSelectionChanged: value });
      },

      // feedback management
      updateFeedbackData: (type: string, value: string) => {
        set((state) => ({
          feedbackData: {
            ...state.feedbackData,
            [type]: value,
          },
        }));
      },

      // field highlighting management
      setHighlightedField: (fieldId: string | null, fieldName?: string | null) => {
        set({
          activeHighlightedField: fieldId,
          highlightedFieldName: fieldName || null,
        });
      },

      // preset management
      setAvailablePresets: (presets: CBCannedContentGroup[]) => {
        set({ availablePresets: presets });
      },

      setSelectedPreset: (preset: CBCannedContentGroup | null) => {
        set({ selectedPreset: preset });
      },

      clearPresets: () => {
        set({ availablePresets: [], selectedPreset: null });
      },

      // Step approval management
      setStepStatuses: (data: Record<string, StepStatusMetadata | null>) => {
        set({ stepStatuses: data });
      },

      setAdminDecisionNotes: (notes: string | null) => {
        set({ adminDecisionNotes: notes });
      },

      // Error Management
      clearError: () => {
        set({ error: null });
      },

      // UI preferences
      setComponentsPanelOpen: (open: boolean) => {
        set({ componentsPanelOpen: open });
      },
    },
  })
);

