package com.alarmapp

import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp

class PoseCameraViewManager : ViewGroupManager<PoseCameraView>() {

    override fun getName(): String = "PoseCameraView"

    override fun createViewInstance(reactContext: ThemedReactContext): PoseCameraView {
        return PoseCameraView(reactContext)
    }

    override fun needsCustomLayoutForChildren(): Boolean {
        return true
    }

    @ReactProp(name = "cameraFacing")
    fun setCameraFacing(view: PoseCameraView, facing: String?) {
        view.setCameraFacing(facing ?: "front")
    }

    @ReactProp(name = "torch")
    fun setTorch(view: PoseCameraView, enabled: Boolean) {
        view.setTorch(enabled)
    }

    @ReactProp(name = "targetReps")
    fun setTargetReps(view: PoseCameraView, target: Int) {
        view.setTargetReps(target)
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> {
        return mapOf(
            "topPoseAnalysis" to mapOf("registrationName" to "onPoseAnalysis")
        )
    }
}
