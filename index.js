import "dotenv/config";
import express from "express";
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
   🌐 KEEP ALIVE
========================= */
const app = express();
app.get("/", (_, res) => res.send("Bot online 🔥"));
app.listen(3000);

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
   🔐 CARGOS
========================= */
const CARGO_MEMBRO = "1456655598396510213"; // PЯӨJΣƬӨ X
const CARGO_LIDER = "1456655598396510215"; // Lider PЯӨJΣƬӨ X

const cooldown = new Set();

/* =========================
   📦 BANCO
========================= */
const cargos = {};

/* =========================
   🤖 CLIENT
========================= */
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

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
    .setDescription("Adicionar pessoa")
    .addStringOption(o => o.setName("cargo").setRequired(true))
    .addUserOption(o => o.setName("pessoa").setRequired(true)),

  new SlashCommandBuilder()
    .setName("removercargo")
    .setDescription("Remover pessoa")
    .addStringOption(o => o.setName("cargo").setRequired(true))
    .addUserOption(o => o.setName("pessoa").setRequired(true))
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

/* =========================
   🔒 PERMISSÕES
========================= */
function isMembro(member) {
  return member.roles.cache.has(CARGO_MEMBRO) || member.roles.cache.has(CARGO_LIDER);
}

function isLider(member) {
  return member.roles.cache.has(CARGO_LIDER);
}

/* =========================
   🧠 HIERARQUIA
========================= */
function criarEmbed() {
  const lideres = cargos["LIDERANCA"] || [];
  const membros = cargos["MEMBROS"] || [];

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
${formatar(lideres)}
━━━━━━━━━━━━━━━━━━━━━━━
🪖 **𝐌𝐄𝐌𝐁𝐑𝐎𝐒**
${formatar(membros)}
━━━━━━━━━━━━━━━━━━━━━━━
☣️ **𝐏𝐑𝐎𝐉𝐄𝐓𝐎 𝐗**
Unidos pela força.
Tem nome, tem respeito.
━━━━━━━━━━━━━━━━━━━━━━━`
    );
}

/* =========================
   🚀 READY
========================= */
client.once(Events.ClientReady, async () => {
  console.log(`🔥 ${client.user.tag}`);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands.map(c => c.toJSON()) }
  );

  console.log("✅ Comandos registrados!");
});

/* =========================
   🎮 INTERAÇÕES
========================= */
client.on(Events.InteractionCreate, async (interaction) => {

  if (interaction.isChatInputCommand()) {

    /* ===== PAINEL (INTACTO) ===== */
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
          .setEmoji("📋")
          .setStyle(ButtonStyle.Primary)
      );

      const embed = new EmbedBuilder()
        .setTitle("👕 PAINEL DE UNIFORMES")
        .setDescription("Clique para registrar uniforme.")
        .setColor("#0099ff");

      return interaction.reply({
        embeds: [embed],
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

    const cargo = interaction.options.getString("cargo").toUpperCase();
    const user = interaction.options.getUser("pessoa");

    /* ===== ADD ===== */
    if (interaction.commandName === "addcargo") {

      if (!isLider(interaction.member)) {
        return interaction.reply({ content: "❌ Apenas líder pode usar", ephemeral: true });
      }

      if (!cargos[cargo]) cargos[cargo] = [];
      if (!cargos[cargo].includes(user.id)) cargos[cargo].push(user.id);

      return interaction.reply({
        content: `✅ ${user} adicionado em ${cargo}`,
        ephemeral: true
      });
    }

    /* ===== REMOVE ===== */
    if (interaction.commandName === "removercargo") {

      if (!isLider(interaction.member)) {
        return interaction.reply({ content: "❌ Apenas líder pode usar", ephemeral: true });
      }

      if (!cargos[cargo]) {
        return interaction.reply({
          content: "❌ Cargo não existe",
          ephemeral: true
        });
      }

      cargos[cargo] = cargos[cargo].filter(id => id !== user.id);

      return interaction.reply({
        content: `❌ ${user} removido de ${cargo}`,
        ephemeral: true
      });
    }
  }

  /* ===== BOTÃO (INTACTO) ===== */
  if (interaction.isButton() && interaction.customId === "registrar") {

    if (!isMembro(interaction.member)) {
      return interaction.reply({ content: "❌ Sem permissão!", ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId("modal_uniforme")
      .setTitle("Registro de Uniforme");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("nome").setLabel("Nome da Roupa").setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("codigo").setLabel("Código").setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("tipo").setLabel("Masculino ou Feminino").setStyle(TextInputStyle.Short).setRequired(true)
      )
    );

    return interaction.showModal(modal);
  }

  /* ===== MODAL (INTACTO) ===== */
  if (interaction.isModalSubmit() && interaction.customId === "modal_uniforme") {

    try {
      const nome = interaction.fields.getTextInputValue("nome");
      const codigo = interaction.fields.getTextInputValue("codigo");
      const tipo = interaction.fields.getTextInputValue("tipo").toLowerCase();

      let canalID;

      if (tipo.startsWith("m")) canalID = CANAL_MASCULINO;
      else if (tipo.startsWith("f")) canalID = CANAL_FEMININO;
      else {
        return interaction.reply({
          content: "❌ Use masculino ou feminino!",
          ephemeral: true
        });
      }

      const canal = await client.channels.fetch(canalID);

      const embed = new EmbedBuilder()
        .setTitle("📦 UNIFORME REGISTRADO")
        .addFields(
          { name: "👕 Nome", value: nome, inline: true },
          { name: "🔢 Código", value: codigo, inline: true },
          { name: "🚻 Tipo", value: tipo, inline: true }
        )
        .setFooter({ text: `Por ${interaction.user.tag}` })
        .setTimestamp()
        .setColor(tipo.startsWith("m") ? "#0099ff" : "#ff4da6");

      await canal.send({ embeds: [embed] });

      return interaction.reply({
        content: "✅ Registrado!",
        ephemeral: true
      });

    } catch (err) {
      console.error(err);
      return interaction.reply({
        content: "❌ Falha ao registrar!",
        ephemeral: true
      });
    }
  }

});

/* =========================
   🛡️ ANTI-CRASH
========================= */
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

client.login(TOKEN);
