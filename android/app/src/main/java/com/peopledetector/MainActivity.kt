package com.peopledetector

import android.content.Intent
import android.os.Bundle
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
    applyImmersiveMode()
  }

  fun enableKioskImmersiveMode(enabled: Boolean) {
    isKioskImmersive = enabled
    runOnUiThread {
      if (enabled) {
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
    if (isKioskImmersive || KioskModule.isKioskRunning) {
      if (hasFocus) {
        applyImmersiveMode()
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
    if (ev != null && (isKioskImmersive || KioskModule.isKioskRunning)) {
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
