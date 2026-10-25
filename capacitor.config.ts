import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.kitty.voiceassistant',
  appName: 'Kitty',
  webDir: 'dist',
  backgroundColor: '#040408',
  android: {
    backgroundColor: '#040408',
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;