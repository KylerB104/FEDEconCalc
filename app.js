const regions = ["Franklin", "Dixieland", "Amarillo", "Lincoln", "Sierra"];

const baseGdp1956 = {
  Franklin: 132.3,
  Dixieland: 74.1,
  Amarillo: 52.2,
  Lincoln: 107.1,
  Sierra: 64.5,
};

const spendingCategories = [
  ["transit", "Transit"],
  ["education", "Education"],
  ["commerce", "Commerce"],
  ["urban", "Urban Development"],
  ["safety", "Public Safety"],
  ["health", "Public Health"],
  ["governor", "Governor's Office"],
  ["agriculture", "Agriculture"],
  ["social", "Social Services"],
  ["other", "Other Spending"],
];

const taxCategories = [
  ["income", "Income Tax"],
  ["income2", "Income Tier 2"],
  ["income3", "Income Tier 3"],
  ["sales", "Sales Tax"],
  ["corporate", "Corporate Tax"],
  ["sin", "Sin Tax"],
  ["gas", "Gas / Highway Tax"],
  ["port", "Port / Commerce Fee"],
  ["luxury", "Luxury Tax"],
  ["inheritance", "Inheritance / Estate"],
  ["other", "Other Tax"],
];

const tutorialSteps = [
  ["Overall dashboard", "The top section compares every region. Change the Compare dropdown to switch between GDP growth, budget result, jobs, and household strain."],
  ["Region sections", "Each region has its own section. The small chart in that section only shows that region over time, so Sierra, Franklin, and the rest can be tracked separately."],
  ["Add a year", "Click + Add Year in any region. The app copies the previous year forward so you can adjust the next budget instead of typing everything from scratch."],
  ["Old versus new", "Inside a year editor, Old means the starting law or budget. New means the proposed budget or new law. The change columns and snapshot come from that difference."],
  ["Context tools", "The sliders model things that budgets do not capture cleanly: business climate, labor protections, housing pressure, and infrastructure stress."],
  ["Output", "Use Copy Snapshot on a region-year to paste the report into Discord or a doc. Export All downloads one text file with every region and year."],
];

const $ = (id) => document.getElementById(id);
const num = (value) => Number(value || 0);

let tutorialIndex = 0;
let state = Object.fromEntries(regions.map((region) => [region, {
  activeYear: 1956,
  years: [blankYear(region, 1956)],
}]));
loadSavedState();

function blankYear(region, year) {
  return {
    id: `${region}-${year}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    year,
    baseGdp: year === 1956 ? baseGdp1956[region] : "",
    unemployment: "",
    laborForce: "",
    households: "",
    debt: "",
    spending: Object.fromEntries(spendingCategories.map(([key]) => [key, { old: "", new: "" }])),
    taxes: Object.fromEntries(taxCategories.map(([key]) => [key, { oldRate: "", oldRevenue: "", newRate: "", newRevenue: "" }])),
    businessClimate: 0,
    laborProtection: 0,
    housingPressure: 5,
    infrastructureStress: 5,
    notes: "",
    hardMetro: "",
    hardReason: "",
    strongMetro: "",
    strongReason: "",
    weakSector: "",
    strongSector: "",
    infrastructure: "",
  };
}

function cloneNextYear(region) {
  const years = state[region].years;
  const last = structuredClone(years[years.length - 1]);
  last.year = Math.max(1956, ...years.map((item) => item.year)) + 1;
  last.id = `${region}-${last.year}-${Date.now()}`;
  last.baseGdp = last.baseGdp || baseGdp1956[region];
  years.push(last);
  state[region].activeYear = last.year;
}

function getYear(region, year = state[region].activeYear) {
  return state[region].years.find((item) => item.year === Number(year)) || state[region].years[0];
}

function money(value) {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}B`;
}

function signed(value, suffix = "%", decimals = 1) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}${suffix}`;
}

function signedRange(value, spread, suffix = "%") {
  return `[${signed(value - spread, suffix)} to ${signed(value + spread, suffix)}]`;
}

function plainRange(value, spread, suffix = "%") {
  return `[${(value - spread).toFixed(1)}${suffix} to ${(value + spread).toFixed(1)}${suffix}]`;
}

function jobRange(jobs) {
  const spread = Math.max(12000, Math.abs(jobs) * 0.12);
  const low = Math.round((jobs - spread) / 1000) * 1000;
  const high = Math.round((jobs + spread) / 1000) * 1000;
  const format = (value) => `${value >= 0 ? "+" : ""}${value.toLocaleString()}`;
  return `[${format(low)} to ${format(high)}]`;
}

function sumSpending(data, field) {
  return Object.values(data.spending).reduce((sum, item) => sum + num(item[field]), 0);
}

function sumRevenue(data, field) {
  return Object.values(data.taxes).reduce((sum, item) => sum + num(item[field]), 0);
}

function averageTax(data) {
  const rates = Object.values(data.taxes).map((item) => num(item.newRate)).filter(Boolean);
  return rates.length ? rates.reduce((sum, item) => sum + item, 0) / rates.length : 0;
}

function calculate(data) {
  const oldSpend = sumSpending(data, "old");
  const newSpend = sumSpending(data, "new");
  const oldRevenue = sumRevenue(data, "oldRevenue");
  const newRevenue = sumRevenue(data, "newRevenue");
  const spendChange = newSpend - oldSpend;
  const revenueChange = newRevenue - oldRevenue;
  const debtInterest = num(data.debt) * 0.05;
  const oldBudget = oldRevenue - oldSpend - debtInterest;
  const newBudget = newRevenue - newSpend - debtInterest;
  const budgetChange = newBudget - oldBudget;
  const baseGdp = Math.max(1, num(data.baseGdp));
  const investmentMix =
    num(data.spending.transit.new) * 0.28 +
    num(data.spending.education.new) * 0.22 +
    num(data.spending.commerce.new) * 0.32 +
    num(data.spending.urban.new) * 0.16 +
    num(data.spending.health.new) * 0.11;
  const spendStimulus = (spendChange / baseGdp) * 20;
  const revenueDrag = (revenueChange / baseGdp) * 11;
  const investmentLift = (investmentMix / baseGdp) * 10;
  const policyLift = num(data.businessClimate) * 0.13 + num(data.laborProtection) * 0.04;
  const pressureDrag = num(data.housingPressure) * 0.035 + num(data.infrastructureStress) * 0.025;
  const gdp = spendStimulus - revenueDrag + investmentLift + policyLift - pressureDrag;
  const unemploymentBase = num(data.unemployment) || 5;
  const unemployment = Math.max(1.5, unemploymentBase - gdp * 0.35 + num(data.infrastructureStress) * 0.06);
  const laborForce = num(data.laborForce) || Math.max(1, baseGdp / 8.5);
  const households = num(data.households) || Math.max(0.4, baseGdp / 15);
  const jobs = Math.round((gdp / 100) * laborForce * 1000000 * 1.35);
  const wage = gdp * 0.55 + num(data.laborProtection) * 0.13 + (num(data.spending.education.new) / baseGdp) * 5;
  const cost = Math.max(0, averageTax(data) * 0.09 + num(data.housingPressure) * 0.18 + Math.max(0, gdp) * 0.16);
  const rent = Math.max(0, cost + num(data.housingPressure) * 0.14 - (num(data.spending.urban.new) / baseGdp) * 4);
  const strainRate = Math.max(4, Math.min(38, 7 + rent * 1.25 + unemployment * 0.7 - wage * 0.55));
  const householdsStrained = (households * strainRate) / 100;
  const gini = Math.max(0.28, Math.min(0.53, 0.34 + num(data.businessClimate) * 0.005 - num(data.laborProtection) * 0.008 + num(data.housingPressure) * 0.004));
  const top10 = Math.round(25 + gini * 22 + Math.max(0, num(data.businessClimate)) * 0.4);
  const hitGain = (gdp / 100) * baseGdp + budgetChange * 0.35;
  const sectorGrowth = Math.max(0, Math.abs(hitGain) * 0.75 + num(data.spending.commerce.new) * 1.4);
  const sectorJobs = Math.round(Math.max(0, Math.abs(jobs) * 0.28 + num(data.spending.commerce.new) * 12000));
  const weakOutput = -Math.max(0, num(data.infrastructureStress) * 0.08 + num(data.housingPressure) * 0.04 + Math.max(0, -gdp) * 0.5);
  const weakJobs = Math.round(Math.max(0, laborForce * (num(data.infrastructureStress) + num(data.housingPressure)) * 95));
  const overall = getOverall(gdp, unemployment, newBudget, strainRate);
  return { oldSpend, newSpend, oldRevenue, newRevenue, spendChange, revenueChange, debtInterest, oldBudget, newBudget, budgetChange, gdp, unemployment, jobs, wage, cost, rent, strainRate, householdsStrained, gini, top10, hitGain, sectorGrowth, sectorJobs, weakOutput, weakJobs, overall };
}

function getOverall(gdp, unemployment, budget, strain) {
  const score = gdp * 1.4 - unemployment * 0.16 + budget * 0.08 - strain * 0.03;
  if (score >= 2) return "Rapidly Expanding";
  if (score >= 0.9) return "Moderately Expanding";
  if (score >= -0.2) return "Stable / Mixed";
  if (score >= -1) return "Softening";
  return "Contracting";
}

function fieldValue(value, fallback) {
  return value && String(value).trim() ? String(value).trim() : fallback;
}

function buildSnapshot(region, data) {
  const result = calculate(data);
  const strongSector = fieldValue(data.strongSector, "[enter strongest sector]");
  const weakSector = fieldValue(data.weakSector, "[enter hardest-hit sector]");
  const strongMetro = fieldValue(data.strongMetro, "[enter strongest metro/area]");
  const hardMetro = fieldValue(data.hardMetro, "[enter hardest-hit metro/area]");
  const pressure = num(data.housingPressure) >= num(data.infrastructureStress)
    ? "Housing and household cost pressure."
    : "Infrastructure and transport bottlenecks.";
  return `# COMMONWEALTH OF ${region.toUpperCase()} REGIONAL ECONOMIC SNAPSHOT
-# Fiscal year: ${data.year}
-# GDP base: ${money(num(data.baseGdp))}
-# Old budget result: ${money(result.oldBudget)}
-# New budget result: ${money(result.newBudget)}
-# Budget change: ${money(result.budgetChange)}
-# Regional GDP growth: ${signedRange(result.gdp, 0.3)}
-# Unemployment: ${plainRange(result.unemployment, 0.3)}
-# Jobs gained/lost: ${jobRange(result.jobs)}
-# Real wage growth: ${signedRange(result.wage, 0.4)}
-# Cost-of-living pressure: ${signedRange(result.cost, 0.3)}
-# Rent/housing costs: ${signedRange(result.rent, 0.4)}
-# Households under strain: ${result.householdsStrained.toFixed(1)}M / ${result.strainRate.toFixed(0)}%
-# Regional inequality: [Top 10% own ${result.top10}% / Gini ${result.gini.toFixed(2)}]
-# Hardest-hit metro/area: ${hardMetro} — ${fieldValue(data.hardReason, "[enter reason]")}
-# Strongest metro/area: ${strongMetro} — ${fieldValue(data.strongReason, "[enter reason]")}
-# Hardest-hit sector: ${weakSector} — ${money(result.weakOutput)} output slowdown / ${result.weakJobs.toLocaleString()} jobs impacted
-# Strongest sector: ${strongSector} — +$${result.sectorGrowth.toFixed(1)}B growth / ${result.sectorJobs.toLocaleString()} jobs gained
-# Infrastructure/transport pressure: ${fieldValue(data.infrastructure, "[enter infrastructure pressure]")} — Stress index ${data.infrastructureStress}/10
-# Total regional economic hit/gain: ${money(result.hitGain)}
TLDR
-# GOOD: ${strongSector.includes("[") ? "Enter strongest sector details." : `${strongSector} is receiving the clearest lift.`}
-# GOOD: ${strongMetro.includes("[") ? "Enter strongest metro details." : `${strongMetro} is outperforming the rest of the region.`}
-# BAD: ${weakSector.includes("[") ? "Enter hardest-hit sector details." : `${weakSector} is absorbing the sharpest drag.`}
-# BAD: Household strain is ${result.strainRate.toFixed(0)}% after the entered taxes, spending, and pressure inputs.
-# MAIN PRESSURE: ${pressure}
-# OVERALL: ${result.overall}`;
}

function render() {
  renderJumpNav();
  renderOverview();
  renderRegions();
  saveState();
}

function renderJumpNav() {
  $("jumpNav").innerHTML = regions.map((region) => `<a href="#${region}">${region}</a>`).join("");
}

function renderOverview() {
  const metric = $("overviewMetric").value;
  const rows = regions.map((region) => {
    const data = getYear(region);
    const result = calculate(data);
    return { region, year: data.year, result };
  });
  const values = rows.map(({ result }) => metric === "budget" ? result.newBudget : metric === "jobs" ? result.jobs / 1000 : metric === "strain" ? result.strainRate : result.gdp);
  drawBarChart($("overviewChart"), regions, values, {
    gdp: "GDP growth by selected year (%)",
    budget: "Budget result by selected year ($B)",
    jobs: "Jobs by selected year (thousands)",
    strain: "Household strain by selected year (%)",
  }[metric]);
  $("scoreboard").innerHTML = rows.map(({ region, year, result }) => `
    <div class="score-row">
      <div><strong>${region}</strong><br><span class="muted">${year} · ${result.overall}</span></div>
      <div class="${result.newBudget < 0 ? "negative" : "positive"}">${money(result.newBudget)}</div>
    </div>
  `).join("");
}

function renderRegions() {
  $("regionsBoard").innerHTML = regions.map((region) => renderRegion(region)).join("");
  regions.forEach((region) => drawRegionChart(region));
}

function renderRegion(region) {
  const regionState = state[region];
  const active = getYear(region);
  const activeResult = calculate(active);
  return `
    <section class="region-section" id="${region}" data-region="${region}">
      <div class="region-header">
        <div>
          <p class="eyebrow">Region</p>
          <h2>${region}</h2>
          <p class="region-subtitle">Selected year: ${active.year} · ${activeResult.overall}</p>
        </div>
        <div class="tools-row">
          <button data-action="add-year" data-region="${region}" type="button">+ Add Year</button>
          <button class="secondary" data-action="copy" data-region="${region}" type="button">Copy Snapshot</button>
          <button class="secondary" data-action="clear-year" data-region="${region}" type="button">Clear Year</button>
        </div>
      </div>

      <div class="region-layout">
        <div>
          <article class="chart-card">
            <canvas id="chart-${region}" width="620" height="300"></canvas>
          </article>
          <div class="year-list">
            ${regionState.years.map((yearData) => renderYearCard(region, yearData)).join("")}
          </div>
        </div>

        <div>
          ${renderEditor(region, active)}
          <div class="outputs-grid">
            <article class="snapshot-card">
              <div class="panel-heading">
                <h3>Snapshot</h3>
                <span>${region} ${active.year}</span>
              </div>
              <pre>${escapeHtml(buildSnapshot(region, active))}</pre>
            </article>
            <article class="budget-card">
              <h3>Budget Table</h3>
              <table>
                <thead><tr><th>Line Item</th><th>Old</th><th>New</th><th>Change</th></tr></thead>
                <tbody>${renderBudgetRows(active)}</tbody>
              </table>
            </article>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderYearCard(region, data) {
  const result = calculate(data);
  const active = state[region].activeYear === data.year ? "active" : "";
  return `
    <article class="year-card ${active}" data-action="select-year" data-region="${region}" data-year="${data.year}">
      <div class="year-card-head">
        <h3>${data.year}</h3>
        <button class="secondary" data-action="select-year" data-region="${region}" data-year="${data.year}" type="button">Edit</button>
      </div>
      <div class="year-summary">
        <div><span>GDP</span><strong>${signed(result.gdp)}</strong></div>
        <div><span>Budget</span><strong class="${result.newBudget < 0 ? "negative" : "positive"}">${money(result.newBudget)}</strong></div>
        <div><span>Jobs</span><strong>${result.jobs.toLocaleString()}</strong></div>
        <div><span>Strain</span><strong>${result.strainRate.toFixed(0)}%</strong></div>
      </div>
    </article>
  `;
}

function renderEditor(region, data) {
  return `
    <article class="editor-panel">
      <div class="panel-heading">
        <h3>${region} ${data.year} Inputs</h3>
        <span class="muted">Old = before law · New = after law</span>
      </div>
      <div class="editor-grid">
        ${input(region, data.year, "year", "Year", data.year, "number")}
        ${input(region, data.year, "baseGdp", "GDP base ($B)", data.baseGdp, "number")}
        ${input(region, data.year, "unemployment", "Old unemployment (%)", data.unemployment, "number")}
        ${input(region, data.year, "laborForce", "Labor force (M)", data.laborForce, "number")}
        ${input(region, data.year, "households", "Households (M)", data.households, "number")}
        ${input(region, data.year, "debt", "Current debt ($B)", data.debt, "number")}
        ${slider(region, data.year, "businessClimate", "Business climate", data.businessClimate, -5, 5)}
        ${slider(region, data.year, "laborProtection", "Labor protection", data.laborProtection, -5, 5)}
        ${slider(region, data.year, "housingPressure", "Housing pressure", data.housingPressure, 0, 10)}
        ${slider(region, data.year, "infrastructureStress", "Infrastructure stress", data.infrastructureStress, 0, 10)}
        ${textarea(region, data.year, "notes", "Policy notes", data.notes)}
        ${input(region, data.year, "hardMetro", "Hardest-hit metro / area", data.hardMetro)}
        ${textarea(region, data.year, "hardReason", "Why hardest hit?", data.hardReason)}
        ${input(region, data.year, "strongMetro", "Strongest metro / area", data.strongMetro)}
        ${textarea(region, data.year, "strongReason", "Why strongest?", data.strongReason)}
        ${input(region, data.year, "weakSector", "Hardest-hit sector", data.weakSector)}
        ${input(region, data.year, "strongSector", "Strongest sector", data.strongSector)}
        ${input(region, data.year, "infrastructure", "Infrastructure / transport pressure", data.infrastructure)}
      </div>

      <div class="entry-header"><span>Spending</span><span>Old $B</span><span>New $B</span></div>
      <div class="entry-grid">${spendingCategories.map(([key, label]) => `
        <label>${label}</label>
        <input data-region="${region}" data-year="${data.year}" data-group="spending" data-key="${key}" data-field="old" value="${escapeAttr(data.spending[key].old)}" type="number" step="0.01">
        <input data-region="${region}" data-year="${data.year}" data-group="spending" data-key="${key}" data-field="new" value="${escapeAttr(data.spending[key].new)}" type="number" step="0.01">
      `).join("")}</div>

      <div class="tax-header"><span>Taxes</span><span>Old %</span><span>Old $B</span><span>New %</span><span>New $B</span></div>
      <div class="tax-grid">${taxCategories.map(([key, label]) => `
        <label>${label}</label>
        <input data-region="${region}" data-year="${data.year}" data-group="taxes" data-key="${key}" data-field="oldRate" value="${escapeAttr(data.taxes[key].oldRate)}" type="number" step="0.1">
        <input data-region="${region}" data-year="${data.year}" data-group="taxes" data-key="${key}" data-field="oldRevenue" value="${escapeAttr(data.taxes[key].oldRevenue)}" type="number" step="0.01">
        <input data-region="${region}" data-year="${data.year}" data-group="taxes" data-key="${key}" data-field="newRate" value="${escapeAttr(data.taxes[key].newRate)}" type="number" step="0.1">
        <input data-region="${region}" data-year="${data.year}" data-group="taxes" data-key="${key}" data-field="newRevenue" value="${escapeAttr(data.taxes[key].newRevenue)}" type="number" step="0.01">
      `).join("")}</div>
    </article>
  `;
}

function input(region, year, field, label, value, type = "text") {
  return `<label class="field"><span>${label}</span><input data-region="${region}" data-year="${year}" data-field="${field}" type="${type}" step="0.1" value="${escapeAttr(value)}"></label>`;
}

function textarea(region, year, field, label, value) {
  return `<label class="field wide"><span>${label}</span><textarea data-region="${region}" data-year="${year}" data-field="${field}" rows="2">${escapeHtml(value)}</textarea></label>`;
}

function slider(region, year, field, label, value, min, max) {
  return `<label class="slider-field"><span>${label}: <output>${value}</output></span><input data-region="${region}" data-year="${year}" data-field="${field}" type="range" min="${min}" max="${max}" step="1" value="${escapeAttr(value)}"></label>`;
}

function renderBudgetRows(data) {
  const result = calculate(data);
  const taxRows = taxCategories.map(([key, label]) => {
    const item = data.taxes[key];
    const change = num(item.newRevenue) - num(item.oldRevenue);
    return `<tr><td>${label}</td><td>${num(item.oldRate).toFixed(2)}% / ${money(num(item.oldRevenue))}</td><td>${num(item.newRate).toFixed(2)}% / ${money(num(item.newRevenue))}</td><td class="${change < 0 ? "negative" : "positive"}">${money(change)}</td></tr>`;
  }).join("");
  const spendRows = spendingCategories.map(([key, label]) => {
    const item = data.spending[key];
    const change = num(item.new) - num(item.old);
    return `<tr><td>${label}</td><td>${money(num(item.old))}</td><td>${money(num(item.new))}</td><td class="${change < 0 ? "positive" : "negative"}">${money(change)}</td></tr>`;
  }).join("");
  return `
    ${taxRows}
    <tr class="subtotal"><td>Total Revenue</td><td>${money(result.oldRevenue)}</td><td>${money(result.newRevenue)}</td><td class="${result.revenueChange < 0 ? "negative" : "positive"}">${money(result.revenueChange)}</td></tr>
    ${spendRows}
    <tr><td>Debt Interest</td><td>${money(result.debtInterest)}</td><td>${money(result.debtInterest)}</td><td>${money(0)}</td></tr>
    <tr class="subtotal"><td>Total Spend</td><td>${money(result.oldSpend)}</td><td>${money(result.newSpend)}</td><td class="${result.spendChange < 0 ? "positive" : "negative"}">${money(result.spendChange)}</td></tr>
    <tr class="subtotal"><td>Budget Result</td><td>${money(result.oldBudget)}</td><td>${money(result.newBudget)}</td><td class="${result.budgetChange < 0 ? "negative" : "positive"}">${money(result.budgetChange)}</td></tr>
  `;
}

function drawRegionChart(region) {
  const years = state[region].years;
  drawLineChart(document.getElementById(`chart-${region}`), years.map((item) => item.year), years.map((item) => calculate(item).gdp), `${region} GDP growth over time`);
}

function drawBarChart(canvas, labels, values, title) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const pad = { top: 42, right: 24, bottom: 58, left: 58 };
  const w = canvas.width - pad.left - pad.right;
  const h = canvas.height - pad.top - pad.bottom;
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const zeroY = pad.top + h - ((0 - min) / span) * h;
  drawTitle(ctx, title, pad.left);
  drawAxis(ctx, pad.left, zeroY, canvas.width - pad.right);
  labels.forEach((label, i) => {
    const bw = w / labels.length * 0.58;
    const x = pad.left + i * (w / labels.length) + (w / labels.length - bw) / 2;
    const y = pad.top + h - ((values[i] - min) / span) * h;
    const bh = Math.abs(zeroY - y);
    ctx.fillStyle = values[i] >= 0 ? "#45b486" : "#f07178";
    ctx.fillRect(x, values[i] >= 0 ? y : zeroY, bw, Math.max(2, bh));
    drawLabel(ctx, label, x + bw / 2, canvas.height - 26);
    drawSmall(ctx, values[i].toFixed(1), x + bw / 2, values[i] >= 0 ? y - 8 : zeroY + bh + 18);
  });
}

function drawLineChart(canvas, labels, values, title) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const pad = { top: 42, right: 28, bottom: 48, left: 54 };
  const w = canvas.width - pad.left - pad.right;
  const h = canvas.height - pad.top - pad.bottom;
  const min = Math.min(-1, ...values);
  const max = Math.max(1, ...values);
  const span = max - min || 1;
  drawTitle(ctx, title, pad.left);
  drawAxis(ctx, pad.left, pad.top + h - ((0 - min) / span) * h, canvas.width - pad.right);
  ctx.strokeStyle = "#6ea8fe";
  ctx.lineWidth = 3;
  ctx.beginPath();
  values.forEach((value, i) => {
    const x = pad.left + (values.length === 1 ? w / 2 : (i / (values.length - 1)) * w);
    const y = pad.top + h - ((value - min) / span) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  values.forEach((value, i) => {
    const x = pad.left + (values.length === 1 ? w / 2 : (i / (values.length - 1)) * w);
    const y = pad.top + h - ((value - min) / span) * h;
    ctx.fillStyle = "#45b486";
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    drawLabel(ctx, String(labels[i]), x, canvas.height - 20);
    drawSmall(ctx, signed(value), x, y - 12);
  });
}

function drawTitle(ctx, title, x) {
  ctx.fillStyle = "#eef4fb";
  ctx.font = "800 20px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(title, x, 26);
}

function drawAxis(ctx, x1, y, x2) {
  ctx.strokeStyle = "#303b49";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
}

function drawLabel(ctx, text, x, y) {
  ctx.fillStyle = "#eef4fb";
  ctx.font = "800 13px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, x, y);
}

function drawSmall(ctx, text, x, y) {
  ctx.fillStyle = "#9eabb8";
  ctx.font = "800 12px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, x, y);
}

function updateData(target) {
  const region = target.dataset.region;
  const year = target.dataset.year;
  if (!region || !year) return;
  const data = getYear(region, year);
  if (target.dataset.group === "spending") {
    data.spending[target.dataset.key][target.dataset.field] = target.value;
  } else if (target.dataset.group === "taxes") {
    data.taxes[target.dataset.key][target.dataset.field] = target.value;
  } else if (target.dataset.field) {
    const oldYear = data.year;
    data[target.dataset.field] = target.type === "range" || target.type === "number" ? num(target.value) || target.value : target.value;
    if (target.dataset.field === "year" && Number(data.year) !== oldYear) {
      data.year = Number(data.year) || oldYear;
      state[region].activeYear = data.year;
    }
  }
}

function handleAction(target) {
  const actionTarget = target.closest("[data-action]");
  if (!actionTarget) return false;
  const region = actionTarget.dataset.region;
  if (actionTarget.dataset.action === "add-year") cloneNextYear(region);
  if (actionTarget.dataset.action === "select-year") state[region].activeYear = Number(actionTarget.dataset.year);
  if (actionTarget.dataset.action === "clear-year") {
    const currentYear = state[region].activeYear;
    const index = state[region].years.findIndex((item) => item.year === currentYear);
    state[region].years[index] = blankYear(region, currentYear);
  }
  if (actionTarget.dataset.action === "copy") {
    navigator.clipboard.writeText(buildSnapshot(region, getYear(region)));
  }
  render();
  return true;
}

function fillExample() {
  const data = blankYear("Sierra", 1956);
  Object.assign(data, {
    unemployment: "4.6",
    laborForce: "15.2",
    households: "8.5",
    businessClimate: 2,
    laborProtection: 1,
    housingPressure: 7,
    infrastructureStress: 7,
    notes: "Defense aviation procurement, electronics expansion, suburban housing tracts, timber oversupply, Pacific lumber export slowdown.",
    hardMetro: "Hoquiam-Aberdeen, WA",
    hardReason: "Timber oversupply and slowing Pacific lumber export pricing",
    strongMetro: "Los Angeles-Long Beach, CA",
    strongReason: "Defense aviation, suburban housing tracts, and entertainment are expanding quickly",
    weakSector: "Timber & Metal Mining",
    strongSector: "Aerospace, Electronics, & Residential Construction",
    infrastructure: "Roads & Water Grid",
  });
  const spending = { transit: [1, 1.3], education: [1.2, 1.6], commerce: [0.45, 0.55], urban: [0.55, 0.8], safety: [0.75, 0.85], health: [0.8, 1], governor: [0.08, 0.06] };
  Object.entries(spending).forEach(([key, [oldValue, newValue]]) => {
    data.spending[key].old = oldValue;
    data.spending[key].new = newValue;
  });
  const taxes = { income: [4.5, 2.08, 5.5, 2.55], sales: [3, 1.21, 4, 1.61], corporate: [6, 1.91, 8, 2.54], sin: [12, 0.65, 12, 0.65], gas: [0.5, 0.09, 0.7, 0.13], port: [6, 0.64, 5.5, 0.59] };
  Object.entries(taxes).forEach(([key, [oldRate, oldRevenue, newRate, newRevenue]]) => {
    data.taxes[key] = { oldRate, oldRevenue, newRate, newRevenue };
  });
  state.Sierra = { activeYear: 1956, years: [data] };
  render();
  document.getElementById("Sierra").scrollIntoView({ block: "start" });
}

function renderTutorial() {
  const [title, body] = tutorialSteps[tutorialIndex];
  $("tutorialTitle").textContent = title;
  $("tutorialBody").textContent = body;
  $("tutorialProgress").style.setProperty("--progress", `${((tutorialIndex + 1) / tutorialSteps.length) * 100}%`);
  $("prevTutorial").disabled = tutorialIndex === 0;
  $("nextTutorial").textContent = tutorialIndex === tutorialSteps.length - 1 ? "Finish" : "Next";
}

function exportAll() {
  const text = regions.flatMap((region) => state[region].years.map((data) => buildSnapshot(region, data))).join("\n\n---\n\n");
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "mockgov-regional-economic-snapshots.txt";
  link.click();
  URL.revokeObjectURL(url);
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "fed-econ-calc-data.json";
  link.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const incoming = JSON.parse(reader.result);
      regions.forEach((region) => {
        if (incoming[region]?.years?.length) {
          state[region] = incoming[region];
        }
      });
      render();
    } catch {
      alert("That file did not look like FED Econ Calc JSON data.");
    }
  });
  reader.readAsText(file);
}

function saveState() {
  localStorage.setItem("fed-econ-calc-state", JSON.stringify(state));
}

function loadSavedState() {
  try {
    const saved = JSON.parse(localStorage.getItem("fed-econ-calc-state"));
    if (!saved) return;
    regions.forEach((region) => {
      if (saved[region]?.years?.length) state[region] = saved[region];
    });
  } catch {
    localStorage.removeItem("fed-econ-calc-state");
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value);
}

document.body.addEventListener("input", (event) => {
  if (event.target.type !== "range") return;
  updateData(event.target);
  event.target.previousElementSibling.querySelector("output").textContent = event.target.value;
  render();
});

document.body.addEventListener("change", (event) => {
  updateData(event.target);
  render();
});

document.body.addEventListener("click", (event) => {
  if (handleAction(event.target)) return;
});

$("overviewMetric").addEventListener("change", renderOverview);
$("exampleFill").addEventListener("click", fillExample);
$("exportAll").addEventListener("click", exportAll);
$("exportData").addEventListener("click", exportData);
$("importData").addEventListener("click", () => $("importFile").click());
$("importFile").addEventListener("change", (event) => {
  if (event.target.files[0]) importData(event.target.files[0]);
  event.target.value = "";
});
$("openTutorial").addEventListener("click", () => {
  tutorialIndex = 0;
  renderTutorial();
  $("tutorialModal").showModal();
});
$("closeTutorial").addEventListener("click", () => $("tutorialModal").close());
$("prevTutorial").addEventListener("click", () => {
  tutorialIndex = Math.max(0, tutorialIndex - 1);
  renderTutorial();
});
$("nextTutorial").addEventListener("click", () => {
  if (tutorialIndex === tutorialSteps.length - 1) $("tutorialModal").close();
  else {
    tutorialIndex += 1;
    renderTutorial();
  }
});

render();
