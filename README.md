# Solar Powerflow Card

A modern, animated Home Assistant card for visualising solar, battery, grid and home energy flow, featuring a 3D isometric home scene with live power-flow animation and clean information blocks beneath.

Forked from and built upon the excellent [Sunsynk Power Flow Card](https://github.com/slipx06/sunsynk-power-flow-card) by [@slipx06](https://github.com/slipx06). All original card styles (`compact`, `lite`, `full`) remain available, with a new **`modern`** style added.

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=toadee&repository=modern-power-flow-card&category=plugin)
![GitHub release (latest by date)](https://img.shields.io/github/v/release/toadee/modern-power-flow-card?style=for-the-badge)
[![HACS Custom](https://img.shields.io/badge/HACS-Custom-orange.svg?style=for-the-badge)](https://hacs.xyz/docs/faq/custom_repositories)

---

## ✨ What's new in the Modern style

| | |
|---|---|
| 🏠 **3D scene** | Isometric home with rooftop solar, grid pole, inverter and battery, bundled inside the card (no extra files to copy) |
| ⚡ **Animated flows** | Particle animation along grid, solar, battery and load paths; speed scales with power |
| 🔴 **Grid outage alert** | Grid line turns red, dashed and pulsing when the grid is disconnected; grid block highlights in red |
| 📊 **Info blocks below the scene** | No labels cluttering the artwork; all data lives in a responsive grid of blocks |
| ☀️ **Solar block** | Total generation plus per-string (PV1, PV2 …) power, voltage and current |
| 🔋 **Battery block** | SOC with progress bar, charging/discharging/idle/floating state, and time remaining to shutdown SOC or full charge |
| 🏡 **Home block** | Total house load, unlimited monitored sub-loads, and an automatic "Other / unmeasured" row |
| 🔧 **Inverter block** | Status with colour dot, temperatures, frequency, voltage, timer/priority state, plus any custom inverter sensors |
| 🔌 **Grid block** | Import/export power, connection state, daily buy/sell and tariff |
| 📱 **Responsive** | Blocks reflow based on card width (container queries), from phone to wall panel |
| ♿ **Accessible** | Keyboard-navigable, focus outlines, ARIA labels, and respects *reduced motion* |
| 👆 **Interactive** | Tap any block or row to open the entity's more-info dialog |

## Screenshots

_Modern style_

![Modern style](docs/images/modern.png)

_Grid disconnected_

![Grid off](docs/images/modern-grid-off.png)

> The original `compact`, `lite` and `full` styles are unchanged. See the [upstream documentation](https://slipx06.github.io/sunsynk-power-flow-card/index.html) for screenshots and full configuration.

---

## Installation

### HACS (recommended)

1. Open **HACS** → ⋮ (top right) → **Custom repositories**.
2. Add `https://github.com/toadee/modern-power-flow-card` with type **Dashboard**.
3. Search for **Solar Powerflow Card** and click **Download**.
4. Hard-refresh your browser (Ctrl + Shift + R).

> ⚠️ **Already using the original Sunsynk Power Flow Card?** Remove it from HACS first. Both cards register the same element name and cannot be loaded at the same time. Your existing YAML continues to work with this card.

### Manual

1. Download `solar-powerflow-card.js` from the [latest release](https://github.com/toadee/modern-power-flow-card/releases/latest).
2. Copy it to `config/www/solar-powerflow-card/`.
3. **Settings → Dashboards → ⋮ → Resources → Add resource**
   - URL: `/local/solar-powerflow-card/solar-powerflow-card.js?v=1`
   - Type: **JavaScript module**
4. Increment `?v=` each time you update, to avoid browser caching.

---

## Quick start (Modern)

```yaml
type: custom:sunsynk-power-flow-card
cardstyle: modern
show_solar: true
show_battery: true
show_grid: true
decimal_places: 2
battery:
  energy: 15960            # Wh, required for runtime / time-to-full
  shutdown_soc: 20
  soc_end_of_charge: 100
  show_daily: true
solar:
  mppts: 2
  pv1_name: North roof
  pv2_name: West roof
  show_daily: true
load:
  show_daily: true
grid:
  show_daily_buy: true
  show_daily_sell: true
modern:
  title: Energy
  subtitle: Home power flow
  loads:
    - entity: sensor.geyser_power
      name: Geyser
      icon: mdi:water-boiler
    - entity: sensor.pool_pump_power
      name: Pool pump
      icon: mdi:pool
  inverter_stats:
    - entity: sensor.inverter_fault_code
      name: Fault code
      icon: mdi:alert-circle-outline
entities:
  essential_power: sensor.house_total_load
  inverter_status_59: sensor.inverter_overall_state
  grid_connected_status_194: binary_sensor.grid_connected
  grid_ct_power_172: sensor.grid_ct_power
  battery_soc_184: sensor.battery_soc
  battery_power_190: sensor.battery_power
  battery_current_191: sensor.battery_current
  pv1_power_186: sensor.pv1_power
  pv1_voltage_109: sensor.pv1_voltage
  pv1_current_110: sensor.pv1_current
  pv2_power_187: sensor.pv2_power
  pv2_voltage_111: sensor.pv2_voltage
  pv2_current_112: sensor.pv2_current
  day_pv_energy_108: sensor.day_pv_energy
  day_load_energy_84: sensor.day_load_energy
  day_battery_charge_70: sensor.day_battery_charge
  day_battery_discharge_71: sensor.day_battery_discharge
  day_grid_import_76: sensor.day_grid_import
  day_grid_export_77: sensor.day_grid_export
  dc_transformer_temp_90: sensor.inverter_dc_temperature
  radiator_temp_91: sensor.inverter_ac_temperature
  load_frequency_192: sensor.load_frequency
  inverter_voltage_154: sensor.inverter_voltage
```

---

## Modern configuration

### Card options

| Option | Type | Default | Description |
|---|---|---|---|
| `cardstyle` | string | `lite` | Set to `modern` for the scene view. Also accepts `compact`, `lite`, `full` |
| `modern_scene_image` | string | *bundled* | Optional URL to override the built-in scene, e.g. `/local/my-scene.png`. Falls back to the bundled image if it fails to load |
| `modern_view` | boolean | `false` | Legacy flag, equivalent to `cardstyle: modern` |

### `modern:` block

| Option | Type | Default | Description |
|---|---|---|---|
| `title` | string | `Energy` | Card heading |
| `subtitle` | string | `Home power flow` | Text to the right of the heading |
| `show_header` | boolean | `true` | Hide the header entirely with `false` |
| `show_unmeasured` | boolean | `true` | Show the "Other / unmeasured" row (total load minus monitored loads) |
| `grid_off_colour` | colour | `#ef4444` | Colour of the grid line and block when the grid is disconnected |
| `loads` | list | — | Monitored sub-loads shown in the Home block (see below) |
| `inverter_stats` | list | — | Extra inverter sensors shown in the Inverter block (see below) |

### `loads` and `inverter_stats` items

| Key | Required | Description |
|---|---|---|
| `entity` | ✅ | Entity ID, e.g. `sensor.geyser_power` |
| `name` | | Display name; defaults to the entity's friendly name |
| `icon` | | MDI icon; defaults to the entity's icon |

> If `modern.loads` is not set, the card falls back to the existing `essential_load1`–`essential_load6` entities, using `load.additional_loads`, `load.loadX_name` and `load.loadX_icon`.

### How each block is populated

| Block | Headline | Details | Key settings |
|---|---|---|---|
| **Solar** | `pv_total` or the sum of PV strings | Per-string power / voltage / current, daily yield | `solar.mppts`, `solar.pvX_name`, `solar.show_daily`, `solar.off_threshold` |
| **Battery** | `battery_soc_184` | Power, runtime to shutdown SOC or time to full, daily in/out | `battery.energy`, `battery.shutdown_soc`, `battery.shutdown_soc_offgrid`, `battery.soc_end_of_charge`, `battery.invert_flow`, `battery.show_daily` |
| **Home** | `essential_power` (total house load) | Monitored loads, unmeasured remainder, daily usage | `modern.loads`, `load.show_daily`, `load.invert_load` |
| **Inverter** | Status from `inverter_status_59` | DC/AC/ambient temperature, frequency, voltage, timer, priority load, program SOC, custom stats | `inverter.model`, `modern.inverter_stats` |
| **Grid** | `grid_ct_power_172` | Connection, daily buy/sell, tariff | `grid.show_daily_buy`, `grid.show_daily_sell`, `grid.invert_grid`, `grid.off_threshold` |

> 💡 **Tip:** set `essential_power` to a dedicated whole-house load sensor. If it is left as `none`, the card estimates load as `inverter power + grid power − AUX power`.

> 🔋 **Battery runtime** requires `battery.energy` (in Wh), or `battery_rated_capacity` plus `battery_voltage_183`. Without it, the Battery block shows a hint instead of a time estimate.

> 🔴 **Grid outage detection** uses `grid_connected_status_194`. Recognised "off" states include `off`, `0`, `off-grid` and similar.

---

## Original card styles

`compact`, `lite` and `full` work exactly as in the upstream project, including wide mode, two batteries, AUX and non-essential loads, autarky, and timer programs.

📖 Full reference: [Sunsynk Power Flow Card documentation](https://slipx06.github.io/sunsynk-power-flow-card/index.html)

---

## Development

```bash
npm install --legacy-peer-deps
npm run build      # outputs dist/solar-powerflow-card.js
npm run watch      # rebuild on change (unminified)
```

The scene artwork is in `src/assets/scene-clean.webp` and is inlined into the bundle at build time via `@rollup/plugin-url`.

### Releasing

1. Bump `version` in `package.json` (must be higher than the latest tag).
2. Commit and push to `main`.
3. **Actions → release → Run workflow**.
4. The workflow builds the card, attaches `solar-powerflow-card.js` to a new GitHub release, and HACS picks it up.

---

## Credits

- Original card: [slipx06/sunsynk-power-flow-card](https://github.com/slipx06/sunsynk-power-flow-card) and its contributors. If you find the original useful, consider [buying slipx06 a coffee](https://www.buymeacoffee.com/slipx).
- Released under the [MIT License](LICENSE).
