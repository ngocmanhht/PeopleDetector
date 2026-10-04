package com.peopledetector

import android.app.Activity
import android.app.ActivityManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class KioskModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "KioskModule"
        @Volatile
        var isKioskRunning: Boolean = false
    }

    override fun getName(): String = "KioskModule"

    private fun getDpm(): DevicePolicyManager? {
        return reactApplicationContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
    }

    private fun getAdminComponent(): ComponentName {
        return ComponentName(reactApplicationContext, AdminReceiver::class.java)
    }

    private fun checkIsDeviceOwner(): Boolean {
        val dpm = getDpm() ?: return false
        return dpm.isDeviceOwnerApp(reactApplicationContext.packageName)
    }

    private fun checkIsLockTaskActive(): Boolean {
        val am = reactApplicationContext.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
            ?: return false
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            am.lockTaskModeState != ActivityManager.LOCK_TASK_MODE_NONE
        } else {
            @Suppress("DEPRECATION")
            am.isInLockTaskMode
        }
    }

    private fun getLockTaskState(): Int {
        val am = reactApplicationContext.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
            ?: return ActivityManager.LOCK_TASK_MODE_NONE
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            am.lockTaskModeState
        } else {
            @Suppress("DEPRECATION")
            if (am.isInLockTaskMode) ActivityManager.LOCK_TASK_MODE_PINNED else ActivityManager.LOCK_TASK_MODE_NONE
        }
    }

    @ReactMethod
    fun isDeviceOwner(promise: Promise) {
        try {
            promise.resolve(checkIsDeviceOwner())
        } catch (e: Exception) {
            Log.e(TAG, "isDeviceOwner failed", e)
            promise.reject("DEVICE_OWNER_CHECK_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun isKioskModeActive(promise: Promise) {
        try {
            promise.resolve(checkIsLockTaskActive())
        } catch (e: Exception) {
            Log.e(TAG, "isKioskModeActive failed", e)
            promise.reject("CHECK_ACTIVE_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun isInLockTaskMode(promise: Promise) {
        isKioskModeActive(promise)
    }

    @ReactMethod
    fun getKioskStatus(promise: Promise) {
        try {
            val map = Arguments.createMap().apply {
                putBoolean("isDeviceOwner", checkIsDeviceOwner())
                putBoolean("isKioskModeActive", checkIsLockTaskActive())
                putInt("lockTaskModeState", getLockTaskState())
                putString("packageName", reactApplicationContext.packageName)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            Log.e(TAG, "getKioskStatus failed", e)
            promise.reject("GET_STATUS_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun setLockTaskPackages(packagesArray: com.facebook.react.bridge.ReadableArray?, promise: Promise) {
        try {
            val dpm = getDpm()
            val adminComponent = getAdminComponent()
            val isOwner = dpm?.isDeviceOwnerApp(reactApplicationContext.packageName) == true

            if (!isOwner) {
                promise.reject("NOT_DEVICE_OWNER", "App is not a device owner")
                return
            }

            val packages = if (packagesArray != null && packagesArray.size() > 0) {
                val list = mutableListOf<String>()
                for (i in 0 until packagesArray.size()) {
                    packagesArray.getString(i)?.let { list.add(it) }
                }
                list.toTypedArray()
            } else {
                arrayOf(reactApplicationContext.packageName)
            }

            dpm.setLockTaskPackages(adminComponent, packages)
            Log.i(TAG, "Configured setLockTaskPackages for ${packages.joinToString()}")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to setLockTaskPackages", e)
            promise.reject("SET_LOCK_TASK_PACKAGES_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun startKioskMode(promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Current activity is null")
            return
        }

        try {
            val dpm = getDpm()
            val adminComponent = getAdminComponent()
            val isOwner = dpm?.isDeviceOwnerApp(reactApplicationContext.packageName) == true

            if (isOwner) {
                try {
                    // Set lock task packages whitelist for true Device Owner kiosk mode
                    val packages = arrayOf(reactApplicationContext.packageName)
                    dpm.setLockTaskPackages(adminComponent, packages)
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                        dpm.setLockTaskFeatures(adminComponent, android.app.admin.DevicePolicyManager.LOCK_TASK_FEATURE_NONE)
                    }
                    // Khóa hoàn toàn StatusBar (ngăn vuốt từ mép trên xuống để mở thanh thông báo / Quick Settings)
                    dpm.setStatusBarDisabled(adminComponent, true)
                    // Tắt màn hình khóa Keyguard
                    dpm.setKeyguardDisabled(adminComponent, true)
                    Log.i(TAG, "Configured setStatusBarDisabled(true), setKeyguardDisabled(true), and LOCK_TASK_FEATURE_NONE for ${reactApplicationContext.packageName}")
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to configure DeviceOwner policies", e)
                }
            }

            isKioskRunning = true

            activity.runOnUiThread {
                try {
                    activity.startLockTask()
                    (activity as? MainActivity)?.enableKioskImmersiveMode(true)
                    Log.i(TAG, "activity.startLockTask() invoked successfully")
                    promise.resolve(true)
                } catch (e: Exception) {
                    isKioskRunning = false
                    Log.e(TAG, "activity.startLockTask() failed", e)
                    promise.reject("START_LOCK_TASK_FAILED", e.message, e)
                }
            }
        } catch (e: Exception) {
            isKioskRunning = false
            Log.e(TAG, "startKioskMode exception", e)
            promise.reject("START_KIOSK_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopKioskMode(promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Current activity is null")
            return
        }

        try {
            isKioskRunning = false
            val dpm = getDpm()
            val adminComponent = getAdminComponent()
            val isOwner = dpm?.isDeviceOwnerApp(reactApplicationContext.packageName) == true

            if (isOwner) {
                try {
                    // Khôi phục StatusBar và Keyguard
                    dpm.setStatusBarDisabled(adminComponent, false)
                    dpm.setKeyguardDisabled(adminComponent, false)
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                        dpm.setLockTaskFeatures(adminComponent, android.app.admin.DevicePolicyManager.LOCK_TASK_FEATURE_SYSTEM_INFO or android.app.admin.DevicePolicyManager.LOCK_TASK_FEATURE_HOME)
                    }
                    Log.i(TAG, "Restored setStatusBarDisabled(false) and keyguard")
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to restore DeviceOwner policies", e)
                }
            }

            activity.runOnUiThread {
                try {
                    (activity as? MainActivity)?.enableKioskImmersiveMode(false)
                    activity.stopLockTask()
                    Log.i(TAG, "activity.stopLockTask() invoked successfully")
                    promise.resolve(true)
                } catch (e: IllegalStateException) {
                    // Thrown if activity is not currently in lock task mode
                    Log.w(TAG, "activity.stopLockTask() called when not in lock task mode: ${e.message}")
                    promise.resolve(false)
                } catch (e: Exception) {
                    Log.e(TAG, "activity.stopLockTask() failed", e)
                    promise.reject("STOP_LOCK_TASK_FAILED", e.message, e)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "stopKioskMode exception", e)
            promise.reject("STOP_KIOSK_ERROR", e.message, e)
        }
    }
}
