import type { SolveResult } from "./algorithm/types";
import type { Group, Slot } from "./parser";

export interface SolveRequest {
	groups: Group[];
	slots: Slot[];
	lotterySeed?: string;
}

/** Everything the worker posts back. Shared so the two sides cannot drift apart. */
export type WorkerMessage =
	| { type: "status"; message: string }
	| { type: "result"; data: SolveResult }
	| { type: "error"; message: string };

/** A run this long is stuck, not slow. Aborting beats leaving the organizer waiting. */
const TIMEOUT_MS = 60_000;

/**
 * Owns the solver worker across runs.
 *
 * The worker survives between runs so the 3.4 MB Wasm module compiles once, but it
 * is dropped after any failure or timeout: its state after a crash is not
 * trustworthy, and the next run should start from a fresh module.
 */
export class SolverClient {
	#worker: Worker | null = null;

	#get(): Worker {
		if (!this.#worker) {
			this.#worker = new Worker(
				new URL("./solver.worker.ts", import.meta.url),
				{ type: "module" },
			);
		}
		return this.#worker;
	}

	/** Compile the Wasm ahead of the first run so the button responds immediately. */
	prewarm(): void {
		this.#get();
	}

	/**
	 * @param onStatus - Progress messages from the solver, already in German.
	 * @throws Error carrying the raw solver message, or a German timeout message.
	 *   Map it through toUserMessage before showing it.
	 */
	run(
		request: SolveRequest,
		onStatus: (message: string) => void,
	): Promise<SolveResult> {
		return new Promise((resolve, reject) => {
			const worker = this.#get();

			const timeout = setTimeout(() => {
				this.dispose();
				reject(new Error("Zeitüberschreitung: Die Berechnung dauert zu lange."));
			}, TIMEOUT_MS);

			worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
				if (e.data.type === "status") {
					onStatus(e.data.message);
					return;
				}
				clearTimeout(timeout);
				if (e.data.type === "result") resolve(e.data.data);
				else reject(new Error(e.data.message));
			};

			worker.onerror = (e) => {
				clearTimeout(timeout);
				this.dispose();
				reject(new Error(e.message ?? "Worker-Fehler"));
			};

			worker.postMessage(request);
		});
	}

	/** Terminate the worker. The next run transparently creates a new one. */
	dispose(): void {
		this.#worker?.terminate();
		this.#worker = null;
	}
}
