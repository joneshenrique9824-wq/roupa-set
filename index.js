import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  Events,
  ChannelType,
  PermissionsBitField
} from "discord.js";

/* ========================= 🤖 BOT ========================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* ========================= 🔐 CONFIG ========================= */
const {
  TOKEN,
  CLIENT_ID,
  GUILD_ID,
  CANAL_MASCULINO,
  CANAL_FEMININO,
  META_CANAL,
  META_CATEGORIA
} = process.env;

/* ========================= 🔰 CARGOS ========================= */
const CARGO_MEMBRO = process.env.CARGO_MEMBRO || "1456655598396510213";
const CARGO_LIDER = process.env.CARGO_LIDER || "1456655598396510215";
const CARGO_GERENTE = process.env.CARGO_GERENTE || "1456655598530723956";

/* ========================= 📦 SISTEMA CARGOS ========================= */
const cargos = { LIDERANCA: [], GERENTE: [], MEMBROS: [] };
const cargosValidos = ["LIDERANCA", "GERENTE", "MEMBROS"];

/* ========================= 📊 META POR PLAYER ========================= */
const metas = {};

const META_DIARIA = {
  KEVLAR: 30,
  FERRO: 200
};

function hoje() {
  return new Date().toISOString().split("T")[0];
}

function initUser(id) {
  if (!metas[id]) {
    metas[id] = {
      data: hoje(),
      kevlar: 0,
      ferro: 0,
      canalId: null
    };
  }

  if (metas[id].data !== hoje()) {
    metas[id].data = hoje();
    metas[id].kevlar = 0;
    metas[id].ferro = 0;
  }
}

/* ========================= 📁 CRIAR CANAL DO PLAYER ========================= */
async function criarCanalUsuario(guild, user) {
  const name = `meta-${user.username}`.toLowerCase();

  const canal = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: META_CATEGORIA,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      }
    ]
  });

  return canal.id;
}

/* ========================= 🏆 RANKING ========================= */
function ranking() {
  return Object.entries(metas)
    .map(([id, m]) => ({
      id,
      total: m.kevlar + m.ferro
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

/* ========================= 📜 SLASH COMMANDS ========================= */
const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel"),

  new SlashCommandBuilder()
    .setName("quadro")
    .setDescription("Ver hierarquia"),

  new SlashCommandBuilder()
    .setName("meta")
    .setDescription("Ver sua meta diária"),

  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Ranking de farm"),

  new SlashCommandBuilder()
    .setName("addcargo")
    .setDescription("Adicionar cargo")
    .addStringOption(o =>
      o.setName("cargo").setDescription("Cargo").setRequired(true)
    )
    .addUserOption(o =>
      o.setName("pessoa").setDescription("Usuário").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("removercargo")
    .setDescription("Remover cargo")
    .addStringOption(o =>
      o.setName("cargo").setDescription("Cargo").setRequired(true)
    )
    .addUserOption(o =>
      o.setName("pessoa").setDescription("Usuário").setRequired(true)
    )
];

/* ========================= 🚀 REGISTER ========================= */
const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once(Events.ClientReady, async () => {
  console.log(`🔥 Logado como ${client.user.tag}`);

  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: commands.map(c => c.toJSON())
  });

  console.log("✅ Comandos registrados!");
});

/* ========================= 📸 META SYSTEM ========================= */
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== META_CANAL) return;

  const userId = message.author.id;
  initUser(userId);

  const content = message.content.toLowerCase();

  const temPrint =
    message.attachments.size > 0 ||
    message.embeds.length > 0 ||
    message.content.includes("http");

  if (!temPrint) {
    return message.reply("❌ Envie o PRINT junto da meta!");
  }

  const image =
    message.attachments.first()?.url ||
    message.embeds[0]?.image?.url ||
    null;

  const kevlar = content.match(/(\d+)\s*kevlar/);
  const ferro = content.match(/(\d+)\s*(ferro|minério|minerio)/);

  if (!kevlar && !ferro) {
    return message.reply("❌ Ex: 30 kevlar ou 200 ferro + print");
  }

  const guild = message.guild;

  /* ================= CANAL INDIVIDUAL ================= */
  if (!metas[userId].canalId) {
    metas[userId].canalId = await criarCanalUsuario(guild, message.author);
  }

  const canal = await guild.channels.fetch(metas[userId].canalId);

  let ganhos = [];

  if (kevlar) {
    metas[userId].kevlar += parseInt(kevlar[1]);
    ganhos.push(`🦺 Kevlar +${kevlar[1]}`);
  }

  if (ferro) {
    metas[userId].ferro += parseInt(ferro[1]);
    ganhos.push(`⛏️ Ferro +${ferro[1]}`);
  }

  const embed = new EmbedBuilder()
    .setTitle("📊 RELATÓRIO DO PLAYER")
    .setColor("#00ff99")
    .setDescription(ganhos.join("\n"))
    .addFields(
      {
        name: "🦺 Kevlar",
        value: `${metas[userId].kevlar}/${META_DIARIA.KEVLAR}`,
        inline: true
      },
      {
        name: "⛏️ Ferro",
        value: `${metas[userId].ferro}/${META_DIARIA.FERRO}`,
        inline: true
      },
      {
        name: "📈 Total",
        value: `${metas[userId].kevlar + metas[userId].ferro}`,
        inline: true
      }
    )
    .setFooter({ text: message.author.tag });

  if (image) embed.setImage(image);

  canal.send({ embeds: [embed] });

  message.reply("✅ Meta registrada com sucesso!");
});

/* ========================= 🎮 INTERAÇÕES ========================= */
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const id = interaction.user.id;
  initUser(id);

  /* ===== META ===== */
  if (interaction.commandName === "meta") {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("📊 SUA META")
          .setColor("#ffaa00")
          .addFields(
            { name: "Kevlar", value: `${metas[id].kevlar}/30`, inline: true },
            { name: "Ferro", value: `${metas[id].ferro}/200`, inline: true }
          )
      ],
      flags: 64
    });
  }

  /* ===== RANK ===== */
  if (interaction.commandName === "rank") {
    const top = ranking();

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🏆 RANKING")
          .setColor("#ffd700")
          .setDescription(
            top.map((u, i) => `**${i + 1}.** <@${u.id}> - ${u.total}`).join("\n")
          )
      ],
      flags: 64
    });
  }

  /* ===== CARGOS ===== */
  if (interaction.commandName === "quadro") {
    return interaction.reply({ content: "📊 Hierarquia ativa", flags: 64 });
  }

  if (interaction.commandName === "painel") {
    return interaction.reply({ content: "📦 Painel aberto", flags: 64 });
  }

  if (interaction.commandName === "addcargo" || interaction.commandName === "removercargo") {
    return interaction.reply({ content: "⚙️ Sistema de cargos ativo", flags: 64 });
  }
});

/* ========================= 💥 ANTI CRASH ========================= */
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

client.login(TOKEN);
