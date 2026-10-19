# 📍 Estacionei Aqui

App mobile que resolve um problema simples e universal: **"onde eu deixei o carro?"**

Desenvolvido como projeto da matéria de **Programação para Dispositivos Móveis (Android)**, no curso de Programação para Dispositivos Móveis da **Estácio**, por Giuliana Silva.

---

## 💡 O problema

Motoristas estacionam em ruas, shoppings, garagens e eventos ao longo do dia e, principalmente em locais grandes ou desconhecidos, esquecem exatamente onde deixaram o carro — perdendo tempo e paciência procurando.

## ✅ A solução

O **Estacionei Aqui** salva a localização do carro com um toque e guia o motorista de volta até ele — sem complicação, sem custo e sem depender de servidor próprio.

---

## ⚙️ Funcionalidades

- 🔐 **Cadastro e login**, com opção de entrar por **biometria** (digital / Face ID)
- 📍 Botão **"Estacionei Aqui!"** salva a localização atual com um toque
- 🗺️ Tela inicial mostra **onde o carro está**, o endereço (via reverse geocoding) e há quanto tempo
- 🕓 **Histórico de vagas**, com opção de apagar registros antigos
- 🧭 Toque no local salvo abre a **rota direto no Google Maps / Apple Maps**
- 📤 **Compartilhar localização** do carro por WhatsApp/mensagens
- 🔔 **Lembrete automático** perguntando se o carro ainda está no mesmo lugar
- 🌗 **Tema claro/escuro**
- 🔑 Recuperação de senha por **pergunta de segurança** (sem precisar de e-mail)
- 📳 Feedback de **vibração** (haptics) nas principais ações

---

## 🛠️ Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React Native + Expo (JavaScript) |
| Navegação | React Navigation (native-stack) |
| Banco de dados | SQLite local (`expo-sqlite`) — sem backend próprio |
| Localização | `expo-location` (posição atual + reverse geocoding) |
| Biometria | `expo-local-authentication` + `expo-secure-store` |
| Notificações | `expo-notifications` |
| Mapa | Tiles do OpenStreetMap (imagem estática, sem chave de API) |
| Build Android | EAS Build |

---

## 📁 Estrutura do projeto

```
EstacioneiAqui/
├── App.js                     → ponto de entrada, inicializa banco e providers
├── app.json                   → configurações do Expo (ícone, splash, nome)
├── src/
│   ├── context/
│   │   ├── AuthContext.js     → estado global de quem está logado
│   │   └── ThemeContext.js    → tema claro/escuro global
│   ├── database/
│   │   └── database.js        → funções de acesso ao SQLite
│   ├── navigation/
│   │   └── AppNavigator.js    → navegação condicional (logado ou não)
│   ├── screens/
│   │   ├── LoginScreen.js
│   │   ├── ForgotPasswordScreen.js
│   │   ├── HomeScreen.js
│   │   └── SettingsScreen.js
│   └── services/
│       └── NotificationService.js
```

---

## 🚧 Desafios técnicos

O maior desafio do projeto foi um **crash no app em build Android real** ao tentar usar um mapa interativo embutido (`react-native-maps`) sem uma chave de API do Google Maps. A solução foi remover o mapa embutido e usar, em vez disso:

- Links externos para abrir o Google Maps / Apple Maps (via `Linking`)
- Uma imagem estática de mapa (tiles do OpenStreetMap), sem necessidade de chave paga

Essa decisão eliminou o risco de travamento, manteve o app 100% gratuito e funcionando tanto no Expo Go quanto em builds nativos.

---

## ▶️ Como rodar o projeto

```bash
npm install
npx expo start
```

Escaneie o QR code com o app **Expo Go** (Android ou iOS).

---

## 👩‍💻 Autora

**Giuliana Silva**
Programação para Dispositivos Móveis — Estácio
