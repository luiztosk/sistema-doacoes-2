import type { Hono } from "hono";
import {
  beneficiary,
  donor,
} from "../../schemas/db/contacts";
import {
  beneficiaryInsertSchema,
  beneficiaryUpdateSchema,
  donorInsertSchema,
  donorUpdateSchema,
} from "../../schemas/zod/contacts";
import type { ApiBindings } from "./resource";
import { registerResource } from "./resource";
import { registerStock } from "./inventory";

export function registerResources(app: Hono<ApiBindings>) {
	registerResource(app, {
		table: beneficiary,
		path: "beneficiaries",
		name: "Beneficiary",
		schemas: { insert: beneficiaryInsertSchema, update: beneficiaryUpdateSchema },
	});

  registerResource(app, {
    table: donor,
    path: "donors",
    name: "Donor",
    schemas: { insert: donorInsertSchema, update: donorUpdateSchema },
  });

	registerStock(app);
}
