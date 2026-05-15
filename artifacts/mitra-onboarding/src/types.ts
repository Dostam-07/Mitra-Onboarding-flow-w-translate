export enum OnboardingStep {
  PROFILE = 1,
  PROFESSION = 2,
  LOCATION = 3,
  SUCCESS = 4,
  TERMS = 5,
  CHAT = 6,
}

export type LocationMethod = 'gps' | 'pincode' | 'dropdown';

export interface LocationData {
  state: string;
  district: string;
  taluk: string;
  village: string;
}

export interface TelemetryData {
  sessionId: string;
  startTime: number;
  endTime: number | null;
  totalTimeSec?: number;

  gpsDuration: number;
  pincodeDuration: number;
  manualDuration: number;

  gpsSuccess: boolean;
  pincodeSuccess: boolean;

  methodSelected: LocationMethod | null;
  finalMethod: LocationMethod | null;
  numberOfEdits: number;
  completionStatus: 'incomplete' | 'completed';
  stepDropOff: OnboardingStep | null;
}

export interface OnboardingState {
  phone: string;
  name: string;
  language: string;
  organization: string;
  role: string;
  location: LocationData;
  currentStep: OnboardingStep;
  telemetry: TelemetryData;
  flowType?: 'discussion' | 'improvement';
}
