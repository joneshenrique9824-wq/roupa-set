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

import { createWorker } from "tesseract.js";

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
  CANAL_FEMININO
} = process.env;

const CANAL_METAS = "1501326344586526820";

/* =========================
   🎯 METAS
========================= */
const metas = {};

/* =========================
   📁 CRIAR CANAL AUTOMÁTICO
========================= */
async function criarCanalMeta(guild, user, qtd) {
  const nome = `meta-${user.username}-${qtd}x`.toLowerCase();

  let canal = guild.channels.cache.find(c => c.name === nome);
  if (canal) return canal;

  return await guild.channels.create({
    name: nome,
    type: ChannelType.GuildText,
    topic: `Meta de ${user.username}`
  });
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
    .setDescription("Sistema de metas com leitura de imagem")
];

/* =========================
   🚀 REGISTER
========================= */
const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once(Events.ClientReady, async () => {
  console.log(`🔥 ONLINE: ${client.user.tag}`);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands.map(c => c.toJSON()) }
  );
});

/* =========================
   🎮 INTERAÇÕES (TUDO JUNTO)
========================= */
client.on(Events.InteractionCreate, async (interaction) => {

  // 📜 COMANDOS
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
        embeds: [
          new EmbedBuilder()
            .setTitle("📸 Envie uma imagem com número (ex: 200x minério)")
        ]
      });
    }
  }

  // 🔘 BOTÃO
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

  // 🧾 MODAL
  if (interaction.isModalSubmit() && interaction.customId === "modal_uniforme") {

    const nome = interaction.fields.getTextInputValue("nome");
    const codigo = interaction.fields.getTextInputValue("codigo");
    const tipo = interaction.fields.getTextInputValue("tipo").toLowerCase();

    const canal = await client.channels.fetch(
      tipo.startsWith("m") ? CANAL_MASCULINO : CANAL_FEMININO
    );

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

    return interaction.reply({ content: "✅ Registrado!", ephemeral: true });
  }

});

/* =========================
   🧠 OCR REAL (IMAGEM)
========================= */
client.on("messageCreate", async (message) => {

  if (message.author.bot) return;
  if (message.channel.id !== CANAL_METAS) return;

  const att = message.attachments.first();
  if (!att) return message.reply("❌ Envie uma imagem");

  try {

    const worker = await createWorker("eng");

    const { data: { text } } = await worker.recognize(att.url);

    await worker.terminate();

    const texto = text.toLowerCase();

    console.log("🧠 TEXTO LIDO:", texto);

    const match = texto.match(/(\d+)/);

    if (!match) {
      return message.reply("❌ Não consegui ler número na imagem");
    }

    const qtd = parseInt(match[1]);
    const user = message.author;

    metas[user.id] = (metas[user.id] || 0) + qtd;

    const canal = await criarCanalMeta(message.guild, user, qtd);

    await canal.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🎯 META REGISTRADA (OCR)")
          .addFields(
            { name: "Usuário", value: user.username },
            { name: "Quantidade", value: `${qtd}`, inline: true },
            { name: "Total", value: `${metas[user.id]}`, inline: true }
          )
          .setImage(att.url)
      ]
    });

    message.reply(`✅ Detectado via imagem: ${qtd}`);

  } catch (err) {
    console.error(err);
    message.reply("❌ Erro ao ler imagem");
  }
});

/* ========================= */
client.login(TOKEN);
