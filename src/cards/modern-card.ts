import { html, svg, nothing } from 'lit';
import type { DataDto, sunsynkPowerFlowCardConfig } from '../types';

// Save as src/cards/modern-card.ts. Artwork must be a clean 1536:1024
// version of the approved scene with NO baked-in labels or glowing paths.
export interface ModernSceneOptions {
  modern_view?: boolean;
  modern_scene_image?: string;
}

export function modernCard(config: sunsynkPowerFlowCardConfig, data: DataDto) {
  const options = config as sunsynkPowerFlowCardConfig & ModernSceneOptions;
  const image = options.modern_scene_image;
  const number = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const watts = (value: unknown) => {
    const n = number(value);
    return n === null ? 'Unavailable' : `${(Math.abs(n) / 1000).toFixed(2)} kW`;
  };
  const threshold = (value: unknown) => Math.max(0, number(value) ?? 0);
  const battery = number(data.batteryPower);
  const batteryFlow = battery === null ? null : battery * (config.battery?.invert_flow ? -1 : 1);
  const grid = number(data.totalGridPower);
  const solar = number(data.totalPV);
  const load = number(data.essentialPower);
  const connected = ['on', '1', 'on-grid', 'connected', 'true'].includes(String(data.gridStatus).toLowerCase());
  const active = (value: number | null, limit: unknown) => value !== null && Math.abs(value) > threshold(limit);
  const batteryActive = active(batteryFlow, config.battery?.off_threshold);
  const gridActive = connected && active(grid, config.grid?.off_threshold);
  const batteryStatus = !batteryActive ? 'Idle' : batteryFlow! > 0 ? 'Discharging' : 'Charging';
  const gridStatus = !connected ? 'Disconnected' : !gridActive ? 'Idle' : grid! > 0 ? 'Importing' : 'Exporting';
  const soc = number(data.stateBatterySoc.state);
  const open = (event: Event, key: string) => {
    const entity = (config.entities as unknown as Record<string, unknown>)[key];
    if (typeof entity !== 'string' || !entity.includes('.') || entity === 'none') return;
    (event.currentTarget as HTMLElement).dispatchEvent(new CustomEvent('hass-more-info', {
      detail: { entityId: entity }, bubbles: true, composed: true,
    }));
  };
  const label = (name: string, value: string, status: string, x: number, y: number, key: string, gold = false) => html`
    <button class="reading ${gold ? 'gold' : ''}" style="left:${x}%;top:${y}%" @click=${(e: Event) => open(e, key)}>
      <span>${name}</span><strong>${value}</strong><small>${status}</small>
    </button>`;
  // Paths use the approved concept's 1536 x 1024 coordinates.
  // Fine alignment is adjusted after the clean scene asset is generated.
  const flow = (id: string, path: string, value: number | null, on: boolean, reverse: boolean, gold = false) => {
    const duration = Math.max(1.4, 5 - Math.min(Math.abs(value ?? 0) / 6000, 1) * 3.6);
    return svg`<svg id=${id} x="0" y="0" width="1536" height="1024" viewBox="0 0 1536 1024">
      <path d=${path} fill="none" stroke=${gold ? '#f2ce89' : '#83d8c6'} stroke-opacity=".2" stroke-width="3"/>
      ${on ? [0, 1, 2, 3, 4].map(i => svg`<circle class="particle" r="4" fill=${gold ? '#f2ce89' : '#83d8c6'}>
        <animateMotion dur="${duration}s" repeatCount="indefinite" begin="${-i * duration / 5}s"
          path=${path} keyPoints=${reverse ? '1;0' : '0;1'} keyTimes="0;1" calcMode="linear"/>
      </circle>`) : nothing}
    </svg>`;
  };
  return html`
    <style>
      .modern-card{overflow:hidden;border:1px solid #83d8c62e;border-radius:24px;background:linear-gradient(130deg,#071625,#073745);color:#dfebf1;font-family:inherit}
      .modern-card header{padding:20px 24px 0;display:flex;justify-content:space-between;align-items:center;gap:12px}
      .modern-card h2{font-size:22px;margin:0;color:#83d8c6;font-weight:600}
      .modern-card .subtitle{font-size:12px;color:#94b1c2}
      .modern-card .scene{position:relative;aspect-ratio:3/2;isolation:isolate}
      .modern-card .art,.modern-card .routes{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
      .modern-card .routes{pointer-events:none}
      .modern-card .reading{position:absolute;transform:translate(-50%,-50%);border:1px solid #83d8c640;border-radius:12px;background:#061c2eed;color:inherit;text-align:left;padding:9px 12px;cursor:pointer;font:inherit;min-width:95px}
      .modern-card .reading:focus-visible{outline:2px solid #f2ce89;outline-offset:3px}
      .modern-card .reading span,.modern-card .reading small{display:block;font-size:11px;color:#a9c2d0}
      .modern-card .reading strong{display:block;font-size:18px;color:#83d8c6;white-space:nowrap;font-variant-numeric:tabular-nums}
      .modern-card .reading.gold strong{color:#f2ce89}
      .modern-card .reading small{font-size:10px;margin-top:3px}
      .modern-card .particle{filter:drop-shadow(0 0 4px #83d8c6)}
      .modern-card footer{padding:12px 24px 18px;font-size:11px;color:#94b1c2;border-top:1px solid #83d8c617}
      .modern-card .missing{position:absolute;inset:35% 22%;text-align:center;color:#adc5cf;font-size:14px;display:grid;place-content:center}
      @media(max-width:450px){.modern-card .reading{min-width:64px;padding:5px 7px;border-radius:8px}.modern-card .reading strong{font-size:12px}.modern-card .reading span{font-size:10px}.modern-card .reading small{font-size:8px}.modern-card header{padding:14px 16px 0}.modern-card h2{font-size:18px}}
      @media(prefers-reduced-motion:reduce){.modern-card .particle{display:none}}
    </style>
    <ha-card class="modern-card">
      <header><h2>Energy</h2><span class="subtitle">Home power flow</span></header>
      <div class="scene">
        ${image ? html`<img class="art" src=${image} alt="Isometric home with rooftop solar, grid pole, inverter and battery" />`
          : html`<div class="missing">Scene artwork pending.<br />Live readings and flow layer are ready for alignment.</div>`}
        <svg class="routes" viewBox="0 0 1536 1024" aria-hidden="true">
          ${config.show_grid ? flow('grid-flow', 'M250 278 Q370 367 520 402', grid, gridActive, (grid ?? 0) < 0, true) : nothing}
          ${config.show_solar ? flow('solar-flow', 'M936 282 C976 294 948 408 990 438 Q1026 452 1026 500', solar, active(solar, config.solar?.off_threshold), false, true) : nothing}
          ${config.show_battery ? flow('battery-flow', 'M1068 620 L1070 674 Q1070 694 1100 680 L1180 657', batteryFlow, batteryActive, (batteryFlow ?? 0) > 0) : nothing}
          ${flow('load-flow', 'M962 589 L920 577 Q910 573 890 580 L850 593 L778 569', load, active(load, config.load?.off_threshold), (load ?? 0) < 0)}
        </svg>
        ${config.show_solar ? label('Solar', watts(solar), 'Generation', 60, 15, config.entities.pv_total ? 'pv_total' : 'pv1_power_186', true) : nothing}
        ${config.show_grid ? label('Grid', watts(grid), gridStatus, 9, 39, 'grid_ct_power_172', true) : nothing}
        ${label('Essential loads', watts(load), 'Consumption', 38, 70, 'essential_power')}
        ${label('Inverter', watts(data.autoScaledInverterPower), String(data.inverterStateMsg || ''), 76, 47, 'inverter_power_175')}
        ${config.show_battery ? label('Battery', soc === null ? 'Unavailable' : `${soc}%`, `${batteryStatus} · ${watts(battery)}`, 90, 59, 'battery_soc_184') : nothing}
      </div>
      <footer>Experimental scene view · one battery · essential loads shown separately from nonessential and AUX loads</footer>
    </ha-card>`;
}
