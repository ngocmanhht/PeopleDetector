const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// 1. Patch react-native-fast-tflite HybridAssetLoader.kt
const tfliteLoaderPath = path.join(
  rootDir,
  'node_modules/react-native-fast-tflite/android/src/main/java/com/margelo/nitro/tflite/HybridAssetLoader.kt'
);

if (fs.existsSync(tfliteLoaderPath)) {
  const content = `package com.margelo.nitro.tflite

import android.net.Uri
import android.os.Build
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.core.Promise
import java.io.File
import java.io.InputStream
import java.net.URL

@Keep
@DoNotStrip
class HybridAssetLoader : HybridAssetLoaderSpec() {
  override fun loadAsset(path: String): Promise<ArrayBuffer> {
    return Promise.async {
      val context = NitroModules.applicationContext
      var stream: InputStream? = null

      try {
        var resolvedPath = path

        // Try extracting simple asset filename first: e.g. yolov8n-face.tflite
        val cleanName = resolvedPath.substringBefore("?").substringAfterLast("/")
        if (cleanName.endsWith(".tflite") && context != null) {
          try {
            stream = context.assets.open(cleanName)
          } catch (_: Exception) {
            // Not directly in root assets, continue with other checks
          }
        }

        if (stream == null) {
          // 1. Android asset:/ protocol
          if (resolvedPath.startsWith("asset:/")) {
            val assetPath = resolvedPath.removePrefix("asset:/").removePrefix("/")
            stream = context?.assets?.open(assetPath)
          }
          // 2. file:// protocol
          else if (resolvedPath.startsWith("file://")) {
            val file = File(Uri.parse(resolvedPath).path ?: resolvedPath.removePrefix("file://"))
            stream = file.inputStream()
          }
          // 3. Absolute filesystem path (/data/user/0/...)
          else if (resolvedPath.startsWith("/")) {
            val file = File(resolvedPath)
            stream = file.inputStream()
          }
          // 4. HTTP / HTTPS URL
          else if (resolvedPath.startsWith("http://") || resolvedPath.startsWith("https://")) {
            // In Android emulator, localhost connects to emulator instead of host
            val isEmulator = Build.FINGERPRINT.contains("generic") ||
                             Build.MODEL.contains("google_sdk") ||
                             Build.HARDWARE.contains("goldfish") ||
                             Build.HARDWARE.contains("ranchu")
            if (isEmulator) {
              if (resolvedPath.startsWith("http://localhost:")) {
                resolvedPath = resolvedPath.replace("http://localhost:", "http://10.0.2.2:")
              } else if (resolvedPath.startsWith("http://127.0.0.1:")) {
                resolvedPath = resolvedPath.replace("http://127.0.0.1:", "http://10.0.2.2:")
              }
            }

            try {
              val conn = URL(resolvedPath).openConnection()
              conn.connectTimeout = 8000
              conn.readTimeout = 15000
              stream = conn.getInputStream()
            } catch (httpErr: Exception) {
              // Fallback to assets if HTTP failed (e.g. offline or Metro unreachable)
              if (context != null) {
                val candidateName = Uri.parse(path).lastPathSegment ?: cleanName
                try {
                  stream = context.assets.open(candidateName)
                } catch (_: Exception) {}
              }
              if (stream == null) throw httpErr
            }
          }
          // 5. Raw resource name or asset identifier fallback
          else if (context != null) {
            try {
              stream = context.assets.open(resolvedPath)
            } catch (_: Exception) {
              val baseName = cleanName.substringBeforeLast(".")
              val resId = context.resources.getIdentifier(baseName, "raw", context.packageName)
              if (resId != 0) {
                stream = context.resources.openRawResource(resId)
              }
            }
          }
        }

        if (stream == null) {
          // Final attempt: standard URL parser
          stream = URL(resolvedPath).openStream()
        }

        val bytes = stream.use { it.readBytes() }
        return@async ArrayBuffer.copy(bytes)
      } catch (e: Exception) {
        stream?.close()
        throw e
      }
    }
  }
}
`;
  fs.writeFileSync(tfliteLoaderPath, content, 'utf8');
  console.log('[Patch] Successfully patched react-native-fast-tflite HybridAssetLoader.kt');
}

// 2. Patch react-native-nitro-image HybridImageFactory.kt for EXIF rotation
const nitroImageFactoryPath = path.join(
  rootDir,
  'node_modules/react-native-nitro-image/android/src/main/java/com/margelo/nitro/image/HybridImageFactory.kt'
);

if (fs.existsSync(nitroImageFactoryPath)) {
  let code = fs.readFileSync(nitroImageFactoryPath, 'utf8');
  if (!code.includes('android.media.ExifInterface')) {
    code = code.replace(
      'import android.graphics.Canvas',
      'import android.graphics.Canvas\nimport android.graphics.Matrix\nimport java.io.ByteArrayInputStream'
    );
    code = code.replace(
      'val cleanPath = filePath.toFilePath()\n        val bitmap = BitmapFactory.decodeFile(cleanPath)',
      `val cleanPath = filePath.toFilePath()
        var bitmap = BitmapFactory.decodeFile(cleanPath)
        if (bitmap != null) {
            try {
                val exif = android.media.ExifInterface(cleanPath)
                val orientation = exif.getAttributeInt(android.media.ExifInterface.TAG_ORIENTATION, android.media.ExifInterface.ORIENTATION_NORMAL)
                val matrix = Matrix()
                when (orientation) {
                    android.media.ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
                    android.media.ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
                    android.media.ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
                    android.media.ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.preScale(-1f, 1f)
                    android.media.ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.preScale(1f, -1f)
                }
                if (!matrix.isIdentity) {
                    bitmap = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
                }
            } catch (_: Exception) {}
        }`
    );
    fs.writeFileSync(nitroImageFactoryPath, code, 'utf8');
    console.log('[Patch] Successfully patched react-native-nitro-image HybridImageFactory.kt');
  }
}

// 3. Patch react-native-nitro-image HybridImage.kt for safe crop bounds
const nitroImagePath = path.join(
  rootDir,
  'node_modules/react-native-nitro-image/android/src/main/java/com/margelo/nitro/image/HybridImage.kt'
);

if (fs.existsSync(nitroImagePath)) {
  let imageCode = fs.readFileSync(nitroImagePath, 'utf8');
  if (!imageCode.includes('safeStartX')) {
    imageCode = imageCode.replace(
      /val croppedBitmap = Bitmap\.createBitmap\(\s*bitmap,\s*startX\.toInt\(\),\s*startY\.toInt\(\),\s*width\.toInt\(\),\s*height\.toInt\(\)\s*\)/,
      `val safeStartX = startX.toInt().coerceIn(0, (bitmap.width - 1).coerceAtLeast(0))
        val safeStartY = startY.toInt().coerceIn(0, (bitmap.height - 1).coerceAtLeast(0))
        val rawWidth = width.toInt().coerceAtLeast(1)
        val rawHeight = height.toInt().coerceAtLeast(1)
        val safeWidth = rawWidth.coerceAtMost(bitmap.width - safeStartX)
        val safeHeight = rawHeight.coerceAtMost(bitmap.height - safeStartY)

        val croppedBitmap = Bitmap.createBitmap(
            bitmap,
            safeStartX,
            safeStartY,
            safeWidth,
            safeHeight
        )`
    );
    fs.writeFileSync(nitroImagePath, imageCode, 'utf8');
    console.log('[Patch] Successfully patched react-native-nitro-image HybridImage.kt');
  }
}

// 4. Pre-populate NitroModules exported headers for CMake/Prefab sync
const nitroBuildHeadersDir = path.join(
  rootDir,
  'node_modules/react-native-nitro-modules/android/build/headers/nitromodules/NitroModules'
);
fs.mkdirSync(nitroBuildHeadersDir, { recursive: true });

function copyHeadersRecursively(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyHeadersRecursively(srcPath, destPath);
    } else if (entry.name.endsWith('.hpp') || entry.name.endsWith('.h')) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
copyHeadersRecursively(
  path.join(rootDir, 'node_modules/react-native-nitro-modules/cpp'),
  nitroBuildHeadersDir
);
copyHeadersRecursively(
  path.join(rootDir, 'node_modules/react-native-nitro-modules/android/src/main/cpp'),
  nitroBuildHeadersDir
);
console.log('[Patch] Pre-populated NitroModules prefab headers for CMake');

// 5. Pre-extract LiteRT AAR libraries for react-native-fast-tflite CMake
const tfliteLibDir = path.join(
  rootDir,
  'node_modules/react-native-fast-tflite/android/src/main/cpp/lib/litert'
);
const sampleSo = path.join(tfliteLibDir, 'jni/x86/libtensorflowlite_jni.so');
if (!fs.existsSync(sampleSo)) {
  fs.mkdirSync(tfliteLibDir, { recursive: true });
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const gradleCache = path.join(
    homeDir,
    '.gradle/caches/modules-2/files-2.1/com.google.ai.edge.litert'
  );
  if (fs.existsSync(gradleCache)) {
    const { execSync } = require('child_process');
    try {
      const aars = execSync(`find "${gradleCache}" -name "*.aar"`, {
        encoding: 'utf8',
      })
        .trim()
        .split('\n');
      for (const aar of aars) {
        if (aar && fs.existsSync(aar)) {
          execSync(`unzip -o -q "${aar}" "jni/*" "headers/*" -d "${tfliteLibDir}"`);
        }
      }
      console.log('[Patch] Pre-extracted LiteRT AAR binaries and headers for CMake');
    } catch (e) {
      console.warn('[Patch] Note: could not pre-extract LiteRT AARs:', e.message);
    }
  }
}

