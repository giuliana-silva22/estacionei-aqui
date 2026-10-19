import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    Image,
    Linking,
    Platform,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
    deleteParkingLocation,
    getLastParkingLocation,
    getParkingHistory,
    saveParkingLocation,
} from "../database/database";
import {
    cancelReminders,
    notifyLocationSaved,
    requestNotificationPermission,
    scheduleParkingReminder,
} from "../services/NotificationService";

const MAP_ZOOM = 17;

// Converte latitude/longitude em qual "quadradinho" (tile) do mapa buscar,
// e em que posição exata (fração de 0 a 1) o pin cai dentro desse quadradinho.
function getTileCoords(lat, lon, zoom) {
  const latRad = (lat * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  const xExact = ((lon + 180) / 360) * n;
  const yExact =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const tileX = Math.floor(xExact);
  const tileY = Math.floor(yExact);
  return {
    tileX,
    tileY,
    fracX: xExact - tileX,
    fracY: yExact - tileY,
  };
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { colors: theme } = useTheme();
  const navigation = useNavigation();
  const [currentPosition, setCurrentPosition] = useState(null);
  const [parkedSpot, setParkedSpot] = useState(null);
  const [parkedAddress, setParkedAddress] = useState(null);
  const [history, setHistory] = useState([]);
  const [addresses, setAddresses] = useState({});
  const [saving, setSaving] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permissão negada",
          "O app precisa da sua localização para funcionar.",
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setCurrentPosition(position.coords);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user]),
  );

  async function loadData() {
    if (!user) return;
    const last = await getLastParkingLocation(user.id);
    setParkedSpot(last || null);
    setMapError(false);
    if (last) {
      resolveAddress(last.latitude, last.longitude, setParkedAddress);
    } else {
      setParkedAddress(null);
    }

    const hist = await getParkingHistory(user.id);
    setHistory(hist);
    hist.forEach((item) => {
      resolveAddress(item.latitude, item.longitude, (addr) => {
        setAddresses((prev) => ({ ...prev, [item.id]: addr }));
      });
    });
  }

  async function resolveAddress(latitude, longitude, callback) {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (results && results.length > 0) {
        const { street, streetNumber, district } = results[0];
        const parts = [street, streetNumber, district].filter(Boolean);
        callback(parts.join(", ") || "Endereço não encontrado");
      } else {
        callback("Endereço não encontrado");
      }
    } catch (error) {
      callback(null);
    }
  }

  function formatTimeAgo(dateString) {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "agora mesmo";
    if (minutes < 60) return `há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMin = minutes % 60;
    if (hours < 24) {
      return remainingMin > 0
        ? `há ${hours}h ${remainingMin}min`
        : `há ${hours}h`;
    }
    const days = Math.floor(hours / 24);
    return `há ${days} dia${days > 1 ? "s" : ""}`;
  }

  function openDirections(latitude, longitude) {
    const url = Platform.select({
      ios: `https://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`,
      android: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    });
    Linking.openURL(url).catch(() => {
      Alert.alert("Erro", "Não foi possível abrir o mapa.");
    });
  }

  async function handleShareLocation() {
    if (!parkedSpot) return;
    const mapsUrl = Platform.select({
      ios: `https://maps.apple.com/?daddr=${parkedSpot.latitude},${parkedSpot.longitude}&dirflg=d`,
      android: `https://www.google.com/maps/dir/?api=1&destination=${parkedSpot.latitude},${parkedSpot.longitude}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${parkedSpot.latitude},${parkedSpot.longitude}`,
    });
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share({
        message: `Estacionei o carro aqui${parkedAddress ? `: ${parkedAddress}` : ""}. Veja no mapa: ${mapsUrl}`,
      });
    } catch (error) {
      Alert.alert("Erro", "Não foi possível compartilhar a localização.");
    }
  }

  async function handleSaveLocation() {
    if (!currentPosition) {
      Alert.alert("Aguarde", "Ainda estamos obtendo sua localização.");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveParkingLocation(
        user.id,
        currentPosition.latitude,
        currentPosition.longitude,
      );
      setParkedSpot(saved);
      setMapError(false);
      await loadData();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await notifyLocationSaved();

      const permissionGranted = await requestNotificationPermission();
      if (permissionGranted) {
        await scheduleParkingReminder(3);
      }

      Alert.alert("Pronto!", "Local do estacionamento salvo com sucesso.");
    } catch (error) {
      Alert.alert("Erro", "Não foi possível salvar o local.");
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteHistoryItem(id) {
    Alert.alert("Apagar registro", "Deseja remover este local do histórico?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const wasCurrentSpot = parkedSpot && parkedSpot.id === id;
          await deleteParkingLocation(id);
          if (wasCurrentSpot) {
            await cancelReminders();
          }
          await loadData();
        },
      },
    ]);
  }

  const firstName = user?.username?.split(" ")[0] || "motorista";

  const tileCoords = useMemo(() => {
    if (!parkedSpot) return null;
    return getTileCoords(parkedSpot.latitude, parkedSpot.longitude, MAP_ZOOM);
  }, [parkedSpot]);

  const showMapImage = parkedSpot && !mapError && tileCoords && mapSize.width > 0;
  const squareSize = showMapImage ? Math.max(mapSize.width, mapSize.height) : 0;
  const squareOffsetX = showMapImage ? (mapSize.width - squareSize) / 2 : 0;
  const squareOffsetY = showMapImage ? (mapSize.height - squareSize) / 2 : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[styles.map, { backgroundColor: theme.card }]}
        onLayout={(e) => setMapSize(e.nativeEvent.layout)}
      >
        {showMapImage ? (
          <TouchableOpacity
            activeOpacity={0.9}
            style={StyleSheet.absoluteFill}
            onPress={() => openDirections(parkedSpot.latitude, parkedSpot.longitude)}
          >
            <Image
              source={{
                uri: `https://tile.openstreetmap.org/${MAP_ZOOM}/${tileCoords.tileX}/${tileCoords.tileY}.png`,
              }}
              style={{
                position: "absolute",
                left: squareOffsetX,
                top: squareOffsetY,
                width: squareSize,
                height: squareSize,
              }}
              resizeMode="cover"
              onError={() => setMapError(true)}
            />
            <View
              style={{
                position: "absolute",
                left: squareOffsetX + tileCoords.fracX * squareSize - 14,
                top: squareOffsetY + tileCoords.fracY * squareSize - 28,
              }}
            >
              <Ionicons name="location" size={28} color="#E63946" />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.mapPanelContent}>
            <Ionicons name="location" size={56} color={theme.primary} />
            <Text style={[styles.mapPanelTitle, { color: theme.text }]}>
              Estacionei Aqui
            </Text>
            <Text style={[styles.mapPanelSubtitle, { color: theme.subtext }]}>
              {parkedSpot
                ? "Toque no cartão abaixo para ver o caminho até o seu carro"
                : "Toque em \"Estacionei Aqui!\" para salvar o local do seu carro"}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.settingsButton, { backgroundColor: theme.card }]}
        onPress={() => navigation.navigate("Settings")}
      >
        <Ionicons name="settings-outline" size={24} color={theme.icon} />
      </TouchableOpacity>

      <View style={[styles.bottomSheet, { backgroundColor: theme.card }]}>
        <Text style={[styles.greeting, { color: theme.text }]}>
          Olá, {firstName} 👋
        </Text>

        {parkedSpot ? (
          <>
            <TouchableOpacity
              style={[styles.statusCard, { backgroundColor: theme.background }]}
              onPress={() => openDirections(parkedSpot.latitude, parkedSpot.longitude)}
            >
              <Ionicons name="car-sport" size={28} color={theme.icon} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.statusTitle, { color: theme.text }]}>
                  Estacionado {formatTimeAgo(parkedSpot.created_at)}
                </Text>
                <Text style={[styles.statusAddress, { color: theme.subtext }]}>
                  {parkedAddress || "Buscando endereço..."}
                </Text>
              </View>
              <Ionicons name="navigate-outline" size={20} color={theme.icon} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareRow} onPress={handleShareLocation}>
              <Ionicons name="share-social-outline" size={16} color={theme.primary} />
              <Text style={[styles.shareText, { color: theme.primary }]}>
                Compartilhar localização
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={[styles.statusCardEmpty, { backgroundColor: theme.background }]}>
            <Ionicons name="location-outline" size={24} color={theme.subtext} />
            <Text style={[styles.statusEmptyText, { color: theme.subtext }]}>
              Você ainda não registrou onde estacionou
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.primary }]}
          onPress={handleSaveLocation}
          disabled={saving}
        >
          <Ionicons name="location" size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>
            {saving ? "Salvando..." : "Estacionei Aqui!"}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.historyTitle, { color: theme.text }]}>
          Histórico de vagas
        </Text>
        <FlatList
          data={history}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.historyItem, { borderBottomColor: theme.border }]}
              onPress={() => openDirections(item.latitude, item.longitude)}
            >
              <Ionicons name="time-outline" size={18} color={theme.subtext} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.historyAddress, { color: theme.text }]}>
                  {addresses[item.id] || "Buscando endereço..."}
                </Text>
                <Text style={[styles.historyTime, { color: theme.subtext }]}>
                  {new Date(item.created_at).toLocaleString("pt-BR")}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteHistoryItem(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={20} color="#e63946" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.subtext }]}>
              Nenhum local salvo ainda.
            </Text>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1, overflow: "hidden" },
  mapPanelContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  mapPanelTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 12,
  },
  mapPanelSubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
  },
  settingsButton: {
    position: "absolute",
    top: 50,
    right: 16,
    padding: 10,
    borderRadius: 24,
    elevation: 4,
    zIndex: 10,
  },
  bottomSheet: {
    height: 340,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  greeting: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
  },
  statusTitle: { fontWeight: "700", fontSize: 14 },
  statusAddress: { fontSize: 12, marginTop: 2 },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    marginBottom: 6,
  },
  shareText: { fontSize: 13, fontWeight: "600" },
  statusCardEmpty: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  statusEmptyText: { fontSize: 13, marginLeft: 10 },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 14,
  },
  saveButtonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 15 },
  historyTitle: {
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 8,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  historyAddress: { fontSize: 13, fontWeight: "500" },
  historyTime: { fontSize: 11, marginTop: 2 },
  emptyText: { fontSize: 13, paddingVertical: 8 },
});