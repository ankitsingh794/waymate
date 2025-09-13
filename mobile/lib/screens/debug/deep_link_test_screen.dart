// lib/screens/debug/deep_link_test_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/services/deep_link_service.dart';
import 'package:go_router/go_router.dart';

class DeepLinkTestScreen extends StatefulWidget {
  const DeepLinkTestScreen({super.key});

  @override
  State<DeepLinkTestScreen> createState() => _DeepLinkTestScreenState();
}

class _DeepLinkTestScreenState extends State<DeepLinkTestScreen> {
  final TextEditingController _urlController = TextEditingController();
  String _testResult = '';

  @override
  void initState() {
    super.initState();
    _urlController.text =
        'waymate://verify-email?token=testtoken123&email=test@example.com';
  }

  Future<void> _testDeepLink() async {
    final url = _urlController.text.trim();
    if (url.isEmpty) return;

    setState(() {
      _testResult = 'Testing deep link: $url\n';
    });

    try {
      final uri = Uri.parse(url);
      debugPrint('🔗 Testing deep link: $uri');

      // Manually call the deep link handler
      final deepLinkService = DeepLinkService();

      setState(() {
        _testResult += 'Parsed URI: $uri\n';
        _testResult += 'Scheme: ${uri.scheme}\n';
        _testResult += 'Host: ${uri.host}\n';
        _testResult += 'Path: ${uri.path}\n';
        _testResult += 'Query: ${uri.query}\n';
        _testResult += 'Parameters: ${uri.queryParameters}\n\n';
      });

      // Test direct navigation
      if (uri.scheme == 'waymate' && uri.host == 'verify-email') {
        final token = uri.queryParameters['token'];
        final email = uri.queryParameters['email'];

        if (token != null && token.isNotEmpty) {
          final route = '/verify-email?token=$token&email=${email ?? ''}';
          setState(() {
            _testResult += 'Attempting navigation to: $route\n';
          });

          context.go(route);

          setState(() {
            _testResult += '✅ Navigation attempted\n';
          });
        } else {
          setState(() {
            _testResult += '❌ Missing token\n';
          });
        }
      } else {
        setState(() {
          _testResult += '❌ Unsupported URL scheme or path\n';
        });
      }
    } catch (e) {
      setState(() {
        _testResult += '❌ Error: $e\n';
      });
    }
  }

  void _copyToClipboard(String text) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Copied to clipboard')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Deep Link Test'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Deep Link Tester',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _urlController,
              decoration: const InputDecoration(
                labelText: 'Deep Link URL',
                border: OutlineInputBorder(),
                hintText: 'waymate://verify-email?token=...',
              ),
              maxLines: 3,
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: _testDeepLink,
                    child: const Text('Test Deep Link'),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: () => _copyToClipboard(_urlController.text),
                  child: const Icon(Icons.copy),
                ),
              ],
            ),
            const SizedBox(height: 24),
            const Text(
              'Test URLs:',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            ...[
              'waymate://verify-email?token=testtoken123&email=test@example.com',
              'https://waymate.vercel.app/verify-email?token=testtoken123&email=test@example.com',
              'waymate://reset-password?token=resettoken456',
            ].map((url) => Card(
                  child: ListTile(
                    title: Text(url, style: const TextStyle(fontSize: 12)),
                    trailing: IconButton(
                      icon: const Icon(Icons.copy),
                      onPressed: () => _copyToClipboard(url),
                    ),
                    onTap: () {
                      _urlController.text = url;
                    },
                  ),
                )),
            const SizedBox(height: 24),
            const Text(
              'Test Result:',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey),
                  borderRadius: BorderRadius.circular(8),
                  color: Colors.grey[50],
                ),
                child: SingleChildScrollView(
                  child: Text(
                    _testResult.isEmpty ? 'No test performed yet' : _testResult,
                    style:
                        const TextStyle(fontFamily: 'monospace', fontSize: 12),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }
}
