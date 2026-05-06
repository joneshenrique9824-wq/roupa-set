import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder
} from "discord.js";

import { temPermissao } from "./cargos.js";
import { config } from "./config.js";

/* ================= PAINEL ================= */
export function painelUniforme(interaction) {
  if (!temPermissao(interaction))
    return interaction.reply({ content: "❌ Sem permissão", flags: 64 });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("registrar_uniforme")
      .setLabel("Registrar Uniforme")
      .setStyle(ButtonStyle.Primary)
  );

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle("👕 PAINEL UNIFORME")
        .setColor("#0099ff")
    ],
    components: [row],
    flags: 64
  });
}

/* ================= MODAL ================= */
export function abrirModal(interaction) {
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
