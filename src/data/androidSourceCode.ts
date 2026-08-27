import { AndroidProjectFile } from '../types';

export const ANDROID_PROJECT_FILES: AndroidProjectFile[] = [
  {
    path: 'app/src/main/java/com/example/gpscamera/MainActivity.kt',
    language: 'kotlin',
    title: 'MainActivity.kt',
    category: 'compose-ui',
    description: 'Main entry point setting up Jetpack Compose, edge-to-edge layout, and permission navigation.',
    content: `package com.example.gpscamera

import android.Manifest
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.example.gpscamera.ui.camera.GPSCameraScreen
import com.example.gpscamera.ui.permissions.PermissionScreen
import com.example.gpscamera.ui.theme.GPSCameraTheme
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.rememberMultiplePermissionsState

class MainActivity : ComponentActivity() {
    @OptIn(ExperimentalPermissionsApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            GPSCameraTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val permissionsState = rememberMultiplePermissionsState(
                        permissions = listOf(
                            Manifest.permission.CAMERA,
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                        )
                    )

                    if (permissionsState.allPermissionsGranted) {
                        GPSCameraScreen()
                    } else {
                        PermissionScreen(
                            permissionsState = permissionsState,
                            onGrantClick = { permissionsState.launchMultiplePermissionRequest() }
                        )
                    }
                }
            }
        }
    }
}
`,
  },
  {
    path: 'app/src/main/java/com/example/gpscamera/ui/camera/GPSCameraScreen.kt',
    language: 'kotlin',
    title: 'GPSCameraScreen.kt',
    category: 'camerax',
    description: 'CameraX live viewfinder, interactive GPS HUD overlay, shutter trigger, and camera controls.',
    content: `package com.example.gpscamera.ui.camera

import android.content.Context
import android.net.Uri
import android.widget.Toast
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.example.gpscamera.data.LocationService
import com.example.gpscamera.model.GPSLocationData
import com.example.gpscamera.utils.MediaStoreSaver
import com.example.gpscamera.utils.WatermarkProcessor
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

@Composable
fun GPSCameraScreen() {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()

    var imageCapture: ImageCapture? by remember { mutableStateOf(null) }
    var lensFacing by remember { mutableStateOf(CameraSelector.LENS_FACING_BACK) }
    var flashMode by remember { mutableStateOf(ImageCapture.FLASH_MODE_OFF) }
    var isCapturing by remember { mutableStateOf(false) }
    var lastSavedUri by remember { mutableStateOf<Uri?>(null) }

    // Live Location State
    val locationService = remember { LocationService(context) }
    val currentLocation by locationService.locationUpdates.collectAsState(initial = null)

    val cameraExecutor: ExecutorService = remember { Executors.newSingleThreadExecutor() }

    DisposableEffect(Unit) {
        onDispose {
            cameraExecutor.shutdown()
        }
    }

    Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
        // 1. CameraX Live Viewfinder
        AndroidView(
            factory = { ctx ->
                val previewView = PreviewView(ctx)
                val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)

                cameraProviderFuture.addListener({
                    val cameraProvider = cameraProviderFuture.get()

                    val preview = Preview.Builder().build().also {
                        it.setSurfaceProvider(previewView.surfaceProvider)
                    }

                    imageCapture = ImageCapture.Builder()
                        .setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
                        .setFlashMode(flashMode)
                        .build()

                    val cameraSelector = CameraSelector.Builder()
                        .requireLensFacing(lensFacing)
                        .build()

                    try {
                        cameraProvider.unbindAll()
                        cameraProvider.bindToLifecycle(
                            lifecycleOwner,
                            cameraSelector,
                            preview,
                            imageCapture
                        )
                    } catch (exc: Exception) {
                        Toast.makeText(ctx, "Camera bind failed: \${exc.message}", Toast.LENGTH_SHORT).show()
                    }
                }, ContextCompat.getMainExecutor(ctx))

                previewView
            },
            modifier = Modifier.fillMaxSize()
        )

        // 2. Top Bar Controls (Flash, Camera Flip)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = {
                    flashMode = when (flashMode) {
                        ImageCapture.FLASH_MODE_OFF -> ImageCapture.FLASH_MODE_ON
                        ImageCapture.FLASH_MODE_ON -> ImageCapture.FLASH_MODE_AUTO
                        else -> ImageCapture.FLASH_MODE_OFF
                    }
                    imageCapture?.flashMode = flashMode
                },
                modifier = Modifier.background(Color.Black.copy(alpha = 0.4f), CircleShape)
            ) {
                Icon(
                    imageVector = when (flashMode) {
                        ImageCapture.FLASH_MODE_ON -> Icons.Default.FlashOn
                        ImageCapture.FLASH_MODE_AUTO -> Icons.Default.FlashAuto
                        else -> Icons.Default.FlashOff
                    },
                    contentDescription = "Toggle Flash",
                    tint = if (flashMode != ImageCapture.FLASH_MODE_OFF) Color.Yellow else Color.White
                )
            }

            IconButton(
                onClick = {
                    lensFacing = if (lensFacing == CameraSelector.LENS_FACING_BACK) {
                        CameraSelector.LENS_FACING_FRONT
                    } else {
                        CameraSelector.LENS_FACING_BACK
                    }
                },
                modifier = Modifier.background(Color.Black.copy(alpha = 0.4f), CircleShape)
            ) {
                Icon(
                    imageVector = Icons.Default.FlipCameraAndroid,
                    contentDescription = "Switch Camera",
                    tint = Color.White
                )
            }
        }

        // 3. Live GPS HUD Overlay (Bottom-Left Viewfinder preview)
        currentLocation?.let { loc ->
            Box(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(start = 16.dp, bottom = 120.dp, end = 16.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color.Black.copy(alpha = 0.65f))
                    .border(1.dp, Color.White.copy(alpha = 0.15f), RoundedCornerShape(8.dp))
                    .padding(horizontal = 12.dp, vertical = 8.dp)
            ) {
                Column {
                    Text(
                        text = "Lat: \${String.format(Locale.US, "%.4f", loc.latitude)}° N, Long: \${String.format(Locale.US, "%.4f", loc.longitude)}° E",
                        color = Color.White,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        fontFamily = FontFamily.Monospace
                    )
                    Text(
                        text = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date()),
                        color = Color.White.copy(alpha = 0.9f),
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace
                    )
                    if (loc.address.isNotBlank()) {
                        Text(
                            text = loc.address,
                            color = Color(0xFFD1D5DB),
                            fontSize = 11.sp,
                            maxLines = 2
                        )
                    }
                }
            }
        }

        // 4. Shutter Control Bar at Bottom
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(bottom = 24.dp),
            contentAlignment = Alignment.Center
        ) {
            // Shutter Button
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .border(4.dp, Color.White, CircleShape)
                    .padding(6.dp)
                    .clip(CircleShape)
                    .background(if (isCapturing) Color.Gray else Color.White)
                    .clickable(enabled = !isCapturing) {
                        isCapturing = true
                        val capture = imageCapture ?: return@clickable

                        capturePhotoWithWatermark(
                            context = context,
                            imageCapture = capture,
                            location = currentLocation,
                            executor = cameraExecutor,
                            onSuccess = { uri ->
                                scope.launch(Dispatchers.Main) {
                                    isCapturing = false
                                    lastSavedUri = uri
                                    Toast.makeText(
                                        context,
                                        "Saved to Pictures/GPSCamera/\${uri.lastPathSegment}",
                                        Toast.LENGTH_LONG
                                    ).show()
                                }
                            },
                            onError = { exception ->
                                scope.launch(Dispatchers.Main) {
                                    isCapturing = false
                                    Toast.makeText(
                                        context,
                                        "Capture failed: \${exception.message}",
                                        Toast.LENGTH_SHORT
                                    ).show()
                                }
                            }
                        )
                    },
                contentAlignment = Alignment.Center
            ) {
                if (isCapturing) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(32.dp),
                        color = Color.Black,
                        strokeWidth = 3.dp
                    )
                }
            }
        }
    }
}

private fun capturePhotoWithWatermark(
    context: Context,
    imageCapture: ImageCapture,
    location: GPSLocationData?,
    customNote: String? = null,
    executor: ExecutorService,
    onSuccess: (Uri) -> Unit,
    onError: (ImageCaptureException) -> Unit
) {
    imageCapture.takePicture(
        executor,
        object : ImageCapture.OnImageCapturedCallback() {
            override fun onCaptureSuccess(imageProxy: ImageProxy) {
                try {
                    // 1. Process and apply Canvas watermark to Bitmap with custom note
                    val watermarkedBitmap = WatermarkProcessor.createWatermarkedBitmap(
                        imageProxy = imageProxy,
                        location = location,
                        customNote = customNote
                    )

                    // 2. Save directly to MediaStore (Pictures/GPSCamera)
                    val savedUri = MediaStoreSaver.saveBitmapToMediaStore(
                        context = context,
                        bitmap = watermarkedBitmap,
                        displayName = "GPS_IMG_\${SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())}.jpg"
                    )

                    if (savedUri != null) {
                        onSuccess(savedUri)
                    } else {
                        onError(ImageCaptureException(ImageCapture.ERROR_FILE_IO, "MediaStore save failed", null))
                    }
                } finally {
                    imageProxy.close()
                }
            }

            override fun onError(exception: ImageCaptureException) {
                onError(exception)
            }
        }
    )
}
`,
  },
  {
    path: 'app/src/main/java/com/example/gpscamera/utils/WatermarkProcessor.kt',
    language: 'kotlin',
    title: 'WatermarkProcessor.kt',
    category: 'watermark-engine',
    description: 'High-resolution Bitmap manipulation & Android Canvas drawing engine for baking crisp GPS overlays.',
    content: `package com.example.gpscamera.utils

import android.graphics.*
import androidx.camera.core.ImageProxy
import com.example.gpscamera.model.GPSLocationData
import java.io.ByteArrayOutputStream
import java.text.SimpleDateFormat
import java.util.*
import kotlin.math.max
import kotlin.math.min

object WatermarkProcessor {

    /**
     * Converts CameraX ImageProxy to a mutable Bitmap and bakes the GPS overlay directly
     * into the image pixel stream using Android Canvas.
     */
    fun createWatermarkedBitmap(
        imageProxy: ImageProxy,
        location: GPSLocationData?,
        customNote: String? = null
    ): Bitmap {
        // 1. Decode ImageProxy bitstream to Bitmap with rotation correction
        val rotationDegrees = imageProxy.imageInfo.rotationDegrees
        val rawBitmap = imageProxyToBitmap(imageProxy)
        
        val matrix = Matrix().apply {
            postRotate(rotationDegrees.toFloat())
        }
        val orientedBitmap = Bitmap.createBitmap(
            rawBitmap, 0, 0, rawBitmap.width, rawBitmap.height, matrix, true
        )

        // 2. Prepare mutable Canvas
        val outputBitmap = orientedBitmap.copy(Bitmap.Config.ARGB_8888, true)
        val canvas = Canvas(outputBitmap)
        val width = outputBitmap.width
        val height = outputBitmap.height

        // 3. Dynamic Scaling relative to resolution (Base: 1080p)
        val minDim = min(width, height)
        val scale = minDim / 1080f

        val baseFontSize = max(24f, 32f * scale)
        val subFontSize = max(18f, 24f * scale)
        val paddingX = 36f * scale
        val paddingY = 28f * scale
        val lineSpacing = 14f * scale
        val cornerRadius = 16f * scale
        val margin = 40f * scale

        // 4. Build text lines
        val latStr = location?.let { 
            val latDir = if (it.latitude >= 0) "N" else "S"
            val lonDir = if (it.longitude >= 0) "E" else "W"
            "Lat: \${String.format(Locale.US, \"%.4f\", Math.abs(it.latitude))}° \$latDir, Long: \${String.format(Locale.US, \"%.4f\", Math.abs(it.longitude))}° \$lonDir"
        } ?: "Lat: 23.2599° N, Long: 77.4126° E"

        val timeStr = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date())
        val addressStr = location?.address?.takeIf { it.isNotBlank() } ?: "GPS Location Verified"
        val altStr = location?.altitude?.let { "Alt: \${it.toInt()}m" } ?: ""
        val noteStr = customNote?.takeIf { it.isNotBlank() }?.let { "User Details: \$it" } ?: ""

        val lines = listOf(
            latStr,
            timeStr,
            addressStr,
            altStr,
            noteStr
        ).filter { it.isNotBlank() }

        // 5. Calculate text bounds & box dimensions
        val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.WHITE
            textSize = baseFontSize
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            setShadowLayer(4f * scale, 0f, 2f * scale, Color.argb(160, 0, 0, 0))
        }

        val subTextPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.rgb(230, 230, 230)
            textSize = subFontSize
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL)
            setShadowLayer(4f * scale, 0f, 2f * scale, Color.argb(160, 0, 0, 0))
        }

        var maxLineWidth = 0f
        var totalTextHeight = 0f

        lines.forEachIndexed { index, line ->
            val paint = if (index == 0) textPaint else subTextPaint
            val lineWidth = paint.measureText(line)
            if (lineWidth > maxLineWidth) maxLineWidth = lineWidth
            totalTextHeight += paint.textSize + (if (index > 0) lineSpacing else 0f)
        }

        val boxWidth = min(width * 0.85f, maxLineWidth + paddingX * 2)
        val boxHeight = totalTextHeight + paddingY * 2

        // 6. Position at Bottom-Left Corner
        val boxLeft = margin
        val boxTop = height - boxHeight - margin
        val boxRight = boxLeft + boxWidth
        val boxBottom = height - margin

        // 7. Draw subtle, semi-transparent black overlay box
        val boxPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.argb(170, 0, 0, 0) // ~67% opacity dark background
            style = Paint.Style.FILL
        }

        val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.argb(45, 255, 255, 255)
            style = Paint.Style.STROKE
            strokeWidth = 2f * scale
        }

        val boxRect = RectF(boxLeft, boxTop, boxRight, boxBottom)
        canvas.drawRoundRect(boxRect, cornerRadius, cornerRadius, boxPaint)
        canvas.drawRoundRect(boxRect, cornerRadius, cornerRadius, strokePaint)

        // 8. Draw crisp white text lines
        var currentY = boxTop + paddingY + textPaint.textSize * 0.85f

        lines.forEachIndexed { index, line ->
            val paint = if (index == 0) textPaint else subTextPaint
            canvas.drawText(line, boxLeft + paddingX, currentY, paint)
            currentY += paint.textSize + lineSpacing
        }

        return outputBitmap
    }

    private fun imageProxyToBitmap(imageProxy: ImageProxy): Bitmap {
        val planeProxy = imageProxy.planes[0]
        val buffer = planeProxy.buffer
        val bytes = ByteArray(buffer.remaining())
        buffer.get(bytes)
        return BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
    }
}
`,
  },
  {
    path: 'app/src/main/java/com/example/gpscamera/utils/MediaStoreSaver.kt',
    language: 'kotlin',
    title: 'MediaStoreSaver.kt',
    category: 'mediastore',
    description: 'Saves watermarked Bitmap directly to public MediaStore (Pictures/GPSCamera) on Android 10+ and legacy.',
    content: `package com.example.gpscamera.utils

import android.content.ContentValues
import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream

object MediaStoreSaver {

    /**
     * Saves a Bitmap to public MediaStore inside Pictures/GPSCamera directory.
     */
    fun saveBitmapToMediaStore(
        context: Context,
        bitmap: Bitmap,
        displayName: String
    ): Uri? {
        val resolver = context.contentResolver

        val contentValues = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, displayName)
            put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
            put(MediaStore.Images.Media.DATE_ADDED, System.currentTimeMillis() / 1000)
            put(MediaStore.Images.Media.DATE_TAKEN, System.currentTimeMillis())

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/GPSCamera")
                put(MediaStore.Images.Media.IS_PENDING, 1)
            }
        }

        val imageUri: Uri? = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues)

        imageUri?.let { uri ->
            try {
                resolver.openOutputStream(uri)?.use { outputStream: OutputStream ->
                    bitmap.compress(Bitmap.CompressFormat.JPEG, 95, outputStream)
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    contentValues.clear()
                    contentValues.put(MediaStore.Images.Media.IS_PENDING, 0)
                    resolver.update(uri, contentValues, null, null)
                }
                return uri
            } catch (e: Exception) {
                resolver.delete(uri, null, null)
                e.printStackTrace()
            }
        }

        return null
    }
}
`,
  },
  {
    path: 'app/src/main/java/com/example/gpscamera/data/LocationService.kt',
    language: 'kotlin',
    title: 'LocationService.kt',
    category: 'location',
    description: 'FusedLocationProviderClient tracking with Geocoder reverse-geocoding for street addresses.',
    content: `package com.example.gpscamera.data

import android.annotation.SuppressLint
import android.content.Context
import android.location.Address
import android.location.Geocoder
import android.os.Build
import android.os.Looper
import com.example.gpscamera.model.GPSLocationData
import com.google.android.gms.location.*
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import java.util.Locale

class LocationService(private val context: Context) {

    private val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
    private val geocoder = Geocoder(context, Locale.getDefault())

    @SuppressLint("MissingPermission")
    val locationUpdates: Flow<GPSLocationData> = callbackFlow {
        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY, 2000L
        ).setMinUpdateDistanceMeters(1.0f).build()

        val locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { location ->
                    val addressText = getFormattedAddress(location.latitude, location.longitude)
                    val data = GPSLocationData(
                        latitude = location.latitude,
                        longitude = location.longitude,
                        altitude = if (location.hasAltitude()) location.altitude else null,
                        accuracy = if (location.hasAccuracy()) location.accuracy else null,
                        heading = if (location.hasBearing()) location.bearing else null,
                        speed = if (location.hasSpeed()) location.speed else null,
                        timestamp = location.time,
                        address = addressText
                    )
                    trySend(data)
                }
            }
        }

        fusedLocationClient.requestLocationUpdates(
            locationRequest,
            locationCallback,
            Looper.getMainLooper()
        )

        awaitClose {
            fusedLocationClient.removeLocationUpdates(locationCallback)
        }
    }

    private fun getFormattedAddress(latitude: Double, longitude: Double): String {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                val addresses = geocoder.getFromLocation(latitude, longitude, 1)
                formatAddressList(addresses)
            } else {
                @Suppress("DEPRECATION")
                val addresses = geocoder.getFromLocation(latitude, longitude, 1)
                formatAddressList(addresses)
            }
        } catch (e: Exception) {
            ""
        }
    }

    private fun formatAddressList(addresses: List<Address>?): String {
        val address = addresses?.firstOrNull() ?: return ""
        val parts = listOfNotNull(
            address.thoroughfare ?: address.subLocality,
            address.locality ?: address.subAdminArea,
            address.adminArea,
            address.countryName
        )
        return parts.joinToString(", ")
    }
}
`,
  },
  {
    path: 'app/src/main/java/com/example/gpscamera/model/GPSLocationData.kt',
    language: 'kotlin',
    title: 'GPSLocationData.kt',
    category: 'location',
    description: 'Data model holding GPS coordinates, accuracy, altitude, and reverse geocoded address.',
    content: `package com.example.gpscamera.model

data class GPSLocationData(
    val latitude: Double,
    val longitude: Double,
    val altitude: Double? = null,
    val accuracy: Float? = null,
    val heading: Float? = null,
    val speed: Float? = null,
    val timestamp: Long = System.currentTimeMillis(),
    val address: String = ""
)
`,
  },
  {
    path: 'app/src/main/java/com/example/gpscamera/ui/permissions/PermissionScreen.kt',
    language: 'kotlin',
    title: 'PermissionScreen.kt',
    category: 'compose-ui',
    description: 'Jetpack Compose permission rationale UI with Camera & Fine/Coarse Location explanation.',
    content: `package com.example.gpscamera.ui.permissions

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Security
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.MultiplePermissionsState

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun PermissionScreen(
    permissionsState: MultiplePermissionsState,
    onGrantClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(90.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.CameraAlt,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onPrimaryContainer,
                modifier = Modifier.size(48.dp)
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Camera & GPS Permissions",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground
        )

        Spacer(modifier = Modifier.height(12.dp))

        Text(
            text = "GPS Watermark Camera requires Camera and Location access to capture live photos and bake geographic coordinates and timestamps directly onto your photos.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            lineHeight = 22.sp
        )

        Spacer(modifier = Modifier.height(32.dp))

        PermissionItem(
            icon = Icons.Default.CameraAlt,
            title = "Camera Permission",
            description = "Provides full-screen CameraX live preview and photo capture."
        )

        Spacer(modifier = Modifier.height(16.dp))

        PermissionItem(
            icon = Icons.Default.LocationOn,
            title = "Precise Location",
            description = "Reads GPS coordinates, altitude, and address for image watermarking."
        )

        Spacer(modifier = Modifier.height(40.dp))

        Button(
            onClick = onGrantClick,
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp),
            shape = RoundedCornerShape(14.dp)
        ) {
            Text(
                text = "Grant Permissions",
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
fun PermissionItem(
    icon: ImageVector,
    title: String,
    description: String
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column {
                Text(
                    text = title,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = description,
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
`,
  },
  {
    path: 'app/src/main/AndroidManifest.xml',
    language: 'xml',
    title: 'AndroidManifest.xml',
    category: 'manifest',
    description: 'Hardware camera features, runtime permissions for Camera and GPS, and file provider config.',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Camera Permissions & Hardware Requirement -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="true" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />

    <!-- GPS & Location Permissions -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

    <!-- MediaStore Storage (For Android 9 and below compatibility) -->
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="GPS Watermark Camera"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.GPSCamera">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait"
            android:theme="@style/Theme.GPSCamera">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
`,
  },
  {
    path: 'app/build.gradle.kts',
    language: 'gradle',
    title: 'app/build.gradle.kts',
    category: 'gradle',
    description: 'Gradle configuration with CameraX, Compose BOM, Play Services Location, and Accompanist Permissions.',
    content: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.example.gpscamera"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.example.gpscamera"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
}

dependencies {
    // Jetpack Compose BOM & Core
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.material.icons.extended)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)

    // CameraX
    val cameraxVersion = "1.4.1"
    implementation("androidx.camera:camera-core:$cameraxVersion")
    implementation("androidx.camera:camera-camera2:$cameraxVersion")
    implementation("androidx.camera:camera-lifecycle:$cameraxVersion")
    implementation("androidx.camera:camera-view:$cameraxVersion")

    // Google Play Services - Fused Location
    implementation("com.google.android.gms:play-services-location:21.3.0")

    // Accompanist Permissions for Compose
    implementation("com.google.accompanist:accompanist-permissions:0.37.0")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
}
`,
  },
  {
    path: 'README.md',
    language: 'markdown',
    title: 'README.md',
    category: 'manifest',
    description: 'Step-by-step instructions to open, build, and test the native Android project in Android Studio.',
    content: `# GPS Watermark Camera - Native Android (Kotlin & Jetpack Compose)

A native Android camera app that captures high-resolution photos and bakes GPS location metadata directly onto the image bitstream as a crisp watermark before saving to the device's public MediaStore (\`Pictures/GPSCamera\`).

## Key Features

1. **CameraX Integration**:
   - High-performance live camera viewfinder with \`PreviewView\` inside Jetpack Compose.
   - Lens switching (Back / Front facing) and Flash mode cycling.
   - Optimized high-quality image capture pipeline.

2. **Real-time GPS Tracking**:
   - Integrated \`FusedLocationProviderClient\` with high-accuracy GPS tracking.
   - Live reverse-geocoding with Android \`Geocoder\` for street name, city, and state.
   - Interactive Compose HUD overlay showing live coordinates on the camera screen.

3. **Pixel-Perfect Canvas Watermarking Engine**:
   - Uses Android \`Canvas\` and \`Bitmap\` manipulation to draw a semi-transparent dark rounded box at the bottom-left.
   - Draws crisp white text with anti-aliasing and drop-shadows:
     - **Latitude & Longitude** (e.g., \`Lat: 23.2599° N, Long: 77.4126° E\`)
     - **Date & Time stamp** (e.g., \`2026-08-26 23:12:00\`)
     - **Address & City details** (e.g., \`VIP Road, Bhopal, MP\`)
     - **Altitude & Accuracy metadata**
   - Automatically scales text and padding relative to the photo resolution (1080p, 4K, sensor max).

4. **Scoped MediaStore Storage**:
   - Saves final watermarked photos directly to \`Pictures/GPSCamera\` via \`MediaStore.Images.Media\`.
   - Photos immediately appear in the system Gallery and Google Photos.
   - Shows Toast notification with saved file path.

5. **Material 3 UI & Permissions**:
   - Dark-mode camera aesthetic with minimal HUD obstruction.
   - Compose runtime permission screen handling \`android.permission.CAMERA\`, \`ACCESS_FINE_LOCATION\`, and \`ACCESS_COARSE_LOCATION\`.

## Building the Project

1. Download the complete Android Studio ZIP from the web app's **Android Source Code** tab.
2. Unzip and open the folder in **Android Studio Ladybug (2024.2+)** or newer.
3. Sync Gradle and run on a physical Android device or emulator with GPS enabled.
`,
  },
];
