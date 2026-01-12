package com.applockproject.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.applockproject.services.AppLockForegroundService

class BootReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "BootReceiver"
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_LOCKED_BOOT_COMPLETED,
            "android.intent.action.QUICKBOOT_POWERON" -> {
                Log.d(TAG, "Boot completed, starting App Lock service")
                startAppLockService(context)
            }
        }
    }
    
    private fun startAppLockService(context: Context) {
        try {
            // Start the foreground service
            AppLockForegroundService.start(context)
            Log.d(TAG, "App Lock service started after boot")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start App Lock service", e)
        }
    }
}
