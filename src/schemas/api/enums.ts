import { z } from "zod";

export const UFS = [
	"AC", "AL", "AP", "AM", "BA",
	"CE", "DF", "ES", "GO", "MA",
	"MT", "MS", "MG", "PA", "PB",
	"PR", "PE", "PI", "RJ", "RN",
	"RS", "RO", "RR", "SC", "SP",
	"SE", "TO",
] as const;

export const TIPOS_IMOVEL = ["ALUGADO", "PROPRIO"] as const;

export const ESTADOS_CIVIS = [
	"SOLTEIRO",
	"CASADO",
	"DIVORCIADO",
	"VIUVO",
	"UNIAO_ESTAVEL",
] as const;

export const UNITS = ["KG", "L", "UNIT", "PACK", "BOX"] as const;

export const DONATION_STATUS = ["RECEIVED", "VOID"] as const;

export const DELIVERY_STATUS = ["OPEN", "COMPLETED", "CANCELLED"] as const;

export const LEDGER_KIND = [
	"COUNT",
	"RECEIVE",
	"RESERVE",
	"ISSUE",
	"RELEASE",
	"ADJUST",
	"REVERSE",
] as const;

export const ADJUSTMENT_REASON = [
	"STOCKTAKE",
	"DONOR_RETURN",
	"LOSS",
	"DAMAGE",
	"CORRECTION",
] as const;

export const ufSchema = z.enum(UFS);
export const tipoImovelSchema = z.enum(TIPOS_IMOVEL);
export const estadoCivilSchema = z.enum(ESTADOS_CIVIS);
export const unitSchema = z.enum(UNITS);
export const donationStatusSchema = z.enum(DONATION_STATUS);
export const deliveryStatusSchema = z.enum(DELIVERY_STATUS);
export const ledgerKindSchema = z.enum(LEDGER_KIND);
export const adjustmentReasonSchema = z.enum(ADJUSTMENT_REASON);
