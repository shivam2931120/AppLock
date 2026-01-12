package com.applockproject.modules

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
import android.text.TextUtils
import android.util.Base64
import android.util.Log
import com.applockproject.services.AppLockAccessibilityService
import com.applockproject.services.AppLockForegroundService
import com.facebook.react.bridge.*
import java.io.ByteArrayOutputStream

class AppLockerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    companion object {
        private const val TAG = "AppLockerModule"
        private const val PREFS_NAME = "applock_prefs"
        private const val LOCKED_APPS_KEY = "locked_apps"
        private const val SESSIONS_KEY = "app_sessions"
    }
    
    private val prefs: SharedPreferences by lazy {
        reactApplicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }
    
    override fun getName(): String = "AppLockerModule"
    
    // ==================== INSTALLED APPS ====================
    
    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val packageManager = reactApplicationContext.packageManager
            val apps = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                packageManager.getInstalledApplications(PackageManager.ApplicationInfoFlags.of(0))
            } else {
                @Suppress("DEPRECATION")
                packageManager.getInstalledApplications(PackageManager.GET_META_DATA)
            }
            
            val result = WritableNativeArray()
            
            for (app in apps) {
                // Skip system apps without launcher intent
                if (!isLaunchableApp(packageManager, app)) continue
                
                val appInfo = WritableNativeMap().apply {
                    putString("packageName", app.packageName)
                    putString("label", packageManager.getApplicationLabel(app).toString())
                    putString("icon", getAppIconBase64(packageManager, app))
                    putBoolean("isSystemApp", (app.flags and ApplicationInfo.FLAG_SYSTEM) != 0)
                }
                result.pushMap(appInfo)
            }
            
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get installed apps", e)
            promise.reject("GET_APPS_ERROR", e.message)
        }
    }
    
    private fun isLaunchableApp(pm: PackageManager, app: ApplicationInfo): Boolean {
        val launchIntent = pm.getLaunchIntentForPackage(app.packageName)
        return launchIntent != null
    }
    
    private fun getAppIconBase64(pm: PackageManager, app: ApplicationInfo): String {
        return try {
            val drawable = pm.getApplicationIcon(app)
            val bitmap = drawableToBitmap(drawable)
            val stream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 80, stream)
            Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
        } catch (e: Exception) {
            ""
        }
    }
    
    private fun drawableToBitmap(drawable: Drawable): Bitmap {
        if (drawable is BitmapDrawable) {
            return drawable.bitmap
        }
        
        val bitmap = Bitmap.createBitmap(
            drawable.intrinsicWidth.coerceAtLeast(1),
            drawable.intrinsicHeight.coerceAtLeast(1),
            Bitmap.Config.ARGB_8888
        )
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, canvas.width, canvas.height)
        drawable.draw(canvas)
        return bitmap
    }
    
    // ==================== PERMISSIONS ====================
    
    @ReactMethod
    fun checkOverlayPermission(promise: Promise) {
        promise.resolve(Settings.canDrawOverlays(reactApplicationContext))
    }
    
    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        try {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${reactApplicationContext.packageName}")
            ).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun checkAccessibilityPermission(promise: Promise) {
        promise.resolve(isAccessibilityServiceEnabled())
    }
    
    @ReactMethod
    fun openAccessibilitySettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SETTINGS_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun checkUsageStatsPermission(promise: Promise) {
        val appOps = reactApplicationContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                reactApplicationContext.packageName
            )
        } else {
            @Suppress("DEPRECATION")
            appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                reactApplicationContext.packageName
            )
        }
        promise.resolve(mode == AppOpsManager.MODE_ALLOWED)
    }
    
    @ReactMethod
    fun requestUsageStatsPermission(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message)
        }
    }
    
    private fun isAccessibilityServiceEnabled(): Boolean {
        val service = "${reactApplicationContext.packageName}/${AppLockAccessibilityService::class.java.canonicalName}"
        val enabledServices = Settings.Secure.getString(
            reactApplicationContext.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false
        
        return TextUtils.SimpleStringSplitter(':').apply {
            setString(enabledServices)
        }.any { it.equals(service, ignoreCase = true) }
    }
    
    // ==================== LOCKED APPS ====================
    
    @ReactMethod
    fun setLockedApps(apps: ReadableArray, promise: Promise) {
        try {
            val appsList = mutableListOf<String>()
            for (i in 0 until apps.size()) {
                apps.getString(i)?.let { appsList.add(it) }
            }
            
            val json = appsList.joinToString(",", "[", "]") { "\"$it\"" }
            prefs.edit().putString(LOCKED_APPS_KEY, json).apply()
            
            // Notify service to refresh
            AppLockAccessibilityService.instance?.refreshLockedApps()
            
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SET_APPS_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun getLockedApps(promise: Promise) {
        try {
            val json = prefs.getString(LOCKED_APPS_KEY, "[]") ?: "[]"
            // Simple JSON array parsing
            val apps = json.removeSurrounding("[", "]")
                .split(",")
                .map { it.trim().removeSurrounding("\"") }
                .filter { it.isNotEmpty() }
            
            val result = WritableNativeArray()
            apps.forEach { result.pushString(it) }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("GET_APPS_ERROR", e.message)
        }
    }
    
    // ==================== SESSION MANAGEMENT ====================
    
    @ReactMethod
    fun unlockApp(packageName: String, durationMs: Double, promise: Promise) {
        try {
            AppLockAccessibilityService.instance?.unlockApp(packageName, durationMs.toLong())
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("UNLOCK_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun clearAllSessions(promise: Promise) {
        try {
            prefs.edit().putString(SESSIONS_KEY, "[]").apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLEAR_ERROR", e.message)
        }
    }
    
    // ==================== SERVICE CONTROL ====================
    
    @ReactMethod
    fun startProtection(promise: Promise) {
        try {
            AppLockForegroundService.start(reactApplicationContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SERVICE_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun stopProtection(promise: Promise) {
        try {
            AppLockForegroundService.stop(reactApplicationContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SERVICE_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun isProtectionActive(promise: Promise) {
        promise.resolve(AppLockAccessibilityService.isRunning && AppLockForegroundService.isRunning)
    }
    
    // ==================== LOCK SCREEN CONTROL ====================
    
    @ReactMethod
    fun closeLockScreen(promise: Promise) {
        try {
            currentActivity?.finish()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLOSE_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun goToHome(promise: Promise) {
        try {
            val homeIntent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_HOME)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactApplicationContext.startActivity(homeIntent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("HOME_ERROR", e.message)
        }
    }
}
