import { beforeEach, describe, expect, it, vi } from "vitest";
import { customers } from "./db/schema";

const database = vi.hoisted(() => ({
	drizzle: vi.fn(),
	select: vi.fn(),
	from: vi.fn(),
	all: vi.fn(),
}));

vi.mock("drizzle-orm/d1", () => ({
	drizzle: database.drizzle,
}));

import app from "./index";

describe("GET /api/", () => {
	const d1Binding = {} as never;

	beforeEach(() => {
		vi.clearAllMocks();
		database.drizzle.mockReturnValue({ select: database.select });
		database.select.mockReturnValue({ from: database.from });
		database.from.mockReturnValue({ all: database.all });
	});

	it("returns the contacts read from D1", async () => {
		const contacts = [
			{ CustomerId: 1, CompanyName: "Alfreds Futterkiste", ContactName: "Maria Anders" },
		];
		database.all.mockResolvedValue(contacts);

		const response = await app.request("http://localhost/api/", undefined, {
			prod_sistema_doacoes_2: d1Binding,
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(contacts);
		expect(database.drizzle).toHaveBeenCalledWith(d1Binding);
		expect(database.from).toHaveBeenCalledWith(customers);
	});

	it("returns an empty list when D1 has no contacts", async () => {
		database.all.mockResolvedValue([]);

		const response = await app.request("http://localhost/api/", undefined, {
			prod_sistema_doacoes_2: d1Binding,
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([]);
	});
});
