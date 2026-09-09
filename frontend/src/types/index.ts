export type Severity = 'none' | 'low' | 'medium' | 'high';
export type SkinType = 'oily' | 'dry' | 'neutral' | 'combination';
export type SensitivityLevel = 'low' | 'medium' | 'high';

export interface DetectedIssue {
  issue: string;
  present: boolean;
  confidence: number;
  severity: Severity;
}

export interface PoreDetected {
  region: string;
  present: boolean;
  confidence: number;
  severity: Severity;
}

export interface Subscores {
  acne: number;
  pigmentation: number;
  darkCircles: number;
  wrinkles: number;
  texture: number;
  oilBalance: number;
}

export interface SkinAnalysis {
  detectedIssues: DetectedIssue[];
  poresDetected: PoreDetected[];
  skinType: SkinType;
  skinScore: number;
  subscores: Subscores;
}

export interface Routine {
  morning: string[];
  night: string[];
  weekly: string[];
}

export interface Recommendation {
  routine: Routine;
  explanation: string;
  insights: string[];
}

export interface UserProfile {
  skinType: SkinType;
  sensitivity: SensitivityLevel;
  allergies: string[];
  goals: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface HistoricalProgressEntry {
  date: string;
  skinScore: number;
  subscores: Subscores;
  notes?: string;
}

export interface APIError {
  message: string;
  status?: number;
}
