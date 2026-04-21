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

// ================= CONFIG =================
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const {
  TOKEN,
  CLIENT_ID,
  GUILD_ID,
  CANAL_MASCULINO,
  CANAL_FEMININO
} = process.env;

// 🔐 CONFIG DE SEGURANÇA
const USERS_PERMITIDOS = ["1174745079630549014"]; // coloca seu ID
const CARGO_PERMITIDO = "1456655598593511539"; // opcional
const cooldown = new Set();

// ================= REGISTRAR COMANDO =================
const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel de uniformes")
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Comandos registrados!");
  } catch (error) {
    console.error(error);
  }
})();

// ================= BOT ONLINE =================
client.once(Events.ClientReady, () => {
  console.log(`🔥 Bot protegido online como ${client.user.tag}`);
});

// ================= INTERAÇÕES =================
client.on(Events.InteractionCreate, async (interaction) => {

  // 🔒 FUNÇÃO DE PERMISSÃO
  const temPermissao = () => {
    if (USERS_PERMITIDOS.includes(interaction.user.id)) return true;
    if (interaction.member?.roles?.cache?.has(CARGO_PERMITIDO)) return true;
    return false;
  };

  // ===== COMANDO =====
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "painel") {

      if (!temPermissao()) {
        return interaction.reply({
          content: "❌ Você não tem permissão!",
          ephemeral: true
        });
      }

      // ⏱️ COOLDOWN
      if (cooldown.has(interaction.user.id)) {
        return interaction.reply({
          content: "⏳ Aguarde alguns segundos...",
          ephemeral: true
        });
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

      await interaction.reply({
        embeds: [embed],
        components: [row]
      });
    }
  }

  // ===== BOTÃO =====
  if (interaction.isButton()) {
    if (interaction.customId === "registrar") {

      if (!temPermissao()) {
        return interaction.reply({
          content: "❌ Sem permissão!",
          ephemeral: true
        });
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

      await interaction.showModal(modal);
    }
  }

  // ===== MODAL =====
  if (interaction.isModalSubmit()) {
    if (interaction.customId === "modal_uniforme") {

      if (!temPermissao()) {
        return interaction.reply({
          content: "❌ Sem permissão!",
          ephemeral: true
        });
      }

      try {
        const nome = interaction.fields.getTextInputValue("nome");
        const codigo = interaction.fields.getTextInputValue("codigo");
        const tipo = interaction.fields.getTextInputValue("tipo").toLowerCase();

        let canalID;

        if (tipo.startsWith("m")) {
          canalID = CANAL_MASCULINO;
        } else if (tipo.startsWith("f")) {
          canalID = CANAL_FEMININO;
        } else {
          return interaction.reply({
            content: "❌ Use masculino ou feminino!",
            ephemeral: true
          });
        }

        const canal = await client.channels.fetch(canalID);

        if (!canal) {
          return interaction.reply({
            content: "❌ Canal não encontrado!",
            ephemeral: true
          });
        }

        const cor = tipo.startsWith("m") ? "#0099ff" : "#ff4da6";

        const embed = new EmbedBuilder()
          .setTitle("📦 UNIFORME REGISTRADO")
          .addFields(
            { name: "👕 Nome", value: nome, inline: true },
            { name: "🔢 Código", value: codigo, inline: true },
            { name: "🚻 Tipo", value: tipo, inline: true }
          )
          .setFooter({ text: `Por ${interaction.user.tag}` })
          .setTimestamp()
          .setColor(cor);

        await canal.send({ embeds: [embed] });

        await interaction.reply({
          content: "✅ Registrado!",
          ephemeral: true
        });

      } catch (err) {
        console.error("❌ ERRO:", err);

        await interaction.reply({
          content: "❌ Falha ao registrar!",
          ephemeral: true
        });
      }
    }
  }

});

// 🛡️ ANTI-CRASH GLOBAL
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

client.login(TOKEN);
