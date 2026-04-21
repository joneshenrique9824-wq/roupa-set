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

// ================= DEBUG =================
console.log("🔎 TOKEN:", TOKEN ? "OK" : "❌ ERRO");
console.log("🔎 CANAL MASC:", CANAL_MASCULINO);
console.log("🔎 CANAL FEM:", CANAL_FEMININO);

// ================= REGISTRAR COMANDO =================
const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel de registro de uniformes")
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("🔄 Registrando comandos...");
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Comandos registrados!");
  } catch (error) {
    console.error("❌ ERRO COMANDO:", error);
  }
})();

// ================= BOT ONLINE =================
client.once(Events.ClientReady, () => {
  console.log(`🔥 Bot online como ${client.user.tag}`);
});

// ================= INTERAÇÕES =================
client.on(Events.InteractionCreate, async (interaction) => {

  // ===== COMANDO =====
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "painel") {

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("registrar")
          .setLabel("Registrar Uniforme")
          .setEmoji("📋")
          .setStyle(ButtonStyle.Primary)
      );

      const embed = new EmbedBuilder()
        .setTitle("👕 PAINEL DE UNIFORMES")
        .setDescription("Clique no botão para registrar um uniforme.")
        .setColor("#0099ff"); // azul seguro

      await interaction.reply({
        embeds: [embed],
        components: [row]
      });
    }
  }

  // ===== BOTÃO =====
  if (interaction.isButton()) {
    if (interaction.customId === "registrar") {

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
        .setLabel("Código da Roupa")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const tipo = new TextInputBuilder()
        .setCustomId("tipo")
        .setLabel("Masculino ou Feminino")
        .setPlaceholder("Ex: masculino ou feminino")
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
            content: "❌ Digite masculino ou feminino!",
            ephemeral: true
          });
        }

        console.log("📤 Canal escolhido:", canalID);

        const canal = await client.channels.fetch(canalID);

        if (!canal) {
          return interaction.reply({
            content: "❌ Canal não encontrado!",
            ephemeral: true
          });
        }

        // 🎨 COR SEGURA (SEM BUG)
        const cor = tipo.startsWith("m") ? "#0099ff" : "#ff4da6";

        const embed = new EmbedBuilder()
          .setTitle("📦 UNIFORME REGISTRADO")
          .addFields(
            { name: "👕 Nome", value: nome, inline: true },
            { name: "🔢 Código", value: codigo, inline: true },
            { name: "🚻 Tipo", value: tipo, inline: true }
          )
          .setFooter({
            text: `Registrado por ${interaction.user.tag}`
          })
          .setTimestamp()
          .setColor(cor);

        await canal.send({ embeds: [embed] });

        await interaction.reply({
          content: "✅ Uniforme registrado com sucesso!",
          ephemeral: true
        });

      } catch (err) {
        console.error("❌ ERRO AO ENVIAR:", err);

        await interaction.reply({
          content: "❌ Erro ao registrar uniforme!",
          ephemeral: true
        });
      }
    }
  }

});

client.login(TOKEN);
