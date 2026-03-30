import { solve } from './algorithm/index';
import type { Group, Slot } from './parser';

interface WorkerInput {
  groups: Group[];
  slots: Slot[];
}

self.onmessage = async (e: MessageEvent<WorkerInput>) => {
  const { groups, slots } = e.data;
  try {
    const result = await solve(groups, slots, (message) => {
      self.postMessage({ type: 'status', message });
    });
    self.postMessage({ type: 'result', data: result });
  } catch (err) {
    self.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};

export {};
