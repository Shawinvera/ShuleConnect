import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.softkit.wazi',
  appName: 'WaziLearn',
  webDir: 'dist/learnplay/browser',
  server: {
    androidScheme: 'https'
  }
};

export default config;
