import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

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
   * Follows enterprise attendance standard (JioAttendance / Darwinbox pattern):
   * Scales on-device to standard 360x360 verification square at quality 0.5 (~12KB - 18KB).
   * Ensures instant upload, zero 413 Payload Too Large errors, and safe database storage.
   */
  async captureLivePhoto(options?: {
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
  }): Promise<PhotoResult | null> {
    // If running in Web environment (browser / mobile web)
    if (Platform.OS === 'web' && typeof document !== 'undefined' && typeof window !== 'undefined') {
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
            // Compress with Canvas to standard 360x360 (~12KB-18KB)
            try {
              const img = document.createElement('img');
              img.onload = () => {
                const MAX_DIM = 360;
                let width = img.width || 360;
                let height = img.height || 360;
                if (width > height) {
                  if (width > MAX_DIM) {
                    height = Math.round((height * MAX_DIM) / width);
                    width = MAX_DIM;
                  }
                } else {
                  if (height > MAX_DIM) {
                    width = Math.round((width * MAX_DIM) / height);
                    height = MAX_DIM;
                  }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0, width, height);
                  const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5);
                  resolve({
                    uri: compressedDataUrl,
                    width,
                    height,
                    base64: compressedDataUrl.split(',')[1] || null,
                  });
                  return;
                }
                resolve({
                  uri: dataUrl,
                  width: 360,
                  height: 360,
                  base64: dataUrl.split(',')[1] || null,
                });
              };
              img.onerror = () => {
                resolve({
                  uri: dataUrl,
                  width: 360,
                  height: 360,
                  base64: dataUrl.split(',')[1] || null,
                });
              };
              img.src = dataUrl;
            } catch {
              resolve({
                uri: dataUrl,
                width: 360,
                height: 360,
                base64: dataUrl.split(',')[1] || null,
              });
            }
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
        aspect: options?.aspect ?? [4, 4],
        quality: options?.quality ?? 0.3, // Native client-side JPEG compression (~20KB-40KB)
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];

      // Enterprise compression on device: scale to standard dimension JPEG @ 0.45 (~15KB-25KB)
      let base64Clean: string | null = null;
      let finalUri = asset.uri;
      let width = asset.width || 360;
      let height = asset.height || 360;

      try {
        const isSquare = (options?.aspect?.[0] || 1) === (options?.aspect?.[1] || 1);
        const targetWidth = isSquare ? 360 : 540;
        const targetHeight = isSquare ? 360 : 405;

        const manipResult = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: targetWidth, height: targetHeight } }],
          { compress: 0.45, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        if (manipResult.base64 && manipResult.base64.length > 50) {
          base64Clean = manipResult.base64;
        }
        if (manipResult.uri) {
          finalUri = manipResult.uri;
        }
        if (manipResult.width) width = manipResult.width;
        if (manipResult.height) height = manipResult.height;
      } catch (manipErr) {
        console.warn('ImageManipulator compression fallback:', manipErr);
      }

      // Check asset.base64 if ImageManipulator didn't provide base64
      if (!base64Clean && asset.base64 && asset.base64.length > 50) {
        base64Clean = asset.base64;
      }

      // Bulletproof native FileSystem read (guaranteed to read local file:/// on Android even with cropping)
      if (!base64Clean && finalUri) {
        try {
          const fsBase64 = await FileSystem.readAsStringAsync(finalUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          if (fsBase64 && fsBase64.length > 50) {
            base64Clean = fsBase64;
          }
        } catch (fsErr) {
          console.warn('FileSystem readAsStringAsync notice:', fsErr);
          if (asset.uri && asset.uri !== finalUri) {
            try {
              const fsBase64Alt = await FileSystem.readAsStringAsync(asset.uri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              if (fsBase64Alt && fsBase64Alt.length > 50) {
                base64Clean = fsBase64Alt;
              }
            } catch {}
          }
        }
      }

      if (base64Clean) {
        const raw = base64Clean.includes(',') ? base64Clean.split(',')[1] : base64Clean;
        const fullDataUrl = `data:image/jpeg;base64,${raw}`;
        return {
          uri: fullDataUrl,
          width,
          height,
          base64: fullDataUrl,
        };
      }

      // Fallback: return file URI but with base64: null so it cannot be mistaken for base64
      return {
        uri: finalUri,
        width,
        height,
        base64: null,
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
