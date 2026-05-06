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

/* ========================= 📦 META SYSTEM ========================= */
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

/* ========================= 📁 CRIAR CANAL ========================= */
async function criarCanalUsuario(guild, user) {
  const nome = `meta-${user.username}`.toLowerCase();

  const canal = await guild.channels.create({
    name: nome,
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

/* ========================= 📜 COMANDOS ========================= */
const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel"),

  new SlashCommandBuilder()
    .setName("meta")
    .setDescription("Ver sua meta diária"),

  new SlashCommandBuilder()
    .setName("quadro")
    .setDescription("Ver hierarquia")
];

/* ========================= 🚀 REGISTRO ========================= */
const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once(Events.ClientReady, async () => {
  console.log(`🔥 Logado como ${client.user.tag}`);

  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: commands.map((c) => c.toJSON())
  });

  console.log("✅ Comandos registrados!");
});

/* ========================= 📸 META SYSTEM (PRINT + CANAL) ========================= */
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== META_CANAL) return;
  if (!message.attachments.size) {
    return message.reply("❌ Envie o PRINT junto da meta!");
  }

  const content = message.content.toLowerCase();
  const userId = message.author.id;

  initUser(userId);

  const matchKevlar = content.match(/(\d+)\s*kevlar/);
  const matchFerro = content.match(/(\d+)\s*(ferro|minério|minerio)/);

  if (!matchKevlar && !matchFerro) {
    return message.reply("❌ Use: `30 kevlar` ou `200 ferro` + print");
  }

  const guild = message.guild;

  // cria canal se não existir
  if (!metas[userId].canalId) {
    metas[userId].canalId = await criarCanalUsuario(guild, message.author);
  }

  const canal = await guild.channels.fetch(metas[userId].canalId);

  let ganho = [];

  if (matchKevlar) {
    const qtd = parseInt(matchKevlar[1]);
    metas[userId].kevlar += qtd;
    ganho.push(`🦺 +${qtd} Kevlar`);
  }

  if (matchFerro) {
    const qtd = parseInt(matchFerro[1]);
    metas[userId].ferro += qtd;
    ganho.push(`⛏️ +${qtd} Ferro`);
  }

  const embed = new EmbedBuilder()
    .setTitle("📊 RELATÓRIO DIÁRIO")
    .setColor("#00ff99")
    .setDescription(ganho.join("\n"))
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
      }
    )
    .setImage(message.attachments.first().url)
    .setFooter({ text: message.author.tag })
    .setTimestamp();

  canal.send({ embeds: [embed] });

  message.reply("✅ Meta registrada com sucesso!");
});

/* ========================= 📊 META COMANDO ========================= */
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "meta") {
    const id = interaction.user.id;
    initUser(id);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("📊 SUA META DIÁRIA")
          .setColor("#ffaa00")
          .addFields(
            {
              name: "🦺 Kevlar",
              value: `${metas[id].kevlar}/${META_DIARIA.KEVLAR}`,
              inline: true
            },
            {
              name: "⛏️ Ferro",
              value: `${metas[id].ferro}/${META_DIARIA.FERRO}`,
              inline: true
            }
          )
      ],
      ephemeral: true
    });
  }

  if (interaction.commandName === "painel") {
    return interaction.reply({
      content: "📦 Painel ativo (customizável depois)",
      ephemeral: true
    });
  }

  if (interaction.commandName === "quadro") {
    return interaction.reply({
      content: "📊 Sistema de hierarquia ativo",
      ephemeral: true
    });
  }
});

/* ========================= 💥 ANTI CRASH ========================= */
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

client.login(TOKEN);
