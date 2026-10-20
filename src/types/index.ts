export type AnimationStatus = 
  | 'idle' 
  | 'aiming' 
  | 'flying' 
  | 'impact' 
  | 'burning' 
  | 'exploding' 
  | 'concluded';

export interface ViceHead {
  id: number;
  sanskritName: string;
  englishName: string;
  meaning: string;
  spiritualRemedy: string;
  headIndex: number; // -4 to 5 relative to center
}

export interface SimulationSettings {
  soundEnabled: boolean;
  particleDensity: 'standard' | 'cinematic';
  speed: number;
  showAura: boolean;
}
