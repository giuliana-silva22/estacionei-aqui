import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Pede permissão para enviar notificações ao usuário
export async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// Notificação imediata confirmando que o local foi salvo
export async function notifyLocationSaved() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Local salvo! 📍",
      body: "Sua vaga foi registrada com sucesso no Estacionei Aqui.",
    },
    trigger: null,
  });
}

// Lembrete único: dispara algumas horas depois de estacionar,
// perguntando se o carro ainda está no mesmo lugar.
export async function scheduleParkingReminder(hoursFromNow = 3) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Ainda estacionado? 🚗",
      body: "Já faz um tempo que você estacionou. Não esqueça de voltar para o seu carro!",
    },
    trigger: {
      seconds: hoursFromNow * 60 * 60,
      repeats: false,
    },
  });
}

export async function cancelReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}