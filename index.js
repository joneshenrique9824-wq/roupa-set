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

// 🎯 canal fixo metas
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

// 🎯 metas
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

/* =========================
   🧠 EMBED CARGOS
========================= */
function criarEmbedCargos() {
  const formatar = (lista) =>
    lista.length ? lista.map(id => `• <@${id}>`).join("\n") : "• (vazio)";

  return new EmbedBuilder()
    .setColor("#2b2d31")
    .setDescription(
`👥 **HIERARQUIA**

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

  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel de uniformes"),

  new SlashCommandBuilder()
    .setName("quadro")
    .setDescription("Ver hierarquia"),

  new SlashCommandBuilder()
    .setName("addcargo")
    .setDescription("Adicionar pessoa ao cargo")
    .addStringOption(o =>
      o.setName("cargo")
        .setDescription("LIDERANCA / GERENTE / MEMBROS")
        .setRequired(true)
    )
    .addUserOption(o =>
      o.setName("pessoa")
        .setDescription("Usuário alvo")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("removercargo")
    .setDescription("Remover pessoa do cargo")
    .addStringOption(o =>
      o.setName("cargo")
        .setDescription("LIDERANCA / GERENTE / MEMBROS")
        .setRequired(true)
    )
    .addUserOption(o =>
      o.setName("pessoa")
        .setDescription("Usuário alvo")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("meta")
    .setDescription("Painel de metas diárias")
];

/* =========================
   🚀 REGISTER
========================= */
const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once(Events.ClientReady, async () => {
  console.log(`🔥 Logado como ${client.user.tag}`);

  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands.map(c => c.toJSON()) }
    );
    console.log("✅ Comandos registrados!");
  } catch (err) {
    console.error(err);
  }
});

/* =========================
   🎮 INTERAÇÕES
========================= */
client.on(Events.InteractionCreate, async (interaction) => {

  // META
  if (interaction.isChatInputCommand() && interaction.commandName === "meta") {

    if (!temPermissao(interaction)) {
      return interaction.reply({ content: "❌ Sem permissão", ephemeral: true });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("meta_btn")
        .setLabel("Enviar Meta")
        .setStyle(ButtonStyle.Success)
    );

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🎯 META DIÁRIA")
          .setDescription(
`📦 Requisitos:
🛡️ 30 Kevlar
⛏️ 200 Minério de Ferro

📸 Envie a imagem no canal de metas`
          )
          .setColor("#00ff88")
      ],
      components: [row]
    });
  }

  if (interaction.isButton() && interaction.customId === "meta_btn") {
    return interaction.reply({
      content: "📸 Envie a imagem no canal de metas!",
      ephemeral: true
    });
  }

  // QUADRO
  if (interaction.isChatInputCommand() && interaction.commandName === "quadro") {
    return interaction.reply({ embeds: [criarEmbedCargos()] });
  }
});

/* =========================
   📸 METAS AUTOMÁTICO
========================= */
client.on("messageCreate", async (message) => {

  if (message.author.bot) return;
  if (message.channel.id !== CANAL_METAS) return;

  const attachment = message.attachments.first();
  if (!attachment) return;

  // valida imagem (corrigido)
  if (!attachment.url.match(/\.(png|jpg|jpeg|webp|gif)/i)) return;

  const id = message.author.id;

  if (!metasPlayer[id]) metasPlayer[id] = 0;
  metasPlayer[id]++;

  const feitas = metasPlayer[id];
  const faltam = META_TOTAL - feitas;

  const canal = await pegarOuCriarCanalPlayer(message.guild, message.author);

  const embed = new EmbedBuilder()
    .setTitle("✅ META REGISTRADA")
    .setColor("#00ff00")
    .addFields(
      { name: "👤 Jogador", value: `<@${id}>`, inline: true },
      { name: "📊 Feitas", value: `${feitas}`, inline: true },
      { name: "📉 Faltam", value: `${faltam > 0 ? faltam : 0}`, inline: true },
      { name: "📦 Meta", value: "30 Kevlar\n200 Minério de Ferro" }
    )
    .setImage(attachment.url)
    .setTimestamp();

  await canal.send({ embeds: [embed] });

  await message.reply(`✅ Meta registrada! Canal: ${canal}`);
});

/* =========================
   ANTI CRASH
========================= */
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

client.login(TOKEN);
