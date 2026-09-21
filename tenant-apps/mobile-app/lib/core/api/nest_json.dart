/// Nest controllers usually return `{ success, data, meta?, message? }`.
dynamic nestEnvelopeData(dynamic body) {
  if (body is Map<String, dynamic>) return body['data'];
  if (body is Map) return body['data'];
  return null;
}
