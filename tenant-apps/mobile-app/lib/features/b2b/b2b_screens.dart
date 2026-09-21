import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../core/api/api_client.dart';
import '../../core/api/dio_errors.dart';
import '../../core/api/nest_json.dart';
import '../../core/localization/language_provider.dart';
import '../../shared/models/models.dart';
import '../../shared/widgets/app_feedback.dart';
import '../settings/settings_detail_screens.dart';
import 'b2b_providers.dart';

const MethodChannel _invoiceFilesChannel =
    MethodChannel('ridego/invoice_files');

class BusinessGstScreen extends ConsumerStatefulWidget {
  const BusinessGstScreen({super.key});

  @override
  ConsumerState<BusinessGstScreen> createState() => _BusinessGstScreenState();
}

class _BusinessGstScreenState extends ConsumerState<BusinessGstScreen> {
  final TextEditingController _company = TextEditingController();
  final TextEditingController _gstin = TextEditingController();
  String? _certificatePath;
  String? _certificateFileName;
  bool _saving = false;

  @override
  void dispose() {
    _company.dispose();
    _gstin.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final t = ref.read(appTranslatorProvider);
    if (_company.text.trim().isEmpty || !isValidGstin(_gstin.text)) {
      showAppFeedback(
        context,
        message: t('Enter company legal name and a valid GSTIN.'),
        type: AppFeedbackType.info,
      );
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(businessProfileServiceProvider).save(
            companyLegalName: _company.text,
            gstin: _gstin.text,
            certificatePath: _certificatePath,
            certificateFileName: _certificateFileName,
          );
      ref.invalidate(businessProfileProvider);
      if (!mounted) return;
      showAppFeedback(
        context,
        message: t('Business profile verified successfully.'),
        type: AppFeedbackType.success,
      );
    } catch (error) {
      if (!mounted) return;
      showAppFeedback(
        context,
        message: '${t('Verification failed')}: $error',
        type: AppFeedbackType.error,
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pickCertificate() async {
    final t = ref.read(appTranslatorProvider);
    final String? source = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (BuildContext context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              ListTile(
                leading: const Icon(Icons.photo_library_outlined),
                title: Text(t('Choose image from gallery')),
                onTap: () => Navigator.of(context).pop('gallery'),
              ),
              ListTile(
                leading: const Icon(Icons.photo_camera_outlined),
                title: Text(t('Take certificate photo')),
                onTap: () => Navigator.of(context).pop('camera'),
              ),
              ListTile(
                leading: const Icon(Icons.picture_as_pdf_outlined),
                title: Text(t('Choose PDF / document')),
                onTap: () => Navigator.of(context).pop('document'),
              ),
            ],
          ),
        );
      },
    );
    if (source == null) return;
    try {
      if (source == 'gallery' || source == 'camera') {
        await _pickCertificateImage(
          source == 'camera' ? ImageSource.camera : ImageSource.gallery,
        );
      } else {
        await _pickCertificateDocument();
      }
    } on PlatformException catch (error) {
      if (!mounted) return;
      showAppFeedback(
        context,
        message:
            '${t('Could not open file picker. Please fully restart the app after dependency changes.')}: ${error.message ?? error.code}',
        type: AppFeedbackType.error,
      );
    } catch (error) {
      if (!mounted) return;
      showAppFeedback(
        context,
        message: '${t('Could not select GST certificate')}: $error',
        type: AppFeedbackType.error,
      );
    }
  }

  Future<void> _pickCertificateImage(ImageSource source) async {
    final XFile? image = await ImagePicker().pickImage(
      source: source,
      imageQuality: 90,
    );
    if (image == null) return;
    setState(() {
      _certificatePath = image.path;
      _certificateFileName = image.name;
    });
  }

  Future<void> _pickCertificateDocument() async {
    final t = ref.read(appTranslatorProvider);
    final FilePickerResult? result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: <String>['pdf', 'jpg', 'jpeg', 'png', 'webp'],
      allowMultiple: false,
      withData: false,
    );
    if (result == null || result.files.isEmpty) return;
    final PlatformFile file = result.files.single;
    if (file.path == null || file.path!.trim().isEmpty) {
      if (!mounted) return;
      showAppFeedback(
        context,
        message: t('Could not read selected GST certificate file.'),
        type: AppFeedbackType.error,
      );
      return;
    }
    setState(() {
      _certificatePath = file.path;
      _certificateFileName = file.name;
    });
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.watch(appTranslatorProvider);
    final profile = ref.watch(businessProfileProvider);
    return SettingsDetailScaffold(
      title: t('Business & GST'),
      child: profile.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (Object error, _) => _B2bError(
          message: '$error',
          onRetry: () => ref.invalidate(businessProfileProvider),
        ),
        data: (BusinessProfile value) {
          if (_company.text.isEmpty) _company.text = value.companyLegalName;
          if (_gstin.text.isEmpty) _gstin.text = value.gstin;
          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
            children: <Widget>[
              _StatusCard(
                icon: value.verified
                    ? Icons.verified_user_outlined
                    : Icons.pending_actions_outlined,
                title: value.verified
                    ? t('Verified business')
                    : t('Verification pending'),
                subtitle: value.message ??
                    (value.verified
                        ? t('GST and legal business details are verified.')
                        : t('Add GST details to unlock business checkout.')),
                status: value.status,
              ),
              if (value.certificateFileName?.trim().isNotEmpty ==
                  true) ...<Widget>[
                const SizedBox(height: 12),
                _CertificateStatusCard(profile: value),
              ],
              const SizedBox(height: 16),
              TextField(
                controller: _company,
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(
                  labelText: t('Company legal name'),
                  border: const OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _gstin,
                textCapitalization: TextCapitalization.characters,
                maxLength: 15,
                decoration: InputDecoration(
                  labelText: t('GSTIN'),
                  helperText: t('Example: 27ABCDE1234F1Z5'),
                  border: const OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: _saving ? null : _pickCertificate,
                icon: const Icon(Icons.upload_file_outlined),
                label: Text(
                  _certificateFileName == null
                      ? t('Upload GST certificate PDF / image')
                      : _certificateFileName!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (_certificateFileName != null) ...<Widget>[
                const SizedBox(height: 8),
                Text(
                  t('Selected certificate will be checked and saved for verification.'),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: _saving ? null : _save,
                icon: _saving
                    ? const SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.verified_outlined),
                label: Text(
                  _certificatePath == null
                      ? t('Verify GSTIN')
                      : t('Upload & verify certificate'),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _CertificateStatusCard extends StatelessWidget {
  const _CertificateStatusCard({required this.profile});

  final BusinessProfile profile;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colors = Theme.of(context).colorScheme;
    return Card(
      margin: EdgeInsets.zero,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: colors.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                Icon(Icons.description_outlined, color: colors.primary),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    'GST certificate details',
                    style: TextStyle(fontWeight: FontWeight.w900),
                  ),
                ),
                Text(
                  profile.status,
                  style: TextStyle(
                    color: profile.verified ? Colors.green : colors.primary,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _MiniDetail(
                label: 'File', value: profile.certificateFileName ?? '-'),
            _MiniDetail(label: 'Legal name', value: profile.companyLegalName),
            _MiniDetail(label: 'GSTIN', value: profile.gstin),
            if (profile.verifiedAt != null)
              _MiniDetail(
                label: 'Verified at',
                value:
                    profile.verifiedAt!.toLocal().toString().split('.').first,
              ),
          ],
        ),
      ),
    );
  }
}

class _MiniDetail extends StatelessWidget {
  const _MiniDetail({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Row(
        children: <Widget>[
          SizedBox(
            width: 90,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ),
        ],
      ),
    );
  }
}

class DistributorPaymentSettingsScreen extends ConsumerWidget {
  const DistributorPaymentSettingsScreen({
    super.key,
    this.amount = 0,
    this.orderId,
  });

  final double amount;
  final String? orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.watch(appTranslatorProvider);
    final settings = ref.watch(distributorPaymentSettingsProvider);
    return SettingsDetailScaffold(
      title: t('Distributor payments'),
      child: settings.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (Object error, _) => _B2bError(
          message: '$error',
          onRetry: () => ref.invalidate(distributorPaymentSettingsProvider),
        ),
        data: (DistributorPaymentSettings data) {
          final String upiUri = data.upiUri(
            amount: amount,
            orderNumber: orderId,
            transactionNote: orderId == null ? null : 'Order $orderId payment',
          );
          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
            children: <Widget>[
              Card(
                margin: EdgeInsets.zero,
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    children: <Widget>[
                      QrImageView(data: upiUri, size: 210),
                      const SizedBox(height: 10),
                      Text(
                        data.upiId,
                        style: const TextStyle(fontWeight: FontWeight.w900),
                      ),
                      Text(
                          t('Generated automatically from distributor UPI ID')),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              _CopyTile(
                  label: t('Account holder'), value: data.accountHolderName),
              _CopyTile(label: t('Bank name'), value: data.bankName),
              _CopyTile(label: t('Account number'), value: data.accountNumber),
              _CopyTile(label: t('IFSC'), value: data.ifsc),
              _CopyTile(label: t('Branch'), value: data.branch),
              _CopyTile(label: t('UPI ID'), value: data.upiId),
            ],
          );
        },
      ),
    );
  }
}

class PaymentSubmissionSheet extends ConsumerStatefulWidget {
  const PaymentSubmissionSheet({
    super.key,
    required this.orderId,
    required this.method,
    this.orderNumber,
    this.amount,
    this.upiUri,
    this.transactionNote,
  });

  final String orderId;
  final String method;
  final String? orderNumber;
  final double? amount;
  final String? upiUri;
  final String? transactionNote;

  @override
  ConsumerState<PaymentSubmissionSheet> createState() =>
      _PaymentSubmissionSheetState();
}

class _PaymentSubmissionSheetState
    extends ConsumerState<PaymentSubmissionSheet> {
  final TextEditingController _utr = TextEditingController();
  bool _saving = false;
  String? _proofPath;
  String? _proofFileName;

  @override
  void dispose() {
    _utr.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final t = ref.read(appTranslatorProvider);
    if (_utr.text.trim().isEmpty) {
      showAppFeedback(
        context,
        message: t('Enter UTR number.'),
        type: AppFeedbackType.info,
      );
      return;
    }
    if (_proofPath == null) {
      showAppFeedback(
        context,
        message: t('Attach payment proof.'),
        type: AppFeedbackType.info,
      );
      return;
    }
    setState(() => _saving = true);
    try {
      final PaymentSubmission result =
          await ref.read(paymentSubmissionServiceProvider).submit(
                orderId: widget.orderId,
                method: widget.method,
                utrNumber: _utr.text,
                proofPath: _proofPath,
                proofFileName: _proofFileName,
                idempotencyKey:
                    '${widget.orderId}-${DateTime.now().millisecondsSinceEpoch}',
              );
      if (!mounted) return;
      Navigator.of(context).pop(result);
    } catch (error) {
      if (!mounted) return;
      showAppFeedback(
        context,
        message: '${t('Payment submission failed')}: $error',
        type: AppFeedbackType.error,
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.watch(appTranslatorProvider);
    final bool upi = widget.method == 'UPI_QR' && widget.upiUri != null;
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        8,
        20,
        MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text(
            widget.method == 'UPI_QR'
                ? t('Submit UPI payment proof')
                : t('Submit NEFT / RTGS / IMPS details'),
            style: Theme.of(context)
                .textTheme
                .titleLarge
                ?.copyWith(fontWeight: FontWeight.w900),
          ),
          if (widget.orderNumber != null || widget.amount != null) ...<Widget>[
            const SizedBox(height: 6),
            Text(
              [
                if (widget.orderNumber != null)
                  '${t('Order')} ${widget.orderNumber}',
                if (widget.amount != null)
                  'INR ${widget.amount!.toStringAsFixed(2)}',
              ].join(' - '),
            ),
          ],
          if (upi) ...<Widget>[
            const SizedBox(height: 12),
            Center(child: QrImageView(data: widget.upiUri!, size: 190)),
            if (widget.transactionNote?.trim().isNotEmpty == true) ...<Widget>[
              const SizedBox(height: 6),
              Text(
                widget.transactionNote!,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ],
          const SizedBox(height: 12),
          TextField(
            controller: _utr,
            textCapitalization: TextCapitalization.characters,
            decoration: InputDecoration(
              labelText: t('UTR number'),
              border: const OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: _saving ? null : _pickProof,
            icon: const Icon(Icons.attach_file),
            label: Text(
              _proofFileName == null
                  ? t('Attach payment proof')
                  : _proofFileName!,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: _saving ? null : _submit,
            icon: _saving
                ? const SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.fact_check_outlined),
            label: Text(t('Mark pending verification')),
          ),
        ],
      ),
    );
  }

  Future<void> _pickProof() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const <String>['jpg', 'jpeg', 'png', 'webp', 'pdf'],
      withData: false,
    );
    final file = result?.files.single;
    if (file?.path == null) return;
    setState(() {
      _proofPath = file!.path;
      _proofFileName = file.name;
    });
  }
}

class InvoiceCenterScreen extends ConsumerWidget {
  const InvoiceCenterScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.watch(appTranslatorProvider);
    final localization = ref.watch(mobileLocalizationServiceProvider);
    final invoices = ref.watch(invoiceCenterProvider);
    return SettingsDetailScaffold(
      title: t('Invoice center'),
      child: invoices.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (Object error, _) => _B2bError(
          message: '$error',
          onRetry: () => ref.invalidate(invoiceCenterProvider),
        ),
        data: (List<InvoiceDocument> rows) {
          if (rows.isEmpty) {
            return Center(child: Text(t('No invoices available yet.')));
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemBuilder: (BuildContext context, int index) {
              final InvoiceDocument invoice = rows[index];
              return Card(
                margin: EdgeInsets.zero,
                child: ListTile(
                  leading: const Icon(Icons.receipt_long_outlined),
                  title: Text(invoice.invoiceNumber),
                  subtitle: Text(
                    '${t('Order')} ${invoice.orderId}\n'
                    '${t('GST')}: ${localization.formatCurrency(invoice.gstTotal)}',
                  ),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: <Widget>[
                      Text(
                        localization.formatCurrency(invoice.total),
                        style: const TextStyle(fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 2),
                      Text(t('PDF')),
                    ],
                  ),
                  onTap: () => _showInvoiceActions(context, ref, invoice),
                ),
              );
            },
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemCount: rows.length,
          );
        },
      ),
    );
  }

  void _showInvoiceActions(
    BuildContext context,
    WidgetRef ref,
    InvoiceDocument invoice,
  ) {
    final t = ref.read(appTranslatorProvider);
    final BuildContext screenContext = context;
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (BuildContext sheetContext) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            ListTile(
              leading: const Icon(Icons.download_outlined),
              title: Text(t('Download PDF')),
              subtitle: Text(t('Save to phone Downloads folder')),
              onTap: () async {
                Navigator.of(sheetContext).pop();
                await _downloadInvoicePdf(screenContext, ref, invoice);
              },
            ),
            ListTile(
              leading: const Icon(Icons.share_outlined),
              title: Text(t('Share invoice')),
              subtitle: Text(t('Share PDF with other apps')),
              onTap: () async {
                Navigator.of(sheetContext).pop();
                await _shareInvoicePdf(screenContext, ref, invoice);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _downloadInvoicePdf(
    BuildContext context,
    WidgetRef ref,
    InvoiceDocument invoice,
  ) async {
    final t = ref.read(appTranslatorProvider);
    showAppFeedback(
      context,
      message: t('Preparing invoice PDF...'),
      type: AppFeedbackType.info,
    );
    try {
      final Uint8List bytes = await _fetchInvoicePdf(ref, invoice);
      final String? savedTo = await _invoiceFilesChannel.invokeMethod<String>(
        'savePdfToDownloads',
        <String, Object>{
          'fileName': _invoiceFileName(invoice),
          'bytes': bytes,
        },
      );
      if (!context.mounted) return;
      showAppFeedback(
        context,
        message: savedTo?.trim().isNotEmpty == true
            ? t('Invoice PDF saved to Downloads.')
            : t('Invoice PDF saved.'),
        type: AppFeedbackType.success,
      );
    } on DioException catch (error) {
      if (!context.mounted) return;
      showAppFeedback(
        context,
        message:
            '${t('Could not download invoice')}: ${describeDioError(error)}',
        type: AppFeedbackType.error,
      );
    } on PlatformException catch (error) {
      if (!context.mounted) return;
      showAppFeedback(
        context,
        message:
            '${t('Could not save invoice to Downloads')}: ${error.message ?? error.code}',
        type: AppFeedbackType.error,
      );
    } catch (error) {
      if (!context.mounted) return;
      showAppFeedback(
        context,
        message: '${t('Could not download invoice')}: $error',
        type: AppFeedbackType.error,
      );
    }
  }

  Future<void> _shareInvoicePdf(
    BuildContext context,
    WidgetRef ref,
    InvoiceDocument invoice,
  ) async {
    final t = ref.read(appTranslatorProvider);
    showAppFeedback(
      context,
      message: t('Preparing invoice PDF...'),
      type: AppFeedbackType.info,
    );
    try {
      final Uint8List bytes = await _fetchInvoicePdf(ref, invoice);
      await _invoiceFilesChannel.invokeMethod<void>(
        'sharePdf',
        <String, Object>{
          'fileName': _invoiceFileName(invoice),
          'bytes': bytes,
          'title': '${t('Invoice')} ${invoice.invoiceNumber}',
        },
      );
    } on DioException catch (error) {
      if (!context.mounted) return;
      showAppFeedback(
        context,
        message: '${t('Could not share invoice')}: ${describeDioError(error)}',
        type: AppFeedbackType.error,
      );
    } on PlatformException catch (error) {
      if (!context.mounted) return;
      showAppFeedback(
        context,
        message:
            '${t('Could not open share options')}: ${error.message ?? error.code}',
        type: AppFeedbackType.error,
      );
    } catch (error) {
      if (!context.mounted) return;
      showAppFeedback(
        context,
        message: '${t('Could not share invoice')}: $error',
        type: AppFeedbackType.error,
      );
    }
  }

  Future<Uint8List> _fetchInvoicePdf(
    WidgetRef ref,
    InvoiceDocument invoice,
  ) async {
    final Dio apiDio = ref.read(apiClientProvider);
    try {
      final String pdfUrl = await _invoicePdfUrl(apiDio, invoice);
      final Uri? parsedUrl = Uri.tryParse(pdfUrl);
      final Dio downloadDio = parsedUrl?.hasScheme == true ? Dio() : apiDio;
      final Response<List<int>> response = await downloadDio.get<List<int>>(
        pdfUrl,
        options: Options(responseType: ResponseType.bytes),
      );
      final List<int>? data = response.data;
      if (data == null || data.isEmpty) {
        throw const FormatException('Invoice PDF is empty.');
      }
      return Uint8List.fromList(data);
    } on DioException catch (error) {
      if (_isNotFound(error)) {
        return _buildFallbackInvoicePdf(invoice);
      }
      rethrow;
    } on FormatException {
      return _buildFallbackInvoicePdf(invoice);
    }
  }

  Future<String> _invoicePdfUrl(Dio dio, InvoiceDocument invoice) async {
    if (invoice.pdfUrl?.trim().isNotEmpty == true) {
      return invoice.pdfUrl!.trim();
    }
    final String invoiceId = invoice.id.trim();
    if (invoiceId.isEmpty) {
      throw const FormatException('Invoice id is missing.');
    }
    final Response<Map<String, dynamic>> response =
        await dio.get<Map<String, dynamic>>(
      '/invoices/${Uri.encodeComponent(invoiceId)}/download',
    );
    final data = nestEnvelopeData(response.data);
    if (data is! Map) {
      throw const FormatException('Invoice download response is invalid.');
    }
    final String url =
        '${data['url'] ?? data['pdfUrl'] ?? data['pdf_url'] ?? ''}'.trim();
    if (url.isEmpty) {
      throw const FormatException('Invoice PDF URL is missing.');
    }
    return url;
  }

  bool _isNotFound(DioException error) => error.response?.statusCode == 404;

  String _invoiceFileName(InvoiceDocument invoice) {
    final String invoiceNumber = invoice.invoiceNumber.trim().isNotEmpty
        ? invoice.invoiceNumber.trim()
        : invoice.id.trim();
    final String safeName =
        invoiceNumber.replaceAll(RegExp(r'[^A-Za-z0-9._-]+'), '_');
    return '$safeName.pdf';
  }

  Uint8List _buildFallbackInvoicePdf(InvoiceDocument invoice) {
    final List<String> rows = <String>[
      'Invoice: ${invoice.invoiceNumber}',
      'Order: ${invoice.orderId}',
      'Date: ${invoice.createdAt.toLocal().toString().split('.').first}',
      'GST: INR ${invoice.gstTotal.toStringAsFixed(2)}',
      'Total: INR ${invoice.total.toStringAsFixed(2)}',
      '',
      'This PDF was generated from the invoice data available on this device.',
    ];
    return Uint8List.fromList(_simplePdfBytes(rows));
  }

  List<int> _simplePdfBytes(List<String> lines) {
    final String text = lines
        .map((String line) => _escapePdfText(line))
        .map((String line) => '($line) Tj T*')
        .join('\n');
    final String stream = 'BT /F1 12 Tf 50 780 Td 16 TL\n$text\nET';
    final List<String> objects = <String>[
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
      '4 0 obj << /Length ${ascii.encode(stream).length} >> stream\n$stream\nendstream endobj',
      '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    ];
    String body = '%PDF-1.4\n';
    final List<int> offsets = <int>[0];
    for (final String object in objects) {
      offsets.add(ascii.encode(body).length);
      body += '$object\n';
    }
    final int xref = ascii.encode(body).length;
    body += 'xref\n0 ${objects.length + 1}\n0000000000 65535 f \n';
    for (int index = 1; index <= objects.length; index += 1) {
      body += '${offsets[index].toString().padLeft(10, '0')} 00000 n \n';
    }
    body +=
        'trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n$xref\n%%EOF';
    return ascii.encode(body);
  }

  String _escapePdfText(String value) {
    return value
        .replaceAll(r'\', r'\\')
        .replaceAll('(', r'\(')
        .replaceAll(')', r'\)');
  }
}

class RfqQuotesScreen extends ConsumerWidget {
  const RfqQuotesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.watch(appTranslatorProvider);
    final rfqs = ref.watch(rfqProvider);
    final quotes = ref.watch(quotationProvider);
    return SettingsDetailScaffold(
      title: t('RFQ & quotations'),
      child: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(rfqProvider);
          ref.invalidate(quotationProvider);
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          children: <Widget>[
            Text(
              t('Quotations'),
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 8),
            quotes.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (Object error, _) => _InlineError('$error'),
              data: (List<Quotation> rows) => rows.isEmpty
                  ? _EmptyText(t('No quotations yet.'))
                  : Column(
                      children: rows.map((Quotation quote) {
                        return _QuoteCard(quote: quote);
                      }).toList(growable: false),
                    ),
            ),
            const SizedBox(height: 20),
            Text(
              t('Requests for quote'),
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 8),
            rfqs.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (Object error, _) => _InlineError('$error'),
              data: (List<RfqRequest> rows) => rows.isEmpty
                  ? _EmptyText(t(
                      'No RFQs yet. Open a product and tap Request for quote.'))
                  : Column(
                      children: rows.map((RfqRequest rfq) {
                        return Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          child: ListTile(
                            leading: const Icon(Icons.request_quote_outlined),
                            title: Text(rfq.productName),
                            subtitle: Text('${t('Qty')}: ${rfq.quantity}'),
                            trailing: Chip(label: Text(t(rfq.status))),
                          ),
                        );
                      }).toList(growable: false),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class CreditLedgerScreen extends ConsumerWidget {
  const CreditLedgerScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.watch(appTranslatorProvider);
    final localization = ref.watch(mobileLocalizationServiceProvider);
    final ledger = ref.watch(creditLedgerProvider);
    return SettingsDetailScaffold(
      title: t('Credit ledger'),
      child: ledger.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (Object error, _) => _B2bError(
          message: '$error',
          onRetry: () => ref.invalidate(creditLedgerProvider),
        ),
        data: (List<CreditLedgerEntry> rows) {
          if (rows.isEmpty) return Center(child: Text(t('No ledger entries.')));
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemBuilder: (BuildContext context, int index) {
              final CreditLedgerEntry entry = rows[index];
              return Card(
                margin: EdgeInsets.zero,
                child: ListTile(
                  leading: Icon(
                    entry.type.toUpperCase().contains('CREDIT')
                        ? Icons.south_west
                        : Icons.north_east,
                  ),
                  title: Text(t(entry.type)),
                  subtitle: Text(
                    '${entry.reference ?? ''}\n'
                    '${t('Due')}: ${entry.dueDate == null ? t('Not applicable') : localization.formatDateTime(entry.dueDate!)}',
                  ),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: <Widget>[
                      Text(
                        localization.formatCurrency(entry.amount),
                        style: const TextStyle(fontWeight: FontWeight.w900),
                      ),
                      Text(
                        localization.formatCurrency(entry.balance),
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              );
            },
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemCount: rows.length,
          );
        },
      ),
    );
  }
}

class CustomerStatementScreen extends ConsumerWidget {
  const CustomerStatementScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.watch(appTranslatorProvider);
    final localization = ref.watch(mobileLocalizationServiceProvider);
    final ledger = ref.watch(creditLedgerProvider);
    return SettingsDetailScaffold(
      title: t('Customer statement'),
      child: ledger.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (Object error, _) => _B2bError(
          message: '$error',
          onRetry: () => ref.invalidate(creditLedgerProvider),
        ),
        data: (List<CreditLedgerEntry> rows) {
          final double debit = rows
              .where((CreditLedgerEntry e) =>
                  !e.type.toUpperCase().contains('CREDIT'))
              .fold<double>(
                  0, (double sum, CreditLedgerEntry e) => sum + e.amount);
          final double credit = rows
              .where((CreditLedgerEntry e) =>
                  e.type.toUpperCase().contains('CREDIT'))
              .fold<double>(
                  0, (double sum, CreditLedgerEntry e) => sum + e.amount);
          final double balance = rows.isEmpty ? 0 : rows.first.balance;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: <Widget>[
              _StatementSummary(
                debit: localization.formatCurrency(debit),
                credit: localization.formatCurrency(credit),
                balance: localization.formatCurrency(balance),
              ),
              const SizedBox(height: 16),
              for (final CreditLedgerEntry entry in rows)
                Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: ListTile(
                    title: Text(entry.reference ?? t(entry.type)),
                    subtitle:
                        Text(localization.formatDateTime(entry.createdAt)),
                    trailing: Text(localization.formatCurrency(entry.amount)),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _QuoteCard extends ConsumerWidget {
  const _QuoteCard({required this.quote});

  final Quotation quote;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.watch(appTranslatorProvider);
    final localization = ref.watch(mobileLocalizationServiceProvider);
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        leading: const Icon(Icons.price_check_outlined),
        title: Text(quote.productName),
        subtitle: Text(
          '${t('Qty')}: ${quote.quantity} | '
          '${t('Valid until')}: ${localization.formatDateTime(quote.validUntil)}',
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: <Widget>[
            Text(
              localization.formatCurrency(quote.quotedPrice),
              style: const TextStyle(fontWeight: FontWeight.w900),
            ),
            Text(t(quote.status)),
          ],
        ),
        onTap: () async {
          await ref.read(rfqServiceProvider).approveQuote(quote);
          if (context.mounted) {
            showAppFeedback(
              context,
              message:
                  t('Quote approved. Add the quoted items to order from cart.'),
              type: AppFeedbackType.success,
            );
          }
        },
      ),
    );
  }
}

class _CopyTile extends StatelessWidget {
  const _CopyTile({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(label),
      subtitle: SelectableText(value.isEmpty ? '-' : value),
      trailing: IconButton(
        tooltip: 'Copy',
        icon: const Icon(Icons.copy_outlined),
        onPressed: value.isEmpty
            ? null
            : () {
                Clipboard.setData(ClipboardData(text: value));
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('$label copied')),
                );
              },
      ),
    );
  }
}

class _StatusCard extends StatelessWidget {
  const _StatusCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.status,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String status;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colors = Theme.of(context).colorScheme;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Icon(icon, color: colors.primary, size: 34),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 4),
                  Text(subtitle),
                ],
              ),
            ),
            Chip(label: Text(status)),
          ],
        ),
      ),
    );
  }
}

class _StatementSummary extends StatelessWidget {
  const _StatementSummary({
    required this.debit,
    required this.credit,
    required this.balance,
  });

  final String debit;
  final String credit;
  final String balance;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: <Widget>[
            _SummaryRow(label: 'Total debit', value: debit),
            const SizedBox(height: 8),
            _SummaryRow(label: 'Total credit', value: credit),
            const Divider(height: 24),
            _SummaryRow(label: 'Current balance', value: balance, strong: true),
          ],
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.label,
    required this.value,
    this.strong = false,
  });

  final String label;
  final String value;
  final bool strong;

  @override
  Widget build(BuildContext context) {
    final TextStyle? style = strong
        ? Theme.of(context)
            .textTheme
            .titleMedium
            ?.copyWith(fontWeight: FontWeight.w900)
        : Theme.of(context).textTheme.bodyMedium;
    return Row(
      children: <Widget>[
        Expanded(child: Text(label, style: style)),
        Text(value, style: style),
      ],
    );
  }
}

class _B2bError extends StatelessWidget {
  const _B2bError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            const Icon(Icons.error_outline, size: 42),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}

class _InlineError extends StatelessWidget {
  const _InlineError(this.message);

  final String message;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Text(message),
      ),
    );
  }
}

class _EmptyText extends StatelessWidget {
  const _EmptyText(this.message);

  final String message;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Text(message),
      ),
    );
  }
}
