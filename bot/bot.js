const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const express = require("express");
const mysql = require("mysql2/promise");

require("dotenv").config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN || "TON_TOKEN_DISCORD";
const PORT = parseInt(process.env.BOT_PORT || "3000", 10);
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID || "ID_DU_CHANNEL_LOGS";

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "password",
  database: process.env.DB_NAME || "fivem_protection"
};

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const app = express();

// API: check ip
app.get("/checkip", async (req, res) => {
  const ip = req.query.ip;
  if (!ip) return res.send("DENIED");

  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      "SELECT ip FROM whitelist WHERE ip = ? AND (expires_at IS NULL OR expires_at > NOW())",
      [ip]
    );
    await conn.end();

    if (rows.length > 0) res.send("ALLOWED");
    else res.send("DENIED");
  } catch (err) {
    console.error(err);
    res.send("ERROR");
  }
});

// API: log denied attempts
app.get("/logdenied", (req, res) => {
  const ip = req.query.ip;
  if (!ip) return res.send("NO_IP");

  const channel = client.channels.cache.get(LOG_CHANNEL_ID);
  if (channel) {
    const embed = new EmbedBuilder()
      .setTitle("🚨 Tentative d'utilisation non autorisée")
      .setDescription("Un serveur a tenté de lancer la ressource depuis une IP **non whitelistée**.")
      .addFields({ name: "IP détectée", value: `\`${ip}\`` })
      .setColor(0xFF0000)
      .setTimestamp();

    channel.send({ embeds: [embed] });
  }
  res.send("LOGGED");
});

// Commands
client.on("messageCreate", async (msg) => {
  if (!msg.content.startsWith("!")) return;
  const args = msg.content.trim().split(/\s+/);
  const command = args[0].toLowerCase();

  if (command === "!addip") {
    const ip = args[1];
    const days = parseInt(args[2]) || 30;
    if (!ip) return msg.reply("❌ Utilisation : !addip <ip> <jours>");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    try {
      const conn = await mysql.createConnection(dbConfig);
      await conn.execute(
        "INSERT INTO whitelist (ip, expires_at) VALUES (?, ?) ON DUPLICATE KEY UPDATE expires_at = ?",
        [ip, expiresAt, expiresAt]
      );
      await conn.end();
      msg.reply(`✅ IP ${ip} ajoutée pour ${days} jours (expire le ${expiresAt.toLocaleString()}).`);
      updateBotStatus();
    } catch (err) {
      console.error(err);
      msg.reply("⚠️ Erreur SQL.");
    }
  }

  if (command === "!removeip") {
    const ip = args[1];
    if (!ip) return msg.reply("❌ Utilisation : !removeip <ip>");
    try {
      const conn = await mysql.createConnection(dbConfig);
      await conn.execute("DELETE FROM whitelist WHERE ip = ?", [ip]);
      await conn.end();
      msg.reply(`🗑️ IP ${ip} supprimée de la whitelist.`);
      updateBotStatus();
    } catch (err) {
      console.error(err);
      msg.reply("⚠️ Erreur SQL.");
    }
  }

  if (command === "!listip") {
    try {
      const conn = await mysql.createConnection(dbConfig);
      const [rows] = await conn.execute("SELECT ip, expires_at FROM whitelist ORDER BY expires_at IS NULL DESC, expires_at ASC");
      await conn.end();
      if (rows.length === 0) return msg.reply("📭 Aucune IP whitelistée.");
      const ipList = rows.map(r => r.expires_at ? `${r.ip} (expire le ${new Date(r.expires_at).toLocaleString()})` : `${r.ip} (illimitée)`).join("\n");
      msg.reply("📜 **Liste des IP autorisées :**\n" + ipList);
    } catch (err) {
      console.error(err);
      msg.reply("⚠️ Erreur SQL.");
    }
  }

  if (command === "!cleanips") {
    try {
      const conn = await mysql.createConnection(dbConfig);
      const [result] = await conn.execute("DELETE FROM whitelist WHERE expires_at IS NOT NULL AND expires_at < NOW()");
      await conn.end();
      msg.reply(`🧹 Nettoyage effectué : ${result.affectedRows} IP(s) expirée(s) supprimée(s).`);
      updateBotStatus();
    } catch (err) {
      console.error(err);
      msg.reply("⚠️ Erreur SQL lors du nettoyage.");
    }
  }
});

async function updateBotStatus() {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute("SELECT COUNT(*) AS total FROM whitelist WHERE expires_at IS NULL OR expires_at > NOW()");
    await conn.end();
    const count = rows[0].total;
    if (client.user) client.user.setActivity(`${count} IP(s) valides`, { type: 3 });
  } catch (err) {
    console.error("Erreur mise à jour statut bot :", err);
  }
}

client.once("ready", () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
  updateBotStatus();
  setInterval(updateBotStatus, 60000);
});

client.login(DISCORD_TOKEN);
app.listen(PORT, () => console.log(`✅ API active sur http://127.0.0.1:${PORT}`));
