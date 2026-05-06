import "dotenv/config";
import express from "express";
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ChannelType,
  PermissionsBitField
} from "discord.js";

/* =========================
   🔧 WEB (ANTI-SIGTERM)
========================= */
const app = express();
app.get("/", (req, res) => res.send("Bot online"));
app.listen(3000, () => console.log("🌐 Web server ativo"));

/* =========================
   🔒 PROTEÇÃO
========================= */
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

/* =========================
   🤖 CLIENT
========================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* =========================
   🔐 CONFIG
========================= */
const { TOKEN, CANAL_METAS } = process.env;

console.log("🔧 Iniciando...");
console.log("TOKEN:", TOKEN ? "OK" : "ERRO");
console.log("CANAL_METAS:", CANAL_METAS);

if (!TOKEN || !CANAL_METAS) {
  console.log("❌ CONFIG .env incompleta");
  process.exit(1);
}

/* =========================
   ⚙️ CONFIG GERAL
========================= */
const META_PADRAO = 200;

const CATEGORIA_LOG_ID = "1501326344586526820";
const CARGO_LIDER_ID = "1456655598396510215";
const NOME_CATEGORIA_META = "🏆 METAS CONCLUÍDAS";

const entregas = new Map();
const pendentes = new Map();

/* =========================
   📁 CANAL LOG
========================= */
async function getCanalLog(guild, user) {
  const categoria = guild.channels.cache.get(CATEGORIA_LOG_ID);
  if (!categoria) return null;

  const nome = `log-${user.username}`.toLowerCase().replace(/[^a-z0-9]/g, "");

  let canal = guild.channels.cache.find(
    c => c.name === nome && c.parentId === categoria.id
  );

  if (canal) return canal;

  return await guild.channels.create({
    name: nome,
    type: ChannelType.GuildText,
    parent: categoria.id,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      {
        id: user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages
        ]
      },
      {
        id: CARGO_LIDER_ID,
        allow: [PermissionsBitField.Flags.ViewChannel]
      }
    ]
  });
}

/* =========================
   🏆 META (CATEGORIA)
========================= */
async function getCategoriaMeta(guild) {
  let categoria = guild.channels.cache.find(
    c => c.name === NOME_CATEGORIA_META && c.type === ChannelType.GuildCategory
  );

  if (categoria) return categoria;

  return await guild.channels.create({
    name: NOME_CATEGORIA_META,
    type: ChannelType.GuildCategory
  });
}

async function criarCanalMeta(guild, user) {
  const categoria = await getCategoriaMeta(guild);

  const nome = `meta-${user.username}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  let canal = guild.channels.cache.find(
    c => c.name === nome && c.parentId === categoria.id
  );

  if (canal) return canal;

  return await guild.channels.create({
    name: nome,
    type: ChannelType.GuildText,
    parent: categoria.id,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
      { id: CARGO_LIDER_ID, allow: [PermissionsBitField.Flags.ViewChannel] }
    ]
  });
}

/* =========================
   🚀 READY
========================= */
client.once("ready", () => {
  console.log(`🔥 ONLINE: ${client.user.tag}`);
});

/* =========================
   🎮 INTERAÇÕES (SEM ERRO)
========================= */
client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;

    await interaction.deferReply({ flags: 64 });

    if (interaction.commandName === "meta") {
      return interaction.editReply("📸 Envie número + imagem no canal de metas");
    }

    if (interaction.commandName === "painel") {
      return interaction.editReply("👕 Painel ativo!");
    }

  } catch (err) {
    console.error(err);

    if (interaction.deferred) {
      interaction.editReply("❌ Erro interno");
    }
  }
});

/* =========================
   📸 SISTEMA DE METAS
========================= */
client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;

    if (message.channel.id !== CANAL_METAS) return;

    const userId = message.author.id;

    const numeroMatch = message.content.match(/\d+/);
    const temNumero = numeroMatch !== null;
    const temImagem = message.attachments.size > 0;

    let data = pendentes.get(userId) || { numero: null, imagem: null };

    if (temNumero) data.numero = parseInt(numeroMatch[0]);
    if (temImagem) data.imagem = message.attachments.first().url;

    pendentes.set(userId, data);

    if (!data.numero && data.imagem) {
      return message.reply("❌ Envie o número");
    }

    if (data.numero && !data.imagem) {
      return message.reply("📸 Envie a imagem");
    }

    if (data.numero && data.imagem) {

      const total = (entregas.get(userId) || 0) + 1;
      entregas.set(userId, total);

      const canalLog = await getCanalLog(message.guild, message.author);
      if (!canalLog) return message.reply("❌ Erro ao criar canal");

      await canalLog.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("📦 ENTREGA")
            .setImage(data.imagem)
            .addFields(
              { name: "Usuário", value: message.author.username },
              { name: "Quantidade", value: `${data.numero}` },
              { name: "Progresso", value: `${total}/${META_PADRAO}` }
            )
        ]
      });

      if (total >= META_PADRAO) {
        const canalMeta = await criarCanalMeta(message.guild, message.author);
        await canalMeta.send(`🏆 ${message.author} bateu a meta!`);
      }

      pendentes.delete(userId);

      return message.reply(`✅ Registrado (${total}/${META_PADRAO})`);
    }

  } catch (err) {
    console.error(err);
    message.reply("❌ Erro ao processar");
  }
});

/* ========================= */
client.login(TOKEN).catch(err => {
  console.error("❌ ERRO LOGIN:", err);
});
