package com.applockproject.services

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.content.SharedPreferences
import android.view.accessibility.AccessibilityEvent
import android.util.Log

class AppLockAccessibilityService : AccessibilityService() {
    
    companion object {
        private const val TAG = "AppLockAccessibility"
        private const val PREFS_NAME = "applock_prefs"
        private const val LOCKED_APPS_KEY = "locked_apps"
        private const val SESSIONS_KEY = "app_sessions"
        
        @Volatile
        var isRunning = false
            private set
            
        var instance: AppLockAccessibilityService? = null
            private set
    }
    
    private lateinit var prefs: SharedPreferences
    private var lastPackage: String = ""
    private var lastEventTime: Long = 0
    
    override fun onCreate() {
        super.onCreate()
        prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        instance = this
        Log.d(TAG, "AccessibilityService created")
    }
    
    override fun onServiceConnected() {
        super.onServiceConnected()
        isRunning = true
        
        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
            notificationTimeout = 50
        }
        serviceInfo = info
        
        Log.d(TAG, "AccessibilityService connected")
    }
    
    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        
        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                val packageName = event.packageName?.toString() ?: return
                
                // Debounce rapid events
                val now = System.currentTimeMillis()
                if (packageName == lastPackage && now - lastEventTime < 300) {
                    return
                }
                
                lastPackage = packageName
                lastEventTime = now
                
                // Skip system packages and our own app
                if (shouldIgnorePackage(packageName)) {
                    return
                }
                
                // Check if this app is locked
                if (isAppLocked(packageName) && !isSessionValid(packageName)) {
                    Log.d(TAG, "Locked app detected: $packageName")
                    showLockScreen(packageName)
                }
            }
        }
    }
    
    override fun onInterrupt() {
        Log.d(TAG, "AccessibilityService interrupted")
    }
    
    override fun onDestroy() {
        isRunning = false
        instance = null
        super.onDestroy()
        Log.d(TAG, "AccessibilityService destroyed")
    }
    
    private fun shouldIgnorePackage(packageName: String): Boolean {
        val ignoredPrefixes = listOf(
            "com.android.",
            "com.google.android.",
            "com.samsung.",
            "com.sec.",
            "com.applockproject"
        )
        
        val ignoredPackages = setOf(
            "android",
            packageName, // Self
            "com.android.systemui",
            "com.android.launcher",
            "com.android.launcher3",
            "com.google.android.apps.nexuslauncher"
        )
        
        if (ignoredPackages.contains(packageName)) return true
        
        for (prefix in ignoredPrefixes) {
            if (packageName.startsWith(prefix) && 
                !packageName.contains("youtube") &&
                !packageName.contains("photos") &&
                !packageName.contains("gmail")) {
                return true
            }
        }
        
        return false
    }
    
    private fun isAppLocked(packageName: String): Boolean {
        val lockedAppsJson = prefs.getString(LOCKED_APPS_KEY, "[]") ?: "[]"
        return lockedAppsJson.contains("\"$packageName\"")
    }
    
    private fun isSessionValid(packageName: String): Boolean {
        val sessionsJson = prefs.getString(SESSIONS_KEY, "[]") ?: "[]"
        if (!sessionsJson.contains(packageName)) return false
        
        // Simple check - in production, parse JSON properly
        try {
            val now = System.currentTimeMillis()
            // Check if we have a valid session within last 30 seconds
            val sessionMarker = "\"packageName\":\"$packageName\""
            if (sessionsJson.contains(sessionMarker)) {
                // For simplicity, assume session is valid for 30 seconds
                // In full implementation, parse expiresAt from JSON
                return false // Force re-authentication for now
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking session", e)
        }
        
        return false
    }
    
    private fun showLockScreen(packageName: String) {
        try {
            val intent = Intent(this, com.applockproject.LockScreenActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                addFlags(Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS)
                putExtra("locked_package", packageName)
            }
            startActivity(intent)
            Log.d(TAG, "Lock screen launched for $packageName")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to show lock screen", e)
        }
    }
    
    // Public methods for native module
    fun refreshLockedApps() {
        // Force refresh from prefs
        Log.d(TAG, "Refreshing locked apps list")
    }
    
    fun unlockApp(packageName: String, durationMs: Long) {
        val sessions = prefs.getString(SESSIONS_KEY, "[]") ?: "[]"
        val now = System.currentTimeMillis()
        val newSession = """{"packageName":"$packageName","unlockedAt":$now,"expiresAt":${now + durationMs}}"""
        
        // Simple append - in production, properly parse and update JSON
        val updatedSessions = if (sessions == "[]") {
            "[$newSession]"
        } else {
            sessions.dropLast(1) + ",$newSession]"
        }
        
        prefs.edit().putString(SESSIONS_KEY, updatedSessions).apply()
        Log.d(TAG, "App unlocked: $packageName for ${durationMs}ms")
    }
}
