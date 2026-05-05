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

/* =========================
   🤖 BOT
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
const {
  TOKEN,
  CLIENT_ID,
  GUILD_ID,
  CANAL_MASCULINO,
  CANAL_FEMININO
} = process.env;

const CANAL_METAS = "1501326790537379860";

/* =========================
   🔰 CARGOS
========================= */
const CARGO_MEMBRO = process.env.CARGO_MEMBRO || "1456655598396510213";
const CARGO_LIDER = process.env.CARGO_LIDER || "1456655598396510215";
const CARGO_GERENTE = process.env.CARGO_GERENTE || "1456655598530723956";

/* =========================
   📦 MEMÓRIA
========================= */
const cargos = {
  LIDERANCA: [],
  GERENTE: [],
  MEMBROS: []
};

const cargosValidos = ["LIDERANCA", "GERENTE", "MEMBROS"];

// 🎯 METAS
const metasPlayer = {};
const META_TOTAL = 10;

/* =========================
   ⏱️ COOLDOWN
========================= */
const cooldown = new Set();

/* =========================
   🔒 PERMISSÕES
========================= */
const temPermissao = (interaction) => {
  if (interaction.member?.roles?.cache?.has(CARGO_MEMBRO)) return true;
  if (interaction.member?.roles?.cache?.has(CARGO_LIDER)) return true;
  if (interaction.member?.roles?.cache?.has(CARGO_GERENTE)) return true;
  return false;
};

const isAdmin = (interaction) => {
  return (
    interaction.member?.roles?.cache?.has(CARGO_LIDER) ||
    interaction.member?.roles?.cache?.has(CARGO_GERENTE)
  );
};

/* =========================
   🧠 EMBED CARGOS
========================= */
function criarEmbedCargos() {
  const formatar = (lista) =>
    lista.length ? lista.map(id => `• <@${id}>`).join("\n") : "• (vazio)";

  return new EmbedBuilder()
    .setColor("#2b2d31")
    .setDescription(
`👥 **𝐇𝐈𝐄𝐑𝐀𝐑𝐐𝐔𝐈𝐀**

👑 LIDERANÇA
${formatar(cargos.LIDERANCA)}

👔 GERENTE
${formatar(cargos.GERENTE)}

🪖 MEMBROS
${formatar(cargos.MEMBROS)}`
    );
}

/* =========================
   🏗️ CANAL PLAYER
========================= */
async function pegarOuCriarCanalPlayer(guild, user) {
  const nome = `meta-${user.username}`.toLowerCase();
  let canal = guild.channels.cache.find(c => c.name === nome);

  if (canal) return canal;

  return await guild.channels.create({
    name: nome,
    type: 0
  });
}

/* =========================
   📜 COMANDOS
========================= */
const commands = [
  new SlashCommandBuilder().setName("painel").setDescription("Uniformes"),
  new SlashCommandBuilder().setName("quadro").setDescription("Hierarquia"),

  new SlashCommandBuilder()
    .setName("addcargo")
    .setDescription("Adicionar cargo")
    .addStringOption(o => o.setName("cargo").setRequired(true))
    .addUserOption(o => o.setName("pessoa").setRequired(true)),

  new SlashCommandBuilder()
    .setName("removercargo")
    .setDescription("Remover cargo")
    .addStringOption(o => o.setName("cargo").setRequired(true))
    .addUserOption(o => o.setName("pessoa").setRequired(true)),

  new SlashCommandBuilder()
    .setName("meta")
    .setDescription("Painel de metas")
];

/* =========================
   🚀 REGISTER
========================= */
const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once(Events.ClientReady, async () => {
  console.log(`🔥 ${client.user.tag}`);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands.map(c => c.toJSON()) }
  );
});

/* =========================
   🎮 INTERAÇÕES
========================= */
client.on(Events.InteractionCreate, async (interaction) => {

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "meta") {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🎯 META DIÁRIA")
          .setDescription("Envie print no canal de metas")
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("meta_btn")
            .setLabel("Enviar Meta")
            .setStyle(ButtonStyle.Success)
        )
      ]
    });
  }

  if (interaction.commandName === "quadro") {
    return interaction.reply({ embeds: [criarEmbedCargos()] });
  }
});

/* =========================
   📸 SISTEMA DE META
========================= */
client.on("messageCreate", async (message) => {

  if (message.author.bot) return;
  if (message.channel.id !== CANAL_METAS) return;

  const attachment = message.attachments.first();
  if (!attachment || !attachment.contentType?.startsWith("image")) return;

  const id = message.author.id;

  if (!metasPlayer[id]) metasPlayer[id] = 0;
  metasPlayer[id]++;

  const feitas = metasPlayer[id];
  const faltam = META_TOTAL - feitas;

  const canal = await pegarOuCriarCanalPlayer(message.guild, message.author);

  const embed = new EmbedBuilder()
    .setTitle("✅ META REGISTRADA")
    .addFields(
      { name: "👤 Jogador", value: `<@${id}>`, inline: true },
      { name: "📊 Feitas", value: `${feitas}`, inline: true },
      { name: "📉 Faltam", value: `${faltam > 0 ? faltam : 0}`, inline: true },
      { name: "📦 Meta", value: "30 Kevlar\n200 Minério de Ferro" }
    )
    .setImage(attachment.url)
    .setColor("#00ff00");

  await canal.send({ embeds: [embed] });

  await message.reply(`✅ Meta registrada! Canal: ${canal}`);
});

/* =========================
   ANTI CRASH
========================= */
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

client.login(TOKEN);
