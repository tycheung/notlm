function pairLow(lane: number): number {
  return lane % 2 === 1 ? lane : lane - 1;
}

export function formatLaneSlotLabel(
  lane: number,
  slot: number,
  maxPerLane: number
): string {
  const depth = Math.max(1, maxPerLane);
  const low = pairLow(lane);
  const base = lane === low ? 0 : depth;
  return `${lane}${String.fromCharCode(65 + base + slot)}`;
}

export type LaneSlotOption = {
  lane: number;
  lane_slot: number | null;
  label: string;
  value: string;
};

export function buildLaneSlotOptions(
  lanes: number[],
  maxPerLane: number
): LaneSlotOption[] {
  const depth = Math.max(1, maxPerLane);
  const options: LaneSlotOption[] = [];
  for (const lane of lanes) {
    if (depth <= 1) {
      options.push({
        lane,
        lane_slot: null,
        label: String(lane),
        value: String(lane),
      });
      continue;
    }
    for (let slot = 0; slot < depth; slot += 1) {
      options.push({
        lane,
        lane_slot: slot,
        label: formatLaneSlotLabel(lane, slot, depth),
        value: `${lane}:${slot}`,
      });
    }
  }
  return options;
}

export function currentLaneSelectValue(
  assignedLane: number | null,
  laneSlot: number | null | undefined,
  maxPerLane: number
): string {
  if (assignedLane == null) return '';
  if (maxPerLane <= 1) return String(assignedLane);
  if (laneSlot != null && Number.isFinite(laneSlot)) {
    return `${assignedLane}:${laneSlot}`;
  }
  return String(assignedLane);
}

export function parseLaneSelectValue(
  raw: string,
  maxPerLane: number
): { assigned_lane: number | null; lane_slot?: number | null } | null {
  if (raw === '') {
    return { assigned_lane: null, lane_slot: null };
  }
  if (maxPerLane <= 1) {
    const lane = Number(raw);
    if (!Number.isFinite(lane) || lane < 1) return null;
    return { assigned_lane: lane };
  }
  const [lanePart, slotPart] = raw.split(':');
  const lane = Number(lanePart);
  const laneSlot = Number(slotPart);
  if (!Number.isFinite(lane) || lane < 1 || !Number.isFinite(laneSlot)) return null;
  return { assigned_lane: lane, lane_slot: laneSlot };
}
