# Forgot Password OTP Test Guide

This guide explains how to test the forgot password functionality with OTP verification and Firebase password change integration.

## Overview

The forgot password flow consists of three main steps:

1. **OTP Generation** - Generate and send a 6-digit OTP to the user's email
2. **OTP Verification** - Verify the OTP code entered by the user
3. **Password Reset** - Update the user's password in Firebase Authentication

## Test Files

### 1. Interactive Web Test (`test-forgot-password-otp.html`)

A comprehensive web-based test interface that provides:

- Real-time Firebase connection status
- Step-by-step testing of each component
- Visual feedback and logging
- Complete flow testing with progress tracking

### 2. Command Line Test (`test-forgot-password-otp.js`)

A Node.js script for automated testing that provides:

- Command-line interface with options
- Automated test execution
- Detailed logging and reporting
- Integration with CI/CD pipelines

## Prerequisites

### Server Requirements

- Node.js server running on port 3000 (or configured port)
- Firebase Admin SDK configured
- SendGrid API configured (optional, falls back to server API)
- Required endpoints available:
  - `POST /api/send-password-reset-otp`
  - `POST /api/verify-password-reset-otp`
  - `POST /api/reset-password-with-otp`

### Firebase Configuration

- Firebase project configured with Authentication enabled
- Service account key file (`firebase-service-account.json`) in project root
- Or Firebase service account environment variable set

### Test User Account

- A test user account in Firebase Authentication
- Valid email address for receiving OTP codes

## Using the Web Test Interface

### 1. Open the Test Page

```bash
# Start your server
npm start

# Open in browser
http://localhost:3000/test-forgot-password-otp.html
```

### 2. Configure Test Parameters

- **Test Email**: Enter the email address of your test user
- **New Password**: Enter the new password to set
- **Server URL**: Verify the server URL is correct
- **Test Mode**: Choose the type of test to run

### 3. Run Tests

#### Individual Component Tests

1. **Firebase Connection**: Check if Firebase is properly connected
2. **OTP Generation**: Test OTP generation and display
3. **OTP Verification**: Test OTP verification with generated code
4. **Password Reset**: Test password reset functionality
5. **Password Verification**: Verify the password was actually changed

#### Complete Flow Test

- Click "Run Complete Test" to execute all steps in sequence
- Monitor progress with the progress bar
- Review detailed logs for each step

### 4. Interpret Results

- **Green Status**: Test passed successfully
- **Red Status**: Test failed - check logs for details
- **Yellow Status**: Test in progress or warning

## Using the Command Line Test

### Basic Usage

```bash
# Run complete flow test
node test-forgot-password-otp.js

# Run with custom email
node test-forgot-password-otp.js --email test@example.com

# Run with verbose logging
node test-forgot-password-otp.js --verbose

# Run only OTP generation test
node test-forgot-password-otp.js --mode otp-only
```

### Command Line Options

| Option              | Description              | Default                    |
| ------------------- | ------------------------ | -------------------------- |
| `--email <email>`   | Test email address       | `test@viktoriasbistro.com` |
| `--password <pass>` | New password for testing | `NewTestPassword123!`      |
| `--server <url>`    | Server URL               | `http://localhost:3000`    |
| `--mode <mode>`     | Test mode                | `full`                     |
| `--verbose`         | Enable verbose logging   | `false`                    |
| `--help`            | Show help message        | -                          |

### Test Modes

#### `full` (Default)

Runs the complete flow:

1. Server connectivity check
2. OTP generation
3. OTP verification
4. Password reset
5. Password verification

#### `otp-only`

Tests only OTP generation:

- Generates OTP code
- Displays the code for manual verification
- Tests email sending (if configured)

#### `verification-only`

Tests only OTP verification:

- Requires an existing OTP code
- Verifies the OTP against the server
- Useful for testing verification logic

#### `password-reset-only`

Tests only password reset:

- Attempts to reset password with new value
- Tests Firebase integration
- Verifies server-side password update

### Example Commands

```bash
# Test with custom configuration
node test-forgot-password-otp.js \
  --email admin@viktoriasbistro.com \
  --password SecurePassword123! \
  --server http://localhost:8080 \
  --verbose

# Test only OTP generation
node test-forgot-password-otp.js --mode otp-only --verbose

# Test against production server
node test-forgot-password-otp.js \
  --server https://viktoriasbistro.restaurant \
  --email production-test@example.com
```

## Understanding Test Results

### Success Indicators

- ✅ All steps completed without errors
- OTP generated and displayed
- OTP verification successful
- Password reset completed
- Firebase password updated

### Common Failure Scenarios

#### Firebase Connection Issues

```
❌ Firebase connection failed: Firebase not configured
```

**Solution**: Ensure Firebase Admin SDK is properly configured

#### Server Not Running

```
❌ Server is not running or not reachable
```

**Solution**: Start the server with `npm start`

#### OTP Generation Failed

```
❌ OTP generation failed: Email service not configured
```

**Solution**: Configure SendGrid API or ensure server OTP endpoints work

#### OTP Verification Failed

```
❌ OTP verification failed: Invalid OTP code
```

**Solution**: Use the correct OTP code or generate a new one

#### Password Reset Failed

```
❌ Password reset failed: Firebase update failed
```

**Solution**: Check Firebase Admin SDK configuration and permissions

## Troubleshooting

### Firebase Issues

1. **Service Account Not Found**

   - Ensure `firebase-service-account.json` exists in project root
   - Or set `FIREBASE_SERVICE_ACCOUNT` environment variable

2. **Permission Denied**

   - Check Firebase project permissions
   - Ensure service account has Authentication admin rights

3. **Project Not Found**
   - Verify project ID in service account file
   - Check Firebase project configuration

### Server Issues

1. **Port Already in Use**

   - Change server port in configuration
   - Or stop other services using the port

2. **API Endpoints Not Found**

   - Ensure server routes are properly configured
   - Check server startup logs for route registration

3. **CORS Issues**
   - Verify CORS configuration in server
   - Check browser console for CORS errors

### Email Service Issues

1. **SendGrid Not Configured**

   - Set `SENDGRID_API_KEY` environment variable
   - Or use server-side OTP generation as fallback

2. **Email Not Sending**
   - Check SendGrid API key validity
   - Verify sender email is authenticated
   - Check SendGrid dashboard for delivery status

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Test Forgot Password Flow
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: "16"

      - name: Install dependencies
        run: npm install

      - name: Start server
        run: npm start &

      - name: Wait for server
        run: sleep 10

      - name: Run forgot password tests
        run: node test-forgot-password-otp.js --verbose
        env:
          FIREBASE_SERVICE_ACCOUNT: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          SENDGRID_API_KEY: ${{ secrets.SENDGRID_API_KEY }}
```

### Docker Testing

```dockerfile
FROM node:16-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

# Expose port
EXPOSE 3000

# Start server and run tests
CMD ["sh", "-c", "npm start & sleep 10 && node test-forgot-password-otp.js --verbose"]
```

## Security Considerations

### Test Data

- Use test email addresses, not production accounts
- Use strong test passwords that meet security requirements
- Clear test data after testing

### API Keys

- Never commit API keys to version control
- Use environment variables for sensitive configuration
- Rotate API keys regularly

### Firebase Security

- Use service accounts with minimal required permissions
- Regularly audit Firebase project access
- Monitor authentication logs for suspicious activity

## Performance Testing

### Load Testing

```bash
# Test OTP generation under load
for i in {1..10}; do
  node test-forgot-password-otp.js --mode otp-only --email "test$i@example.com" &
done
wait
```

### Rate Limiting Testing

```bash
# Test rate limiting
for i in {1..20}; do
  node test-forgot-password-otp.js --mode otp-only --email "test@example.com"
  sleep 1
done
```

## Monitoring and Alerts

### Key Metrics to Monitor

- OTP generation success rate
- OTP verification success rate
- Password reset completion rate
- Average response times
- Error rates by endpoint

### Alert Conditions

- OTP generation failure rate > 5%
- Password reset failure rate > 2%
- Average response time > 5 seconds
- Firebase connection failures

## Conclusion

This comprehensive test suite ensures that the forgot password functionality works correctly across all components. Regular testing helps maintain system reliability and provides confidence in the authentication system.

For additional support or questions, refer to the main project documentation or contact the development team.
