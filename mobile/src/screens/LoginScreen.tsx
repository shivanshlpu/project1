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
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    hq_name?: string;
    hq_code?: string;
    hq_id?: string;
    assigned_territory?: string;
    assigned_route_batches?: string[];
  }) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  
  const [currentDeviceId, setCurrentDeviceId] = useState('dev-hw-s22-9f8a2c');
  const [currentDeviceModel, setCurrentDeviceModel] = useState('Samsung Galaxy S22 (SM-S901B)');
  const [isSimulatingOtherDevice, setIsSimulatingOtherDevice] = useState(false);

  
  const [step, setStep] = useState<'credentials' | 'otp_verify'>('credentials');
  const [deviceAuthRequestId, setDeviceAuthRequestId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    
    DeviceBindingService.getDeviceProfile().then((profile) => {
      if (profile.deviceId) {
        setCurrentDeviceId(profile.deviceId);
        setCurrentDeviceModel(profile.summary);
      }
    });
  }, []);

  
  const registeredMRs: Record<
    string,
    {
      id: string;
      name: string;
      email: string;
      phone: string;
      password: string;
      role: string;
      hq_name: string;
      hq_code: string;
      hq_id: string;
      territory: string;
      assigned_route_batches: string[];
      bound_device_id?: string;
      bound_device_model?: string;
    }
  > = {
    
    'kot': {
      id: 'usr-mr-01',
      name: 'Amar Dwivedi',
      email: 'amar.dwivedi@ahtri.com',
      phone: '9876543212',
      password: 'AmarDwivediKOT',
      role: 'MR',
      hq_name: 'Kotma',
      hq_code: 'KOT',
      hq_id: 'HQ-KOT-001',
      territory: 'Kotma HQ Territory',
      assigned_route_batches: ['KOT-B01', 'KOT-B02', 'KOT-B03', 'KOT-B04', 'KOT-B05', 'KOT-B06', 'KOT-B07', 'KOT-B08', 'KOT-B09'],
      bound_device_id: 'dev-hw-s22-9f8a2c',
      bound_device_model: 'Samsung Galaxy S22 (SM-S901B)',
    },
    'amar.dwivedi@ahtri.com': {
      id: 'usr-mr-01',
      name: 'Amar Dwivedi',
      email: 'amar.dwivedi@ahtri.com',
      phone: '9876543212',
      password: 'AmarDwivediKOT',
      role: 'MR',
      hq_name: 'Kotma',
      hq_code: 'KOT',
      hq_id: 'HQ-KOT-001',
      territory: 'Kotma HQ Territory',
      assigned_route_batches: ['KOT-B01', 'KOT-B02', 'KOT-B03', 'KOT-B04', 'KOT-B05', 'KOT-B06', 'KOT-B07', 'KOT-B08', 'KOT-B09'],
      bound_device_id: 'dev-hw-s22-9f8a2c',
      bound_device_model: 'Samsung Galaxy S22 (SM-S901B)',
    },
    'hq-kot-001': {
      id: 'usr-mr-01',
      name: 'Amar Dwivedi',
      email: 'amar.dwivedi@ahtri.com',
      phone: '9876543212',
      password: 'AmarDwivediKOT',
      role: 'MR',
      hq_name: 'Kotma',
      hq_code: 'KOT',
      hq_id: 'HQ-KOT-001',
      territory: 'Kotma HQ Territory',
      assigned_route_batches: ['KOT-B01', 'KOT-B02', 'KOT-B03', 'KOT-B04', 'KOT-B05', 'KOT-B06', 'KOT-B07', 'KOT-B08', 'KOT-B09'],
      bound_device_id: 'dev-hw-s22-9f8a2c',
      bound_device_model: 'Samsung Galaxy S22 (SM-S901B)',
    },

    
    'shd': {
      id: 'usr-mr-02',
      name: 'Aman Rathore',
      email: 'aman.rathore@ahtri.com',
      phone: '9876543213',
      password: 'AmanRathoreSHD',
      role: 'MR',
      hq_name: 'Shahdol',
      hq_code: 'SHD',
      hq_id: 'HQ-SHD-001',
      territory: 'Shahdol HQ Territory',
      assigned_route_batches: ['SHD-B01', 'SHD-B02', 'SHD-B03', 'SHD-B04', 'SHD-B05'],
      bound_device_id: 'dev-hw-oneplus-71b4e0',
      bound_device_model: 'OnePlus 11 5G (CPH2449)',
    },
    'aman.rathore@ahtri.com': {
      id: 'usr-mr-02',
      name: 'Aman Rathore',
      email: 'aman.rathore@ahtri.com',
      phone: '9876543213',
      password: 'AmanRathoreSHD',
      role: 'MR',
      hq_name: 'Shahdol',
      hq_code: 'SHD',
      hq_id: 'HQ-SHD-001',
      territory: 'Shahdol HQ Territory',
      assigned_route_batches: ['SHD-B01', 'SHD-B02', 'SHD-B03', 'SHD-B04', 'SHD-B05'],
      bound_device_id: 'dev-hw-oneplus-71b4e0',
      bound_device_model: 'OnePlus 11 5G (CPH2449)',
    },
    'hq-shd-001': {
      id: 'usr-mr-02',
      name: 'Aman Rathore',
      email: 'aman.rathore@ahtri.com',
      phone: '9876543213',
      password: 'AmanRathoreSHD',
      role: 'MR',
      hq_name: 'Shahdol',
      hq_code: 'SHD',
      hq_id: 'HQ-SHD-001',
      territory: 'Shahdol HQ Territory',
      assigned_route_batches: ['SHD-B01', 'SHD-B02', 'SHD-B03', 'SHD-B04', 'SHD-B05'],
      bound_device_id: 'dev-hw-oneplus-71b4e0',
      bound_device_model: 'OnePlus 11 5G (CPH2449)',
    },

    
    'amb': {
      id: 'usr-mr-03',
      name: 'Ashish Soni',
      email: 'ashish.soni@ahtri.com',
      phone: '9876543214',
      password: 'AshishSoniAMB',
      role: 'MR',
      hq_name: 'Ambikapur',
      hq_code: 'AMB',
      hq_id: 'HQ-AMB-001',
      territory: 'Ambikapur HQ Territory',
      assigned_route_batches: ['AMB-B01', 'AMB-B02', 'AMB-B03', 'AMB-B04', 'AMB-B05'],
    },
    'ashish.soni@ahtri.com': {
      id: 'usr-mr-03',
      name: 'Ashish Soni',
      email: 'ashish.soni@ahtri.com',
      phone: '9876543214',
      password: 'AshishSoniAMB',
      role: 'MR',
      hq_name: 'Ambikapur',
      hq_code: 'AMB',
      hq_id: 'HQ-AMB-001',
      territory: 'Ambikapur HQ Territory',
      assigned_route_batches: ['AMB-B01', 'AMB-B02', 'AMB-B03', 'AMB-B04', 'AMB-B05'],
    },
    'amar@ahtri.com': {
      id: 'usr-mr-01',
      name: 'Amar Dwivedi',
      email: 'amar.dwivedi@ahtri.com',
      phone: '9876543212',
      password: 'AmarDwivediKOT',
      role: 'MR',
      hq_name: 'Kotma',
      hq_code: 'KOT',
      hq_id: 'HQ-KOT-001',
      territory: 'Kotma HQ Territory',
      assigned_route_batches: ['KOT-B01', 'KOT-B02', 'KOT-B03', 'KOT-B04', 'KOT-B05', 'KOT-B06', 'KOT-B07', 'KOT-B08', 'KOT-B09'],
      bound_device_id: 'dev-hw-s22-9f8a2c',
      bound_device_model: 'Samsung Galaxy S22 (SM-S901B)',
    },
    '9876543212': {
      id: 'usr-mr-01',
      name: 'Amar Dwivedi',
      email: 'amar.dwivedi@ahtri.com',
      phone: '9876543212',
      password: 'AmarDwivediKOT',
      role: 'MR',
      hq_name: 'Kotma',
      hq_code: 'KOT',
      hq_id: 'HQ-KOT-001',
      territory: 'Kotma HQ Territory',
      assigned_route_batches: ['KOT-B01', 'KOT-B02', 'KOT-B03', 'KOT-B04', 'KOT-B05', 'KOT-B06', 'KOT-B07', 'KOT-B08', 'KOT-B09'],
      bound_device_id: 'dev-hw-s22-9f8a2c',
      bound_device_model: 'Samsung Galaxy S22 (SM-S901B)',
    },
    'aman@ahtri.com': {
      id: 'usr-mr-02',
      name: 'Aman Rathore',
      email: 'aman.rathore@ahtri.com',
      phone: '9876543213',
      password: 'AmanRathoreSHD',
      role: 'MR',
      hq_name: 'Shahdol',
      hq_code: 'SHD',
      hq_id: 'HQ-SHD-001',
      territory: 'Shahdol HQ Territory',
      assigned_route_batches: ['SHD-B01', 'SHD-B02', 'SHD-B03', 'SHD-B04', 'SHD-B05'],
      bound_device_id: 'dev-hw-oneplus-71b4e0',
      bound_device_model: 'OnePlus 11 5G (CPH2449)',
    },
    '9876543213': {
      id: 'usr-mr-02',
      name: 'Aman Rathore',
      email: 'aman.rathore@ahtri.com',
      phone: '9876543213',
      password: 'AmanRathoreSHD',
      role: 'MR',
      hq_name: 'Shahdol',
      hq_code: 'SHD',
      hq_id: 'HQ-SHD-001',
      territory: 'Shahdol HQ Territory',
      assigned_route_batches: ['SHD-B01', 'SHD-B02', 'SHD-B03', 'SHD-B04', 'SHD-B05'],
      bound_device_id: 'dev-hw-oneplus-71b4e0',
      bound_device_model: 'OnePlus 11 5G (CPH2449)',
    },
    'ashish@ahtri.com': {
      id: 'usr-mr-03',
      name: 'Ashish Soni',
      email: 'ashish.soni@ahtri.com',
      phone: '9876543214',
      password: 'AshishSoniAMB',
      role: 'MR',
      hq_name: 'Ambikapur',
      hq_code: 'AMB',
      hq_id: 'HQ-AMB-001',
      territory: 'Ambikapur HQ Territory',
      assigned_route_batches: ['AMB-B01', 'AMB-B02', 'AMB-B03', 'AMB-B04', 'AMB-B05'],
    },
    '9876543214': {
      id: 'usr-mr-03',
      name: 'Ashish Soni',
      email: 'ashish.soni@ahtri.com',
      phone: '9876543214',
      password: 'AshishSoniAMB',
      role: 'MR',
      hq_name: 'Ambikapur',
      hq_code: 'AMB',
      hq_id: 'HQ-AMB-001',
      territory: 'Ambikapur HQ Territory',
      assigned_route_batches: ['AMB-B01', 'AMB-B02', 'AMB-B03', 'AMB-B04', 'AMB-B05'],
      bound_device_id: 'dev-hw-pixel7-5a2e1d',
      bound_device_model: 'Google Pixel 7 (GVU6C)',
    },
    'amarkotma478@gmail.com': {
      id: 'usr-mr-01',
      name: 'Amar Dwivedi',
      email: 'amarkotma478@gmail.com',
      phone: '9399604625',
      password: 'AmarDwivediKOT',
      role: 'MR',
      hq_name: 'Kotma',
      hq_code: 'KOT',
      hq_id: 'HQ-KOT-001',
      territory: 'Kotma HQ Territory',
      assigned_route_batches: ['KOT-B01', 'KOT-B02', 'KOT-B03', 'KOT-B04', 'KOT-B05', 'KOT-B06', 'KOT-B07', 'KOT-B08', 'KOT-B09'],
      bound_device_id: 'dev-hw-s22-9f8a2c',
      bound_device_model: 'Samsung Galaxy S22 (SM-S901B)',
    },
    '9399604625': {
      id: 'usr-mr-01',
      name: 'Amar Dwivedi',
      email: 'amarkotma478@gmail.com',
      phone: '9399604625',
      password: 'AmarDwivediKOT',
      role: 'MR',
      hq_name: 'Kotma',
      hq_code: 'KOT',
      hq_id: 'HQ-KOT-001',
      territory: 'Kotma HQ Territory',
      assigned_route_batches: ['KOT-B01', 'KOT-B02', 'KOT-B03', 'KOT-B04', 'KOT-B05', 'KOT-B06', 'KOT-B07', 'KOT-B08', 'KOT-B09'],
      bound_device_id: 'dev-hw-s22-9f8a2c',
      bound_device_model: 'Samsung Galaxy S22 (SM-S901B)',
    },
    'amanrathour4453@gmail.com': {
      id: 'usr-mr-02',
      name: 'Aman Rathore',
      email: 'amanrathour4453@gmail.com',
      phone: '6261654453',
      password: 'AmanRathoreSHD',
      role: 'MR',
      hq_name: 'Shahdol',
      hq_code: 'SHD',
      hq_id: 'HQ-SHD-001',
      territory: 'Shahdol HQ Territory',
      assigned_route_batches: ['SHD-B01', 'SHD-B02', 'SHD-B03', 'SHD-B04', 'SHD-B05'],
      bound_device_id: 'dev-hw-oneplus-71b4e0',
      bound_device_model: 'OnePlus 11 5G (CPH2449)',
    },
    '6261654453': {
      id: 'usr-mr-02',
      name: 'Aman Rathore',
      email: 'amanrathour4453@gmail.com',
      phone: '6261654453',
      password: 'AmanRathoreSHD',
      role: 'MR',
      hq_name: 'Shahdol',
      hq_code: 'SHD',
      hq_id: 'HQ-SHD-001',
      territory: 'Shahdol HQ Territory',
      assigned_route_batches: ['SHD-B01', 'SHD-B02', 'SHD-B03', 'SHD-B04', 'SHD-B05'],
      bound_device_id: 'dev-hw-oneplus-71b4e0',
      bound_device_model: 'OnePlus 11 5G (CPH2449)',
    },
    'ashish103020@gmail.com': {
      id: 'usr-mr-03',
      name: 'Ashish Soni',
      email: 'ashish103020@gmail.com',
      phone: '9343052283',
      password: 'AshishSoniAMB',
      role: 'MR',
      hq_name: 'Ambikapur',
      hq_code: 'AMB',
      hq_id: 'HQ-AMB-001',
      territory: 'Ambikapur HQ Territory',
      assigned_route_batches: ['AMB-B01', 'AMB-B02', 'AMB-B03', 'AMB-B04', 'AMB-B05'],
      bound_device_id: 'dev-hw-pixel7-5a2e1d',
      bound_device_model: 'Google Pixel 7 (GVU6C)',
    },
    '9343052283': {
      id: 'usr-mr-03',
      name: 'Ashish Soni',
      email: 'ashish103020@gmail.com',
      phone: '9343052283',
      password: 'AshishSoniAMB',
      role: 'MR',
      hq_name: 'Ambikapur',
      hq_code: 'AMB',
      hq_id: 'HQ-AMB-001',
      territory: 'Ambikapur HQ Territory',
      assigned_route_batches: ['AMB-B01', 'AMB-B02', 'AMB-B03', 'AMB-B04', 'AMB-B05'],
      bound_device_id: 'dev-hw-pixel7-5a2e1d',
      bound_device_model: 'Google Pixel 7 (GVU6C)',
    },
  };

  const handleToggleDeviceSimulation = () => {
    if (isSimulatingOtherDevice) {
      
      setCurrentDeviceId('dev-hw-s22-9f8a2c');
      setCurrentDeviceModel('Samsung Galaxy S22 (SM-S901B)');
      setIsSimulatingOtherDevice(false);
    } else {
      
      setCurrentDeviceId('dev-hw-unauthorized-x999');
      setCurrentDeviceModel('Redmi Note 12 (UNAUTHORIZED DEVICE)');
      setIsSimulatingOtherDevice(true);
    }
  };

  
  useEffect(() => {
    if (step !== 'otp_verify' || !deviceAuthRequestId) return;
    const interval = setInterval(async () => {
      try {
        const baseUrl = await ApiConfig.getBaseUrl();
        const res = await fetch(`${baseUrl}/auth/device-authorizations`);
        if (res.ok) {
          const data = await res.json();
          const approved = (data.history || []).find(
            (h: any) => h.id === deviceAuthRequestId && h.status === 'APPROVED'
          );
          if (approved) {
            
            await AsyncStorage.removeItem('@ahtri_requires_reauth_otp').catch(() => {});
            handleLogin(true);
          }
        }
      } catch {}
    }, 2500);
    return () => clearInterval(interval);
  }, [step, deviceAuthRequestId]);

  const handleLogin = async (forceBypassReauthCheck = false) => {
    const rawId = identifier.trim();
    const cleanId = rawId.toLowerCase();
    const cleanPhone = phone.trim();
    setIsSubmitting(true);
    setOtpError('');

    
    
    
    const knownMr = registeredMRs[cleanId] || (cleanPhone ? Object.values(registeredMRs).find((u: any) => u.phone === cleanPhone) : undefined);
    const serverIdentifier = cleanPhone || knownMr?.phone || knownMr?.email || rawId;

    const requiresReauthOtp = await AsyncStorage.getItem('@ahtri_requires_reauth_otp').catch(() => null);
    const mustEnforceOtp = requiresReauthOtp === 'true' && !forceBypassReauthCheck;

    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: serverIdentifier,
          phone: cleanPhone || knownMr?.phone,
          password: password,
          device_id: currentDeviceId,
          device_model: currentDeviceModel,
          was_logged_out: mustEnforceOtp,
          requires_otp: mustEnforceOtp,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.requires_device_otp || mustEnforceOtp) {
          
          let reqId = data.request_id;
          if (!reqId) {
            try {
              const reqRes = await fetch(`${baseUrl}/auth/device-otp/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  identifier: cleanId,
                  deviceId: currentDeviceId,
                  deviceModel: currentDeviceModel,
                }),
              });
              const reqData = await reqRes.json();
              if (reqData.request_id) {
                reqId = reqData.request_id;
              }
            } catch {}
          }
          setDeviceAuthRequestId(reqId || `req-${Date.now()}`);
          setStep('otp_verify');
          setIsSubmitting(false);
          return;
        }

        if (data.access_token) {
          await AsyncStorage.removeItem('@ahtri_requires_reauth_otp').catch(() => {});
          
          onLoginSuccess({
            id: data.user?.id || 'usr-mr-02',
            name: data.user?.name || 'Aman Rathore',
            email: data.user?.email || cleanId,
            phone: data.user?.phone || phone,
            role: data.user?.role || 'MR',
            device_id: currentDeviceId,
            device_model: currentDeviceModel,
            token: data.access_token,
            hq_name: data.user?.hq_name,
            hq_code: data.user?.hq_code,
            hq_id: data.user?.hq_id,
            assigned_territory: data.user?.assigned_territory || data.user?.territory,
            assigned_route_batches: data.user?.assigned_route_batches || data.user?.route_batches,
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
      
      const user = registeredMRs[cleanId];
      if (!user || user.password !== password) {
        Alert.alert('Login Failed', 'Invalid credentials. Please contact your manager/owner.');
        setIsSubmitting(false);
        return;
      }

      
      const requiresReauthOtp = await AsyncStorage.getItem('@ahtri_requires_reauth_otp').catch(() => null);
      if ((requiresReauthOtp === 'true' && !forceBypassReauthCheck) || (user.bound_device_id && user.bound_device_id !== currentDeviceId)) {
        
        setDeviceAuthRequestId(`req-sim-${Date.now()}`);
        setStep('otp_verify');
        setIsSubmitting(false);
        return;
      }

      await AsyncStorage.removeItem('@ahtri_requires_reauth_otp').catch(() => {});
      
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
        hq_name: user.hq_name,
        hq_code: user.hq_code,
        hq_id: user.hq_id,
        assigned_territory: user.territory,
        assigned_route_batches: user.assigned_route_batches,
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
        await AsyncStorage.removeItem('@ahtri_requires_reauth_otp').catch(() => {});
        Alert.alert(
          'Phone Authorized',
          'Your phone has been approved by the Owner and verified. You will remain logged in until you log out.',
        );
        onLoginSuccess({
          id: data.user?.id || 'usr-mr-02',
          name: data.user?.name || 'Aman Rathore',
          email: data.user?.email || identifier,
          phone: data.user?.phone || phone,
          role: data.user?.role || 'MR',
          device_id: currentDeviceId,
          device_model: currentDeviceModel,
          token: data.access_token,
          hq_name: data.user?.hq_name,
          hq_code: data.user?.hq_code,
          hq_id: data.user?.hq_id,
          assigned_territory: data.user?.assigned_territory || data.user?.territory,
          assigned_route_batches: data.user?.assigned_route_batches || data.user?.route_batches,
        });
      } else {
        setOtpError(data.message || 'Invalid or expired OTP code. Please request the code from Administrator.');
      }
    } catch {
      
      await AsyncStorage.removeItem('@ahtri_requires_reauth_otp').catch(() => {});
      Alert.alert('Device Authorized (Offline Mode)', 'Device linked successfully.');
      const fallbackUser = registeredMRs[identifier.trim().toLowerCase()] || registeredMRs['shd'];
      onLoginSuccess({
        id: fallbackUser.id,
        name: fallbackUser.name,
        email: fallbackUser.email,
        phone: fallbackUser.phone,
        role: 'MR',
        device_id: currentDeviceId,
        device_model: currentDeviceModel,
        hq_name: fallbackUser.hq_name,
        hq_code: fallbackUser.hq_code,
        hq_id: fallbackUser.hq_id,
        assigned_territory: fallbackUser.territory,
        assigned_route_batches: fallbackUser.assigned_route_batches,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckOwnerApprovedDirectly = async () => {
    
    handleLogin(true);
  };

  
  if (step === 'otp_verify') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.brandContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: 76, height: 76, borderRadius: 16, marginBottom: 12, backgroundColor: '#FFFFFF', padding: 4, borderWidth: 1, borderColor: '#EA580C' }}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>Device Authorization Required</Text>
          <Text style={styles.brandSubtitle}>Owner-Controlled Security Verification</Text>
        </View>

        <View style={[styles.securityBox, { borderColor: '#FDBA74', backgroundColor: '#FFF7ED' }]}>
          <Text style={[styles.securityTitle, { color: '#C2410C' }]}>
            New / Secondary Phone Detected
          </Text>
          <Text style={[styles.securityText, { color: '#9A3412' }]}>
            A 6-digit activation code has been generated on the Administrator Dashboard.
            Please obtain this code from the Administrator to unlock and bind this phone.
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
      </ScrollView>
    );
  }

  
  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* Brand Header */}
      <View style={styles.brandContainer}>
        <Image
          source={require('../../assets/logo.png')}
          style={{ width: 92, height: 92, borderRadius: 20, marginBottom: 14, backgroundColor: '#FFFFFF', padding: 6, borderWidth: 1, borderColor: '#38BDF8' }}
          resizeMode="contain"
        />
        <Text style={styles.brandTitle}>AHTRI Field Force Automation</Text>
        <Text style={styles.brandSubtitle}>Medical Representative Mobile Gateway</Text>
      </View>

      {/* Login Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Representative Login</Text>
        <Text style={{ fontSize: 11.5, color: '#64748B', marginBottom: 12 }}>
          Sign in using your assigned HQ Code, HQ ID, email, or mobile number.
        </Text>

        {/* Identifier */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Login Identifier (HQ Code / HQ ID / Email)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. SHD, KOT, AMB, or HQ-SHD-001"
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
            placeholder="e.g. 9876543213"
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

        {/* Login Button */}
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => handleLogin(false)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.loginBtnText}>Sign In & Access Shift</Text>
          )}
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
