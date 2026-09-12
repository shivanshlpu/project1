import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { DeviceBindingService } from '../services/deviceBindingService';
import { ApiConfig } from '../services/apiConfig';
import { ServerStatusPill } from '../components/ServerStatusPill';

interface LoginScreenProps {
  onLoginSuccess: (user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    device_id: string;
    device_model: string;
    token?: string;
  }) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('mr@ahtri.com');
  const [password, setPassword] = useState('Password@123');
  const [phone, setPhone] = useState('9876543212');

  // Real Hardware Fingerprint of the running phone
  const [currentDeviceId, setCurrentDeviceId] = useState('dev-hw-s22-9f8a2c');
  const [currentDeviceModel, setCurrentDeviceModel] = useState('Samsung Galaxy S22 (SM-S901B)');
  const [isSimulatingOtherDevice, setIsSimulatingOtherDevice] = useState(false);

  // OTP Verification Flow State
  const [step, setStep] = useState<'credentials' | 'otp_verify'>('credentials');
  const [deviceAuthRequestId, setDeviceAuthRequestId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Automatically detect physical device hardware on mount
    DeviceBindingService.getDeviceProfile().then((profile) => {
      if (profile.isPhysicalPhone || profile.modelName !== 'Device') {
        setCurrentDeviceId(profile.deviceId);
        setCurrentDeviceModel(profile.summary);
      }
    });
  }, []);

  // Registered MR accounts in the system (for offline or local fallback)
  const registeredMRs: Record<
    string,
    {
      id: string;
      name: string;
      email: string;
      phone: string;
      password: string;
      role: string;
      bound_device_id?: string;
      bound_device_model?: string;
    }
  > = {
    'mr@ahtri.com': {
      id: 'usr-mr-01',
      name: 'Rahul Sharma',
      email: 'mr@ahtri.com',
      phone: '9876543212',
      password: 'Password@123',
      role: 'MR',
      bound_device_id: 'dev-hw-s22-9f8a2c',
      bound_device_model: 'Samsung Galaxy S22 (SM-S901B)',
    },
    'vikram@ahtri.com': {
      id: 'usr-mr-02',
      name: 'Vikram Malhotra',
      email: 'vikram@ahtri.com',
      phone: '9876543213',
      password: 'Password@123',
      role: 'MR',
      bound_device_id: 'dev-hw-oneplus-71b4e0',
      bound_device_model: 'OnePlus 11 5G (CPH2449)',
    },
    'pooja@ahtri.com': {
      id: 'usr-mr-03',
      name: 'Pooja Verma',
      email: 'pooja@ahtri.com',
      phone: '9876543214',
      password: 'Password@123',
      role: 'MR',
      bound_device_id: undefined, // Unbound - pairs with current phone on first login
    },
  };

  const handleToggleDeviceSimulation = () => {
    if (isSimulatingOtherDevice) {
      // Revert to designated phone
      setCurrentDeviceId('dev-hw-s22-9f8a2c');
      setCurrentDeviceModel('Samsung Galaxy S22 (SM-S901B)');
      setIsSimulatingOtherDevice(false);
    } else {
      // Switch to unauthorized device (e.g. friend's phone or secondary device)
      setCurrentDeviceId('dev-hw-unauthorized-x999');
      setCurrentDeviceModel('Redmi Note 12 (UNAUTHORIZED DEVICE)');
      setIsSimulatingOtherDevice(true);
    }
  };

  const handleLogin = async () => {
    const cleanId = identifier.trim().toLowerCase();
    setIsSubmitting(true);
    setOtpError('');

    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: cleanId,
          password: password,
          device_id: currentDeviceId,
          device_model: currentDeviceModel,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.requires_device_otp) {
          // New device detected! Switch to Owner OTP verification screen
          setDeviceAuthRequestId(data.request_id);
          setStep('otp_verify');
          setIsSubmitting(false);
          return;
        }

        if (data.access_token) {
          // Direct login success on recognized device
          onLoginSuccess({
            id: data.user?.id || 'usr-mr-01',
            name: data.user?.name || 'Rahul Sharma',
            email: data.user?.email || cleanId,
            phone: data.user?.phone || phone,
            role: data.user?.role || 'MR',
            device_id: currentDeviceId,
            device_model: currentDeviceModel,
            token: data.access_token,
          });
          setIsSubmitting(false);
          return;
        }
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid credentials.');
        setIsSubmitting(false);
        return;
      }
    } catch {
      // Network/offline fallback: check local registeredMRs
      const user = registeredMRs[cleanId];
      if (!user || user.password !== password) {
        Alert.alert('Login Failed', 'Invalid credentials. Please contact your manager/owner.');
        setIsSubmitting(false);
        return;
      }

      // Check device binding in local store
      if (user.bound_device_id && user.bound_device_id !== currentDeviceId) {
        // Trigger simulated OTP flow
        setDeviceAuthRequestId(`req-sim-${Date.now()}`);
        setStep('otp_verify');
        setIsSubmitting(false);
        return;
      }

      // Bound or new pairing
      user.bound_device_id = currentDeviceId;
      user.bound_device_model = currentDeviceModel;
      onLoginSuccess({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        device_id: currentDeviceId,
        device_model: currentDeviceModel,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    const cleanOtp = otpCode.trim();
    if (cleanOtp.length !== 6) {
      setOtpError('Please enter the complete 6-digit code.');
      return;
    }

    setIsSubmitting(true);
    setOtpError('');

    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const res = await fetch(`${baseUrl}/auth/device-otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: deviceAuthRequestId,
          otp: cleanOtp,
          deviceId: currentDeviceId,
          deviceModel: currentDeviceModel,
        }),
      });

      const data = await res.json();

      if (res.ok && data.access_token) {
        Alert.alert(
          'Phone Authorized',
          'Your new phone has been approved by the Owner and locked to your MR account. You will remain logged in indefinitely.',
        );
        onLoginSuccess({
          id: data.user?.id || 'usr-mr-01',
          name: data.user?.name || 'Rahul Sharma',
          email: data.user?.email || identifier,
          phone: data.user?.phone || phone,
          role: data.user?.role || 'MR',
          device_id: currentDeviceId,
          device_model: currentDeviceModel,
          token: data.access_token,
        });
      } else {
        setOtpError(data.message || 'Invalid or expired OTP code. Please request the code from Shivansh Tiwari (Owner).');
      }
    } catch {
      // Offline simulation verify
      Alert.alert('Device Authorized (Offline Mode)', 'Device linked successfully.');
      onLoginSuccess({
        id: 'usr-mr-01',
        name: 'Rahul Sharma',
        email: identifier,
        phone: phone,
        role: 'MR',
        device_id: currentDeviceId,
        device_model: currentDeviceModel,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckOwnerApprovedDirectly = async () => {
    // If owner clicked "Approve" button on their web dashboard, logging in now will succeed
    handleLogin();
  };

  // STEP 2: 6-Digit Owner OTP Challenge Screen
  if (step === 'otp_verify') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.brandContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: 68, height: 68, borderRadius: 16, marginBottom: 12, borderWidth: 1.5, borderColor: '#EA580C' }}
            resizeMode="cover"
          />
          <Text style={styles.brandTitle}>Device Authorization Required</Text>
          <Text style={styles.brandSubtitle}>Owner-Controlled Security Verification</Text>
        </View>

        <View style={[styles.securityBox, { borderColor: '#FDBA74', backgroundColor: '#FFF7ED' }]}>
          <Text style={[styles.securityTitle, { color: '#C2410C' }]}>
            New / Secondary Phone Detected
          </Text>
          <Text style={[styles.securityText, { color: '#9A3412' }]}>
            A 6-digit activation code has been generated on the Owner Dashboard (Shivansh Tiwari).
            Please obtain this code from the Owner to unlock and bind this phone.
          </Text>
        </View>

        <View style={styles.card}>
          {/* Server Connection Status (Non-editable, Read-Only) */}
          <ServerStatusPill />

          <Text style={styles.cardTitle}>Enter 6-Digit Owner OTP</Text>
          <Text style={styles.cardSubtitle}>
            Representative: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{identifier}</Text>
          </Text>
          <Text style={styles.cardSubtitle}>
            Hardware: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{currentDeviceModel}</Text>
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>6-Digit Activation Code</Text>
            <TextInput
              style={styles.otpInput}
              placeholder="0 0 0 0 0 0"
              placeholderTextColor="#94A3B8"
              value={otpCode}
              onChangeText={(text) => {
                setOtpCode(text.replace(/[^0-9]/g, '').slice(0, 6));
                setOtpError('');
              }}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
          </View>

          {otpError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{otpError}</Text>
            </View>
          ) : null}

          {/* Submit OTP Button */}
          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: '#EA580C', marginTop: 10 }]}
            onPress={handleVerifyOtp}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginBtnText}>Verify Code & Authorize Phone</Text>
            )}
          </TouchableOpacity>

          {/* Alternative: Check if owner clicked Approve on Web */}
          <TouchableOpacity
            style={[styles.secondaryBtn, { marginTop: 10 }]}
            onPress={handleCheckOwnerApprovedDirectly}
            disabled={isSubmitting}
          >
            <Text style={styles.secondaryBtnText}>Owner Approved on Dashboard? Re-check</Text>
          </TouchableOpacity>

          {/* Back to Login */}
          <TouchableOpacity
            style={[styles.linkBtn, { marginTop: 14 }]}
            onPress={() => {
              setStep('credentials');
              setOtpCode('');
              setOtpError('');
            }}
          >
            <Text style={styles.linkBtnText}>← Back to Login Credentials</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ownerHintCard}>
          <Text style={styles.ownerHintTitle}>Where is the code?</Text>
          <Text style={styles.ownerHintText}>
            Open the Admin Dashboard (http://localhost:3001) as Shivansh Tiwari and look at the
            top navigation bar under &quot;Device OTPs&quot;. The 6-digit code is waiting there for you to read or 1-click approve.
          </Text>
        </View>
      </ScrollView>
    );
  }

  // STEP 1: Standard Credentials Screen
  return (
    <ScrollView contentContainerStyle={styles.container}>


      {/* Brand Header */}
      <View style={styles.brandContainer}>
        <Image
          source={require('../../assets/logo.png')}
          style={{ width: 78, height: 78, borderRadius: 18, marginBottom: 14, borderWidth: 1.5, borderColor: '#38BDF8' }}
          resizeMode="cover"
        />
        <Text style={styles.brandTitle}>AHTRI Field Force Automation</Text>
        <Text style={styles.brandSubtitle}>Medical Representative Mobile Gateway</Text>
      </View>

      {/* Security Architecture Badge */}
      <View style={styles.securityBox}>
        <Text style={styles.securityTitle}>Device Lock Active</Text>
        <Text style={styles.securityText}>
          Accounts are generated by company administration. The application binds directly to the hardware ID and assigned phone number of your designated phone.
        </Text>
      </View>



      {/* Login Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Representative Login</Text>

        {/* Identifier */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Login ID / Email</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. mr@ahtri.com"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
          />
        </View>

        {/* Phone */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Assigned Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 9876543212"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {/* Current Phone Hardware ID Fingerprint */}
        <View style={styles.deviceInfoBox}>
          <Text style={styles.deviceInfoLabel}>Current Hardware Fingerprint:</Text>
          <Text style={styles.deviceInfoValue}>{currentDeviceModel}</Text>
          <Text style={styles.deviceInfoSub}>UUID: {currentDeviceId}</Text>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={handleLogin}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.loginBtnText}>Authenticate & Access Tasks</Text>
          )}
        </TouchableOpacity>

        {/* Quick MR Presets for Demo / Testing */}
        <View style={styles.quickPresetsRow}>
          <Text style={styles.presetsTitle}>Quick Account Presets:</Text>
          <View style={styles.presetButtons}>
            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => {
                setIdentifier('mr@ahtri.com');
                setPhone('9876543212');
                setPassword('Password@123');
              }}
            >
              <Text style={styles.presetBtnText}>Rahul Sharma (Bound)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => {
                setIdentifier('pooja@ahtri.com');
                setPhone('9876543214');
                setPassword('Password@123');
              }}
            >
              <Text style={styles.presetBtnText}>Pooja (New / Unbound)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Device Lock Simulation Controls */}
      <View style={styles.simCard}>
        <Text style={styles.simTitle}>[Test Device Binding Security]</Text>
        <Text style={styles.simText}>
          Simulate what happens if an MR attempts to install and open the app on an unauthorized phone:
        </Text>
        <TouchableOpacity
          style={[styles.simToggleBtn, isSimulatingOtherDevice ? styles.simActive : styles.simInactive]}
          onPress={handleToggleDeviceSimulation}
        >
          <Text style={styles.simToggleText}>
            {isSimulatingOtherDevice
              ? 'WARNING: Currently Simulating: UNAUTHORIZED Phone (Redmi Note 12)'
              : 'PHONE: Currently Simulating: DESIGNATED Phone (Samsung Galaxy S22)'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F4F6FA',
    flexGrow: 1,
    justifyContent: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0F8B5A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  securityBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  securityTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 4,
  },
  securityText: {
    fontSize: 11,
    color: '#1E3A8A',
    lineHeight: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  inputGroup: {
    marginTop: 12,
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  otpInput: {
    backgroundColor: '#FFFBEB',
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 24,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 8,
    textAlign: 'center',
  },
  deviceInfoBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    padding: 10,
    marginTop: 14,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#0F8B5A',
  },
  deviceInfoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  deviceInfoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 2,
  },
  deviceInfoSub: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: 'monospace',
    marginTop: 1,
  },
  loginBtn: {
    backgroundColor: '#1A3C6E',
    height: 46,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    height: 40,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  linkBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  linkBtnText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 6,
    padding: 8,
    marginTop: 10,
  },
  errorBannerText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  ownerHintCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: 14,
  },
  ownerHintTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  ownerHintText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  quickPresetsRow: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  presetsTitle: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 8,
  },
  presetButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    borderRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#334155',
  },
  simCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  simTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  simText: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10,
    lineHeight: 15,
  },
  simToggleBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  simActive: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  simInactive: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  simToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  serverConfigTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  serverStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#0F8B5A',
  },
  serverConfigTopBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#1E293B',
  },
});
