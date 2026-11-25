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

/**
 * Front-facing biomechanical push-up state machine using ML Kit Pose landmarks.
 * Tracks eye-distance depth scaling alongside mandatory dual-shoulder presence
 * and device stillness to prevent hand-held or head-bobbing false reps.
 */
class PoseDetectionEngine(private var targetReps: Int = 20) {

    companion object {
        private const val MIN_LANDMARK_LIKELIHOOD = 0.45f
        private const val DEPTH_SCALE_SPAN = 0.55
        private const val TOP_STABILITY_MIN_SCALE = 0.85
        private const val TOP_STABILITY_MAX_SCALE = 1.15
        private const val TOP_STABILITY_FRAME_THRESHOLD = 15
        private const val BASELINE_EMA_OLD_WEIGHT = 0.95
        private const val BASELINE_EMA_NEW_WEIGHT = 0.05
        private const val DESCEND_SCALE_THRESHOLD = 1.22
        private const val BOTTOM_SCALE_THRESHOLD = 1.50
        private const val ABORT_DESCENT_SCALE_THRESHOLD = 1.12
        private const val ASCEND_SCALE_THRESHOLD = 1.40
        private const val LOCKOUT_SCALE_THRESHOLD = 1.18
        private const val BOTTOM_HOLD_DURATION_MS = 100L
        private const val HEAD_BOB_DROP_PX = 70.0
        private const val MIN_SHOULDER_DROP_PX = 20.0
    }

    private var currentState: PushUpState = PushUpState.NO_FACE
    private var completedReps: Int = 0
    private var isDeviceStationary: Boolean = true

    private var baselineEyeDist: Double = 0.0
    private var baselineNoseY: Double = 0.0
    private var baselineShoulderY: Double = 0.0
    private var topStabilityFrames: Int = 0
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
        if (!isDeviceStationary) {
            currentState = PushUpState.DEVICE_MOVING
            return buildBlockedResult(
                state = PushUpState.DEVICE_MOVING,
                isEyesDetected = true,
                isFormValid = false,
                isDeviceStationary = false
            )
        }

        val nose = pose.getPoseLandmark(PoseLandmark.NOSE)
        val leftEye = pose.getPoseLandmark(PoseLandmark.LEFT_EYE)
        val rightEye = pose.getPoseLandmark(PoseLandmark.RIGHT_EYE)
        val leftShoulder = pose.getPoseLandmark(PoseLandmark.LEFT_SHOULDER)
        val rightShoulder = pose.getPoseLandmark(PoseLandmark.RIGHT_SHOULDER)

        if (!areFaceLandmarksVisible(nose, leftEye, rightEye)) {
            currentState = PushUpState.NO_FACE
            return buildBlockedResult(
                state = PushUpState.NO_FACE,
                isEyesDetected = false,
                isFormValid = true,
                isDeviceStationary = true
            )
        }

        if (!areBothShouldersVisible(leftShoulder, rightShoulder)) {
            currentState = PushUpState.NEED_SHOULDERS
            return buildBlockedResult(
                state = PushUpState.NEED_SHOULDERS,
                isEyesDetected = true,
                isFormValid = false,
                isDeviceStationary = true
            )
        }

        val currentEyeDist = distance(leftEye!!.position, rightEye!!.position)
        val currentNoseY = nose!!.position.y.toDouble()
        val currentShoulderY = (leftShoulder!!.position.y + rightShoulder!!.position.y) / 2.0

        if (baselineEyeDist <= 0.0) {
            baselineEyeDist = currentEyeDist
            baselineNoseY = currentNoseY
            baselineShoulderY = currentShoulderY
            currentState = PushUpState.READY_AT_TOP
        }

        val depthScale = currentEyeDist / baselineEyeDist
        val rawPercent = ((depthScale - 1.0) / DEPTH_SCALE_SPAN) * 100.0
        val depthPercentage = Math.max(0, Math.min(100, Math.round(rawPercent).toInt()))
        val isFormValid = checkFormValidity(currentNoseY, currentShoulderY)

        val repJustCounted = advanceStateMachine(
            depthScale = depthScale,
            isFormValid = isFormValid,
            currentEyeDist = currentEyeDist,
            currentNoseY = currentNoseY,
            currentShoulderY = currentShoulderY
        )

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

    private fun areFaceLandmarksVisible(
        nose: PoseLandmark?,
        leftEye: PoseLandmark?,
        rightEye: PoseLandmark?
    ): Boolean {
        return leftEye != null && rightEye != null && nose != null &&
            leftEye.inFrameLikelihood >= MIN_LANDMARK_LIKELIHOOD &&
            rightEye.inFrameLikelihood >= MIN_LANDMARK_LIKELIHOOD &&
            nose.inFrameLikelihood >= MIN_LANDMARK_LIKELIHOOD
    }

    private fun areBothShouldersVisible(
        leftShoulder: PoseLandmark?,
        rightShoulder: PoseLandmark?
    ): Boolean {
        return leftShoulder != null && rightShoulder != null &&
            leftShoulder.inFrameLikelihood > MIN_LANDMARK_LIKELIHOOD &&
            rightShoulder.inFrameLikelihood > MIN_LANDMARK_LIKELIHOOD
    }

    private fun checkFormValidity(currentNoseY: Double, currentShoulderY: Double): Boolean {
        if (baselineShoulderY <= 0.0 || currentState != PushUpState.DESCENDING) {
            return true
        }
        val headDrop = currentNoseY - baselineNoseY
        val shoulderDrop = currentShoulderY - baselineShoulderY
        return !(headDrop > HEAD_BOB_DROP_PX && shoulderDrop < MIN_SHOULDER_DROP_PX)
    }

    private fun adaptTopBaseline(
        depthScale: Double,
        currentEyeDist: Double,
        currentNoseY: Double,
        currentShoulderY: Double
    ) {
        if (depthScale in TOP_STABILITY_MIN_SCALE..TOP_STABILITY_MAX_SCALE) {
            topStabilityFrames++
            if (topStabilityFrames > TOP_STABILITY_FRAME_THRESHOLD) {
                baselineEyeDist = baselineEyeDist * BASELINE_EMA_OLD_WEIGHT + currentEyeDist * BASELINE_EMA_NEW_WEIGHT
                baselineNoseY = baselineNoseY * BASELINE_EMA_OLD_WEIGHT + currentNoseY * BASELINE_EMA_NEW_WEIGHT
                baselineShoulderY = baselineShoulderY * BASELINE_EMA_OLD_WEIGHT + currentShoulderY * BASELINE_EMA_NEW_WEIGHT
            }
        } else {
            topStabilityFrames = 0
        }
    }

    private fun advanceStateMachine(
        depthScale: Double,
        isFormValid: Boolean,
        currentEyeDist: Double,
        currentNoseY: Double,
        currentShoulderY: Double
    ): Boolean {
        var repJustCounted = false
        val now = System.currentTimeMillis()

        when (currentState) {
            PushUpState.NO_FACE, PushUpState.DEVICE_MOVING, PushUpState.NEED_SHOULDERS -> {
                currentState = PushUpState.READY_AT_TOP
            }

            PushUpState.READY_AT_TOP -> {
                adaptTopBaseline(depthScale, currentEyeDist, currentNoseY, currentShoulderY)
                if (depthScale >= DESCEND_SCALE_THRESHOLD && isFormValid) {
                    currentState = PushUpState.DESCENDING
                }
            }

            PushUpState.DESCENDING -> {
                if (depthScale >= BOTTOM_SCALE_THRESHOLD && isFormValid) {
                    currentState = PushUpState.BOTTOM_REACHED
                    bottomReachedTime = now
                } else if (depthScale < ABORT_DESCENT_SCALE_THRESHOLD) {
                    currentState = PushUpState.READY_AT_TOP
                }
            }

            PushUpState.BOTTOM_REACHED -> {
                if (now - bottomReachedTime >= BOTTOM_HOLD_DURATION_MS &&
                    depthScale < ASCEND_SCALE_THRESHOLD
                ) {
                    currentState = PushUpState.ASCENDING
                }
            }

            PushUpState.ASCENDING -> {
                if (depthScale <= LOCKOUT_SCALE_THRESHOLD) {
                    completedReps++
                    repJustCounted = true
                    currentState = PushUpState.READY_AT_TOP
                    topStabilityFrames = 0
                }
            }
        }

        return repJustCounted
    }

    private fun buildBlockedResult(
        state: PushUpState,
        isEyesDetected: Boolean,
        isFormValid: Boolean,
        isDeviceStationary: Boolean
    ): PoseAnalysisResult {
        return PoseAnalysisResult(
            state = state,
            completedReps = completedReps,
            depthScale = 1.0,
            depthPercentage = 0,
            isEyesDetected = isEyesDetected,
            isFormValid = isFormValid,
            isDeviceStationary = isDeviceStationary,
            repJustCounted = false
        )
    }

    private fun distance(p1: PointF, p2: PointF): Double {
        val dx = (p1.x - p2.x).toDouble()
        val dy = (p1.y - p2.y).toDouble()
        return Math.sqrt(dx * dx + dy * dy)
    }
}
