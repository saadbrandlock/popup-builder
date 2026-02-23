import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Skeleton } from 'antd';
import {
  CheckCircleFilled,
  ExclamationCircleFilled,
  CloseCircleFilled,
  InfoCircleFilled,
} from '@ant-design/icons';
import { useClientFlowStore } from '@/stores/clientFlowStore';
import { useGenericStore } from '@/stores/generic.store';
import { createAPI } from '@/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type AlertType = 'success' | 'warning' | 'error' | 'info';
type BannerStatus = 'admin-changes-request' | 'admin-rejected' | 'published' | 'admin-review';

interface SlideData {
  type: AlertType;
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
}

interface StepInfoBannerProps {
  message: React.ReactNode;
  /**
   * When true, also shows `published` and `admin-review` lock banners.
   * Set this only on the Copy Review step (step 3) where the content form is editable.
   * Default: false — steps 1, 2, 4 only show admin-decision banners.
   */
  showLockStatuses?: boolean;
}

// ─── Token map ────────────────────────────────────────────────────────────────

const TOKENS: Record<AlertType, {
  bg: string; border: string; leftBar: string;
  titleColor: string; bodyColor: string; iconColor: string; progressColor: string;
}> = {
  success: {
    bg: '#f0fdf4', border: '#bbf7d0', leftBar: '#22c55e',
    titleColor: '#15803d', bodyColor: '#166534', iconColor: '#22c55e', progressColor: '#22c55e',
  },
  warning: {
    bg: '#fffbeb', border: '#fde68a', leftBar: '#f59e0b',
    titleColor: '#b45309', bodyColor: '#92400e', iconColor: '#f59e0b', progressColor: '#f59e0b',
  },
  error: {
    bg: '#fef2f2', border: '#fecaca', leftBar: '#ef4444',
    titleColor: '#dc2626', bodyColor: '#991b1b', iconColor: '#ef4444', progressColor: '#ef4444',
  },
  info: {
    bg: '#eff6ff', border: '#bfdbfe', leftBar: '#3b82f6',
    titleColor: '#1d4ed8', bodyColor: '#1e40af', iconColor: '#3b82f6', progressColor: '#3b82f6',
  },
};

const TYPE_ICONS: Record<AlertType, React.ReactNode> = {
  success: <CheckCircleFilled />,
  warning: <ExclamationCircleFilled />,
  error: <CloseCircleFilled />,
  info: <InfoCircleFilled />,
};

// ─── Shared CTA ───────────────────────────────────────────────────────────────

const SupportCTA: React.FC<{ bodyColor: string }> = ({ bodyColor }) => (
  <span>
    Please{' '}
    <a
      href="mailto:support@brandlock.io"
      style={{ color: bodyColor, fontWeight: 600, textDecoration: 'underline' }}
    >
      contact support@brandlock.io
    </a>{' '}
    or submit a note via the <strong>feedback thread</strong> on the right.
  </span>
);

// ─── Custom Banner Slider ─────────────────────────────────────────────────────

const AUTOPLAY_MS  = 6000;
const FADE_OUT_MS  = 260;   // time to fade current slide out
const FADE_IN_MS   = 320;   // time to fade next slide in

interface BannerSliderProps {
  slides: SlideData[];
}

const BannerSlider: React.FC<BannerSliderProps> = ({ slides }) => {
  const [current, setCurrent]       = useState(0);
  const [opacity, setOpacity]       = useState(1);
  const [translateY, setTranslateY] = useState(0);
  const [isPaused, setIsPaused]     = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const [progressPaused, setProgressPaused] = useState(false);

  const isAnimating = useRef(false);

  const goTo = useCallback((nextIndex: number) => {
    if (isAnimating.current || nextIndex === current) return;
    isAnimating.current = true;

    // Phase 1: fade + slide current out (upward)
    setOpacity(0);
    setTranslateY(-10);

    setTimeout(() => {
      // Phase 2: snap position to come from below, switch content
      setTranslateY(10);
      setCurrent(nextIndex);
      setProgressKey((k) => k + 1);

      // Phase 3: fade + slide new slide in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setOpacity(1);
          setTranslateY(0);
          setTimeout(() => { isAnimating.current = false; }, FADE_IN_MS);
        });
      });
    }, FADE_OUT_MS);
  }, [current]);

  const advance = useCallback(() => {
    goTo((current + 1) % slides.length);
  }, [current, goTo, slides.length]);

  // Auto-advance timer
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const id = setInterval(advance, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [isPaused, advance, slides.length]);

  // Pause progress bar alongside hover state
  useEffect(() => {
    setProgressPaused(isPaused);
  }, [isPaused]);

  const slide = slides[current];
  const tok   = TOKENS[slide.type];

  return (
    <div
      style={{ position: 'relative', userSelect: 'none' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ── Card ── */}
      <div
        style={{
          background: tok.bg,
          border: `1px solid ${tok.border}`,
          borderLeft: `4px solid ${tok.leftBar}`,
          borderRadius: 8,
          padding: '12px 14px 10px',
          overflow: 'hidden',
        }}
      >
        {/* Slide content */}
        <div
          style={{
            opacity,
            transform: `translateY(${translateY}px)`,
            transition: `opacity ${opacity === 0 ? FADE_OUT_MS : FADE_IN_MS}ms ease,
                         transform ${opacity === 0 ? FADE_OUT_MS : FADE_IN_MS}ms ease`,
          }}
        >
          {slide.title ? (
            /* ── Header + indented body layout (status slides) ── */
            <>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: slide.body ? 5 : 0 }}>
                <span style={{ color: tok.iconColor, fontSize: 14, marginTop: 1, flexShrink: 0 }}>
                  {slide.icon}
                </span>
                <span style={{ color: tok.titleColor, fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>
                  {slide.title}
                </span>
              </div>
              {slide.body && (
                <div style={{ paddingLeft: 22, color: tok.bodyColor, fontSize: 12, lineHeight: 1.6 }}>
                  {slide.body}
                </div>
              )}
            </>
          ) : (
            /* ── Inline icon + body layout (compact info slide) ── */
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ color: tok.iconColor, fontSize: 14, marginTop: 1, flexShrink: 0 }}>
                {slide.icon}
              </span>
              {slide.body && (
                <div style={{ color: tok.bodyColor, fontSize: 12.5, lineHeight: 1.5 }}>
                  {slide.body}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Bottom controls: dots + progress ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 10,
            paddingTop: 8,
            borderTop: `1px solid ${tok.border}`,
          }}
        >
          {/* Dot indicators */}
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {slides.map((s, i) => {
              const dotTok = TOKENS[s.type];
              const isActive = i === current;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  style={{
                    width: isActive ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    border: 'none',
                    background: isActive ? dotTok.leftBar : `${tok.leftBar}33`,
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                    outline: 'none',
                  }}
                />
              );
            })}
          </div>

          {/* Progress bar */}
          <div
            style={{
              flex: 1,
              marginLeft: 10,
              height: 3,
              borderRadius: 2,
              background: `${tok.leftBar}22`,
              overflow: 'hidden',
            }}
          >
            <div
              key={progressKey}
              style={{
                height: '100%',
                borderRadius: 2,
                background: tok.progressColor,
                animationName: 'bannerProgressFill',
                animationDuration: `${AUTOPLAY_MS}ms`,
                animationTimingFunction: 'linear',
                animationFillMode: 'forwards',
                animationPlayState: progressPaused ? 'paused' : 'running',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Banner config ────────────────────────────────────────────────────────────

const BANNER_CONFIG: Record<
  BannerStatus,
  { type: AlertType; title: string; staticBody?: React.ReactNode; fetchNotes: boolean }
> = {
  published: {
    type: 'success',
    title: 'Template Published — Content Editing Locked',
    staticBody: null, // rendered inline with SupportCTA
    fetchNotes: false,
  },
  'admin-review': {
    type: 'warning',
    title: 'Awaiting Admin Review — Editing Temporarily Locked',
    staticBody: null,
    fetchNotes: false,
  },
  'admin-changes-request': {
    type: 'warning',
    title: 'Admin Has Requested Changes',
    staticBody: null,
    fetchNotes: true,
  },
  'admin-rejected': {
    type: 'error',
    title: 'Submission Rejected — Content Editing Locked',
    staticBody: null,
    fetchNotes: true,
  },
};

const STATIC_BODIES: Record<BannerStatus, (bodyColor: string) => React.ReactNode> = {
  published: (c) => (
    <>
      Your template has been successfully published and is now live. Content editing has been
      disabled to protect the published version. To request modifications,{' '}
      <SupportCTA bodyColor={c} />
    </>
  ),
  'admin-review': (c) => (
    <>
      Your content has been submitted and is currently under admin review. Editing is locked
      while the review is in progress to preserve the submitted version. For urgent changes,{' '}
      <SupportCTA bodyColor={c} />
    </>
  ),
  'admin-changes-request': () => null,
  'admin-rejected': () => null,
};

// ─── Main export ──────────────────────────────────────────────────────────────

export const StepInfoBanner: React.FC<StepInfoBannerProps> = ({ message, showLockStatuses = false }) => {
  const clientData  = useClientFlowStore((s) => s.clientData);
  const adminNotes  = useClientFlowStore((s) => s.adminDecisionNotes);
  const { actions } = useClientFlowStore();
  const apiClient   = useGenericStore((s) => s.apiClient);
  const fetchedRef  = useRef(false);

  /* Derive status — lock statuses (published/admin-review) only shown when opted in */
  const status = useMemo((): BannerStatus | null => {
    if (!clientData?.length) return null;
    const all = (s: string) => clientData.every((t) => t.staging_status === s);
    if (all('admin-changes-request')) return 'admin-changes-request';
    if (all('admin-rejected'))        return 'admin-rejected';
    if (showLockStatuses && all('published'))    return 'published';
    if (showLockStatuses && all('admin-review')) return 'admin-review';
    return null;
  }, [clientData, showLockStatuses]);

  /* Fetch admin note once, cache in store */
  useEffect(() => {
    if (!status || !BANNER_CONFIG[status].fetchNotes) return;
    if (!apiClient || !clientData?.length || fetchedRef.current) return;
    if (adminNotes !== null) { fetchedRef.current = true; return; }

    fetchedRef.current = true;
    const api = createAPI(apiClient);
    api.feedback
      .getFeedbackThreads(clientData[0].template_id, 'all')
      .then((threads) => {
        if (!Array.isArray(threads) || threads.length === 0) {
          actions.setAdminDecisionNotes('');
          return;
        }
        const adminThreads = threads.filter((t) => t.is_admin_response);
        const latest = adminThreads[adminThreads.length - 1] ?? threads[threads.length - 1];
        actions.setAdminDecisionNotes(latest.feedback_text ?? '');
      })
      .catch(() => actions.setAdminDecisionNotes(''));
  }, [status, apiClient, clientData]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Info slide (always present) */
  const infoSlide: SlideData = {
    type: 'info',
    icon: TYPE_ICONS.info,
    title: '',
    body: <span style={{ fontSize: 12.5 }}>{message}</span>,
  };

  /* No special status → single plain info banner */
  if (!status) {
    const tok = TOKENS.info;
    return (
      <div
        className="step-info-banner mb-4"
        style={{
          background: tok.bg,
          border: `1px solid ${tok.border}`,
          borderLeft: `4px solid ${tok.leftBar}`,
          borderRadius: 8,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
        }}
      >
        <span style={{ color: tok.iconColor, fontSize: 14, marginTop: 1, flexShrink: 0 }}>
          {TYPE_ICONS.info}
        </span>
        <span style={{ color: tok.bodyColor, fontSize: 12.5, lineHeight: 1.5 }}>{message}</span>
      </div>
    );
  }

  /* Build status slide */
  const config = BANNER_CONFIG[status];
  const tok    = TOKENS[config.type];
  const isLoading = config.fetchNotes && adminNotes === null;

  let body: React.ReactNode;
  if (config.fetchNotes) {
    if (isLoading) {
      body = <Skeleton active paragraph={{ rows: 1 }} title={false} style={{ marginTop: 2 }} />;
    } else {
      body = (
        <>
          {adminNotes && (
            <span style={{ display: 'block', marginBottom: 6, whiteSpace: 'pre-wrap' }}>
              {adminNotes}
            </span>
          )}
          <SupportCTA bodyColor={tok.bodyColor} />
        </>
      );
    }
  } else {
    body = STATIC_BODIES[status](tok.bodyColor);
  }

  const statusSlide: SlideData = {
    type: config.type,
    icon: TYPE_ICONS[config.type],
    title: config.title,
    body,
  };

  return (
    <div className="step-info-banner mb-4">
      <BannerSlider slides={[statusSlide, infoSlide]} />
    </div>
  );
};
