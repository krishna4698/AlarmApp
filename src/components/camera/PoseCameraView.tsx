import React from 'react';
import {
  requireNativeComponent,
  ViewProps,
  NativeSyntheticEvent,
} from 'react-native';

export interface PoseAnalysisEventData {
  reps: number;
  state:
    | 'NO_FACE'
    | 'DEVICE_MOVING'
    | 'NEED_SHOULDERS'
    | 'READY_AT_TOP'
    | 'DESCENDING'
    | 'BOTTOM_REACHED'
    | 'ASCENDING';
  depthScale: number;
  depthPercentage: number;
  isEyesDetected: boolean;
  isFormValid: boolean;
  isDeviceStationary: boolean;
  repJustCounted: boolean;
}

interface NativePoseCameraViewProps extends ViewProps {
  cameraFacing?: 'front' | 'back';
  torch?: boolean;
  targetReps?: number;
  onPoseAnalysis?: (event: NativeSyntheticEvent<PoseAnalysisEventData>) => void;
}

const NativePoseCameraView =
  requireNativeComponent<NativePoseCameraViewProps>('PoseCameraView');

export interface PoseCameraProps extends ViewProps {
  cameraFacing?: 'front' | 'back';
  torch?: boolean;
  targetReps?: number;
  onPoseAnalysis?: (data: PoseAnalysisEventData) => void;
}

export const PoseCamera: React.FC<PoseCameraProps> = ({
  onPoseAnalysis,
  ...props
}) => {
  const handlePoseAnalysis = (
    event: NativeSyntheticEvent<PoseAnalysisEventData>
  ) => {
    onPoseAnalysis?.(event.nativeEvent);
  };

  return <NativePoseCameraView {...props} onPoseAnalysis={handlePoseAnalysis} />;
};
