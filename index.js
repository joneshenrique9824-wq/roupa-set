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
   🔐 CARGOS
========================= */
const CARGO_MEMBRO = "1456655598396510213";
const CARGO_LIDER = "1456655598396510215";

const cooldown = new Set();
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
  new SlashCommandBuilder().setName("painel").setDescription("Abrir painel"),
  new SlashCommandBuilder().setName("quadro").setDescription("Ver hierarquia"),
  new SlashCommandBuilder()
    .setName("addcargo")
    .addStringOption(o => o.setName("cargo").setRequired(true))
    .addUserOption(o => o.setName("pessoa").setRequired(true)),
  new SlashCommandBuilder()
    .setName("removercargo")
    .addStringOption(o => o.setName("cargo").setRequired(true))
    .addUserOption(o => o.setName("pessoa").setRequired(true))
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

/* =========================
   🔒 PERMISSÕES
========================= */
const isMembro = (m) =>
  m.roles.cache.has(CARGO_MEMBRO) || m.roles.cache.has(CARGO_LIDER);

const isLider = (m) =>
  m.roles.cache.has(CARGO_LIDER);

/* =========================
   🧠 HIERARQUIA
========================= */
function criarEmbed() {
  const lideres = cargos["LIDERANCA"] || [];
  const membros = cargos["MEMBROS"] || [];

  const f = (l) => l.length ? l.map(id => `• <@${id}>`).join("\n") : "• (vazio)";

  return new EmbedBuilder().setColor("#2b2d31").setDescription(
`👥 **𝐌𝐄𝐌𝐁𝐑𝐎𝐒 - 𝐏𝐑𝐎𝐉𝐄𝐓𝐎 𝐗**

━━━━━━━━━━━━━━━━━━━━━━━
👑 **𝐋𝐈𝐃𝐄𝐑𝐀𝐍𝐂̧𝐀**
${f(lideres)}
━━━━━━━━━━━━━━━━━━━━━━━
🪖 **𝐌𝐄𝐌𝐁𝐑𝐎𝐒**
${f(membros)}
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
});

/* =========================
   🎮 INTERAÇÕES
========================= */
client.on(Events.InteractionCreate, async (i) => {

  if (i.isChatInputCommand()) {

    if (i.commandName === "painel") {

      if (!isMembro(i.member)) return i.reply({ content: "❌ Sem permissão", ephemeral: true });

      if (cooldown.has(i.user.id))
        return i.reply({ content: "⏳ Aguarde...", ephemeral: true });

      cooldown.add(i.user.id);
      setTimeout(() => cooldown.delete(i.user.id), 5000);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("registrar")
          .setLabel("Registrar Uniforme")
          .setStyle(ButtonStyle.Primary)
      );

      return i.reply({
        embeds: [new EmbedBuilder().setTitle("PAINEL").setColor("#0099ff")],
        components: [row]
      });
    }

    if (i.commandName === "quadro") {
      if (!isMembro(i.member)) return i.reply({ content: "❌ Sem permissão", ephemeral: true });
      return i.reply({ embeds: [criarEmbed()] });
    }

    const cargo = i.options.getString("cargo").toUpperCase();
    const user = i.options.getUser("pessoa");

    if (!isLider(i.member))
      return i.reply({ content: "❌ Só líder", ephemeral: true });

    if (!cargos[cargo]) cargos[cargo] = [];

    if (i.commandName === "addcargo") {
      if (!cargos[cargo].includes(user.id)) cargos[cargo].push(user.id);
      return i.reply({ content: "✅ Adicionado", ephemeral: true });
    }

    if (i.commandName === "removercargo") {
      cargos[cargo] = cargos[cargo].filter(id => id !== user.id);
      return i.reply({ content: "❌ Removido", ephemeral: true });
    }
  }

});

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

client.login(TOKEN);
