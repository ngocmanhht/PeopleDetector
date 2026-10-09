package com.peopledetector

import android.app.AlarmManager
import android.app.Application
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.util.Log
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          add(FileCleanerPackage())
          add(KioskPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    setupCrashAutoRecovery()
    loadReactNative(this)
  }

  private fun setupCrashAutoRecovery() {
    val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
    Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
      Log.e("CrashWatchdog", "FATAL CRASH in thread ${thread.name}: ${throwable.message}", throwable)
      try {
        if (KioskModule.isKioskPersisted(applicationContext)) {
          val restartIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            addFlags(
              Intent.FLAG_ACTIVITY_NEW_TASK or
              Intent.FLAG_ACTIVITY_CLEAR_TOP or
              Intent.FLAG_ACTIVITY_CLEAR_TASK
            )
          }
          if (restartIntent != null) {
            val pendingIntent = PendingIntent.getActivity(
              applicationContext,
              9999,
              restartIntent,
              PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
            )
            val alarmManager = getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            alarmManager?.set(
              AlarmManager.RTC,
              System.currentTimeMillis() + 1000,
              pendingIntent
            )
            Log.i("CrashWatchdog", "Scheduled automatic restart of MainActivity in 1000ms")
          }
        }
      } catch (e: Exception) {
        Log.e("CrashWatchdog", "Failed to schedule crash recovery", e)
      }
      defaultHandler?.uncaughtException(thread, throwable)
    }
  }
}
