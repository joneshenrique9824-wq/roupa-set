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
  ChannelType
} from "discord.js";

/* =========================
   🔒 PROTEÇÃO GLOBAL
========================= */
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

/* =========================
   🤖 BOT
========================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
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
  CANAL_FEMININO,
  CANAL_METAS
} = process.env;

if (!TOKEN) {
  console.error("❌ TOKEN não definido no .env");
  process.exit(1);
}

/* =========================
   🎯 METAS
========================= */
const metas = {};

/* =========================
   📁 CRIAR CANAL SEGURO
========================= */
async function criarCanalMeta(guild, user, qtd) {
  try {
    const nome = `meta-${user.username}-${qtd}x`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");

    let canal = guild.channels.cache.find(c => c.name === nome);
    if (canal) return canal;

    return await guild.channels.create({
      name: nome,
      type: ChannelType.GuildText,
      topic: `Meta de ${user.username}`
    });

  } catch (err) {
    console.error("Erro ao criar canal:", err);
    return null;
  }
}

/* =========================
   📜 COMANDOS
========================= */
const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Painel de uniforme"),

  new SlashCommandBuilder()
    .setName("meta")
    .setDescription("Sistema de metas com imagem")
];

/* =========================
   🚀 REGISTER
========================= */
const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once(Events.ClientReady, async () => {
  console.log(`🔥 ONLINE: ${client.user.tag}`);

  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands.map(c => c.toJSON()) }
    );
    console.log("✅ Comandos registrados");
  } catch (err) {
    console.error("Erro ao registrar comandos:", err);
  }
});

/* =========================
   🎮 INTERAÇÕES
========================= */
client.on(Events.InteractionCreate, async (interaction) => {
  try {

    /* 📜 COMANDOS */
    if (interaction.isChatInputCommand()) {

      if (interaction.commandName === "painel") {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("uniforme_btn")
            .setLabel("Registrar Uniforme")
            .setStyle(ButtonStyle.Primary)
        );

        return interaction.reply({
          embeds: [new EmbedBuilder().setTitle("👕 PAINEL UNIFORME")],
          components: [row]
        });
      }

      if (interaction.commandName === "meta") {
        return interaction.reply({
          content: "📸 Envie imagem OU número"
        });
      }
    }

    /* 🔘 BOTÃO */
    if (interaction.isButton() && interaction.customId === "uniforme_btn") {

      const modal = new ModalBuilder()
        .setCustomId("modal_uniforme")
        .setTitle("Registrar Uniforme");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("nome")
            .setLabel("Nome")
            .setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("codigo")
            .setLabel("Código")
            .setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("tipo")
            .setLabel("Masculino ou Feminino")
            .setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }

    /* 🧾 MODAL */
    if (interaction.isModalSubmit() && interaction.customId === "modal_uniforme") {

      const nome = interaction.fields.getTextInputValue("nome");
      const codigo = interaction.fields.getTextInputValue("codigo");
      const tipo = interaction.fields.getTextInputValue("tipo").toLowerCase();

      const canalID = tipo.startsWith("m")
        ? CANAL_MASCULINO
        : CANAL_FEMININO;

      let canal = null;

      try {
        canal = await client.channels.fetch(canalID);
      } catch {
        return interaction.reply({
          content: "❌ Canal inválido no .env",
          ephemeral: true
        });
      }

      if (!canal) {
        return interaction.reply({
          content: "❌ Canal não encontrado",
          ephemeral: true
        });
      }

      await canal.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("👕 UNIFORME REGISTRADO")
            .addFields(
              { name: "Nome", value: nome },
              { name: "Código", value: codigo }
            )
        ]
      });

      return interaction.reply({
        content: "✅ Registrado!",
        ephemeral: true
      });
    }

  } catch (err) {
    console.error("Erro interação:", err);

    if (interaction.isRepliable()) {
      interaction.reply({
        content: "❌ Erro interno",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

/* =========================
   📸 METAS (COM FALLBACK)
========================= */
client.on("messageCreate", async (message) => {
  try {

    if (message.author.bot) return;
    if (message.channel.id !== CANAL_METAS) return;

    let numero = null;

    // pegar número do texto
    const match = message.content.match(/(\d+)/);
    if (match) numero = parseInt(match[1]);

    if (!numero && message.attachments.size > 0) {
      return message.reply("⚠️ Não consegui ler imagem. Envie número junto.");
    }

    if (!numero) {
      return message.reply("❌ Envie um número válido");
    }

    const user = message.author;

    metas[user.id] = (metas[user.id] || 0) + numero;

    const canal = await criarCanalMeta(message.guild, user, numero);

    if (canal) {
      await canal.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("🎯 META REGISTRADA")
            .addFields(
              { name: "Usuário", value: user.username },
              { name: "Quantidade", value: `${numero}`, inline: true },
              { name: "Total", value: `${metas[user.id]}`, inline: true }
            )
        ]
      });
    }

    message.reply(`✅ Registrado: ${numero}`);

  } catch (err) {
    console.error("Erro meta:", err);
    message.reply("❌ Erro ao processar");
  }
});

/* ========================= */
client.login(TOKEN);
