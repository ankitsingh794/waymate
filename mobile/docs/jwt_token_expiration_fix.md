# Mobile JWT Token Expiration Fix Documentation

## Problem
The mobile Flutter app was experiencing crashes when JWT tokens expired during socket authentication. The error "jwt expired" was causing the socket connection to fail without proper error handling.

## Root Cause
The mobile `SocketService` was not properly handling JWT token expiration errors from the server. When tokens expired:
1. Server would return "Authentication failed: Token expired" error
2. Mobile app would treat this as a generic connection error
3. No attempt was made to refresh the token
4. App would keep trying to reconnect with the same expired token

## Solution Implemented

### 1. Enhanced Socket Error Handling
- Added specific detection for JWT expiration errors in `onConnectError` and `onError` handlers
- Error messages containing "Token expired" or "Authentication failed" now trigger special handling
- Generic connection errors still use normal reconnection logic

### 2. Automatic Token Refresh
- Implemented `_handleTokenExpiration()` method in `SocketService`
- When JWT expiration is detected:
  - Attempts to refresh the token using `AuthService.refreshToken()`
  - If successful, reconnects socket with new token
  - If failed, clears tokens and notifies UI

### 3. User Experience Improvements
- Authentication errors are emitted through `onError` stream
- UI components can listen for "Authentication expired" messages
- Users are notified when they need to log in again
- No more silent failures or infinite reconnection attempts

## Code Changes

### SocketService (`mobile/lib/services/socket_service.dart`)
```dart
// Enhanced error handling
_socket!.onConnectError((data) async {
  if (data?.toString().contains('Token expired') ?? false) {
    await _handleTokenExpiration();
  } else {
    _scheduleReconnect();
  }
});

// New token expiration handler
Future<void> _handleTokenExpiration() async {
  final refreshResult = await _authService.refreshToken();
  if (refreshResult['success']) {
    // Reconnect with new token
    await connect();
  } else {
    // Clear tokens and notify UI
    await _authService.clearTokens();
    _errorController.add('Authentication expired. Please log in again.');
  }
}
```

### Providers (`mobile/lib/providers.dart`)
- Added `socketServiceProvider` and `authServiceProvider` for dependency injection
- Services can now be properly managed through Riverpod

## Testing
The fix can be tested by:
1. Connecting to the socket with a valid token
2. Waiting for token expiration (or manually expiring it)
3. Verifying that:
   - Error is handled gracefully
   - Token refresh is attempted
   - Socket reconnects with new token
   - UI shows appropriate messages

## Benefits
- **No more crashes** from JWT expiration
- **Automatic recovery** when tokens expire
- **Better user experience** with clear error messages
- **Robust authentication** handling throughout the app
- **Consistent behavior** with web client implementation

## Future Enhancements
- Add retry limits for token refresh attempts
- Implement exponential backoff for authentication retries
- Add metrics for authentication failure tracking
- Consider implementing token pre-emptive refresh based on expiration time