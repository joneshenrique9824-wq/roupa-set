import { config } from "./config.js";

export const cargos = {
  LIDERANCA: [],
  GERENTE: [],
  MEMBROS: []
};

export const cargosValidos = ["LIDERANCA", "GERENTE", "MEMBROS"];

export const temPermissao = (interaction) =>
  interaction.member?.roles?.cache?.has(config.CARGO_MEMBRO) ||
  interaction.member?.roles?.cache?.has(config.CARGO_LIDER) ||
  interaction.member?.roles?.cache?.has(config.CARGO_GERENTE);

export const isAdmin = (interaction) =>
  interaction.member?.roles?.cache?.has(config.CARGO_LIDER) ||
  interaction.member?.roles?.cache?.has(config.CARGO_GERENTE);
