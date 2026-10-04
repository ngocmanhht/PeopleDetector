package com.peopledetector

import android.net.Uri
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class FileCleanerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "FileCleaner"

    @ReactMethod
    fun deleteFile(filePath: String, promise: Promise) {
        try {
            val cleanPath = when {
                filePath.startsWith("file://") -> Uri.parse(filePath).path ?: filePath.removePrefix("file://")
                else -> filePath
            }
            val file = File(cleanPath)
            if (file.exists()) {
                val deleted = file.delete()
                promise.resolve(deleted)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }
}
