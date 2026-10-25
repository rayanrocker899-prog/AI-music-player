# Kitty Android package

The web application is configured for Capacitor with app ID
`app.kitty.voiceassistant`. To produce an Android APK on a machine with Android
Studio and JDK 21 installed:

```bash
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

In Android Studio, use **Build > Generate Signed Bundle / APK > APK**. Create or
select a release signing key and build the `release` variant. The signed APK can
then be hosted as `/downloads/kitty.apk` or distributed through Google Play.

An APK is Android-only. iPhone and iPad users should install the PWA from
Safari using **Share > Add to Home Screen**, or package the same web build in an
iOS Capacitor project on macOS with Xcode.

## Native limitations

Android does not permit an ordinary web view to hold the microphone indefinitely
in the background. A production version of always-on `Hey Kitty` must add a
native foreground service, display a persistent microphone notification, use an
offline wake-word engine, and request the relevant Android runtime permissions.
Background music and lock-screen controls already use the browser Media Session
when installed as a PWA; a native release should replace these with Android
Media3 for reliable process-level playback.