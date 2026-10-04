import { PIPELINE_LIMIT_SECONDS } from "./algorithm/limits";
import type { Guarantee, SolveResult } from "./algorithm/types";
import type { Group, Slot } from "./parser";

export interface SolveRequest {
	groups: Group[];
	slots: Slot[];
	lotterySeed?: string;
	guarantees?: Guarantee[];
}

/** Everything the worker posts back. Shared so the two sides cannot drift apart. */
export type WorkerMessage =
	| { type: "status"; message: string }
	| { type: "result"; data: SolveResult }
	| { type: "error"; message: string };

/** Headroom on top of the solver budget for Wasm init, model building and validation. */
const TIMEOUT_MARGIN_SECONDS = 45;

/**
 * A run longer than this is stuck, not slow. Aborting beats leaving the organizer waiting.
 *
 * Has to stay above the solver's own budget, otherwise the client cuts off runs the
 * solver was still allowed to finish. Guarantees double that budget, because solve runs
 * the whole pipeline a second time without them to price them.
 */
export function timeoutMs(request: SolveRequest): number {
	const runs = request.guarantees?.length ? 2 : 1;
	return (runs * PIPELINE_LIMIT_SECONDS + TIMEOUT_MARGIN_SECONDS) * 1000;
}

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
				reject(
					new Error("Zeitüberschreitung: Die Berechnung dauert zu lange."),
				);
			}, timeoutMs(request));

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
