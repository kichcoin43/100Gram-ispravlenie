# Building APK for 100GRAM Messenger

This guide will walk you through building an Android APK file for the 100GRAM messenger app.

## Prerequisites

1. **Node.js and npm** - Install from [nodejs.org](https://nodejs.org/)
2. **Android Studio** - Download from [developer.android.com/studio](https://developer.android.com/studio)
3. **Java Development Kit (JDK)** - JDK 17 or higher
4. **Firebase Project** - For push notifications

## Step 1: Install Dependencies

\`\`\`bash
npm install
\`\`\`

Install Capacitor CLI globally:

\`\`\`bash
npm install -g @capacitor/cli
\`\`\`

Install Capacitor dependencies:

\`\`\`bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npm install @capacitor/push-notifications @capacitor/local-notifications
\`\`\`

## Step 2: Build the Next.js App

Build the static export:

\`\`\`bash
npm run build
\`\`\`

This will create an `out` directory with your static files.

## Step 3: Initialize Capacitor (if not already done)

\`\`\`bash
npx cap init
\`\`\`

When prompted:
- App name: `100GRAM`
- App ID: `com.telegram.messenger`
- Web directory: `out`

## Step 4: Add Android Platform

\`\`\`bash
npx cap add android
\`\`\`

This creates the `android` directory with the native Android project.

## Step 5: Sync Web Assets

\`\`\`bash
npx cap sync android
\`\`\`

This copies your web assets to the Android project.

## Step 6: Configure Firebase for Push Notifications

### 6.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `100GRAM`
4. Follow the setup wizard

### 6.2 Add Android App to Firebase

1. In Firebase Console, click "Add app" → Android
2. Enter package name: `com.telegram.messenger`
3. Download `google-services.json`
4. Place it in `android/app/` directory

### 6.3 Get Server Key for Backend

1. In Firebase Console, go to Project Settings → Cloud Messaging
2. Copy the "Server key"
3. Add it to your backend environment variables as `FIREBASE_SERVER_KEY`

## Step 7: Add Notification Icon

Create a notification icon (white on transparent background):

1. Use [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/icons-notification.html)
2. Generate `ic_stat_notification.png` in various sizes
3. Place them in:
   - `android/app/src/main/res/drawable-mdpi/`
   - `android/app/src/main/res/drawable-hdpi/`
   - `android/app/src/main/res/drawable-xhdpi/`
   - `android/app/src/main/res/drawable-xxhdpi/`
   - `android/app/src/main/res/drawable-xxxhdpi/`

## Step 8: Add Notification Sound (Optional)

1. Add your notification sound file (e.g., `notification.mp3`)
2. Place it in `android/app/src/main/res/raw/notification.mp3`

## Step 9: Open in Android Studio

\`\`\`bash
npx cap open android
\`\`\`

This opens the Android project in Android Studio.

## Step 10: Build APK in Android Studio

### Debug APK (for testing)

1. In Android Studio, go to **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Wait for the build to complete
3. Click "locate" in the notification to find the APK
4. APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK (for distribution)

#### 10.1 Generate Signing Key

\`\`\`bash
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
\`\`\`

Save this keystore file securely!

#### 10.2 Configure Signing in Android Studio

1. Go to **Build → Generate Signed Bundle / APK**
2. Select **APK**
3. Click **Next**
4. Click **Create new...** or choose existing keystore
5. Fill in the keystore information
6. Click **Next**
7. Select **release** build variant
8. Check both signature versions (V1 and V2)
9. Click **Finish**

#### 10.3 Locate Release APK

The signed APK will be at:
`android/app/build/outputs/apk/release/app-release.apk`

## Step 11: Test the APK

### Install on Device

\`\`\`bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
\`\`\`

Or drag and drop the APK file onto an Android device.

### Test Push Notifications

1. Open the app and log in
2. Grant notification permissions when prompted
3. Send a message from another device/browser
4. You should receive a notification with sound

## Step 12: Distribute Your App

### Option 1: Direct Distribution

Share the APK file directly with users. They need to:
1. Enable "Install from unknown sources" in Android settings
2. Download and install the APK

### Option 2: Google Play Store

1. Create a Google Play Developer account ($25 one-time fee)
2. Go to [Google Play Console](https://play.google.com/console)
3. Create a new app
4. Upload your signed APK or AAB (Android App Bundle)
5. Fill in store listing details
6. Submit for review

#### Build AAB for Play Store

In Android Studio:
1. **Build → Generate Signed Bundle / APK**
2. Select **Android App Bundle**
3. Follow the signing steps
4. Upload the AAB file to Play Console

## Troubleshooting

### Build Errors

**Gradle sync failed:**
- Open `android/build.gradle` and update Gradle version
- Sync project with Gradle files

**Firebase not working:**
- Ensure `google-services.json` is in `android/app/`
- Check package name matches in Firebase Console

**Notification not showing:**
- Check notification permissions are granted
- Verify notification channel is created (Android 8+)
- Check `AndroidManifest.xml` has notification permissions

### Common Issues

**App crashes on startup:**
- Check Android Studio Logcat for errors
- Verify all Capacitor plugins are properly installed
- Run `npx cap sync android` again

**Push notifications not received:**
- Verify Firebase configuration
- Check FCM token is registered on backend
- Test with Firebase Console → Cloud Messaging → Send test message

**Notifications don't show on top:**
- Ensure notification importance is set to HIGH or MAX
- Check "Display over other apps" permission is granted
- Verify notification channel settings

## Updating the App

When you make changes to your web code:

\`\`\`bash
npm run build
npx cap sync android
\`\`\`

Then rebuild in Android Studio.

## Environment Variables

For production, update these in your backend:

- `JWT_SECRET` - Your JWT secret key
- `FIREBASE_SERVER_KEY` - Firebase Cloud Messaging server key
- `UPSTASH_REDIS_REST_URL` - Your Redis URL
- `UPSTASH_REDIS_REST_TOKEN` - Your Redis token

## Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/guide)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)

## Support

If you encounter issues:
1. Check Android Studio Logcat for detailed error messages
2. Review Capacitor documentation
3. Check Firebase Console for push notification logs
4. Verify all environment variables are set correctly
