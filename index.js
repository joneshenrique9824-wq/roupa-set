import { SlashCommandBuilder } from "discord.js";

export const commands = [
  new SlashCommandBuilder()
    .setName("meta")
    .setDescription("Registrar meta")
    .addStringOption(o =>
      o.setName("tipo")
        .setDescription("kevlar ou ferro")
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("quantidade")
        .setDescription("Quantidade farmada")
        .setRequired(true)
    )
    .addAttachmentOption(o =>
      o.setName("print")
        .setDescription("Print da meta")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Ranking de farm")
];
