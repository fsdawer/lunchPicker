export function sectorPath(index: number, count: number, radius = 140) {
  const center = 150;
  const start = -Math.PI / 2 + (index * 2 * Math.PI) / count;
  const end = -Math.PI / 2 + ((index + 1) * 2 * Math.PI) / count;
  const x1 = center + radius * Math.cos(start);
  const y1 = center + radius * Math.sin(start);
  const x2 = center + radius * Math.cos(end);
  const y2 = center + radius * Math.sin(end);
  return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${count === 2 ? 0 : 2 * Math.PI / count > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`;
}

export function labelPosition(index: number, count: number) {
  const angle = -Math.PI / 2 + ((index + 0.5) * 2 * Math.PI) / count;
  return { x: 150 + 82 * Math.cos(angle), y: 150 + 82 * Math.sin(angle) };
}

export function nextRotation(current: number, index: number, count: number) {
  const desired = (360 - ((index + 0.5) * 360) / count) % 360;
  return current + 1440 + ((desired - (current % 360) + 360) % 360);
}
