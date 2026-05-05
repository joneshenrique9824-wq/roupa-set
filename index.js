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

// 🎯 CANAL FIXO DE METAS
const CANAL_METAS = "1501326790537379860";

/* =========================
   🔰 CARGOS
========================= */
const CARGO_MEMBRO = process.env.CARGO_MEMBRO || "1456655598396510213";
const CARGO_LIDER = process.env.CARGO_LIDER || "1456655598396510215";
const CARGO_GERENTE = process.env.CARGO_GERENTE || "1456655598530723956";

/* =========================
   📦 MEMÓRIA CARGOS
========================= */
const cargos = {
  LIDERANCA: [],
  GERENTE: [],
  MEMBROS: []
};

const cargosValidos = ["LIDERANCA", "GERENTE", "MEMBROS"];

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
    lista.length
      ? lista.map(id => `• <@${id}>`).join("\n")
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

  // 🎯 NOVO
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

  if (interaction.isChatInputCommand() && interaction.commandName === "meta") {

    if (!temPermissao(interaction)) {
      return interaction.reply({ content: "❌ Sem permissão!", ephemeral: true });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("meta_enviar")
        .setLabel("Enviar Meta")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🎯")
    );

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🎯 META DIÁRIA")
          .setDescription(
`📦 **Requisitos:**
🛡️ 30 Kevlar  
⛏️ 200 Minério de Ferro  

📸 Envie a imagem neste canal.`
          )
          .setColor("#00ff88")
      ],
      components: [row]
    });
  }

  if (interaction.isButton() && interaction.customId === "meta_enviar") {
    return interaction.reply({
      content: "📸 Envie a imagem aqui no canal de metas!",
      ephemeral: true
    });
  }

  // 👇 TODO O RESTO DO SEU BOT CONTINUA IGUAL (não alterado)
});

/* =========================
   📸 SISTEMA DE META AUTOMÁTICO
========================= */
client.on("messageCreate", async (message) => {

  if (message.author.bot) return;
  if (message.channel.id !== CANAL_METAS) return;

  const attachment = message.attachments.first();
  if (!attachment) return;
  if (!attachment.contentType?.startsWith("image")) return;

  const embed = new EmbedBuilder()
    .setTitle("✅ META DIÁRIA PAGA")
    .setColor("#00ff00")
    .addFields(
      { name: "👤 Jogador", value: `<@${message.author.id}>`, inline: true },
      { name: "📦 Metas", value: "🛡️ 30 Kevlar\n⛏️ 200 Minério de Ferro" }
    )
    .setImage(attachment.url)
    .setTimestamp();

  await message.reply({ embeds: [embed] });
});

/* =========================
   ANTI CRASH
========================= */
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

client.login(TOKEN);
