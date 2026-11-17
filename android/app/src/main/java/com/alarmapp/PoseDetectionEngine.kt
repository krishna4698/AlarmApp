package com.alarmapp

import android.graphics.PointF
import com.google.mlkit.vision.pose.Pose
import com.google.mlkit.vision.pose.PoseLandmark

enum class PushUpState {
    NO_FACE,
    DEVICE_MOVING,
    NEED_SHOULDERS,
    READY_AT_TOP,
    DESCENDING,
    BOTTOM_REACHED,
    ASCENDING
}

data class PoseAnalysisResult(
    val state: PushUpState,
    val completedReps: Int,
    val depthScale: Double,
    val depthPercentage: Int,
    val isEyesDetected: Boolean,
    val isFormValid: Boolean,
    val isDeviceStationary: Boolean,
    val repJustCounted: Boolean
)

class PoseDetectionEngine(private var targetReps: Int = 20) {

    private var currentState: PushUpState = PushUpState.NO_FACE
    private var completedReps: Int = 0
    private var isDeviceStationary: Boolean = true

    // Top position baseline calibration
    private var baselineEyeDist: Double = 0.0
    private var baselineNoseY: Double = 0.0
    private var baselineShoulderY: Double = 0.0
    private var topStabilityFrames: Int = 0

    // Timing
    private var bottomReachedTime: Long = 0L

    fun setDeviceStationary(stationary: Boolean) {
        this.isDeviceStationary = stationary
    }

    fun reset(newTarget: Int = 20) {
        currentState = PushUpState.NO_FACE
        completedReps = 0
        targetReps = newTarget
        baselineEyeDist = 0.0
        baselineNoseY = 0.0
        baselineShoulderY = 0.0
        topStabilityFrames = 0
        bottomReachedTime = 0L
    }

    fun analyzePose(pose: Pose): PoseAnalysisResult {
        // Anti-Cheat Rule 1: The phone must be resting still on the floor, NOT in hand
        if (!isDeviceStationary) {
            currentState = PushUpState.DEVICE_MOVING
            return PoseAnalysisResult(
                state = PushUpState.DEVICE_MOVING,
                completedReps = completedReps,
                depthScale = 1.0,
                depthPercentage = 0,
                isEyesDetected = true,
                isFormValid = false,
                isDeviceStationary = false,
                repJustCounted = false
            )
        }

        val nose = pose.getPoseLandmark(PoseLandmark.NOSE)
        val leftEye = pose.getPoseLandmark(PoseLandmark.LEFT_EYE)
        val rightEye = pose.getPoseLandmark(PoseLandmark.RIGHT_EYE)
        val leftShoulder = pose.getPoseLandmark(PoseLandmark.LEFT_SHOULDER)
        val rightShoulder = pose.getPoseLandmark(PoseLandmark.RIGHT_SHOULDER)

        val leftEyeScore = leftEye?.inFrameLikelihood ?: 0f
        val rightEyeScore = rightEye?.inFrameLikelihood ?: 0f
        val noseScore = nose?.inFrameLikelihood ?: 0f

        // 1. Must detect face / eyes looking at camera
        if (leftEye == null || rightEye == null || nose == null ||
            leftEyeScore < 0.45f || rightEyeScore < 0.45f || noseScore < 0.45f
        ) {
            currentState = PushUpState.NO_FACE
            return PoseAnalysisResult(
                state = PushUpState.NO_FACE,
                completedReps = completedReps,
                depthScale = 1.0,
                depthPercentage = 0,
                isEyesDetected = false,
                isFormValid = true,
                isDeviceStationary = true,
                repJustCounted = false
            )
        }

        // Anti-Cheat Rule 2: Both shoulders MUST be in frame (proves user is in push-up stance, not just holding phone to face)
        val hasShoulders = leftShoulder != null && rightShoulder != null &&
                leftShoulder.inFrameLikelihood > 0.45f && rightShoulder.inFrameLikelihood > 0.45f

        if (!hasShoulders) {
            currentState = PushUpState.NEED_SHOULDERS
            return PoseAnalysisResult(
                state = PushUpState.NEED_SHOULDERS,
                completedReps = completedReps,
                depthScale = 1.0,
                depthPercentage = 0,
                isEyesDetected = true,
                isFormValid = false,
                isDeviceStationary = true,
                repJustCounted = false
            )
        }

        val currentEyeDist = distance(leftEye.position, rightEye.position)
        val currentNoseY = nose.position.y.toDouble()
        val currentShoulderY = (leftShoulder!!.position.y + rightShoulder!!.position.y) / 2.0

        // 2. Initialize or adapt baseline when at top lockout
        if (baselineEyeDist <= 0.0) {
            baselineEyeDist = currentEyeDist
            baselineNoseY = currentNoseY
            baselineShoulderY = currentShoulderY
            currentState = PushUpState.READY_AT_TOP
        }

        // Calculate depth scale: how much larger face appears compared to top lockout
        val depthScale = currentEyeDist / baselineEyeDist

        // Scale maps: 1.0 (0% depth) -> 1.55+ (100% depth)
        val rawPercent = ((depthScale - 1.0) / 0.55) * 100.0
        val depthPercentage = Math.max(0, Math.min(100, Math.round(rawPercent).toInt()))

        // Anti-Cheat Rule 3: Verify shoulders move downward with the head (prevents neck bobbing)
        var isFormValid = true
        if (baselineShoulderY > 0.0 && currentState == PushUpState.DESCENDING) {
            val headDrop = currentNoseY - baselineNoseY
            val shoulderDrop = currentShoulderY - baselineShoulderY
            if (headDrop > 70.0 && shoulderDrop < 20.0) {
                isFormValid = false
            }
        }

        var repJustCounted = false
        val now = System.currentTimeMillis()

        // 3. State Machine
        when (currentState) {
            PushUpState.NO_FACE, PushUpState.DEVICE_MOVING, PushUpState.NEED_SHOULDERS -> {
                currentState = PushUpState.READY_AT_TOP
            }

            PushUpState.READY_AT_TOP -> {
                // Adapt baseline smoothly if user stays at top lockout
                if (depthScale in 0.85..1.15) {
                    topStabilityFrames++
                    if (topStabilityFrames > 15) {
                        baselineEyeDist = baselineEyeDist * 0.95 + currentEyeDist * 0.05
                        baselineNoseY = baselineNoseY * 0.95 + currentNoseY * 0.05
                        baselineShoulderY = baselineShoulderY * 0.95 + currentShoulderY * 0.05
                    }
                } else {
                    topStabilityFrames = 0
                }

                // Descending trigger: face scale grows past 1.22x
                if (depthScale >= 1.22 && isFormValid) {
                    currentState = PushUpState.DESCENDING
                }
            }

            PushUpState.DESCENDING -> {
                if (depthScale >= 1.50 && isFormValid) {
                    currentState = PushUpState.BOTTOM_REACHED
                    bottomReachedTime = now
                } else if (depthScale < 1.12) {
                    currentState = PushUpState.READY_AT_TOP
                }
            }

            PushUpState.BOTTOM_REACHED -> {
                // Must hold bottom depth for at least 100ms
                if (now - bottomReachedTime >= 100) {
                    if (depthScale < 1.40) {
                        currentState = PushUpState.ASCENDING
                    }
                }
            }

            PushUpState.ASCENDING -> {
                // Returned back to top lockout (scale <= 1.18x)
                if (depthScale <= 1.18) {
                    completedReps++
                    repJustCounted = true
                    currentState = PushUpState.READY_AT_TOP
                    topStabilityFrames = 0
                }
            }
        }

        return PoseAnalysisResult(
            state = currentState,
            completedReps = completedReps,
            depthScale = Math.round(depthScale * 100.0) / 100.0,
            depthPercentage = depthPercentage,
            isEyesDetected = true,
            isFormValid = isFormValid,
            isDeviceStationary = isDeviceStationary,
            repJustCounted = repJustCounted
        )
    }

    private fun distance(p1: PointF, p2: PointF): Double {
        val dx = (p1.x - p2.x).toDouble()
        val dy = (p1.y - p2.y).toDouble()
        return Math.sqrt(dx * dx + dy * dy)
    }
}
