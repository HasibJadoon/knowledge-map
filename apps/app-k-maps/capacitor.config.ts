import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'app-k-maps',
  webDir: 'www',
  plugins: {
    Keyboard: {
      resize: KeyboardResize.Ionic,
      resizeOnFullScreen: true,
      // Hide the native iOS "^ v ✓" input accessory bar so our custom
      // ion-footer formatting bar has unobstructed space above the keyboard.
      hideFormAccessoryBar: true,
    },
  },
};

export default config;
