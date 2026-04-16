package com.nexusfreight.driver

import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.concurrent.TimeUnit

class LocationSyncModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "LocationSync"

  @ReactMethod
  fun start(promise: Promise) {
    try {
      val constraints = Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .build()
      val req = PeriodicWorkRequestBuilder<LocationSyncWorker>(15, TimeUnit.MINUTES)
        .setConstraints(constraints)
        .build()
      WorkManager.getInstance(reactApplicationContext)
        .enqueueUniquePeriodicWork("driver_location_sync", ExistingPeriodicWorkPolicy.UPDATE, req)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("start_failed", e)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    try {
      WorkManager.getInstance(reactApplicationContext)
        .cancelUniqueWork("driver_location_sync")
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("stop_failed", e)
    }
  }
}

