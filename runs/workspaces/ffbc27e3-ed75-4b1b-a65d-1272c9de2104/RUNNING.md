# Firebase-only setup for ExpenseMaster

The Flutter client now uses Firebase Authentication for email/password accounts and Cloud Firestore for transactions and budgets. You do not run the Node backend, MongoDB, SQLite, or the original Firebase Functions prototype. The client no longer calls localhost:5000.

The code is ready, but you must connect your own Firebase project. `lib/firebase_options.dart` is a setup stub until FlutterFire replaces it with real configuration. Seeing **Firebase setup required** before configuration is expected.

## 1. Create/select your Firebase project

Open https://console.firebase.google.com/ and create a project such as ExpenseMaster, or select an existing project dedicated to this app. Analytics is optional. Note the actual **Project ID** under Project settings > General. The Loom workspace UUID is not your Firebase Project ID.

## 2. Enable email/password accounts

In Firebase Console, open Authentication > Get started > Sign-in method. Enable **Email/Password** and save. Email-link sign-in is not needed. This app uses email/password, not Google Sign-In.

## 3. Create Cloud Firestore

Open Firestore Database > Create database. Use the default database, select its location, and start in **production mode**. If asked for an edition, use Standard. This code uses Cloud Firestore, not Realtime Database.

## 4. Publish the provided security rules

Open `frontend/firestore.rules` in your editor. Copy its entire contents into Firebase Console > Firestore Database > Rules, replacing the default rules, then click **Publish**. These rules allow a signed-in user to access only their own `users/{uid}/transactions` and `users/{uid}/budgets`.

Use a dedicated project or review existing rules before replacing them in a shared project. You do not need to create collections manually; saving your first transaction creates the documents.

## 5. Link this Flutter app to Firebase

Firebase CLI and FlutterFire CLI were already found on this PC. Open PowerShell:

```powershell
Set-Location 'C:\Shashank\loom_multiverse\runs\workspaces\ffbc27e3-ed75-4b1b-a65d-1272c9de2104\frontend'
firebase login
flutterfire configure --platforms=android,web
```

Sign in with the Google account that owns your project. Select the project from step 1. Allow FlutterFire to create/register the Android and web apps. If asked to overwrite `lib/firebase_options.dart`, answer **yes**. Keep the current Android application ID `com.example.expense_master` unless you deliberately change it in the app too.

For a different PC where either CLI is missing:

```powershell
npm install -g firebase-tools
dart pub global activate flutterfire_cli
```

If `flutterfire` is not found after installation, add the Dart pub-cache bin folder for this terminal:

```powershell
$env:Path += ";$env:LOCALAPPDATA\Pub\Cache\bin"
```

Run `flutterfire configure --platforms=android,web` again. FlutterFire creates the platform configuration; do not paste service-account private keys into the app.

## 6. Start the app

Stop the previous running app completely. From the same frontend folder:

```powershell
flutter pub get
flutter run -d chrome
```

For an Android emulator/device instead:

```powershell
flutter devices
flutter run -d YOUR_ANDROID_DEVICE_ID
```

Replace `YOUR_ANDROID_DEVICE_ID` with the ID from `flutter devices`. Use an emulator with Google Play and working internet. There is no API_BASE_URL argument and no backend terminal.

## 7. Create your Firebase account and check storage

Click **New here? Create account**, enter an email and password of at least eight characters, and create the account. Previous local-backend accounts do not automatically exist in Firebase; register again. Existing SQLite data is preserved but is not migrated by this setup.

Add a transaction and a budget. In Firebase Console, confirm the account under Authentication > Users and documents under Firestore Database > users > YOUR_UID. Sign out and back in to verify the data remains available.

## Troubleshooting

- **Firebase setup required:** FlutterFire has not replaced the configuration stub, or you selected a platform other than the one you are running. Configure Android/web and restart fully.
- **operation-not-allowed:** enable Email/Password in step 2.
- **invalid-credential:** create a Firebase account first or check its password; the old local account is separate.
- **permission-denied after login:** create the default Cloud Firestore database and publish step 4's rules in the same project selected by FlutterFire.
- **unauthorized-domain in a browser:** add `localhost` in Authentication > Settings > Authorized domains, then restart the app.
- **localhost:5000 still appears:** you are running an old build or a different project folder. Stop it, run `flutter clean`, `flutter pub get`, then `flutter run` from the folder above.

Local analysis/tests can run before project configuration; live registration/storage can only be verified after you finish the Firebase Console and FlutterFire steps. Mock tests do not prove that your deployed Firestore rules are configured correctly.

Official references: https://firebase.google.com/docs/flutter/setup and https://firebase.google.com/docs/auth/flutter/password-auth
