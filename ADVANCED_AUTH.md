# OfflinePay Advanced Authentication Features

## Overview

OfflinePay now supports multiple authentication methods to provide flexibility and security:

- **🔑 Passkey (WebAuthn)** - Most secure, uses biometric or security key
- **📧 Email + Password** - Traditional method with password management
- **📱 OTP (One-Time Password)** - Email-based verification
- **🔐 Multi-Factor Authentication (MFA)** - Combine multiple methods
- **💾 Wallet Backup & Recovery** - Secure wallet recovery codes
- **🤝 Social Login** - Google and Apple authentication (coming soon)
- **📱 Device Trust** - Remember trusted devices

---

## Authentication Methods

### 1. Passkey (WebAuthn) ✓ Available

**Security Level: ⭐⭐⭐⭐⭐ (Highest)**

Uses FIDO2/WebAuthn standard. Most secure method.

**Features:**
- Biometric authentication (fingerprint, face)
- Hardware security key support
- Phishing-resistant
- No passwords to remember

**How to use:**
```bash
POST /api/auth/register/options → Get challenge
POST /api/auth/register/verify → Verify credential
POST /api/auth/login/options → Get login challenge
POST /api/auth/login/verify → Verify login
```

---

### 2. Email + Password ✓ Available

**Security Level: ⭐⭐⭐ (Medium)**

Traditional email and password authentication with password strength requirements.

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

**Endpoints:**
```bash
POST /api/auth/email-password/register
Body: { email, password }

POST /api/auth/email-password/login
Body: { email, password }

POST /api/auth/email-password/change
Body: { oldPassword, newPassword }
```

**Features:**
- Password recovery via email
- Recovery codes generated during signup
- Change password anytime

---

### 3. One-Time Password (OTP) ✓ Available

**Security Level: ⭐⭐⭐⭐ (Very High)**

Email-based OTP with 5-minute expiration.

**Endpoints:**
```bash
POST /api/auth/otp/send
Body: { email }

POST /api/auth/otp/verify
Body: { email, otp }
```

**Features:**
- 6-digit OTP code
- 5-minute expiration
- Resend capability
- No password needed

---

## Multi-Factor Authentication (MFA)

### Combine Authentication Methods

**Supported MFA Methods:**
1. TOTP (Time-based One-Time Password)
   - Use authenticator apps: Google Authenticator, Authy, Microsoft Authenticator
   - 30-second codes
   
2. Email OTP
   - Receive codes via email
   - Backup method if authenticator not available

3. Recovery Codes
   - 10 backup codes generated during MFA setup
   - Each code can be used once
   - Save in a safe place

### Enable MFA

```bash
# Enable TOTP
POST /api/auth/mfa/totp/enable
Response: {
  secret: "base32-encoded-secret",
  qrCode: "data:image/png..."
}

# Verify TOTP setup
POST /api/auth/mfa/totp/verify
Body: { token: "123456" }

# Create backup codes
POST /api/auth/mfa/backup-codes

# Get MFA status
GET /api/auth/mfa/status
```

### Using Recovery Codes

If you lose access to your authenticator, use a recovery code:

```bash
POST /api/wallet/recovery-code
Body: { code: "ABC123DEF" }
```

---

## Wallet Backup & Recovery

### Create Wallet Backup

Encrypt and backup your wallet's seed phrase.

**Endpoints:**
```bash
POST /api/wallet/backup
Body: { encryptedSeedPhrase: "encrypted-data" }

GET /api/wallet/backups
Response: [
  { id, createdAt, backupHash },
  ...
]

POST /api/wallet/restore
Body: { backupId, password }
```

### Recovery Codes

Every account gets 10 recovery codes during creation.

```bash
# Use a recovery code
POST /api/wallet/recovery-code
Body: { code: "ABC123DEF" }

# Check remaining codes
GET /api/wallet/recovery-codes/count
Response: { remainingCodes: 8 }
```

**Use Case:**
- If your passkey is lost
- If email is inaccessible
- Emergency wallet restore

---

## Social Login (Coming Soon)

### Google Login

```
Features:
- Quick signup/login
- No password needed
- Automatic account creation
```

### Apple Sign In

```
Features:
- Privacy-focused
- Hide email option
- iCloud Keychain integration
```

---

## Device Trust & Sessions

### Remember Device

After successful login on a trusted device:

```bash
# Backend automatically creates device session
POST /api/auth/login/verify → Returns sessionId

# Mark device as trusted
POST /api/auth/device/trust
Body: { sessionId }
```

### Manage Trusted Devices

```bash
GET /api/auth/devices/trusted
Response: [
  {
    id,
    deviceInfo: { browser, os, device },
    lastActivity,
    trustedAt
  },
  ...
]

# Revoke access on specific device
DELETE /api/auth/device/:deviceId

# Revoke all devices
POST /api/auth/revoke/all-devices
```

---

## Security Best Practices

### ✅ Do:

1. **Use Passkey** for best security
   - Enable biometric lock on your phone
   - Consider hardware security key as backup

2. **Enable MFA** 
   - Use authenticator app for TOTP
   - Save recovery codes in secure location
   - Never share recovery codes

3. **Create Wallet Backups**
   - Regular encrypted backups
   - Store backup links securely
   - Use strong encryption password

4. **Use Strong Passwords** (if using email/password)
   - Mix uppercase, lowercase, numbers, symbols
   - Don't reuse passwords
   - Use password manager

5. **Keep Recovery Codes Safe**
   - Print or save securely
   - Don't share with anyone
   - Regenerate if compromised

### ❌ Don't:

1. Share your recovery codes
2. Write passwords in plain text
3. Use same password as other apps
4. Click links from suspicious emails
5. Grant device trust on shared computers
6. Save sensitive info in browser

---

## Account Recovery Flow

### If you lose access:

1. **Passkey locked?**
   - Use recovery code
   - Use backup authentication method

2. **Email inaccessible?**
   - Use recovery code from backup
   - Contact support with identity proof

3. **Lost all recovery codes?**
   - Use secondary authentication method
   - Verify identity via wallet address
   - Generate new recovery codes

---

## API Reference Summary

### Authentication Endpoints

```
POST   /api/auth/email-password/register
POST   /api/auth/email-password/login
POST   /api/auth/email-password/change

POST   /api/auth/otp/send
POST   /api/auth/otp/verify

POST   /api/auth/mfa/totp/enable
POST   /api/auth/mfa/totp/verify
POST   /api/auth/mfa/backup-codes
GET    /api/auth/mfa/status
```

### Wallet Recovery Endpoints

```
POST   /api/wallet/backup
GET    /api/wallet/backups
POST   /api/wallet/restore
POST   /api/wallet/recovery-code
GET    /api/wallet/recovery-codes/count
```

### Device Management Endpoints

```
GET    /api/auth/devices/trusted
DELETE /api/auth/device/:deviceId
POST   /api/auth/revoke/all-devices
```

---

## Environment Configuration

### SMTP (Email)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@offlinepay.io
```

### OAuth Providers

```env
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
APPLE_CLIENT_ID=xxx
APPLE_TEAM_ID=xxx
APPLE_KEY_ID=xxx
```

---

## Future Enhancements

- [ ] SMS-based OTP
- [ ] Telegram/WhatsApp notifications
- [ ] Biometric fingerprint on mobile
- [ ] Hardware wallet integration
- [ ] Zero-knowledge backup
- [ ] Decentralized identity (DID)
- [ ] Account linking/recovery via blockchain

---

## Support

For questions or issues:
- Check [GitHub Issues](https://github.com/offlinepay/offlinepay)
- Email: support@offlinepay.io
- Community: Discord link coming soon
