import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { updateUserPassword, updateUserPhoto } from '../database/database';
import * as NotificationService from '../services/NotificationService';

const SAVED_USER_KEY = 'estacionei_aqui_saved_user';
const BIOMETRIC_ENABLED_KEY = 'estacionei_aqui_biometric_enabled';

export default function SettingsScreen() {
  const { user, logout, setUser } = useAuth();
  const { darkMode, toggleTheme, colors: theme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    checkBiometricStatus();
  }, []);

  async function checkBiometricStatus() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricSupported(hasHardware && isEnrolled);

    const storedFlag = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    setBiometricEnabled(storedFlag === 'true');
  }

  async function handlePickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão necessária',
        'Precisamos de acesso às suas fotos para definir a foto de perfil.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    if (result.canceled) return;

    const uri = result.assets[0].uri;
    setUploadingPhoto(true);
    try {
      await updateUserPhoto(user.id, uri);
      setUser({ ...user, photo_uri: uri });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar a foto.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleToggleBiometric(value) {
    if (value) {
      if (!biometricSupported) {
        Alert.alert(
          'Indisponível',
          'Seu dispositivo não tem biometria configurada.',
        );
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirme sua identidade para ativar',
      });

      if (!result.success) return;

      await SecureStore.setItemAsync(
        SAVED_USER_KEY,
        JSON.stringify({ id: user.id, username: user.username }),
      );
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
      setBiometricEnabled(true);
      Alert.alert('Pronto!', 'Login com biometria ativado.');
    } else {
      await SecureStore.deleteItemAsync(SAVED_USER_KEY);
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'false');
      setBiometricEnabled(false);
    }
  }

  const toggleNotifications = async (value) => {
    setNotificationsEnabled(value);
    if (value) {
      await NotificationService.requestNotificationPermission();
    }
  };

  const handleLogout = () => {
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => logout() },
    ]);
  };

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Atenção', 'A nova senha e a confirmação não coincidem.');
      return;
    }
    if (newPassword.length < 4) {
      Alert.alert('Atenção', 'A nova senha deve ter pelo menos 4 caracteres.');
      return;
    }

    setSavingPassword(true);
    try {
      const result = await updateUserPassword(
        user.id,
        currentPassword,
        newPassword,
      );
      if (result.success) {
        Alert.alert('Sucesso', 'Senha alterada com sucesso.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordForm(false);
      } else {
        Alert.alert('Erro', result.message);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível alterar a senha.');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Text style={[styles.pageTitle, { color: theme.text }]}>
        Configurações
      </Text>

      {/* Perfil */}
      <View style={[styles.profileCard, { backgroundColor: theme.card }]}>
        <TouchableOpacity onPress={handlePickImage} disabled={uploadingPhoto}>
          {user?.photo_uri ? (
            <Image source={{ uri: user.photo_uri }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Ionicons name="person" size={28} color="#FFFFFF" />
            </View>
          )}
          <View style={[styles.editBadge, { backgroundColor: theme.primary }]}>
            <Ionicons name="camera" size={12} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        <View style={{ marginLeft: 14 }}>
          <Text style={[styles.profileName, { color: theme.text }]}>
            {user?.username || 'Não identificado'}
          </Text>
          <Text style={[styles.profileSubtitle, { color: theme.subtext }]}>
            {uploadingPhoto ? 'Salvando foto...' : 'Toque na foto para alterar'}
          </Text>
        </View>
      </View>

      {/* Seção Conta */}
      <Text style={[styles.sectionLabel, { color: theme.subtext }]}>
        CONTA
      </Text>
      <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
        <TouchableOpacity
          style={styles.rowBetween}
          onPress={() => setShowPasswordForm(!showPasswordForm)}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="key-outline" size={20} color={theme.icon} />
            <Text style={[styles.rowLabel, { color: theme.text }]}>
              Alterar senha
            </Text>
          </View>
          <Ionicons
            name={showPasswordForm ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={theme.subtext}
          />
        </TouchableOpacity>

        {showPasswordForm && (
          <View style={styles.passwordForm}>
            <TextInput
              style={[
                styles.input,
                { borderColor: theme.border, color: theme.text },
              ]}
              placeholder="Senha atual"
              placeholderTextColor={theme.placeholder}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <TextInput
              style={[
                styles.input,
                { borderColor: theme.border, color: theme.text },
              ]}
              placeholder="Nova senha"
              placeholderTextColor={theme.placeholder}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={[
                styles.input,
                { borderColor: theme.border, color: theme.text },
              ]}
              placeholder="Confirmar nova senha"
              placeholderTextColor={theme.placeholder}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity
              style={[styles.savePasswordButton, { backgroundColor: theme.primary }]}
              onPress={handleChangePassword}
              disabled={savingPassword}
            >
              <Text style={styles.savePasswordText}>
                {savingPassword ? 'Salvando...' : 'Salvar nova senha'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.rowBetween}>
          <View style={styles.rowLeft}>
            <Ionicons name="finger-print-outline" size={20} color={theme.icon} />
            <Text style={[styles.rowLabel, { color: theme.text }]}>
              Login com biometria
            </Text>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={handleToggleBiometric}
          />
        </View>
      </View>

      {/* Seção Preferências */}
      <Text style={[styles.sectionLabel, { color: theme.subtext }]}>
        PREFERÊNCIAS
      </Text>
      <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
        <View style={styles.rowBetween}>
          <View style={styles.rowLeft}>
            <Ionicons
              name="notifications-outline"
              size={20}
              color={theme.icon}
            />
            <Text style={[styles.rowLabel, { color: theme.text }]}>
              Notificações
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.rowBetween}>
          <View style={styles.rowLeft}>
            <Ionicons name="moon-outline" size={20} color={theme.icon} />
            <Text style={[styles.rowLabel, { color: theme.text }]}>
              Tema escuro
            </Text>
          </View>
          <Switch value={darkMode} onValueChange={toggleTheme} />
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileName: { fontSize: 16, fontWeight: '700' },
  profileSubtitle: { fontSize: 12, marginTop: 2 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  sectionCard: {
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { fontSize: 15, fontWeight: '500' },
  divider: { height: 1, marginHorizontal: 12 },
  passwordForm: { paddingHorizontal: 12, paddingBottom: 14, gap: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  savePasswordButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  savePasswordText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#e63946',
    paddingVertical: 14,
    borderRadius: 12,
  },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});