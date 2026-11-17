package com.alarmapp

import android.annotation.SuppressLint
import android.content.Context
import android.content.ContextWrapper
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.util.Log
import android.widget.FrameLayout
import androidx.camera.core.*
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.events.RCTEventEmitter
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.pose.PoseDetection
import com.google.mlkit.vision.pose.PoseDetector
import com.google.mlkit.vision.pose.defaults.PoseDetectorOptions
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

@SuppressLint("ViewConstructor")
class PoseCameraView(context: Context) : FrameLayout(context) {

    private val previewView = PreviewView(context)
    private var cameraProvider: ProcessCameraProvider? = null
    private var camera: Camera? = null
    private var imageAnalysis: ImageAnalysis? = null
    private val cameraExecutor: ExecutorService = Executors.newSingleThreadExecutor()

    private val poseDetector: PoseDetector
    private val poseEngine = PoseDetectionEngine()

    // Motion Sensor to detect if phone is being held or moved by hand
    private val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
    private val accelerometer = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
    private var isDeviceStationary = true
    private var lastAccX = 0f
    private var lastAccY = 0f
    private var lastAccZ = 0f
    private var lastMovementTime = 0L

    private val sensorListener = object : SensorEventListener {
        override fun onSensorChanged(event: SensorEvent?) {
            if (event == null || event.sensor.type != Sensor.TYPE_ACCELEROMETER) return
            val x = event.values[0]
            val y = event.values[1]
            val z = event.values[2]

            val deltaX = Math.abs(x - lastAccX)
            val deltaY = Math.abs(y - lastAccY)
            val deltaZ = Math.abs(z - lastAccZ)

            lastAccX = x
            lastAccY = y
            lastAccZ = z

            val jitter = deltaX + deltaY + deltaZ
            val now = System.currentTimeMillis()

            // Phone is being moved/handled in hand (jitter > 1.2 m/s²)
            if (jitter > 1.2f) {
                lastMovementTime = now
                isDeviceStationary = false
            } else if (now - lastMovementTime > 600) {
                // Device resting still on floor/surface for > 600ms
                isDeviceStationary = true
            }
        }

        override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
    }

    private var lensFacing = CameraSelector.LENS_FACING_FRONT
    private var isTorchOn = false
    private var isProcessing = false
    private var isCameraStarted = false

    companion object {
        private const val TAG = "PoseCameraView"
    }

    private val mLayoutRunnable = Runnable {
        measure(
            MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
        )
        layout(left, top, right, bottom)
    }

    override fun requestLayout() {
        super.requestLayout()
        post(mLayoutRunnable)
    }

    init {
        previewView.scaleType = PreviewView.ScaleType.FILL_CENTER
        addView(previewView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))

        val options = PoseDetectorOptions.Builder()
            .setDetectorMode(PoseDetectorOptions.STREAM_MODE)
            .build()
        poseDetector = PoseDetection.getClient(options)

        previewView.addOnLayoutChangeListener { _, l, t, r, b, _, _, _, _ ->
            val w = r - l
            val h = b - t
            Log.d(TAG, "previewView layout change: ${w}x${h}")
            if (w > 0 && h > 0 && !isCameraStarted) {
                isCameraStarted = true
                startCamera()
            }
        }
    }

    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        super.onLayout(changed, left, top, right, bottom)
        val w = right - left
        val h = bottom - top
        previewView.measure(
            MeasureSpec.makeMeasureSpec(w, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(h, MeasureSpec.EXACTLY)
        )
        previewView.layout(0, 0, w, h)
    }

    fun setCameraFacing(facing: String) {
        val newFacing = if (facing.equals("back", ignoreCase = true)) {
            CameraSelector.LENS_FACING_BACK
        } else {
            CameraSelector.LENS_FACING_FRONT
        }
        if (newFacing != lensFacing) {
            lensFacing = newFacing
            if (isCameraStarted) {
                startCamera()
            }
        }
    }

    fun setTorch(enabled: Boolean) {
        isTorchOn = enabled
        camera?.cameraControl?.enableTorch(isTorchOn)
    }

    fun setTargetReps(target: Int) {
        poseEngine.reset(target)
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        Log.d(TAG, "onAttachedToWindow")
        // Start motion sensor monitoring
        accelerometer?.let {
            sensorManager?.registerListener(sensorListener, it, SensorManager.SENSOR_DELAY_UI)
        }
        post {
            if (previewView.width > 0 && previewView.height > 0 && !isCameraStarted) {
                isCameraStarted = true
                startCamera()
            }
        }
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        Log.d(TAG, "onDetachedFromWindow")
        sensorManager?.unregisterListener(sensorListener)
        isCameraStarted = false
        stopCamera()
    }

    private fun getLifecycleOwner(): LifecycleOwner? {
        var ctx: Context? = context
        while (ctx != null) {
            if (ctx is LifecycleOwner) {
                return ctx
            }
            if (ctx is ThemedReactContext) {
                val act = ctx.currentActivity
                if (act is LifecycleOwner) return act
            }
            if (ctx is ReactContext) {
                val act = ctx.currentActivity
                if (act is LifecycleOwner) return act
            }
            if (ctx is ContextWrapper) {
                ctx = ctx.baseContext
            } else {
                break
            }
        }
        return null
    }

    private fun startCamera() {
        if (ContextCompat.checkSelfPermission(context, android.Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED
        ) {
            Log.w(TAG, "Camera permission not granted yet")
            return
        }

        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        cameraProviderFuture.addListener({
            try {
                cameraProvider = cameraProviderFuture.get()
                bindCameraUseCases()
            } catch (e: Exception) {
                Log.e(TAG, "Failed to get CameraProvider", e)
            }
        }, ContextCompat.getMainExecutor(context))
    }

    private fun bindCameraUseCases() {
        val provider = cameraProvider ?: run {
            Log.w(TAG, "bindCameraUseCases: cameraProvider is null")
            return
        }
        val lifecycleOwner = getLifecycleOwner() ?: run {
            Log.e(TAG, "bindCameraUseCases: LifecycleOwner is null for context: $context")
            return
        }

        provider.unbindAll()

        val preview = Preview.Builder().build().also {
            it.setSurfaceProvider(previewView.surfaceProvider)
        }

        imageAnalysis = ImageAnalysis.Builder()
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
            .build()
            .also {
                it.setAnalyzer(cameraExecutor, ImageAnalysis.Analyzer { imageProxy ->
                    processImageProxy(imageProxy)
                })
            }

        val cameraSelector = if (lensFacing == CameraSelector.LENS_FACING_BACK) {
            if (provider.hasCamera(CameraSelector.DEFAULT_BACK_CAMERA)) {
                CameraSelector.DEFAULT_BACK_CAMERA
            } else {
                CameraSelector.DEFAULT_FRONT_CAMERA
            }
        } else {
            if (provider.hasCamera(CameraSelector.DEFAULT_FRONT_CAMERA)) {
                CameraSelector.DEFAULT_FRONT_CAMERA
            } else {
                CameraSelector.DEFAULT_BACK_CAMERA
            }
        }

        try {
            camera = provider.bindToLifecycle(
                lifecycleOwner,
                cameraSelector,
                preview,
                imageAnalysis
            )
            camera?.cameraControl?.enableTorch(isTorchOn)
            Log.d(TAG, "Camera successfully bound to lifecycle! lensFacing: $lensFacing")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to bind camera use cases", e)
        }
    }

    @ExperimentalGetImage
    private fun processImageProxy(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage == null || isProcessing) {
            imageProxy.close()
            return
        }

        isProcessing = true
        val rotationDegrees = imageProxy.imageInfo.rotationDegrees
        val image = InputImage.fromMediaImage(mediaImage, rotationDegrees)

        // Pass real-time accelerometer phone stability to pose engine
        poseEngine.setDeviceStationary(isDeviceStationary)

        poseDetector.process(image)
            .addOnSuccessListener { pose ->
                val result = poseEngine.analyzePose(pose)
                emitPoseEvent(result)
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "Pose detection failed", e)
            }
            .addOnCompleteListener {
                isProcessing = false
                imageProxy.close()
            }
    }

    private fun emitPoseEvent(result: PoseAnalysisResult) {
        val reactContext = (context as? ThemedReactContext) ?: (context as? ReactContext) ?: return
        val event = Arguments.createMap().apply {
            putInt("reps", result.completedReps)
            putString("state", result.state.name)
            putDouble("depthScale", result.depthScale)
            putInt("depthPercentage", result.depthPercentage)
            putBoolean("isEyesDetected", result.isEyesDetected)
            putBoolean("isFormValid", result.isFormValid)
            putBoolean("isDeviceStationary", result.isDeviceStationary)
            putBoolean("repJustCounted", result.repJustCounted)
        }

        try {
            reactContext.getJSModule(RCTEventEmitter::class.java).receiveEvent(
                id,
                "topPoseAnalysis",
                event
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error emitting pose event to React Native", e)
        }
    }

    private fun stopCamera() {
        try {
            sensorManager?.unregisterListener(sensorListener)
            cameraProvider?.unbindAll()
            cameraExecutor.shutdown()
            poseDetector.close()
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping camera", e)
        }
    }
}
