import * as SQLite from "expo-sqlite";

let db;

export async function getDatabase() {
  if (!db) {
    db = await SQLite.openDatabaseAsync("estacionei_aqui.db");
  }
  return db;
}

export async function initDatabase() {
  const database = await getDatabase();
  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      notifications_enabled INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS parking_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
  `);

  try {
    await database.execAsync(`ALTER TABLE users ADD COLUMN photo_uri TEXT;`);
  } catch (error) {
    // Coluna já existe, pode ignorar
  }

  try {
    await database.execAsync(`ALTER TABLE users ADD COLUMN security_answer TEXT;`);
  } catch (error) {
    // Coluna já existe, pode ignorar
  }
}

// ---------- USUÁRIOS ----------

export async function registerUser(username, password, securityAnswer) {
  const database = await getDatabase();
  try {
    const normalizedAnswer = securityAnswer.trim().toLowerCase();
    const result = await database.runAsync(
      "INSERT INTO users (username, password, security_answer) VALUES (?, ?, ?)",
      [username, password, normalizedAnswer],
    );
    return { success: true, userId: result.lastInsertRowId };
  } catch (error) {
    if (error.message.includes("UNIQUE")) {
      return { success: false, message: "Esse nome de usuário já existe." };
    }
    return { success: false, message: "Erro ao cadastrar usuário." };
  }
}

export async function loginUser(username, password) {
  const database = await getDatabase();
  const user = await database.getFirstAsync(
    "SELECT * FROM users WHERE username = ? AND password = ?",
    [username, password],
  );
  if (user) {
    return { success: true, user };
  }
  return { success: false, message: "Usuário ou senha inválidos." };
}

export async function updateNotificationSetting(userId, enabled) {
  const database = await getDatabase();
  await database.runAsync(
    "UPDATE users SET notifications_enabled = ? WHERE id = ?",
    [enabled ? 1 : 0, userId],
  );
}

export async function updateUserPassword(userId, currentPassword, newPassword) {
  const database = await getDatabase();
  const user = await database.getFirstAsync(
    "SELECT * FROM users WHERE id = ? AND password = ?",
    [userId, currentPassword],
  );
  if (!user) {
    return { success: false, message: "Senha atual incorreta." };
  }
  await database.runAsync("UPDATE users SET password = ? WHERE id = ?", [
    newPassword,
    userId,
  ]);
  return { success: true };
}

export async function updateUserPhoto(userId, photoUri) {
  const database = await getDatabase();
  await database.runAsync("UPDATE users SET photo_uri = ? WHERE id = ?", [
    photoUri,
    userId,
  ]);
}

export async function checkUserExists(username) {
  const database = await getDatabase();
  const user = await database.getFirstAsync(
    "SELECT id, security_answer FROM users WHERE username = ?",
    [username],
  );
  return user;
}

export async function resetPasswordWithSecurityAnswer(
  username,
  securityAnswer,
  newPassword,
) {
  const database = await getDatabase();
  const normalizedAnswer = securityAnswer.trim().toLowerCase();
  const user = await database.getFirstAsync(
    "SELECT * FROM users WHERE username = ? AND security_answer = ?",
    [username, normalizedAnswer],
  );
  if (!user) {
    return { success: false, message: "Resposta de segurança incorreta." };
  }
  await database.runAsync("UPDATE users SET password = ? WHERE id = ?", [
    newPassword,
    user.id,
  ]);
  return { success: true };
}

// TEMPORÁRIO: só para debug, ver quais usuários existem no banco
export async function getAllUsers() {
  const database = await getDatabase();
  return await database.getAllAsync("SELECT id, username FROM users");
}

// ---------- LOCAIS DE ESTACIONAMENTO ----------

export async function saveParkingLocation(
  userId,
  latitude,
  longitude,
  note = "",
) {
  const database = await getDatabase();
  const createdAt = new Date().toISOString();
  const result = await database.runAsync(
    "INSERT INTO parking_locations (user_id, latitude, longitude, note, created_at) VALUES (?, ?, ?, ?, ?)",
    [userId, latitude, longitude, note, createdAt],
  );
  return {
    id: result.lastInsertRowId,
    latitude,
    longitude,
    note,
    created_at: createdAt,
  };
}

export async function getLastParkingLocation(userId) {
  const database = await getDatabase();
  return await database.getFirstAsync(
    "SELECT * FROM parking_locations WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
    [userId],
  );
}

export async function getParkingHistory(userId) {
  const database = await getDatabase();
  return await database.getAllAsync(
    "SELECT * FROM parking_locations WHERE user_id = ? ORDER BY created_at DESC",
    [userId],
  );
}

export async function deleteParkingLocation(id) {
  const database = await getDatabase();
  await database.runAsync("DELETE FROM parking_locations WHERE id = ?", [id]);
}

export async function clearHistory(userId) {
  const database = await getDatabase();
  await database.runAsync("DELETE FROM parking_locations WHERE user_id = ?", [
    userId,
  ]);
}