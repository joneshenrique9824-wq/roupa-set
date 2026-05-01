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
  intents: [GatewayIntentBits.Guilds]
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
   🔒 PERMISSÕES (GERAL)
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

  // 👕 UNIFORME
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel de uniformes"),

  // 👥 CARGOS
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

/* =========================
   🚀 REGISTER COMMANDS
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

  /* ================= UNIFORME ================= */
  if (interaction.isChatInputCommand() && interaction.commandName === "painel") {

    if (!temPermissao(interaction)) {
      return interaction.reply({ content: "❌ Sem permissão!", ephemeral: true });
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
        .setEmoji("📋")
    );

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("👕 PAINEL DE UNIFORMES")
          .setColor("#0099ff")
      ],
      components: [row]
    });
  }

  /* ================= BOTÃO UNIFORME ================= */
  if (interaction.isButton() && interaction.customId === "registrar") {

    if (!temPermissao(interaction)) {
      return interaction.reply({ content: "❌ Sem permissão!", ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId("modal_uniforme")
      .setTitle("Registro de Uniforme");

    const nome = new TextInputBuilder()
      .setCustomId("nome")
      .setLabel("Nome da Roupa")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const codigo = new TextInputBuilder()
      .setCustomId("codigo")
      .setLabel("Código")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const tipo = new TextInputBuilder()
      .setCustomId("tipo")
      .setLabel("Masculino ou Feminino")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nome),
      new ActionRowBuilder().addComponents(codigo),
      new ActionRowBuilder().addComponents(tipo)
    );

    return interaction.showModal(modal);
  }

  /* ================= MODAL UNIFORME ================= */
  if (interaction.isModalSubmit() && interaction.customId === "modal_uniforme") {

    if (!temPermissao(interaction)) {
      return interaction.reply({ content: "❌ Sem permissão!", ephemeral: true });
    }

    const nome = interaction.fields.getTextInputValue("nome");
    const codigo = interaction.fields.getTextInputValue("codigo");
    const tipo = interaction.fields.getTextInputValue("tipo").toLowerCase();

    let canalID;

    if (tipo.startsWith("m")) canalID = CANAL_MASCULINO;
    else if (tipo.startsWith("f")) canalID = CANAL_FEMININO;
    else {
      return interaction.reply({ content: "❌ Masculino ou Feminino!", ephemeral: true });
    }

    const canal = await client.channels.fetch(canalID);

    const embed = new EmbedBuilder()
      .setTitle("📦 UNIFORME REGISTRADO")
      .addFields(
        { name: "👕 Nome", value: nome, inline: true },
        { name: "🔢 Código", value: codigo, inline: true },
        { name: "🚻 Tipo", value: tipo, inline: true }
      )
      .setColor(tipo.startsWith("m") ? "#0099ff" : "#ff4da6")
      .setFooter({ text: `Por ${interaction.user.tag}` })
      .setTimestamp();

    await canal.send({ embeds: [embed] });

    return interaction.reply({ content: "✅ Uniforme registrado!", ephemeral: true });
  }

  /* ================= CARGOS ================= */
  if (!interaction.isChatInputCommand()) return;

  const cargoRaw = interaction.options.getString("cargo");
  const cargo = cargoRaw?.toUpperCase();
  const user = interaction.options.getUser("pessoa");

  if (interaction.commandName === "quadro") {
    if (!temPermissao(interaction)) {
      return interaction.reply({ content: "❌ Sem permissão", ephemeral: true });
    }
    return interaction.reply({ embeds: [criarEmbedCargos()] });
  }

  if (interaction.commandName === "addcargo") {

    if (!isAdmin(interaction)) {
      return interaction.reply({ content: "❌ Sem permissão", ephemeral: true });
    }

    if (!cargosValidos.includes(cargo)) {
      return interaction.reply({ content: "❌ Cargo inválido", ephemeral: true });
    }

    if (!cargos[cargo].includes(user.id)) {
      cargos[cargo].push(user.id);
    }

    return interaction.reply({ content: `✅ Adicionado em ${cargo}`, ephemeral: true });
  }

  if (interaction.commandName === "removercargo") {

    if (!isAdmin(interaction)) {
      return interaction.reply({ content: "❌ Sem permissão", ephemeral: true });
    }

    cargos[cargo] = cargos[cargo].filter(id => id !== user.id);

    return interaction.reply({ content: `❌ Removido de ${cargo}`, ephemeral: true });
  }
});

/* ================= ANTI CRASH ================= */
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

client.login(TOKEN);
