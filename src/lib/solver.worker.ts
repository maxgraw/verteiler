import { solve } from "./algorithm/index";
import type { SolveRequest, WorkerMessage } from "./solver-client";

function post(message: WorkerMessage) {
	self.postMessage(message);
}

self.onmessage = async (e: MessageEvent<SolveRequest>) => {
	const { groups, slots, lotterySeed } = e.data;
	try {
		const result = await solve(groups, slots, {
			lotterySeed,
			onProgress: (message) => post({ type: "status", message }),
		});
		post({ type: "result", data: result });
	} catch (err) {
		post({
			type: "error",
			message: err instanceof Error ? err.message : String(err),
		});
	}
};

export {};
