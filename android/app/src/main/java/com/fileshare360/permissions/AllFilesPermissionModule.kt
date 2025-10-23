package com.fileshare360.permissions

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import android.os.Environment
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AllFilesPermissionModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "AllFilesPermissionModule"

  @ReactMethod
  fun isExternalStorageManager(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        promise.resolve(Environment.isExternalStorageManager())
      } else {
        promise.resolve(true) // Always true on pre-API 30
      }
    } catch (e: Exception) {
      promise.reject("E_CHECK", "Failed to check external storage manager", e)
    }
  }

  @ReactMethod
  fun openManageAllFilesSettings(promise: Promise) {
    val ctx = reactApplicationContext
    try {
      // Try a sequence of intents - different OEMs may expose different
      // action names for the All-files settings page. Log attempts so we
      // can inspect failures in adb logcat.
      val pkgUri = Uri.parse("package:" + ctx.packageName)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        try {
          val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, pkgUri)
          intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          ctx.startActivity(intent)
          Log.i("AllFilesPermission", "Started ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION")
          promise.resolve(true)
          return
        } catch (e: Exception) {
          Log.w("AllFilesPermission", "ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION failed", e)
          // continue
        }

        try {
          // Some devices may respond to the non-APP variant
          val intent2 = Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION, pkgUri)
          intent2.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          ctx.startActivity(intent2)
          Log.i("AllFilesPermission", "Started ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION")
          promise.resolve(true)
          return
        } catch (e: Exception) {
          Log.w("AllFilesPermission", "ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION failed", e)
          // continue
        }
      }

      // Final fallback: open the app details settings page
      try {
        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
        intent.data = pkgUri
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        ctx.startActivity(intent)
        Log.i("AllFilesPermission", "Started ACTION_APPLICATION_DETAILS_SETTINGS fallback")
        promise.resolve(false)
        return
      } catch (e: Exception) {
        Log.e("AllFilesPermission", "Failed to open any settings page", e)
        promise.reject("E_INTENT", "Failed to open any settings page", e)
      }
    } catch (e: Exception) {
      Log.e("AllFilesPermission", "Unexpected error opening manage all files", e)
      promise.reject("E_INTENT", "Unexpected error opening manage all files", e)
    }
  }
}
