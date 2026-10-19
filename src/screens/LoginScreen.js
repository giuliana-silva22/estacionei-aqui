import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { loginUser, registerUser } from "../database/database";
import ForgotPasswordScreen from "./ForgotPasswordScreen";

const SAVED_USER_KEY = "estacionei_aqui_saved_user";
const BIOMETRIC_ENABLED_KEY = "estacionei_aqui_biometric_enabled";
const SECURITY_QUESTION = "Qual o nome do seu primeiro animal de estimação?";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [savedUser, setSavedUser] = useState(null);
  const [forgotMode, setForgotMode] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
    checkBiometricLogin();
  }, []);

  async function checkBiometricLogin() {
    const enabledFlag = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    const storedUser = await SecureStore.getItemAsync(SAVED_USER_KEY);

    if (enabledFlag === "true" && storedUser) {
      setBiometricAvailable(true);
      setSavedUser(JSON.parse(storedUser));
    }
  }

  async function handleBiometricLogin() {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Confirme sua identidade",
        cancelLabel: "Cancelar",
        fallbackLabel: "Usar senha",
      });
      if (result.success) {
        login(savedUser);
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível autenticar com biometria.");
    }
  }

  async function handleSubmit() {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Atenção", "Preencha usuário e senha.");
      return;
    }
    if (isRegisterMode && !securityAnswer.trim()) {
      Alert.alert("Atenção", "Responda a pergunta de segurança.");
      return;
    }

    setLoading(true);
    try {
      if (isRegisterMode) {
        const result = await registerUser(
          username.trim(),
          password,
          securityAnswer,
        );
        if (result.success) {
          Alert.alert("Sucesso", "Cadastro realizado! Agora faça login.");
          setIsRegisterMode(false);
          setSecurityAnswer("");
        } else {
          Alert.alert("Erro", result.message);
        }
      } else {
        const result = await loginUser(username.trim(), password);
        if (result.success) {
          login(result.user);
        } else {
          Alert.alert("Erro", result.message);
        }
      }
    } catch (error) {
      Alert.alert("Erro", "Algo deu errado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (forgotMode) {
    return <ForgotPasswordScreen onBack={() => setForgotMode(false)} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.logoArea}>
        <View style={styles.parkingSign}>
          <Ionicons name="location" size={56} color="#FFFFFF" />
        </View>
        <Text style={styles.title}>Estacionei Aqui</Text>
        <Text style={styles.subtitle}>Nunca mais perca seu veículo de vista</Text>
      </View>

      <View style={styles.form}>
        {biometricAvailable && !isRegisterMode && (
          <>
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={handleBiometricLogin}
            >
              <Ionicons name="finger-print" size={22} color="#1E3A5F" />
              <Text style={styles.biometricText}>
                Entrar como {savedUser?.username} (biometria)
              </Text>
            </TouchableOpacity>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>
          </>
        )}

        <Text style={styles.label}>Usuário</Text>
        <TextInput
          style={styles.input}
          placeholder="Digite seu usuário"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Senha</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Digite sua senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>
        </View>

        {isRegisterMode && (
          <>
            <Text style={styles.label}>{SECURITY_QUESTION}</Text>
            <TextInput
              style={styles.input}
              placeholder="Sua resposta (para recuperar a senha depois)"
              value={securityAnswer}
              onChangeText={setSecurityAnswer}
              autoCapitalize="none"
            />
          </>
        )}

        {!isRegisterMode && (
          <TouchableOpacity onPress={() => setForgotMode(true)}>
            <Text style={styles.forgotText}>Esqueceu a senha?</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Aguarde..." : isRegisterMode ? "Cadastrar" : "Entrar"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsRegisterMode(!isRegisterMode)}>
          <Text style={styles.switchText}>
            {isRegisterMode
              ? "Já tem conta? Fazer login"
              : "Não tem conta? Cadastre-se"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoArea: { alignItems: "center", marginBottom: 40 },
  parkingSign: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: "#1E3A5F",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 28, fontWeight: "bold", color: "#1E3A5F", marginTop: 12 },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
  form: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20 },
  biometricButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#1E3A5F",
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
  },
  biometricText: { color: "#1E3A5F", fontWeight: "600", fontSize: 14 },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  dividerText: { marginHorizontal: 10, color: "#9CA3AF", fontSize: 12 },
  label: { fontSize: 13, color: "#6B7280", marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
  },
  forgotText: { color: "#3B82F6", textAlign: "right", marginTop: 10, fontSize: 13 },
  button: {
    backgroundColor: "#1E3A5F",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 16 },
  switchText: { color: "#3B82F6", textAlign: "center", marginTop: 16, fontSize: 13 },
});