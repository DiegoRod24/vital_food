import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.vitalfoods.control',
  appName: 'Vital Foods',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: { androidScheme: 'https' }
}

export default config
