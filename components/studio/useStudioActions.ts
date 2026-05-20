'use client';

import { useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionDetailRecord, SessionAssetRecord } from '@/lib/server/session-detail';
import type { PieceState, DesignPhase } from '@/types/domain';
import type { Operation } from './studio-sidebar';
import type { TattooQAReport } from '@/lib/ai/prompt-contracts/tattoo-qa';
import type { OptimizeFieldKind } from '@/lib/ai/prompt-contracts/ai-optimize';
import { derivePresetId, varianceToIntensity } from '@/lib/ai/generation-profiles';
import { interpretSurgicalInstruction } from '@/lib/ai/surgical-interpreter';
import { operationAction } from './studio-sidebar';
import { clientUploadAsset } from '@/lib/client/upload';
import type { VoiceCommand } from './voice/voice-command-parser';

const DEFAULT_MODE = 'Surgical Local';
const DEFAULT_VARIANCE = 'Balanced';
const DEFAULT_TATTOO_MODE = true;

// ── Context ───────────────────────────────────────────────────────────────────

export interface ActionContext {
  detail: SessionDetailRecord | undefined;
  piece: PieceState;
  operation: Operation;
  request: string;
  maskAssetId: string | null;
  regionHint: string | null;
  maskType: 'include' | 'exclude';
  showMask: boolean;
  activePhaseId: DesignPhase;
  gates: Record<string, { status: string; unmet: { key: string; label: string }[] }>;
  displayAsset: SessionAssetRecord | null | undefined;
  referencePromptLines: string[];
  surgicalInfo: ReturnType<typeof interpretSurgicalInstruction> | null;
  uploadInputRef: React.RefObject<HTMLInputElement | null>;
  // Store actions
  busy: string | null;
  setBusy: (busy: string | null) => void;
  setStatus: (status: string) => void;
  setOperation: (op: Operation) => void;
  setActiveDrawer: (drawer: string | null) => void;
  setRequest: (r: string) => void;
  pushPiece: (update: Partial<PieceState> | ((prev: PieceState) => Partial<PieceState>)) => void;
  updatePresent: (update: Partial<PieceState> | ((prev: PieceState) => Partial<PieceState>)) => void;
  // Local state setters
  setMessage: (msg: { text: string; type: 'info' | 'error' } | null) => void;
  setMaskAssetId: (id: string | null) => void;
  setRegionHint: (hint: string | null) => void;
  setMaskType: (type: 'include' | 'exclude') => void;
  setShowMask: (show: boolean) => void;
  setDriftError: (err: string | null) => void;
  setQaReport: (report: TattooQAReport | null) => void;
  setPreviewAssetId: (id: string | null) => void;
  // Bootstrap
  bootstrap: (file: File, options?: { projectId?: string; sessionId?: string }) => Promise<{ projectId?: string; sessionId?: string; assetId?: string }>;
  batchUpload: (files: File[], projectId: string) => Promise<string[]>;
  // Voice
  voiceStatus: string;
  voiceToggle: () => void;
  // Derived
  runLabel: string;
  activeLocksList: { name: string; value: string | null | undefined }[];
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useStudioActions(ctx: ActionContext) {
  const router = useRouter();
  // Stable ref so callbacks don't need ctx in their dep arrays
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  const buildEditRequest = useCallback((baseRequest: string) => {
    const { referencePromptLines } = ctxRef.current;
    const trimmed = baseRequest.trim();
    if (referencePromptLines.length === 0) return trimmed;
    return [
      trimmed,
      ['Reference parameters:', ...referencePromptLines.map(l => `- ${l}`)].join('\n'),
    ].filter(Boolean).join('\n\n');
  }, []);

  const handleRun = useCallback(async () => {
    const {
      detail, piece, operation, request, maskAssetId, regionHint, maskType,
      activePhaseId, gates, displayAsset, surgicalInfo,
      setBusy, setStatus, setOperation, setRequest, setMessage, setDriftError,
      setPreviewAssetId, pushPiece,
    } = ctxRef.current;

    if (!detail?.session.id || !detail?.project.id) {
      setStatus('Upload a reference image to start a studio session.');
      return;
    }
    const phaseGate = gates[activePhaseId];
    if (phaseGate.status === 'locked') {
      setMessage({ text: `Phase locked: ${phaseGate.unmet[0]?.label ?? 'Complete the previous step'}`, type: 'error' });
      return;
    }
    if (!displayAsset?.id) {
      setStatus('Select a base reference before running.');
      return;
    }
    if (!request.trim() && ['Surgical', 'Creative'].includes(operation)) {
      setStatus('Add a client request before running.');
      return;
    }

    const referenceAssetIds = piece.activeReferenceIds ?? [];
    const editRequest = buildEditRequest(request);
    const generationPresetId = derivePresetId(operation, DEFAULT_MODE, DEFAULT_VARIANCE);
    setBusy(`RUNNING ${operation.toUpperCase()}`);

    try {
      let endpoint = '';
      let body: Record<string, unknown> = {};

      switch (operation) {
        case 'Extract':
          endpoint = `/api/sessions/${detail.session.id}/extract-locks`;
          body = { sourceAssetId: displayAsset.id, tattooMode: DEFAULT_TATTOO_MODE };
          break;
        case 'Surgical':
          endpoint = `/api/sessions/${detail.session.id}/surgical-edit`;
          body = {
            delta1: editRequest, baseAssetId: displayAsset.id, referenceAssetIds,
            maskAssetId, regionHint: surgicalInfo?.targetRegion || regionHint,
            maskType, tattooMode: DEFAULT_TATTOO_MODE, generationPresetId, variancePreset: DEFAULT_VARIANCE,
          };
          break;
        case 'Creative':
          endpoint = `/api/sessions/${detail.session.id}/creative-delta`;
          body = {
            transformation: editRequest, intensity: varianceToIntensity(DEFAULT_VARIANCE),
            baseAssetId: displayAsset.id, referenceAssetIds,
            transferMode: referenceAssetIds.length > 0 ? 'reference_transfer' : 'none',
            maskAssetId, maskType, tattooMode: DEFAULT_TATTOO_MODE,
            generationPresetId, variancePreset: DEFAULT_VARIANCE,
          };
          break;
        case 'Variant':
          endpoint = `/api/sessions/${detail.session.id}/variant-sheet`;
          body = { baseAssetId: displayAsset.id, constraints: request.trim() || null, layout: 'single', generationPresetId, variancePreset: DEFAULT_VARIANCE };
          break;
        case 'Stencil':
          endpoint = `/api/sessions/${detail.session.id}/stencil`;
          body = { baseAssetId: displayAsset.id };
          break;
        case 'Mockup':
          endpoint = `/api/sessions/${detail.session.id}/mockup`;
          body = { baseAssetId: displayAsset.id, placement: 'Forearm', tattooMode: DEFAULT_TATTOO_MODE };
          break;
        case 'Turnaround':
          endpoint = `/api/sessions/${detail.session.id}/turnaround`;
          body = {
            baseAssetId: displayAsset.id,
            views: ['Front', 'Side', 'Back'],
            layout: 'single',
          };
          break;
      }

      const resp = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await resp.json();
      if (!resp.ok) {
        if (data.error?.includes('Drift detected')) setDriftError(data.error);
        throw new Error(data.error || 'Operation failed');
      }

      setRequest('');
      setMessage({ text: `${operationAction(operation)} complete`, type: 'info' });
      setStatus('Ready');
      setDriftError(null);

      if (operation === 'Extract') {
        pushPiece({ ...piece, locksActive: true, locksExtracted: true, activePhase: 'surgical' });
        setOperation('Surgical');
      } else if (data.artifacts?.outputAsset) {
        pushPiece({ ...piece, baseImage: data.artifacts.outputAsset.blob_url, lastUpdate: new Date().toISOString() });
      }

      router.refresh();
      setPreviewAssetId(null);
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : 'Operation failed', type: 'error' });
    } finally {
      ctxRef.current.setBusy(null);
    }
  }, [buildEditRequest, router]);

  const handleUpdateReference = useCallback(async (assetId: string) => {
    const { detail, piece, activePhaseId, pushPiece, setBusy, setMessage, setStatus } = ctxRef.current;

    if (activePhaseId !== 'reference') {
      const current = piece.activeReferenceIds || [];
      const next = current.includes(assetId)
        ? current.filter(id => id !== assetId)
        : [...current, assetId].slice(0, 14);
      pushPiece({ ...piece, activeReferenceIds: next });
      return;
    }

    if (!detail?.session.id) return;
    setBusy('SWITCHING REFERENCE');
    try {
      const resp = await fetch(`/api/sessions/${detail.session.id}/update-reference`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assetId }),
      });
      if (!resp.ok) throw new Error('Failed to update reference');
      const newRef = detail.projectReferences.find(r => r.id === assetId);
      if (newRef) pushPiece({ ...piece, baseImage: newRef.blob_url });
      router.refresh();
      setMessage({ text: 'Base reference updated', type: 'info' });
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : 'Update failed', type: 'error' });
    } finally {
      ctxRef.current.setBusy(null);
    }
  }, [router]);

  const handleReferencePromptParamChange = useCallback((assetId: string, field: 'title' | 'promptLine', value: string) => {
    ctxRef.current.updatePresent((current) => ({
      referencePromptParams: {
        ...(current.referencePromptParams ?? {}),
        [assetId]: { ...(current.referencePromptParams?.[assetId] ?? {}), [field]: value },
      },
    }));
  }, []);

  const handlePromoteToReference = useCallback(async (assetId: string) => {
    const { detail, setBusy, setMessage } = ctxRef.current;
    if (!detail?.project.id) return;
    setBusy('SAVING TO REFERENCE BOARD');
    try {
      const resp = await fetch('/api/assets/promote-to-reference', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, projectId: detail.project.id }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to save to reference board');
      setMessage({ text: 'Saved to Reference Board', type: 'info' });
      router.refresh();
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : 'Promote failed', type: 'error' });
    } finally {
      ctxRef.current.setBusy(null);
    }
  }, [router]);

  const handleGetCritique = useCallback(async () => {
    const { detail, displayAsset, busy, setBusy, setStatus, setMessage, setQaReport } = ctxRef.current;
    if (!detail?.session.id || !displayAsset?.id || busy) return;
    setBusy('PERFORMING DRIFT DETECTION');
    try {
      const resp = await fetch(`/api/sessions/${detail.session.id}/qa`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateAssetId: displayAsset.id }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'QA failed');
      setQaReport(data.report);
      setStatus('Drift detection complete.');
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : 'QA failed', type: 'error' });
    } finally {
      ctxRef.current.setBusy(null);
    }
  }, []);

  const handleSaveToDevice = useCallback(async (format: string) => {
    const { displayAsset, setBusy, setMessage } = ctxRef.current;
    if (!displayAsset?.blob_url) return;
    setBusy(`EXPORTING ${format.toUpperCase()}`);
    try {
      const response = await fetch(displayAsset.blob_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `artlock-design-${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setMessage({ text: `Design saved as ${format.toUpperCase()}`, type: 'info' });
    } catch (err: unknown) {
      setMessage({ text: `Export failed: ${err instanceof Error ? err.message : 'unknown'}`, type: 'error' });
    } finally {
      ctxRef.current.setBusy(null);
    }
  }, []);

  const handleRelock = useCallback(async () => {
    const { detail, setBusy, setActiveDrawer, setMessage } = ctxRef.current;
    if (!detail?.latestApprovedAsset || !detail?.session.id) return;
    setBusy('RELOCKING APPROVED BASE');
    try {
      const resp = await fetch(`/api/sessions/${detail.session.id}/relock`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceAssetId: detail.latestApprovedAsset.id }),
      });
      if (!resp.ok) throw new Error('Failed to relock');
      setActiveDrawer('locks');
      setMessage({ text: 'Approved base relocked', type: 'info' });
      router.refresh();
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : 'Relock failed', type: 'error' });
    } finally {
      ctxRef.current.setBusy(null);
    }
  }, [router]);

  const handleDeleteAsset = useCallback(async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    const { setBusy, setMessage } = ctxRef.current;
    setBusy('DELETING ASSET');
    try {
      const resp = await fetch(`/api/assets/${assetId}`, { method: 'DELETE' });
      if (!resp.ok) throw new Error('Failed to delete asset');
      router.refresh();
      setMessage({ text: 'Asset deleted', type: 'info' });
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : 'Delete failed', type: 'error' });
    } finally {
      ctxRef.current.setBusy(null);
    }
  }, [router]);

  const handleEnhancePrompt = useCallback(async () => {
    const { request, operation, activeLocksList, busy, setBusy, setRequest, setStatus, setMessage } = ctxRef.current;
    if (!request.trim() || busy) return;
    setBusy('REFINING INSTRUCTION');
    const locksContext = activeLocksList.filter(l => l.value).map(l => `${l.name}: ${l.value}`).join('\n');
    const kind: OptimizeFieldKind =
      operation === 'Surgical' ? 'surgical_change' :
      operation === 'Creative' ? 'creative_delta' : 'general';
    try {
      const resp = await fetch('/api/ai/optimize-text', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalText: request.trim(), fieldKind: kind, locks: locksContext }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Optimization failed');
      setRequest(data.artifacts?.optimizedText ?? request.trim());
      setStatus('Instruction refined.');
    } catch (err: unknown) {
      setStatus('Refinement failed.');
      setMessage({ text: err instanceof Error ? err.message : 'Refinement failed', type: 'error' });
    } finally {
      ctxRef.current.setBusy(null);
    }
  }, []);

  const handleBatchUpload = useCallback(async (files: FileList | File[]) => {
    const { piece, setBusy, setMessage, pushPiece, batchUpload } = ctxRef.current;
    if (!piece.id) return;
    setBusy('UPLOADING REFERENCES');
    try {
      const fileArray = Array.from(files);
      await batchUpload(fileArray, piece.id);
      const newUrls = fileArray.map(f => URL.createObjectURL(f));
      pushPiece({ ...piece, referenceImages: [...newUrls, ...piece.referenceImages] });
      setMessage({ text: `${fileArray.length} references uploaded`, type: 'info' });
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : 'Upload failed', type: 'error' });
    } finally {
      ctxRef.current.setBusy(null);
    }
  }, []);

  const onFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const { piece, detail, setBusy, setMessage, bootstrap } = ctxRef.current;

    if (!piece.id) {
      setBusy('INITIALIZING SESSION');
      try {
        const { projectId } = await bootstrap(fileArray[0], {
          projectId: detail?.project.id,
          sessionId: detail?.session.id,
        });
        if (fileArray.length > 1 && projectId) {
          await ctxRef.current.batchUpload(fileArray.slice(1), projectId);
        }
      } catch (err: unknown) {
        setMessage({ text: `Bootstrap failed: ${err instanceof Error ? err.message : 'unknown'}`, type: 'error' });
      } finally {
        ctxRef.current.setBusy(null);
        e.target.value = '';
      }
    } else {
      await handleBatchUpload(files);
      e.target.value = '';
    }
  }, [handleBatchUpload]);

  const handleAddReference = useCallback(() => {
    ctxRef.current.uploadInputRef.current?.click();
  }, []);

  const handleMicToggle = useCallback(() => {
    const { voiceStatus, voiceToggle, setStatus } = ctxRef.current;
    voiceToggle();
    if (voiceStatus !== 'listening') {
      setStatus('Listening — transcript will fill Client Request.');
    } else {
      setStatus('Voice stopped.');
    }
  }, []);

  const handleVoiceCommand = useCallback((command: VoiceCommand) => {
    const { setOperation, setActiveDrawer, setRequest, setShowMask, setMaskType, setRegionHint, setStatus } = ctxRef.current;
    switch (command.type) {
      case 'SET_OPERATION':
        setOperation(command.value as Operation);
        setStatus(`Switched to ${command.value}`);
        break;
      case 'OPEN_DRAWER':
        setActiveDrawer(command.value as string);
        setStatus(`Opened ${command.value}`);
        break;
      case 'FILL_REQUEST':
        setRequest(command.value as string);
        break;
      case 'TOGGLE_MASK':
        setShowMask(!!command.value);
        setStatus(command.value ? 'Masking enabled.' : 'Masking disabled.');
        break;
      case 'SET_MASK_TYPE': {
        const val = command.value as unknown as { type: 'include' | 'exclude'; subject?: string };
        setMaskType(val.type);
        if (val.subject) {
          setRegionHint(val.subject);
          setStatus(`Target area: ${val.subject} (${val.type})`);
        } else {
          setStatus(`Mask mode: ${val.type}`);
        }
        break;
      }
    }
  }, []);

  return {
    handleRun, handleUpdateReference, handleReferencePromptParamChange,
    handlePromoteToReference, handleGetCritique, handleSaveToDevice,
    handleRelock, handleDeleteAsset, handleEnhancePrompt,
    handleBatchUpload, onFileChange, handleAddReference,
    handleMicToggle, handleVoiceCommand,
  };
}
