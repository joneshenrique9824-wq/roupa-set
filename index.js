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
  Events,
  ChannelType
} from "discord.js";

/* =========================
   🔒 PROTEÇÃO GLOBAL
========================= */
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

/* =========================
   🤖 CLIENT
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
  CANAL_METAS,
  CATEGORIA_METAS,
  META_PADRAO
} = process.env;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("❌ Configure TOKEN, CLIENT_ID e GUILD_ID no .env");
  process.exit(1);
}

/* =========================
   🎯 DADOS
========================= */
const metas = new Map();

/* =========================
   📁 CRIAR / PEGAR CANAL
========================= */
async function getCanalMeta(guild, user) {
  try {
    const categoria = guild.channels.cache.get(CATEGORIA_METAS);
    if (!categoria) return null;

    const nome = user.username
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    let canal = guild.channels.cache.find(
      c => c.name === nome && c.parentId === categoria.id
    );

    if (canal) return canal;

    canal = await guild.channels.create({
      name: nome,
      type: ChannelType.GuildText,
      parent: categoria.id
    });

    return canal;
  } catch (err) {
    console.error("Erro ao criar canal:", err);
    return null;
  }
}

/* =========================
   📜 COMANDOS
========================= */
const commands = [
  {
    name: "painel",
    description: "Abrir painel de uniforme"
  },
  {
    name: "meta",
    description: "Sistema de metas"
  }
];

/* =========================
   🚀 REGISTRAR COMANDOS
========================= */
const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once(Events.ClientReady, async () => {
  console.log(`🔥 ONLINE: ${client.user.tag}`);

  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Comandos registrados");
  } catch (err) {
    console.error(err);
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
            .setCustomId("btn_uniforme")
            .setLabel("Registrar Uniforme")
            .setStyle(ButtonStyle.Primary)
        );

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("👕 PAINEL DE UNIFORME")
              .setDescription("Clique no botão abaixo")
          ],
          components: [row]
        });
      }

      if (interaction.commandName === "meta") {
        return interaction.reply({
          content: "📸 Envie: número + imagem no canal de metas",
          ephemeral: true
        });
      }
    }

    /* 🔘 BOTÃO */
    if (interaction.isButton() && interaction.customId === "btn_uniforme") {

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
    if (interaction.isModalSubmit()) {

      if (interaction.customId === "modal_uniforme") {

        const nome = interaction.fields.getTextInputValue("nome");
        const codigo = interaction.fields.getTextInputValue("codigo");
        const tipo = interaction.fields.getTextInputValue("tipo").toLowerCase();

        const canalID = tipo.startsWith("m")
          ? CANAL_MASCULINO
          : CANAL_FEMININO;

        let canal;

        try {
          canal = await client.channels.fetch(canalID);
        } catch {
          return interaction.reply({
            content: "❌ Canal inválido no .env",
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
          content: "✅ Enviado!",
          ephemeral: true
        });
      }
    }

  } catch (err) {
    console.error("Erro interação:", err);
  }
});

/* =========================
   📸 SISTEMA DE METAS
========================= */
client.on("messageCreate", async (message) => {
  try {

    if (message.author.bot) return;
    if (message.channel.id !== CANAL_METAS) return;

    const match = message.content.match(/\d+/);

    if (!match) {
      return message.reply("❌ Envie a quantidade junto com a imagem");
    }

    if (message.attachments.size === 0) {
      return message.reply("❌ Envie uma imagem da meta");
    }

    const quantidade = parseInt(match[0]);
    const userId = message.author.id;

    const metaTotal = parseInt(META_PADRAO || 100);

    const atual = (metas.get(userId) || 0) + quantidade;
    metas.set(userId, atual);

    const falta = Math.max(metaTotal - atual, 0);

    const canal = await getCanalMeta(message.guild, message.author);

    if (!canal) {
      return message.reply("❌ Categoria de metas inválida");
    }

    const imagem = message.attachments.first().url;

    await canal.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("📦 META ENTREGUE")
          .setImage(imagem)
          .addFields(
            { name: "👤 Usuário", value: message.author.username },
            { name: "📥 Entregue", value: `${quantidade}`, inline: true },
            { name: "📊 Total", value: `${atual}`, inline: true },
            { name: "⏳ Falta", value: `${falta}`, inline: true }
          )
          .setColor(falta === 0 ? 0x00ff00 : 0xff0000)
      ]
    });

    if (falta === 0) {
      await canal.send("🎉 META COMPLETA!");
    }

    message.reply(`✅ Registrado: ${quantidade}`);

  } catch (err) {
    console.error(err);
    message.reply("❌ Erro ao processar meta");
  }
});

/* ========================= */
client.login(TOKEN);
