export const PENALTIES = [0, -1, -5, -100] as const;

export function getPenalty(group: any, slot: any): number {
  const ts = slot.timeSlot;
  for (let k = 0; k < group.choices.length; k++) {
    if (group.choices[k] === -1 || ts === group.choices[k]) return PENALTIES[k];
  }
  return PENALTIES[3];
}

export const varName = (i: number, j: number) => `x_${i}_${j}`;
