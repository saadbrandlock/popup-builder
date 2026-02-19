import { create } from 'zustand';

type LoadingState = {
  templateListingLoading: boolean;
  templateListActionLoading: boolean;
  templateByIdLoading: boolean;
  devicesLoading: boolean;
  configSaving: boolean;
  baseTemplateConfigCreation: boolean;
  baseTemplateStatusUpdate: boolean;
  contentListingLoading: boolean;
  contentActionLoading: boolean;
  contentSubDataLoading: boolean;
  contentSubmitLoading: boolean;
  shopperDetailsLoading: boolean;
  clientTemplateDetailsLoading: boolean;
  stepApprovalLoading: boolean;
  // Builder autosave loading states
  builderAutosaving: boolean;
  reminderTabAutosaving: boolean;
};

type LoadingActions = {
  actions: {
    setTemplateListingLoading: (loading: boolean) => void;
    setTemplateListActionLoading: (loading: boolean) => void;
    setTemplateByIdLoading: (loading: boolean) => void;
    setDevicesLoading: (loading: boolean) => void;
    setConfigSaving: (loading: boolean) => void;
    setBaseTemplateConfigCreation: (loading: boolean) => void;
    setBaseTemplateStatusUpdate: (loading: boolean) => void;
    setContentListingLoading: (loading: boolean) => void;
    setContentActionLoading: (loading: boolean) => void;
    setContentSubDataLoading: (loading: boolean) => void;
    setContentSubmitLoading: (loading: boolean) => void;
    setShopperDetailsLoading: (loading: boolean) => void;
    setClientTemplateDetailsLoading: (loading: boolean) => void;
    setStepApprovalLoading: (loading: boolean) => void;
    // Builder autosave actions
    setBuilderAutosaving: (loading: boolean) => void;
    setReminderTabAutosaving: (loading: boolean) => void;
  };
};

export const useLoadingStore = create<LoadingState & LoadingActions>((set) => ({
  templateListingLoading: false,
  templateListActionLoading: false,
  templateByIdLoading: false,
  devicesLoading: false,
  configSaving: false,
  baseTemplateConfigCreation: false,
  baseTemplateStatusUpdate: false,
  contentListingLoading: false,
  contentActionLoading: false,
  contentSubDataLoading: false,
  contentSubmitLoading: false,
  shopperDetailsLoading: false,
  clientTemplateDetailsLoading: false,
  stepApprovalLoading: false,
  // Builder autosave initial states
  builderAutosaving: false,
  reminderTabAutosaving: false,
  actions: {
    setTemplateListingLoading: (loading: boolean) =>
      set({ templateListingLoading: loading }),
    setTemplateListActionLoading: (loading: boolean) =>
      set({ templateListActionLoading: loading }),
    setTemplateByIdLoading: (loading: boolean) => set({ templateByIdLoading: loading }),
    setDevicesLoading: (loading: boolean) => set({ devicesLoading: loading }),
    setConfigSaving: (loading: boolean) => set({ configSaving: loading }),
    setBaseTemplateConfigCreation: (loading: boolean) =>
      set({ baseTemplateConfigCreation: loading }),
    setBaseTemplateStatusUpdate: (loading: boolean) =>
      set({ baseTemplateStatusUpdate: loading }),
    setContentListingLoading: (loading: boolean) =>
      set({ contentListingLoading: loading }),
    setContentActionLoading: (loading: boolean) =>
      set({ contentActionLoading: loading }),
    setContentSubDataLoading: (loading: boolean) =>
      set({ contentSubDataLoading: loading }),
    setContentSubmitLoading: (loading: boolean) =>
      set({ contentSubmitLoading: loading }),
    setShopperDetailsLoading: (loading: boolean) =>
      set({ shopperDetailsLoading: loading }),
    setClientTemplateDetailsLoading: (loading: boolean) =>
      set({ clientTemplateDetailsLoading: loading }),
    setStepApprovalLoading: (loading: boolean) =>
      set({ stepApprovalLoading: loading }),
    // Builder autosave actions
    setBuilderAutosaving: (loading: boolean) =>
      set({ builderAutosaving: loading }),
    setReminderTabAutosaving: (loading: boolean) =>
      set({ reminderTabAutosaving: loading }),
  },
}));
