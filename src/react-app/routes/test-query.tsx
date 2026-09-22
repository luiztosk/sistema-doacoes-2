import { useState } from "react";
import { createRoute } from "@tanstack/react-router";

import reactLogo from "../assets/react.svg";
import viteLogo from "/vite.svg";
import cloudflareLogo from "../assets/Cloudflare_Logo.svg";
import honoLogo from "../assets/hono.svg";

import { Route as RootRoute } from "./__root";

function TestQuery() {
	const [count, setCount] = useState(0);
	const [tableData, setTableData] = useState<any>(null);
	const [idValue, setIdValue] = useState("1");

	return (
		<>
			<div>
				<a href="https://vite.dev" target="_blank">
					<img src={viteLogo} className="logo" alt="Vite logo" />
				</a>
				<a href="https://react.dev" target="_blank">
					<img src={reactLogo} className="logo react" alt="React logo" />
				</a>
				<a href="https://hono.dev/" target="_blank">
					<img src={honoLogo} className="logo cloudflare" alt="Hono logo" />
				</a>
				<a href="https://workers.cloudflare.com/" target="_blank">
					<img
						src={cloudflareLogo}
						className="logo cloudflare"
						alt="Cloudflare logo"
					/>
				</a>
			</div>
			<h1>Sistema Doações 2</h1>
			<div className="card">
				<button
					onClick={() => setCount((count) => count + 1)}
					aria-label="increment"
				>
					count is {count}
				</button>
				<p>
					sistema para cadastro de Assistidos e controle de doações em
					instituições de caridade.
				</p>
				<p>
					se tudo der certo este será um build oculto visível somente
					no branch stage e pelo link id
				</p>
				<p>
					Edit <code>src/react-app/routes/test-query.tsx</code> and save to test HMR
				</p>
			</div>
			{tableData && (
				<aside
					style={{
						position: "fixed",
						right: 16,
						top: 100,
						width: 320,
						padding: 16,
						border: "2px solid #333",
						borderRadius: 8,
						background: "#1b1c1d",
						boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
						maxHeight: "80vh",
						overflow: "auto",
					}}
				>
					<h3>Side Panel - Records</h3>
					<pre style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>
						{JSON.stringify(tableData, null, 2)}
					</pre>
				</aside>
			)}
			<div className="card">
				<button
					onClick={() => {
						fetch("/api/")
							.then((res) => res.json() as Promise<any>)
							.then((data) => setTableData(data.assistidos || data));
					}}
					aria-label="fetch table"
				>
					Fetch table from /api/
				</button>
				<div style={{ marginTop: 8 }}>
					<select
						value={idValue}
						onChange={(e) => setIdValue(e.target.value)}
						style={{ padding: 4 }}
					>
						<option value="1">1</option>
						<option value="2">2</option>
						<option value="3">3</option>
						<option value="4">4</option>
						<option value="5">5</option>
					</select>
					<button
						onClick={() => {
							fetch(`/api/${idValue}`)
								.then((res) => res.json() as Promise<any>)
								.then((data) => setTableData(data.assistidos || data));
						}}
						aria-label="fetch by id"
						style={{ marginLeft: 8 }}
					>
						Fetch /api/{idValue}
					</button>
				</div>
			</div>
			<p className="read-the-docs">Click on the logos to learn more</p>
		</>
	);
}

export const Route = createRoute({
	getParentRoute: () => RootRoute,
	path: "/test-query",
	component: TestQuery,
});
