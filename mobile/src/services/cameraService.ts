import * as ImagePicker from 'expo-image-picker';

export interface PhotoResult {
  uri: string;
  width: number;
  height: number;
  base64?: string | null;
}

export const CameraService = {
  /**
   * Request camera capture permissions
   */
  async requestCameraPermission(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.warn('Camera permission request error:', error);
      return false;
    }
  },

  /**
   * Capture a live photo via device camera (e.g. attendance selfie, doctor clinic photo)
   */
  async captureLivePhoto(options?: {
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
  }): Promise<PhotoResult | null> {
    // If running in Web environment (browser / mobile web)
    if (typeof document !== 'undefined' && typeof window !== 'undefined') {
      return new Promise<PhotoResult | null>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'user'; // Requests front selfie camera
        input.style.display = 'none';
        document.body.appendChild(input);

        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          try {
            document.body.removeChild(input);
          } catch {
            // Ignored
          }
          if (!file) {
            resolve(null);
            return;
          }
          const reader = new FileReader();
          reader.onload = (event: any) => {
            const dataUrl = event.target.result as string;
            resolve({
              uri: dataUrl,
              width: 400,
              height: 400,
              base64: dataUrl.split(',')[1] || null,
            });
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        };

        // Fallback for user cancelling
        window.addEventListener(
          'focus',
          () => {
            setTimeout(() => {
              if (input.parentNode) {
                try {
                  document.body.removeChild(input);
                } catch {
                  // Ignored
                }
                if (!input.files || input.files.length === 0) {
                  resolve(null);
                }
              }
            }, 500);
          },
          { once: true }
        );

        input.click();
      });
    }

    // Native Mobile (Expo on Android / iOS)
    const hasPermission = await this.requestCameraPermission();
    if (!hasPermission) {
      return null;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options?.allowsEditing ?? true,
        aspect: options?.aspect ?? [4, 3],
        quality: options?.quality ?? 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      return {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        base64: asset.base64,
      };
    } catch (error) {
      console.warn('Error during camera capture:', error);
      return null;
    }
  },

  /**
   * Select a photo from phone gallery (e.g. expense receipts)
   */
  async selectFromGallery(): Promise<PhotoResult | null> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      return {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
      };
    } catch (error) {
      console.warn('Error selecting photo from gallery:', error);
      return null;
    }
  },
};
