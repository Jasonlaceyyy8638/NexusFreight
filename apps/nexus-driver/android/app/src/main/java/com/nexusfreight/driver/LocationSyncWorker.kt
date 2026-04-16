package com.nexusfreight.driver

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.Tasks
import com.google.firebase.messaging.FirebaseMessaging
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class LocationSyncWorker(appContext: Context, params: WorkerParameters) :
  CoroutineWorker(appContext, params) {

  override suspend fun doWork(): Result {
    val url = BuildConfig.SUPABASE_URL
    val anon = BuildConfig.SUPABASE_ANON_KEY
    if (url.isBlank() || anon.isBlank()) return Result.retry()

    val hasFine = ContextCompat.checkSelfPermission(
      applicationContext,
      Manifest.permission.ACCESS_FINE_LOCATION
    ) == PackageManager.PERMISSION_GRANTED
    if (!hasFine) return Result.success()

    val fused = LocationServices.getFusedLocationProviderClient(applicationContext)
    val location = try {
      Tasks.await(
        fused.getCurrentLocation(Priority.PRIORITY_BALANCED_POWER_ACCURACY, null),
        15,
        TimeUnit.SECONDS
      )
    } catch (e: Exception) {
      null
    } ?: return Result.retry()

    val token = try {
      Tasks.await(FirebaseMessaging.getInstance().token, 20, TimeUnit.SECONDS)
    } catch (e: Exception) {
      null
    } ?: return Result.retry()

    val body = JSONObject()
    body.put("device_push_token", token)
    body.put("lat", location.latitude)
    body.put("lng", location.longitude)
    if (location.hasAccuracy()) {
      body.put("accuracy_m", location.accuracy.toDouble())
    } else {
      body.put("accuracy_m", JSONObject.NULL as Any)
    }

    val endpoint = url.trimEnd('/') + "/rest/v1/rpc/driver_ingest_location_from_device"
    val media = "application/json; charset=utf-8".toMediaType()
    val reqBody = body.toString().toRequestBody(media)

    val client = OkHttpClient()
    val req = Request.Builder()
      .url(endpoint)
      .post(reqBody)
      .addHeader("apikey", anon)
      .addHeader("Authorization", "Bearer $anon")
      .addHeader("Content-Type", "application/json")
      .build()

    return try {
      client.newCall(req).execute().use { resp ->
        if (resp.isSuccessful) Result.success() else Result.retry()
      }
    } catch (e: Exception) {
      Result.retry()
    }
  }
}

