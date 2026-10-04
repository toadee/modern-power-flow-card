import { html, svg, nothing, TemplateResult } from 'lit';
import type { CustomEntity } from '../inverters/dto/custom-entity';
import type { DataDto, ModernResolvedItem, sunsynkPowerFlowCardConfig } from '../types';
import { validGridDisconnected } from '../const';
import { localize } from '../localize/localize';

// Artwork: clean 1536x1024 scene with NO baked-in labels or glowing paths.
type Tone = 'solar' | 'battery' | 'load' | 'inverter' | 'grid';
type Row = { label: string; value: string | null; entity?: string; icon?: string };

const PV_POWER_KEYS = ['pv1_power_186', 'pv2_power_187', 'pv3_power_188', 'pv4_power_189', 'pv5_power', 'pv6_power'];
const C = { gold: '#f2ce89', teal: '#83d8c6', blue: '#8ab4f8', violet: '#b9a3e3', red: '#ef4444' };

export function modernCard(config: sunsynkPowerFlowCardConfig, data: DataDto): TemplateResult {
    const m = config.modern ?? {};
    const d = data as unknown as Record<string, unknown>;
    const ents = config.entities as unknown as Record<string, unknown>;
    const dp = config.decimal_places ?? 2;
    const dpe = config.decimal_places_energy ?? 1;

    // ---------- helpers ----------
    const num = (v: unknown): number | null => {
        if (v === null || v === undefined || v === '') return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    };
    const power = (w: unknown): string => {
        const n = num(w);
        if (n === null) return '—';
        const a = Math.abs(n);
        return a >= 1000 ? `${(a / 1000).toFixed(dp)} kW` : `${Math.round(a)} W`;
    };
    const fmt = (e: CustomEntity | undefined, decimals = 1): string | null => {
        if (!e?.notEmpty?.() || e.state === 'unavailable') return null;
        const n = num(e.state);
        return n === null ? String(e.state) : `${n.toFixed(decimals)} ${e.getUOM?.() ?? ''}`.trim();
    };
    const cap = (s: unknown) => { const t = String(s ?? ''); return t ? t[0].toUpperCase() + t.slice(1) : t; };
    const threshold = (v: unknown) => Math.max(0, num(v) ?? 0);
    const active = (v: number | null, limit: unknown) => v !== null && Math.abs(v) > threshold(limit);
    const configured = (key: string) => {
        const v = ents[key];
        return typeof v === 'string' && v.includes('.') && v !== 'none';
    };
    const entityOf = (key: string) => (configured(key) ? (ents[key] as string) : undefined);
    const moreInfo = (ev: Event, entityId?: string) => {
        if (!entityId) return;
        (ev.currentTarget as HTMLElement).dispatchEvent(
            new CustomEvent('hass-more-info', { detail: { entityId }, bubbles: true, composed: true }),
        );
    };

    // ---------- solar ----------
    const solar = num(data.totalPV);
    const solarOn = active(solar, config.solar?.off_threshold);
    const solarCfg = (config.solar ?? {}) as unknown as Record<string, unknown>;
    const mppts = Math.min(Math.max(Number(config.solar?.mppts) || 2, 1), 6);
    const strings = Array.from({ length: mppts }, (_, idx) => {
        const i = idx + 1;
        return {
            name: (solarCfg[`pv${i}_name`] as string) || `PV${i}`,
            watts: power(d[`pv${i}PowerWatts`]),
            volts: fmt(d[`statePV${i}Voltage`] as CustomEntity, 1) ?? '—',
            amps: fmt(d[`statePV${i}Current`] as CustomEntity, 1) ?? '—',
            entity: entityOf(PV_POWER_KEYS[idx]),
        };
    });

    // ---------- battery ----------
    const battW = num(data.batteryPower);
    const battFlow = battW === null ? null : battW * (config.battery?.invert_flow ? -1 : 1); // >0 = discharging
    const battOn = active(battFlow, config.battery?.off_threshold);
    const floating = Boolean(data.isFloating);
    const discharging = battOn && !floating && (battFlow ?? 0) > 0;
    const charging = battOn && !floating && (battFlow ?? 0) < 0;
    const soc = data.stateBatterySoc?.toNum(config.battery?.soc_decimal_places ?? 0);
    const socValid = Boolean(data.stateBatterySoc?.notEmpty()) && Number.isFinite(soc);
    const level = socValid ? Math.min(100, Math.max(0, Math.round(soc / 10) * 10)) : null;
    const battIcon = level === null ? 'mdi:battery-unknown'
        : charging ? (level === 0 ? 'mdi:battery-charging-outline' : `mdi:battery-charging-${level}`)
        : level === 100 ? 'mdi:battery' : level === 0 ? 'mdi:battery-outline' : `mdi:battery-${level}`;
    const battState = floating ? 'Floating'
        : discharging ? localize('common.discharging')
        : charging ? localize('common.charging') : localize('common.idle');
    const hasEnergy = Boolean(num(data.batteryEnergy));
    const battRows: Row[] = [
        { label: 'Power', value: power(battW), entity: entityOf('battery_power_190') },
        discharging && hasEnergy
            ? { label: `Runtime to ${data.batteryCapacity}%`, value: `${data.batteryDuration} · ≈${data.formattedResultTime}` }
            : charging && hasEnergy
                ? { label: `Charged to ${data.batteryCapacity}% in`, value: `${data.batteryDuration} · ≈${data.formattedResultTime}` }
                : { label: '', value: null },
        !hasEnergy && battOn ? { label: 'Runtime', value: 'Set battery.energy' } : { label: '', value: null },
        config.battery?.show_daily ? { label: 'Today in / out',
            value: `${fmt(data.stateDayBatteryCharge, dpe) ?? '—'} / ${fmt(data.stateDayBatteryDischarge, dpe) ?? '—'}` }
            : { label: '', value: null },
    ];

    // ---------- home load ----------
    const load = num(data.essentialPower);
    const loadOn = active(load, config.load?.off_threshold);
    const loads = (data.modernLoads ?? []) as ModernResolvedItem[];
    const measured = loads.reduce((sum, l) => sum + Math.abs(l.state.toPower()), 0);
    const unmeasured = load === null ? null : Math.max(0, Math.abs(load) - measured);
    const loadRows: Row[] = [
        ...loads.map((l) => ({ label: l.name, value: power(l.state.toPower()), entity: l.entityId, icon: l.icon })),
        loads.length && (m.show_unmeasured ?? true)
            ? { label: 'Other / unmeasured', value: power(unmeasured), icon: 'mdi:help-circle-outline' }
            : { label: '', value: null },
        config.load?.show_daily ? { label: 'Today', value: fmt(data.stateDayLoadEnergy, dpe), entity: entityOf('day_load_energy_84') }
            : { label: '', value: null },
    ];

    // ---------- inverter ----------
    const invRows: Row[] = [
        { label: 'DC temp', value: fmt(data.stateDCTransformerTemp), entity: entityOf('dc_transformer_temp_90'), icon: 'mdi:thermometer' },
        { label: 'AC temp', value: fmt(data.stateRadiatorTemp), entity: entityOf('radiator_temp_91'), icon: 'mdi:thermometer' },
        { label: 'Ambient', value: fmt(data.stateEnvironmentTemp), entity: entityOf('environment_temp'), icon: 'mdi:home-thermometer' },
        { label: 'Frequency', value: configured('load_frequency_192') ? `${data.loadFrequency} Hz` : null, entity: entityOf('load_frequency_192'), icon: 'mdi:sine-wave' },
        { label: 'Output voltage', value: configured('inverter_voltage_154') ? `${data.inverterVoltage} V` : null, entity: entityOf('inverter_voltage_154'), icon: 'mdi:flash-triangle-outline' },
        { label: 'System timer', value: configured('use_timer_248') ? cap(data.enableTimer) : null, entity: entityOf('use_timer_248'), icon: 'mdi:timer-outline' },
        { label: 'Priority load', value: configured('priority_load_243') ? cap(data.priorityLoad) : null, entity: entityOf('priority_load_243'), icon: 'mdi:priority-high' },
        { label: 'Program SOC', value: data.inverterProg?.show ? `${data.inverterProg.capacity}%` : null, icon: 'mdi:calendar-clock' },
        ...((data.modernInverterStats ?? []) as ModernResolvedItem[]).map((s) => ({
            label: s.name, value: fmt(s.state) ?? '—', entity: s.entityId, icon: s.icon })),
    ];
    const invStatus = String(data.inverterStateMsg || 'Unknown');
    const invDot = String(data.inverterStateColour || 'transparent');

    // ---------- grid ----------
    const grid = num(data.totalGridPower);
    const gridOff = validGridDisconnected.includes(String(data.gridStatus ?? '').toLowerCase());
    const gridOn = !gridOff && active(grid, config.grid?.off_threshold);
    const gridState = gridOff ? 'Off-grid' : !gridOn ? localize('common.idle') : (grid ?? 0) > 0 ? 'Importing' : 'Exporting';
    const gridOffColour = m.grid_off_colour ?? C.red;
    const costUnit = String(data.stateEnergyCostBuy?.attributes?.unit_of_measurement ?? '');
    const gridRows: Row[] = [
        { label: 'Connection', value: gridOff ? 'Disconnected' : 'Connected', entity: entityOf('grid_connected_status_194'),
            icon: gridOff ? 'mdi:transmission-tower-off' : 'mdi:transmission-tower' },
        config.grid?.show_daily_buy ? { label: 'Bought today', value: fmt(data.stateDayGridImport, dpe), entity: entityOf('day_grid_import_76') } : { label: '', value: null },
        config.grid?.show_daily_sell ? { label: 'Sold today', value: fmt(data.stateDayGridExport, dpe), entity: entityOf('day_grid_export_77') } : { label: '', value: null },
        configured('energy_cost_buy') ? { label: 'Tariff', value: `${data.energyCost} ${costUnit}`.trim(), entity: entityOf('energy_cost_buy') } : { label: '', value: null },
    ];

    // ---------- templates ----------
    const rows = (items: Row[]) => {
        const visible = items.filter((r) => r.value !== null);
        return visible.length ? html`<ul class="rows">${visible.map((r) => html`
            <li><button class="row" ?disabled=${!r.entity} @click=${(e: Event) => moreInfo(e, r.entity)}>
                ${r.icon ? html`<ha-icon .icon=${r.icon}></ha-icon>` : nothing}
                <span class="lbl">${r.label}</span><strong>${r.value}</strong>
            </button></li>`)}</ul>` : nothing;
    };

    const tile = (tone: Tone, title: string, icon: string, value: string, status: string,
        entity: string | undefined, body: unknown, extraClass = '', statusDot?: string) => html`
        <section class="tile ${tone} ${extraClass}">
            <button class="head" ?disabled=${!entity} @click=${(e: Event) => moreInfo(e, entity)}
                aria-label="${title}: ${value}, ${status}">
                <ha-icon .icon=${icon}></ha-icon>
                <span class="title">${title}</span>
                <span class="pill">${statusDot ? html`<i class="dot" style="background:${statusDot}"></i>` : nothing}${status}</span>
            </button>
            <div class="value">${value}</div>
            ${body}
        </section>`;

    const flow = (id: string, path: string, value: number | null, on: boolean, reverse: boolean, colour: string, broken = false) => {
        const duration = Math.max(1.4, 5 - Math.min(Math.abs(value ?? 0) / 6000, 1) * 3.6);
        return svg`<svg id=${id} x="0" y="0" width="1536" height="1024" viewBox="0 0 1536 1024">
            <path class=${broken ? 'broken' : 'track'} d=${path} fill="none" stroke=${colour} stroke-linecap="round"
                stroke-opacity=${broken ? '0.95' : '0.2'} stroke-width=${broken ? '5' : '3'}
                stroke-dasharray=${broken ? '12 10' : nothing}/>
            ${on && !broken ? [0, 1, 2, 3, 4].map((i) => svg`
                <circle class="particle" r="4" fill=${colour} style=${`filter:drop-shadow(0 0 4px ${colour})`}>
                    <animateMotion dur="${duration}s" repeatCount="indefinite" begin="${(-i * duration) / 5}s"
                        path=${path} keyPoints=${reverse ? '1;0' : '0;1'} keyTimes="0;1" calcMode="linear"/>
                </circle>`) : nothing}
        </svg>`;
    };

    const image = config.modern_scene_image;

    return html`
        <style>
            .mpf{--bg1:#071625;--bg2:#073745;--fg:#dfebf1;--muted:#a9c2d0;--line:#83d8c62e;
                container-type:inline-size;overflow:hidden;border:1px solid var(--line);border-radius:24px;
                background:linear-gradient(130deg,var(--bg1),var(--bg2));color:var(--fg)}
            .mpf header{padding:18px 22px 0;display:flex;justify-content:space-between;align-items:baseline;gap:12px}
            .mpf h2{font-size:22px;margin:0;color:${C.teal};font-weight:600}
            .mpf .subtitle{font-size:12px;color:var(--muted)}
            .mpf .scene{position:relative;aspect-ratio:3/2}
            .mpf .art,.mpf .routes{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
            .mpf .routes{pointer-events:none}
            .mpf .missing{position:absolute;inset:35% 20%;display:grid;place-content:center;text-align:center;color:var(--muted)}
            .mpf .broken{animation:mpf-alert 1.6s ease-in-out infinite}
            @keyframes mpf-alert{50%{stroke-opacity:.45}}
            .mpf .tiles{display:grid;gap:12px;padding:4px 16px 18px;
                grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr))}
            .mpf .tile{--accent:${C.teal};background:#061c2ee6;border:1px solid color-mix(in srgb,var(--accent) 25%,transparent);
                border-radius:16px;padding:12px 14px;display:flex;flex-direction:column;gap:6px;min-width:0}
            .mpf .solar{--accent:${C.gold}} .mpf .load{--accent:${C.blue}}
            .mpf .inverter{--accent:${C.violet}} .mpf .grid{--accent:${C.gold}}
            .mpf .grid.off{--accent:${gridOffColour};box-shadow:0 0 0 1px ${gridOffColour}66 inset}
            .mpf button{font:inherit;color:inherit;background:none;border:0;padding:0;text-align:left;cursor:pointer}
            .mpf button:disabled{cursor:default}
            .mpf button:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:8px}
            .mpf .head{display:flex;align-items:center;gap:8px;width:100%}
            .mpf .head ha-icon{--mdc-icon-size:20px;color:var(--accent)}
            .mpf .title{font-size:13px;color:var(--muted);flex:1}
            .mpf .pill{display:inline-flex;align-items:center;gap:5px;font-size:11px;padding:2px 8px;border-radius:999px;
                background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--accent);white-space:nowrap}
            .mpf .dot{width:8px;height:8px;border-radius:50%;display:inline-block}
            .mpf .value{font-size:24px;font-weight:600;color:var(--accent);font-variant-numeric:tabular-nums}
            .mpf .bar{height:6px;border-radius:999px;background:#ffffff14;overflow:hidden}
            .mpf .bar>span{display:block;height:100%;background:var(--accent);border-radius:inherit;transition:width .6s}
            .mpf .rows{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
            .mpf .row{display:flex;align-items:center;gap:8px;width:100%;padding:4px 2px;border-radius:8px;font-size:12px}
            .mpf .row:not(:disabled):hover{background:#ffffff0d}
            .mpf .row ha-icon{--mdc-icon-size:16px;color:var(--muted)}
            .mpf .lbl{flex:1;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
            .mpf .row strong{font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap}
            .mpf .string{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;padding:6px 2px;border-top:1px solid #ffffff0f;width:100%}
            .mpf .string .name{font-size:12px;color:var(--muted);grid-row:span 2;align-self:center}
            .mpf .string .metrics{display:flex;justify-content:flex-end;gap:10px;font-size:12px;font-variant-numeric:tabular-nums}
            .mpf .string .metrics b{color:var(--accent);font-weight:600}
            @container (max-width:420px){.mpf .value{font-size:20px}.mpf header{padding:14px 16px 0}.mpf .tiles{padding:4px 10px 12px;gap:8px}}
            @media (prefers-reduced-motion:reduce){.mpf .particle{display:none}.mpf .broken{animation:none}}
        </style>
        <ha-card class="mpf">
            ${m.show_header === false ? nothing : html`
                <header><h2>${m.title ?? 'Energy'}</h2><span class="subtitle">${m.subtitle ?? 'Home power flow'}</span></header>`}
            <div class="scene">
                ${image
                    ? html`<img class="art" src=${image} alt="Home with rooftop solar, grid connection, inverter and battery" />`
                    : html`<div class="missing">Set <code>modern_scene_image</code> to show the scene.</div>`}
                <svg class="routes" viewBox="0 0 1536 1024" aria-hidden="true">
                    ${config.show_grid ? flow('grid-flow', 'M250 278 Q370 367 520 402', grid, gridOn, (grid ?? 0) < 0,
                        gridOff ? gridOffColour : C.gold, gridOff) : nothing}
                    ${config.show_solar ? flow('solar-flow', 'M936 282 C976 294 948 408 990 438 Q1026 452 1026 500',
                        solar, solarOn, false, C.gold) : nothing}
                    ${config.show_battery ? flow('battery-flow', 'M1068 620 L1070 674 Q1070 694 1100 680 L1180 657',
                        battFlow, battOn && !floating, (battFlow ?? 0) > 0, C.teal) : nothing}
                    ${flow('load-flow', 'M962 589 L920 577 Q910 573 890 580 L850 593 L778 569',
                        load, loadOn, (load ?? 0) < 0, C.teal)}
                </svg>
            </div>

            <div class="tiles">
                ${config.show_solar ? tile('solar', 'Solar', 'mdi:solar-power-variant', power(solar),
                    solarOn ? 'Generating' : localize('common.idle'),
                    entityOf('pv_total') ?? entityOf('pv1_power_186'),
                    html`${strings.map((s) => html`
                        <button class="string" ?disabled=${!s.entity} @click=${(e: Event) => moreInfo(e, s.entity)}
                            aria-label="${s.name}: ${s.watts}, ${s.volts}, ${s.amps}">
                            <span class="name">${s.name}</span>
                            <span class="metrics"><b>${s.watts}</b><span>${s.volts}</span><span>${s.amps}</span></span>
                        </button>`)}
                        ${rows([config.solar?.show_daily
                            ? { label: 'Today', value: fmt(data.stateDayPVEnergy, dpe), entity: entityOf('day_pv_energy_108') }
                            : { label: '', value: null }])}`) : nothing}

                ${config.show_battery ? tile('battery', 'Battery', battIcon, socValid ? `${soc}%` : '—', battState,
                    entityOf('battery_soc_184'),
                    html`<div class="bar" role="progressbar" aria-label="Battery charge"
                            aria-valuemin="0" aria-valuemax="100" aria-valuenow=${socValid ? soc : 0}>
                            <span style="width:${socValid ? Math.min(100, Math.max(0, soc)) : 0}%"></span></div>
                        ${rows(battRows)}`) : nothing}

                ${tile('load', 'Home', 'mdi:home-lightning-bolt-outline', power(load),
                    loadOn ? 'Consuming' : localize('common.idle'), entityOf('essential_power'), rows(loadRows))}

                ${tile('inverter', 'Inverter', 'mdi:solar-power', invStatus, cap(config.inverter?.model ?? ''),
                    entityOf('inverter_status_59'), rows(invRows), '', invDot)}

                ${config.show_grid ? tile('grid', 'Grid', gridOff ? 'mdi:transmission-tower-off' : 'mdi:transmission-tower',
                    power(grid), gridState, entityOf('grid_ct_power_172'), rows(gridRows), gridOff ? 'off' : '') : nothing}
            </div>
        </ha-card>`;
}
