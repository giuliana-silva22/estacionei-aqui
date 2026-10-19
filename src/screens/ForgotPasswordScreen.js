import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
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
import { resetPasswordWithSecurityAnswer } from "../database/database";

const SECURITY_QUESTION = "Qual o nome do seu primeiro animal de estimação?";

export default function ForgotPasswordScreen({ onBack }) {
  const [username, setUsername] = useState("");
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!username.trim() || !answer.trim() || !newPassword || !confirmPassword) {
      Alert.alert("Atenção", "Preencha todos os campos.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Atenção", "As senhas não coincidem.");
      return;
    }
    if (newPassword.length < 4) {
      Alert.alert("Atenção", "A nova senha deve ter pelo menos 4 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const result = await resetPasswordWithSecurityAnswer(
        username.trim(),
        answer,
        newPassword,
      );
      if (result.success) {
        Alert.alert("Sucesso", "Senha redefinida! Agora faça login.");
        onBack();
      } else {
        Alert.alert("Erro", result.message);
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível redefinir a senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.logoArea}>
        <View style={styles.parkingSign}>
          <Ionicons name="key" size={48} color="#FFFFFF" />
        </View>
        <Text style={styles.title}>Recuperar senha</Text>
        <Text style={styles.subtitle}>{SECURITY_QUESTION}</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Usuário"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Resposta de segurança"
          value={answer}
          onChangeText={setAnswer}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Nova senha"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Confirmar nova senha"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleReset}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Aguarde..." : "Redefinir senha"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onBack}>
          <Text style={styles.switchText}>Voltar para o login</Text>
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
  title: { fontSize: 24, fontWeight: "bold", color: "#1E3A5F", marginTop: 12 },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
  form: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, gap: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  button: {
    backgroundColor: "#1E3A5F",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 16 },
  switchText: {
    color: "#3B82F6",
    textAlign: "center",
    marginTop: 12,
    fontSize: 13,
  },
});