import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.iraqiacademy.app',
  appName: 'الاكاديمية العراقية',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
