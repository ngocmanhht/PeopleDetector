package com.peopledetector

import android.app.ActivityManager
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.MotionEvent
import android.view.WindowManager
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  private var isKioskImmersive: Boolean = false

  override fun getMainComponentName(): String = "PeopleDetector"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    dismissKeyguardAndKeepScreenOn()
    applyImmersiveMode()
  }

  override fun onResume() {
    super.onResume()
    dismissKeyguardAndKeepScreenOn()
    val isKiosk = isKioskImmersive || KioskModule.isKioskPersisted(this) || KioskModule.isKioskRunning
    if (isKiosk) {
      applyImmersiveMode()
      ensureLockTaskActive()
    }
  }

  private fun dismissKeyguardAndKeepScreenOn() {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
        setShowWhenLocked(true)
        setTurnScreenOn(true)
      }
      @Suppress("DEPRECATION")
      window.addFlags(
          WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
          WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
          WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
      )

      val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        keyguardManager?.requestDismissKeyguard(this, null)
      }
    } catch (e: Exception) {
      Log.w("MainActivity", "Failed to dismissKeyguard: ${e.message}")
    }
  }

  private fun ensureLockTaskActive() {
    try {
      val am = getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager ?: return
      val isLockTaskRunning = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        am.lockTaskModeState != ActivityManager.LOCK_TASK_MODE_NONE
      } else {
        @Suppress("DEPRECATION")
        am.isInLockTaskMode
      }

      if (!isLockTaskRunning) {
        Log.i("MainActivity", "Re-asserting startLockTask() onResume")
        startLockTask()
      }
    } catch (e: Exception) {
      Log.w("MainActivity", "ensureLockTaskActive failed: ${e.message}")
    }
  }

  fun enableKioskImmersiveMode(enabled: Boolean) {
    isKioskImmersive = enabled
    runOnUiThread {
      if (enabled) {
        dismissKeyguardAndKeepScreenOn()
        applyImmersiveMode()
      } else {
        restoreSystemBars()
      }
    }
  }

  private fun applyImmersiveMode() {
    try {
      WindowCompat.setDecorFitsSystemWindows(window, false)
      val controller = WindowInsetsControllerCompat(window, window.decorView)
      controller.hide(WindowInsetsCompat.Type.systemBars())
      controller.systemBarsBehavior =
          WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE

      window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    } catch (_: Exception) {}
  }

  private fun restoreSystemBars() {
    try {
      WindowCompat.setDecorFitsSystemWindows(window, true)
      val controller = WindowInsetsControllerCompat(window, window.decorView)
      controller.show(WindowInsetsCompat.Type.systemBars())
    } catch (_: Exception) {}
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    val isKiosk = isKioskImmersive || KioskModule.isKioskPersisted(this) || KioskModule.isKioskRunning
    if (isKiosk) {
      if (hasFocus) {
        dismissKeyguardAndKeepScreenOn()
        applyImmersiveMode()
        ensureLockTaskActive()
      } else {
        collapseStatusBar()
      }
    }
  }

  private fun collapseStatusBar() {
    try {
      @Suppress("DEPRECATION")
      val closeDialog = Intent(Intent.ACTION_CLOSE_SYSTEM_DIALOGS)
      sendBroadcast(closeDialog)
    } catch (_: Exception) {}
  }

  override fun dispatchTouchEvent(ev: MotionEvent?): Boolean {
    val isKiosk = isKioskImmersive || KioskModule.isKioskPersisted(this) || KioskModule.isKioskRunning
    if (ev != null && isKiosk) {
      val height = resources.displayMetrics.heightPixels
      val edgeThreshold = 100

      if (ev.y <= edgeThreshold || ev.y >= (height - edgeThreshold)) {
        if (ev.action == MotionEvent.ACTION_MOVE || ev.action == MotionEvent.ACTION_DOWN) {
          applyImmersiveMode()
          collapseStatusBar()
        }
      }
    }
    return super.dispatchTouchEvent(ev)
  }
}
