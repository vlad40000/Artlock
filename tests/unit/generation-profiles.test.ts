import { describe, it, expect } from 'vitest';
import { 
  resolveGenerationProfile, 
  resolveFromControls, 
  derivePresetId, 
  varianceToIntensity,
  clampGenerationControls
} from '@/lib/ai/generation-profiles';

describe('Generation Profiles Logic', () => {
  describe('resolveGenerationProfile', () => {
    it('should resolve a valid surgicalLocal preset', () => {
      const profile = resolveGenerationProfile('surgicalLocal');
      expect(profile).not.toBeNull();
      expect(profile?.operationType).toBe('surgical');
      expect(profile?.temperature).toBe(0.1);
    });

    it('should return null for an invalid preset', () => {
      const profile = resolveGenerationProfile('invalidPreset');
      expect(profile).toBeNull();
    });
  });

  describe('resolveFromControls', () => {
    it('should return the correct profile for surgical operation with default variance', () => {
      const profile = resolveFromControls({ operation: 'surgical' });
      expect(profile.id).toBe('surgicalLocal');
    });

    it('should return the correct profile for creative operation with Locked variance', () => {
      const profile = resolveFromControls({ operation: 'creative', variancePreset: 'Locked' });
      expect(profile.id).toBe('creativeControlled');
    });

    it('should respect explicit generationPresetId if it matches the operation', () => {
      const profile = resolveFromControls({ 
        operation: 'creative', 
        generationPresetId: 'creativeExpressive' 
      });
      expect(profile.id).toBe('creativeExpressive');
    });

    it('should ignore explicit generationPresetId if it mismatch operation type', () => {
      const profile = resolveFromControls({ 
        operation: 'surgical', 
        generationPresetId: 'creativeExpressive' 
      });
      expect(profile.id).toBe('surgicalLocal'); // Defaults to balanced surgical
    });
  });

  describe('derivePresetId (Client-side)', () => {
    it('should derive creativeControlled for Creative operation and Balanced variance', () => {
      const id = derivePresetId('Creative', 'Creative', 'Balanced');
      expect(id).toBe('creativeControlled');
    });

    it('should derive lockStrict for Surgical mode "Lock Strict"', () => {
      const id = derivePresetId('Surgical', 'Lock Strict', 'Balanced');
      expect(id).toBe('lockStrict');
    });
  });

  describe('varianceToIntensity', () => {
    it('should map Balanced to medium', () => {
      expect(varianceToIntensity('Balanced')).toBe('medium');
    });
    it('should map Locked to low', () => {
      expect(varianceToIntensity('Locked')).toBe('low');
    });
    it('should map Creative to high', () => {
      expect(varianceToIntensity('Creative')).toBe('high');
    });
  });

  describe('clampGenerationControls', () => {
    it('should clamp values outside 0-1 range', () => {
      const clamped = clampGenerationControls({ designFidelity: 1.5, detailLoad: -0.5 });
      expect(clamped.designFidelity).toBe(1);
      expect(clamped.detailLoad).toBe(0);
    });

    it('should use defaults if values are missing', () => {
      const clamped = clampGenerationControls({});
      expect(clamped.designFidelity).toBe(0.85);
      expect(clamped.detailLoad).toBe(0.65);
    });
  });
});
