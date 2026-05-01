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
   🔐 CONFIG
========================= */
const {
  TOKEN,
  CLIENT_ID,
  GUILD_ID,
  CANAL_MASCULINO,
  CANAL_FEMININO
} = process.env;

/* =========================
   🔰 CARGOS
========================= */

const CARGO_MEMBRO = process.env.CARGO_MEMBRO || "1456655598396510213";
const CARGO_LIDER = process.env.CARGO_LIDER || "1456655598396510215";
const CARGO_GERENTE = process.env.CARGO_GERENTE || "1456655598530723956";

const cooldown = new Set();

/* =========================
   📦 MEMÓRIA (HIERARQUIA)
========================= */
const cargos = {
  LIDERANCA: [],
  GERENTE: [],
  MEMBROS: []
};

const cargosValidos = ["LIDERANCA", "GERENTE", "MEMBROS"];

/* =========================
   🤖 BOT
========================= */
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* =========================
   🔒 PERMISSÕES
========================= */
const isMembro = (m) =>
  m.roles.cache.has(CARGO_MEMBRO) ||
  m.roles.cache.has(CARGO_LIDER) ||
  m.roles.cache.has(CARGO_GERENTE);

const isAdmin = (m) =>
  m.roles.cache.has(CARGO_LIDER) ||
  m.roles.cache.has(CARGO_GERENTE);

/* =========================
   🧠 EMBED HIERARQUIA
========================= */
function criarEmbed() {

  const formatar = (lista) =>
    lista.length
      ? lista.map(id => `• <@${id}>`).join("\n")
      : "• (vazio)";

  return new EmbedBuilder()
    .setColor("#2b2d31")
    .setDescription(
`👥 **𝐌𝐄𝐌𝐁𝐑𝐎𝐒 - 𝐏𝐑𝐎𝐉𝐄𝐓𝐎 𝐗**

━━━━━━━━━━━━━━━━━━━━━━━
👑 **𝐋𝐈𝐃𝐄𝐑𝐀𝐍𝐂̧𝐀**
${formatar(cargos.LIDERANCA)}
━━━━━━━━━━━━━━━━━━━━━━━
👔 **𝐆𝐄𝐑𝐄𝐍𝐓𝐄**
${formatar(cargos.GERENTE)}
━━━━━━━━━━━━━━━━━━━━━━━
🪖 **𝐌𝐄𝐌𝐁𝐑𝐎𝐒**
${formatar(cargos.MEMBROS)}
━━━━━━━━━━━━━━━━━━━━━━━
☣️ **𝐏𝐑𝐎𝐉𝐄𝐓𝐎 𝐗**
Unidos pela força.
Tem nome, tem respeito.
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
    )
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

/* =========================
   🚀 READY
========================= */
client.once(Events.ClientReady, async () => {
  console.log(`🔥 Logado como ${client.user.tag}`);

  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands.map(c => c.toJSON()) }
    );

    console.log("✅ Comandos registrados!");
  } catch (err) {
    console.error("❌ Erro ao registrar comandos:", err);
  }
});

/* =========================
   🎮 BOTÕES (PAINEL FUNCIONANDO)
========================= */
client.on(Events.InteractionCreate, async (interaction) => {

  /* ===== BOTÃO ===== */
  if (interaction.isButton()) {

    if (interaction.customId === "registrar") {

      const modal = new ModalBuilder()
        .setCustomId("uniforme_modal")
        .setTitle("Registrar Uniforme");

      const input = new TextInputBuilder()
        .setCustomId("uniforme")
        .setLabel("Descreva seu uniforme")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const row = new ActionRowBuilder().addComponents(input);
      modal.addComponents(row);

      return interaction.showModal(modal);
    }
  }

  /* ===== MODAL ===== */
  if (interaction.isModalSubmit()) {

    if (interaction.customId === "uniforme_modal") {

      const texto = interaction.fields.getTextInputValue("uniforme");

      return interaction.reply({
        content: `✅ Uniforme registrado: ${texto}`,
        ephemeral: true
      });
    }
  }

  /* ===== COMANDOS ===== */
  if (!interaction.isChatInputCommand()) return;

  const cargoRaw = interaction.options.getString("cargo");
  const cargo = cargoRaw?.toUpperCase();
  const user = interaction.options.getUser("pessoa");

  /* ===== VALIDAÇÃO ===== */
  if (interaction.commandName === "addcargo" || interaction.commandName === "removercargo") {
    if (!cargosValidos.includes(cargo)) {
      return interaction.reply({
        content: "❌ Cargo inválido! Use: LIDERANCA / GERENTE / MEMBROS",
        ephemeral: true
      });
    }
  }

  /* ===== PAINEL ===== */
  if (interaction.commandName === "painel") {

    if (!isMembro(interaction.member)) {
      return interaction.reply({ content: "❌ Sem permissão", ephemeral: true });
    }

    if (cooldown.has(interaction.user.id)) {
      return interaction.reply({ content: "⏳ Aguarde...", ephemeral: true });
    }

    cooldown.add(interaction.user.id);
    setTimeout(() => cooldown.delete(interaction.user.id), 5000);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("registrar")
        .setLabel("Registrar Uniforme")
        .setStyle(ButtonStyle.Primary)
    );

    return interaction.reply({
      embeds: [new EmbedBuilder().setTitle("👕 PAINEL").setColor("#0099ff")],
      components: [row]
    });
  }

  /* ===== QUADRO ===== */
  if (interaction.commandName === "quadro") {

    if (!isMembro(interaction.member)) {
      return interaction.reply({ content: "❌ Sem permissão", ephemeral: true });
    }

    return interaction.reply({ embeds: [criarEmbed()] });
  }

  /* ===== ADD CARGO ===== */
  if (interaction.commandName === "addcargo") {

    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: "❌ Só líder/gerente pode", ephemeral: true });
    }

    if (!cargos[cargo].includes(user.id)) {
      cargos[cargo].push(user.id);
    }

    return interaction.reply({
      content: `✅ ${user} adicionado em ${cargo}`,
      ephemeral: true
    });
  }

  /* ===== REMOVER CARGO ===== */
  if (interaction.commandName === "removercargo") {

    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: "❌ Só líder/gerente pode", ephemeral: true });
    }

    cargos[cargo] = cargos[cargo].filter(id => id !== user.id);

    return interaction.reply({
      content: `❌ ${user} removido de ${cargo}`,
      ephemeral: true
    });
  }
});

/* =========================
   🛡️ ANTI CRASH
========================= */
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

client.login(TOKEN);
