'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface BootstrapOptions {
  projectId?: string;
  sessionId?: string;
}

export function useStudioBootstrap() {
  const router = useRouter();
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function bootstrap(file: File, options: BootstrapOptions = {}) {
    setIsBootstrapping(true);
    setError(null);

    try {
      let projectId = options.projectId;
      let sessionId = options.sessionId;

      // 1. If no project exists, create one
      if (!projectId) {
        const projectResp = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Studio Project ' + new Date().toLocaleDateString() }),
        });
        const projectData = await projectResp.json();
        if (!projectResp.ok) throw new Error(projectData.error || 'Failed to create project');
        projectId = projectData.artifacts.projectId;
      }

      // 2. Upload the reference asset via shared client-side helper
      const { clientUploadAsset } = await import('@/lib/client/upload');
      const uploadData = await clientUploadAsset(file, projectId!, 'reference', file.name);
      const assetId = uploadData.artifacts.assetId;

      // 3. If no session exists, create one
      if (!sessionId) {
        const sessionResp = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, referenceAssetId: assetId }),
        });
        const sessionData = await sessionResp.json();
        if (!sessionResp.ok) throw new Error(sessionData.error || 'Failed to create session');
        sessionId = sessionData.artifacts.sessionId;

        // 4. Route to the new studio session
        router.push(`/studio/${sessionId}` as any);
      } else {
        // If session exists, we just refresh to see the new asset in gallery
        router.refresh();
      }

      return { projectId, sessionId, assetId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bootstrap failed';
      setError(msg);
      throw err;
    } finally {
      setIsBootstrapping(false);
    }
  }

  async function batchUpload(files: File[], projectId: string) {
    setIsBootstrapping(true);
    setError(null);
    const assetIds: string[] = [];

    try {
      const { clientUploadAsset } = await import('@/lib/client/upload');
      
      for (const file of files) {
        const uploadData = await clientUploadAsset(file, projectId, 'reference', file.name);
        assetIds.push(uploadData.artifacts.assetId);
      }
      
      router.refresh();
      return assetIds;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Batch upload failed';
      setError(msg);
      throw err;
    } finally {
      setIsBootstrapping(false);
    }
  }

  return {
    bootstrap,
    batchUpload,
    isBootstrapping,
    error,
    clearError: () => setError(null),
  };
}
