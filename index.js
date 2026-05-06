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
  Events
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
  META_CANAL
} = process.env;

/* ========================= 🔰 CARGOS ========================= */
const CARGO_MEMBRO = process.env.CARGO_MEMBRO || "1456655598396510213";
const CARGO_LIDER = process.env.CARGO_LIDER || "1456655598396510215";
const CARGO_GERENTE = process.env.CARGO_GERENTE || "1456655598530723956";

/* ========================= 📦 MEMÓRIA ========================= */
const cargos = { LIDERANCA: [], GERENTE: [], MEMBROS: [] };
const cargosValidos = ["LIDERANCA", "GERENTE", "MEMBROS"];

const cooldown = new Set();

/* ========================= 📊 META DIÁRIA ========================= */
const metas = {};

const META_DIARIA = {
  KEVLAR: 30,
  FERRO: 200
};

function getHoje() {
  return new Date().toISOString().split("T")[0];
}

function initUser(id) {
  if (!metas[id]) {
    metas[id] = { data: getHoje(), kevlar: 0, ferro: 0 };
  }

  if (metas[id].data !== getHoje()) {
    metas[id] = { data: getHoje(), kevlar: 0, ferro: 0 };
  }
}

/* ========================= 🔒 PERMISSÕES ========================= */
const temPermissao = (interaction) => {
  return (
    interaction.member?.roles?.cache?.has(CARGO_MEMBRO) ||
    interaction.member?.roles?.cache?.has(CARGO_LIDER) ||
    interaction.member?.roles?.cache?.has(CARGO_GERENTE)
  );
};

const isAdmin = (interaction) => {
  return (
    interaction.member?.roles?.cache?.has(CARGO_LIDER) ||
    interaction.member?.roles?.cache?.has(CARGO_GERENTE)
  );
};

/* ========================= 🧠 EMBED CARGOS ========================= */
function criarEmbedCargos() {
  const formatar = (lista) =>
    lista.length
      ? lista.map((id) => `• <@${id}>`).join("\n")
      : "• (vazio)";

  return new EmbedBuilder()
    .setColor("#2b2d31")
    .setDescription(
      `👥 **𝐇𝐈𝐄𝐑𝐀𝐑𝐐𝐔𝐈𝐀 𝐃𝐎 𝐂𝐋𝐀̃**

━━━━━━━━━━━━━━━━━━━━━━━
👑 **𝐋𝐈𝐃𝐄𝐑𝐀𝐍𝐂̧𝐀**
${formatar(cargos.LIDERANCA)}

━━━━━━━━━━━━━━━━━━━━━━━
👔 **𝐆𝐄𝐑𝐄𝐍𝐓𝐄**
${formatar(cargos.GERENTE)}

━━━━━━━━━━━━━━━━━━━━━━━
🪖 **𝐌𝐄𝐌𝐁𝐑𝐎𝐒**
${formatar(cargos.MEMBROS)}

━━━━━━━━━━━━━━━━━━━━━━━`
    );
}

/* ========================= 📜 COMANDOS ========================= */
const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel de uniformes"),

  new SlashCommandBuilder()
    .setName("quadro")
    .setDescription("Ver hierarquia"),

  new SlashCommandBuilder()
    .setName("addcargo")
    .setDescription("Adicionar cargo")
    .addStringOption((o) =>
      o
        .setName("cargo")
        .setDescription("LIDERANCA / GERENTE / MEMBROS")
        .setRequired(true)
    )
    .addUserOption((o) =>
      o.setName("pessoa").setDescription("Usuário").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("removercargo")
    .setDescription("Remover cargo")
    .addStringOption((o) =>
      o
        .setName("cargo")
        .setDescription("LIDERANCA / GERENTE / MEMBROS")
        .setRequired(true)
    )
    .addUserOption((o) =>
      o.setName("pessoa").setDescription("Usuário").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("meta")
    .setDescription("Ver sua meta diária")
];

/* ========================= 🚀 REGISTER ========================= */
const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once(Events.ClientReady, async () => {
  console.log(`🔥 Logado como ${client.user.tag}`);

  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: commands.map((c) => c.toJSON())
  });

  console.log("✅ Comandos registrados!");
});

/* ========================= 📩 META SYSTEM ========================= */
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== META_CANAL) return;
  if (!message.attachments.size) return;

  const content = message.content.toLowerCase();
  const userId = message.author.id;

  initUser(userId);

  const matchKevlar = content.match(/(\d+)\s*kevlar/);
  const matchFerro = content.match(/(\d+)\s*(ferro|minério|minerio)/);

  let resposta = [];

  if (matchKevlar) {
    const qtd = parseInt(matchKevlar[1]);
    metas[userId].kevlar += qtd;
    resposta.push(`🦺 +${qtd} Kevlar`);
  }

  if (matchFerro) {
    const qtd = parseInt(matchFerro[1]);
    metas[userId].ferro += qtd;
    resposta.push(`⛏️ +${qtd} Ferro`);
  }

  if (!resposta.length) return;

  const embed = new EmbedBuilder()
    .setColor("#00ff99")
    .setTitle("📦 META REGISTRADA")
    .setDescription(resposta.join("\n"))
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
    .setFooter({ text: message.author.tag });

  message.reply({ embeds: [embed] });
});

/* ========================= 🎮 INTERAÇÕES ========================= */
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const cargoRaw = interaction.options.getString("cargo");
  const cargo = cargoRaw?.toUpperCase();
  const user = interaction.options.getUser("pessoa");

  /* ===== META ===== */
  if (interaction.commandName === "meta") {
    const id = interaction.user.id;
    initUser(id);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#ffaa00")
          .setTitle("📊 SUA META DIÁRIA")
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

  /* ===== QUADRO ===== */
  if (interaction.commandName === "quadro") {
    if (!temPermissao(interaction))
      return interaction.reply({ content: "❌ Sem permissão", ephemeral: true });

    return interaction.reply({ embeds: [criarEmbedCargos()] });
  }

  /* ===== ADD CARGO ===== */
  if (interaction.commandName === "addcargo") {
    if (!isAdmin(interaction))
      return interaction.reply({ content: "❌ Sem permissão", ephemeral: true });

    if (!cargosValidos.includes(cargo))
      return interaction.reply({ content: "❌ Cargo inválido", ephemeral: true });

    if (!cargos[cargo].includes(user.id)) {
      cargos[cargo].push(user.id);
    }

    return interaction.reply({
      content: `✅ Adicionado em ${cargo}`,
      ephemeral: true
    });
  }

  /* ===== REMOVER CARGO ===== */
  if (interaction.commandName === "removercargo") {
    if (!isAdmin(interaction))
      return interaction.reply({ content: "❌ Sem permissão", ephemeral: true });

    cargos[cargo] = cargos[cargo].filter((id) => id !== user.id);

    return interaction.reply({
      content: `❌ Removido de ${cargo}`,
      ephemeral: true
    });
  }
});

/* ========================= 💥 ANTI CRASH ========================= */
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

client.login(TOKEN);
