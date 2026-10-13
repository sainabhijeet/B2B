package co.cube.glowora

import android.content.ContentValues
import android.content.Intent
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.content.FileProvider
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File
import java.io.FileOutputStream

class MainActivity : FlutterActivity() {
    private val invoiceFilesChannel = "glowora/invoice_files"
    private val paymentNavigationChannel = "glowora/payment_navigation"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            invoiceFilesChannel
        ).setMethodCallHandler { call, result ->
            val fileName = call.argument<String>("fileName") ?: "invoice.pdf"
            val bytes = call.argument<ByteArray>("bytes")
            if (bytes == null || bytes.isEmpty()) {
                result.error("EMPTY_PDF", "Invoice PDF data is empty.", null)
                return@setMethodCallHandler
            }

            try {
                when (call.method) {
                    "savePdfToDownloads" -> result.success(savePdfToDownloads(fileName, bytes))
                    "sharePdf" -> {
                        val title = call.argument<String>("title") ?: "Share invoice"
                        sharePdf(fileName, bytes, title)
                        result.success(null)
                    }
                    else -> result.notImplemented()
                }
            } catch (error: Exception) {
                result.error("INVOICE_FILE_ERROR", error.message, null)
            }
        }
        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            paymentNavigationChannel
        ).setMethodCallHandler { call, result ->
            if (call.method != "returnToAppAfterPayment") {
                result.notImplemented()
                return@setMethodCallHandler
            }

            // Razorpay Checkout is a second Android activity. A small number
            // of UPI flows finish the charge but leave its error/retry sheet
            // open without sending a plugin callback. Once our server has
            // verified the payment, clear that activity and reveal Flutter's
            // Orders screen.
            val intent = Intent(this, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }
            startActivity(intent)
            result.success(null)
        }
    }

    private fun savePdfToDownloads(fileName: String, bytes: ByteArray): String {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf")
                put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                put(MediaStore.MediaColumns.IS_PENDING, 1)
            }
            val resolver = contentResolver
            val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                ?: throw IllegalStateException("Could not create Downloads file.")
            try {
                resolver.openOutputStream(uri)?.use { stream ->
                    stream.write(bytes)
                } ?: throw IllegalStateException("Could not open Downloads file.")
                values.clear()
                values.put(MediaStore.MediaColumns.IS_PENDING, 0)
                resolver.update(uri, values, null, null)
                return uri.toString()
            } catch (error: Exception) {
                resolver.delete(uri, null, null)
                throw error
            }
        }

        val downloadsDir =
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        if (!downloadsDir.exists() && !downloadsDir.mkdirs()) {
            throw IllegalStateException("Could not open Downloads folder.")
        }
        val file = uniqueFile(downloadsDir, fileName)
        FileOutputStream(file).use { stream ->
            stream.write(bytes)
        }
        return file.absolutePath
    }

    private fun sharePdf(fileName: String, bytes: ByteArray, title: String) {
        val shareDir = File(cacheDir, "shared_invoices")
        if (!shareDir.exists() && !shareDir.mkdirs()) {
            throw IllegalStateException("Could not prepare invoice share file.")
        }
        val file = File(shareDir, fileName)
        FileOutputStream(file).use { stream ->
            stream.write(bytes)
        }
        val uri = FileProvider.getUriForFile(this, "$packageName.fileprovider", file)
        val shareIntent = Intent(Intent.ACTION_SEND).apply {
            type = "application/pdf"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_SUBJECT, title)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        startActivity(Intent.createChooser(shareIntent, title))
    }

    private fun uniqueFile(directory: File, fileName: String): File {
        val baseName = fileName.substringBeforeLast('.', fileName)
        val extension = fileName.substringAfterLast('.', "")
        var file = File(directory, fileName)
        var counter = 1
        while (file.exists()) {
            val suffix = if (extension.isEmpty()) "" else ".$extension"
            file = File(directory, "$baseName ($counter)$suffix")
            counter += 1
        }
        return file
    }
}
