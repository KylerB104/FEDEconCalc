const regions = ["Franklin", "Dixieland", "Amarillo", "Lincoln", "Sierra"];

const baseGdp1956 = {
  Franklin: 132.3,
  Dixieland: 74.1,
  Amarillo: 52.2,
  Lincoln: 107.1,
  Sierra: 64.5,
};

const spendingCategories = [
  ["transit", "Department of Transit"],
  ["education", "Department of Education"],
  ["commerce", "Department of Commerce"],
  ["urban", "Department of Urban Development"],
  ["safety", "Department of Public Safety"],
  ["health", "Department of Public Health"],
  ["governor", "Governor's Office"],
  ["agriculture", "Department of Agriculture"],
  ["social", "Social Services"],
  ["other", "Other Spending"],
];

const taxCategories = [
  ["income", "Income Tax"],
  ["income2", "Income Tax Tier 2"],
  ["income3", "Income Tax Tier 3"],
  ["sales", "Sales Tax"],
  ["corporate", "Corporate Tax"],
  ["sin", "Sin Tax"],
  ["gas", "Gas / Highway Tax"],
  ["port", "Port / Commerce Fee"],
  ["luxury", "Luxury Tax"],
  ["inheritance", "Inheritance / Estate Tax"],
  ["other", "Other Tax"],
];

function blankRegion(name) {
  return {
    name,
    year: 1956,
    baseGdp: baseGdp1956[name],
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

const state = Object.fromEntries(regions.map((name) => [name, blankRegion(name)]));
let activeRegion = "";

const $ = (id) => document.getElementById(id);
const numberOrZero = (value) => Number(value || 0);

function money(value) {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}B`;
}

function signed(value, suffix = "%", decimals = 1) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}${suffix}`;
}

function signedRange(value, spread, suffix = "%", decimals = 1) {
  return `[${signed(value - spread, suffix, decimals)} to ${signed(value + spread, suffix, decimals)}]`;
}

function plainRange(value, spread, suffix = "%", decimals = 1) {
  return `[${(value - spread).toFixed(decimals)}${suffix} to ${(value + spread).toFixed(decimals)}${suffix}]`;
}

function jobRange(jobs) {
  const spread = Math.max(12000, Math.abs(jobs) * 0.12);
  const low = Math.round((jobs - spread) / 1000) * 1000;
  const high = Math.round((jobs + spread) / 1000) * 1000;
  const format = (value) => `${value >= 0 ? "+" : ""}${value.toLocaleString()}`;
  return `[${format(low)} to ${format(high)}]`;
}

function regionReady(region) {
  return Boolean(region && state[region]);
}

function sumSpending(data, key) {
  return Object.values(data.spending).reduce((sum, item) => sum + numberOrZero(item[key]), 0);
}

function sumRevenue(data, key) {
  return Object.values(data.taxes).reduce((sum, item) => sum + numberOrZero(item[key]), 0);
}

function averageNewTaxRate(data) {
  const rates = Object.values(data.taxes).map((item) => numberOrZero(item.newRate)).filter((rate) => rate > 0);
  return rates.length ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length : 0;
}

function calculate(region) {
  if (!regionReady(region)) return null;
  const data = state[region];
  const oldSpend = sumSpending(data, "old");
  const newSpend = sumSpending(data, "new");
  const oldRevenue = sumRevenue(data, "oldRevenue");
  const newRevenue = sumRevenue(data, "newRevenue");
  const spendChange = newSpend - oldSpend;
  const revenueChange = newRevenue - oldRevenue;
  const debtInterest = numberOrZero(data.debt) * 0.05;
  const oldBudget = oldRevenue - oldSpend - debtInterest;
  const newBudget = newRevenue - newSpend - debtInterest;
  const budgetChange = newBudget - oldBudget;
  const baseGdp = Math.max(1, numberOrZero(data.baseGdp));
  const investmentMix =
    numberOrZero(data.spending.transit.new) * 0.28 +
    numberOrZero(data.spending.education.new) * 0.22 +
    numberOrZero(data.spending.commerce.new) * 0.32 +
    numberOrZero(data.spending.urban.new) * 0.16 +
    numberOrZero(data.spending.health.new) * 0.11;
  const spendStimulus = (spendChange / baseGdp) * 20;
  const revenueDrag = (revenueChange / baseGdp) * 11;
  const investmentLift = (investmentMix / baseGdp) * 10;
  const policyLift = data.businessClimate * 0.13 + data.laborProtection * 0.04;
  const pressureDrag = data.housingPressure * 0.035 + data.infrastructureStress * 0.025;
  const gdp = spendStimulus - revenueDrag + investmentLift + policyLift - pressureDrag;
  const unemploymentBase = numberOrZero(data.unemployment) || 5;
  const unemployment = Math.max(1.5, unemploymentBase - gdp * 0.35 + data.infrastructureStress * 0.06);
  const laborForce = numberOrZero(data.laborForce) || Math.max(1, baseGdp / 8.5);
  const households = numberOrZero(data.households) || Math.max(0.4, baseGdp / 15);
  const jobs = Math.round((gdp / 100) * laborForce * 1000000 * 1.35);
  const avgTax = averageNewTaxRate(data);
  const wage = gdp * 0.55 + data.laborProtection * 0.13 + (numberOrZero(data.spending.education.new) / baseGdp) * 5;
  const cost = Math.max(0, avgTax * 0.09 + data.housingPressure * 0.18 + Math.max(0, gdp) * 0.16);
  const rent = Math.max(0, cost + data.housingPressure * 0.14 - (numberOrZero(data.spending.urban.new) / baseGdp) * 4);
  const strainRate = Math.max(4, Math.min(38, 7 + rent * 1.25 + unemployment * 0.7 - wage * 0.55));
  const householdsStrained = (households * strainRate) / 100;
  const gini = Math.max(0.28, Math.min(0.53, 0.34 + data.businessClimate * 0.005 - data.laborProtection * 0.008 + data.housingPressure * 0.004));
  const top10 = Math.round(25 + gini * 22 + Math.max(0, data.businessClimate) * 0.4);
  const hitGain = (gdp / 100) * baseGdp + budgetChange * 0.35;
  const sectorGrowth = Math.max(0, Math.abs(hitGain) * 0.75 + numberOrZero(data.spending.commerce.new) * 1.4);
  const sectorJobs = Math.round(Math.max(0, Math.abs(jobs) * 0.28 + numberOrZero(data.spending.commerce.new) * 12000));
  const weakOutput = -Math.max(0, data.infrastructureStress * 0.08 + data.housingPressure * 0.04 + Math.max(0, -gdp) * 0.5);
  const weakJobs = Math.round(Math.max(0, laborForce * (data.infrastructureStress + data.housingPressure) * 95));
  const overall = getOverall(gdp, unemployment, newBudget, strainRate);

  return {
    oldSpend,
    newSpend,
    oldRevenue,
    newRevenue,
    spendChange,
    revenueChange,
    debtInterest,
    oldBudget,
    newBudget,
    budgetChange,
    gdp,
    unemployment,
    jobs,
    wage,
    cost,
    rent,
    strainRate,
    householdsStrained,
    gini,
    top10,
    hitGain,
    sectorGrowth,
    sectorJobs,
    weakOutput,
    weakJobs,
    overall,
  };
}

function getOverall(gdp, unemployment, budget, strain) {
  const score = gdp * 1.4 - unemployment * 0.16 + budget * 0.08 - strain * 0.03;
  if (score >= 2) return "Rapidly Expanding";
  if (score >= 0.9) return "Moderately Expanding";
  if (score >= -0.2) return "Stable / Mixed";
  if (score >= -1) return "Softening";
  return "Contracting";
}

function placeholder(value, fallback) {
  return value && value.trim() ? value.trim() : fallback;
}

function buildSnapshot(region) {
  if (!regionReady(region)) return "Select a region and enter old/new budget data to generate a snapshot.";
  const data = state[region];
  const result = calculate(region);
  const hardMetro = placeholder(data.hardMetro, "[enter hardest-hit metro/area]");
  const hardReason = placeholder(data.hardReason, "[enter reason]");
  const strongMetro = placeholder(data.strongMetro, "[enter strongest metro/area]");
  const strongReason = placeholder(data.strongReason, "[enter reason]");
  const weakSector = placeholder(data.weakSector, "[enter hardest-hit sector]");
  const strongSector = placeholder(data.strongSector, "[enter strongest sector]");
  const infrastructure = placeholder(data.infrastructure, "[enter infrastructure pressure]");
  const goodOne = strongSector.includes("[") ? "Enter strongest sector and strongest metro details." : `${strongSector} is receiving the clearest policy or demand lift.`;
  const badOne = weakSector.includes("[") ? "Enter hardest-hit sector details." : `${weakSector} is absorbing the sharpest drag.`;
  const mainPressure = data.housingPressure >= data.infrastructureStress
    ? "Housing and household cost pressure."
    : "Infrastructure and transport bottlenecks.";

  return `# COMMONWEALTH OF ${region.toUpperCase()} REGIONAL ECONOMIC SNAPSHOT
-# Fiscal year: ${data.year}
-# 1956 GDP base: ${money(numberOrZero(data.baseGdp))}
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
-# Hardest-hit metro/area: ${hardMetro} — ${hardReason}
-# Strongest metro/area: ${strongMetro} — ${strongReason}
-# Hardest-hit sector: ${weakSector} — ${money(result.weakOutput)} output slowdown / ${result.weakJobs.toLocaleString()} jobs impacted
-# Strongest sector: ${strongSector} — +$${result.sectorGrowth.toFixed(1)}B growth / ${result.sectorJobs.toLocaleString()} jobs gained
-# Infrastructure/transport pressure: ${infrastructure} — Stress index ${data.infrastructureStress}/10
-# Total regional economic hit/gain: ${money(result.hitGain)}
TLDR
-# GOOD: ${goodOne}
-# GOOD: ${strongMetro.includes("[") ? "Enter strongest metro details." : `${strongMetro} is outperforming the rest of the region.`}
-# BAD: ${badOne}
-# BAD: Household strain is ${result.strainRate.toFixed(0)}% after the entered taxes, spending, and pressure inputs.
-# MAIN PRESSURE: ${mainPressure}
-# OVERALL: ${result.overall}`;
}

function renderInputs() {
  $("regionSelect").innerHTML = `<option value="">Select a region</option>${regions.map((name) => `<option value="${name}">${name}</option>`).join("")}`;
  $("spendingInputs").innerHTML = spendingCategories.map(([key, label]) => `
    <label>${label}</label>
    <input data-kind="spending" data-key="${key}" data-field="old" type="number" min="0" step="0.01" placeholder="0.00" />
    <input data-kind="spending" data-key="${key}" data-field="new" type="number" min="0" step="0.01" placeholder="0.00" />
  `).join("");
  $("taxInputs").innerHTML = taxCategories.map(([key, label]) => `
    <label>${label}</label>
    <input data-kind="tax" data-key="${key}" data-field="oldRate" type="number" min="0" step="0.1" placeholder="0.0" />
    <input data-kind="tax" data-key="${key}" data-field="oldRevenue" type="number" min="0" step="0.01" placeholder="0.00" />
    <input data-kind="tax" data-key="${key}" data-field="newRate" type="number" min="0" step="0.1" placeholder="0.0" />
    <input data-kind="tax" data-key="${key}" data-field="newRevenue" type="number" min="0" step="0.01" placeholder="0.00" />
  `).join("");
  $("regionTabs").innerHTML = regions.map((name) => `<button type="button" data-region="${name}">${name}</button>`).join("");
}

function setDisabled(disabled) {
  document.querySelectorAll("aside input, aside textarea, aside button:not(#clearRegion), #exportSnapshot").forEach((el) => {
    el.disabled = disabled;
  });
}

function syncFormFromState() {
  if (!activeRegion) {
    $("regionSelect").value = "";
    setDisabled(true);
    updateSliderOutputs();
    return;
  }
  setDisabled(false);
  const data = state[activeRegion];
  $("regionSelect").value = activeRegion;
  $("yearInput").value = data.year;
  $("baseGdpInput").value = data.baseGdp;
  $("baseUnemploymentInput").value = data.unemployment;
  $("laborForceInput").value = data.laborForce;
  $("householdsInput").value = data.households;
  $("debtInput").value = data.debt;
  $("businessClimateInput").value = data.businessClimate;
  $("laborProtectionInput").value = data.laborProtection;
  $("housingPressureInput").value = data.housingPressure;
  $("infrastructureStressInput").value = data.infrastructureStress;
  $("policyNotesInput").value = data.notes;
  $("hardMetroInput").value = data.hardMetro;
  $("hardReasonInput").value = data.hardReason;
  $("strongMetroInput").value = data.strongMetro;
  $("strongReasonInput").value = data.strongReason;
  $("weakSectorInput").value = data.weakSector;
  $("strongSectorInput").value = data.strongSector;
  $("infrastructureInput").value = data.infrastructure;

  document.querySelectorAll("[data-kind='spending']").forEach((input) => {
    input.value = data.spending[input.dataset.key][input.dataset.field];
  });
  document.querySelectorAll("[data-kind='tax']").forEach((input) => {
    input.value = data.taxes[input.dataset.key][input.dataset.field];
  });
  updateSliderOutputs();
}

function syncStateFromForm() {
  if (!activeRegion) return;
  const data = state[activeRegion];
  data.year = numberOrZero($("yearInput").value) || 1956;
  data.baseGdp = numberOrZero($("baseGdpInput").value);
  data.unemployment = $("baseUnemploymentInput").value;
  data.laborForce = $("laborForceInput").value;
  data.households = $("householdsInput").value;
  data.debt = $("debtInput").value;
  data.businessClimate = numberOrZero($("businessClimateInput").value);
  data.laborProtection = numberOrZero($("laborProtectionInput").value);
  data.housingPressure = numberOrZero($("housingPressureInput").value);
  data.infrastructureStress = numberOrZero($("infrastructureStressInput").value);
  data.notes = $("policyNotesInput").value;
  data.hardMetro = $("hardMetroInput").value;
  data.hardReason = $("hardReasonInput").value;
  data.strongMetro = $("strongMetroInput").value;
  data.strongReason = $("strongReasonInput").value;
  data.weakSector = $("weakSectorInput").value;
  data.strongSector = $("strongSectorInput").value;
  data.infrastructure = $("infrastructureInput").value;

  document.querySelectorAll("[data-kind='spending']").forEach((input) => {
    data.spending[input.dataset.key][input.dataset.field] = input.value;
  });
  document.querySelectorAll("[data-kind='tax']").forEach((input) => {
    data.taxes[input.dataset.key][input.dataset.field] = input.value;
  });
}

function updateSliderOutputs() {
  $("businessClimateOutput").value = $("businessClimateInput").value || "0";
  $("laborProtectionOutput").value = $("laborProtectionInput").value || "0";
  $("housingPressureOutput").value = $("housingPressureInput").value || "5";
  $("infrastructureStressOutput").value = $("infrastructureStressInput").value || "5";
}

function render() {
  const result = calculate(activeRegion);
  $("gdpMetric").textContent = result ? signedRange(result.gdp, 0.3) : "Select region";
  $("unemploymentMetric").textContent = result ? plainRange(result.unemployment, 0.3) : "No region";
  $("budgetMetric").textContent = result ? money(result.newBudget) : "$0.00B";
  $("budgetMetric").className = result && result.newBudget < 0 ? "negative" : "positive";
  $("overallMetric").textContent = result ? result.overall : "Waiting";
  $("snapshotOutput").textContent = buildSnapshot(activeRegion);
  document.querySelectorAll("[data-region]").forEach((button) => {
    button.classList.toggle("active", button.dataset.region === activeRegion);
  });
  renderBudgetTable();
  drawComparisonChart();
  drawBreakdownChart();
}

function renderBudgetTable() {
  if (!activeRegion) {
    $("budgetTable").innerHTML = `<tr><td colspan="4">Select a region, then enter old and new budget data.</td></tr>`;
    return;
  }
  const data = state[activeRegion];
  const result = calculate(activeRegion);
  const taxRows = taxCategories.map(([key, label]) => {
    const item = data.taxes[key];
    const oldText = `${numberOrZero(item.oldRate).toFixed(2)}% / ${money(numberOrZero(item.oldRevenue))}`;
    const newText = `${numberOrZero(item.newRate).toFixed(2)}% / ${money(numberOrZero(item.newRevenue))}`;
    const change = numberOrZero(item.newRevenue) - numberOrZero(item.oldRevenue);
    return `<tr><td>${label}</td><td>${oldText}</td><td>${newText}</td><td class="${change < 0 ? "negative" : "positive"}">${money(change)}</td></tr>`;
  }).join("");
  const spendRows = spendingCategories.map(([key, label]) => {
    const item = data.spending[key];
    const change = numberOrZero(item.new) - numberOrZero(item.old);
    return `<tr><td>${label}</td><td>${money(numberOrZero(item.old))}</td><td>${money(numberOrZero(item.new))}</td><td class="${change < 0 ? "negative" : "positive"}">${money(change)}</td></tr>`;
  }).join("");

  $("budgetTable").innerHTML = `
    ${taxRows}
    <tr class="subtotal"><td>Total Revenue</td><td>${money(result.oldRevenue)}</td><td>${money(result.newRevenue)}</td><td class="${result.revenueChange < 0 ? "negative" : "positive"}">${money(result.revenueChange)}</td></tr>
    ${spendRows}
    <tr><td>Debt Interest</td><td>${money(result.debtInterest)}</td><td>${money(result.debtInterest)}</td><td>${money(0)}</td></tr>
    <tr class="subtotal"><td>Total Spend</td><td>${money(result.oldSpend)}</td><td>${money(result.newSpend)}</td><td class="${result.spendChange < 0 ? "positive" : "negative"}">${money(result.spendChange)}</td></tr>
    <tr class="subtotal"><td>Budget Result</td><td>${money(result.oldBudget)}</td><td>${money(result.newBudget)}</td><td class="${result.budgetChange < 0 ? "negative" : "positive"}">${money(result.budgetChange)}</td></tr>
  `;
}

function drawComparisonChart() {
  const canvas = $("comparisonChart");
  const ctx = canvas.getContext("2d");
  const metric = $("comparisonMetric").value;
  const labels = regions;
  const values = labels.map((region) => {
    const result = activeRegion || hasRegionData(region) ? calculate(region) : null;
    if (!result) return 0;
    if (metric === "jobs") return result.jobs / 1000;
    if (metric === "budget") return result.newBudget;
    if (metric === "strain") return result.strainRate;
    return result.gdp;
  });
  const title = {
    gdp: "GDP growth (%)",
    jobs: "Jobs gained/lost (thousands)",
    budget: "New budget result ($B)",
    strain: "Households under strain (%)",
  }[metric];
  drawBarChart(ctx, canvas, labels, values, title, activeRegion);
}

function hasRegionData(region) {
  const data = state[region];
  return sumSpending(data, "new") > 0 || sumRevenue(data, "newRevenue") > 0;
}

function drawBreakdownChart() {
  const canvas = $("breakdownChart");
  const ctx = canvas.getContext("2d");
  if (!activeRegion) {
    drawEmptyChart(ctx, canvas, "Select a region");
    return;
  }
  const data = state[activeRegion];
  const values = ["transit", "education", "commerce", "urban", "health", "safety"].map((key) => numberOrZero(data.spending[key].new));
  drawDonutChart(ctx, canvas, ["Transit", "Education", "Commerce", "Urban", "Health", "Safety"], values);
}

function drawEmptyChart(ctx, canvas, text) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#626b74";
  ctx.font = "700 22px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  ctx.textAlign = "left";
}

function drawBarChart(ctx, canvas, labels, values, title, highlight) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const pad = { top: 42, right: 24, bottom: 58, left: 58 };
  const chartW = canvas.width - pad.left - pad.right;
  const chartH = canvas.height - pad.top - pad.bottom;
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const zeroY = pad.top + chartH - ((0 - min) / span) * chartH;

  ctx.fillStyle = "#20252b";
  ctx.font = "700 22px Inter, sans-serif";
  ctx.fillText(title, pad.left, 26);
  ctx.strokeStyle = "#d8dee4";
  ctx.beginPath();
  ctx.moveTo(pad.left, zeroY);
  ctx.lineTo(canvas.width - pad.right, zeroY);
  ctx.stroke();

  labels.forEach((label, index) => {
    const barW = chartW / labels.length * 0.58;
    const x = pad.left + index * (chartW / labels.length) + (chartW / labels.length - barW) / 2;
    const y = pad.top + chartH - ((values[index] - min) / span) * chartH;
    const h = Math.abs(zeroY - y);
    ctx.fillStyle = label === highlight ? "#2f6b55" : values[index] >= 0 ? "#3c6696" : "#a84f43";
    ctx.fillRect(x, values[index] >= 0 ? y : zeroY, barW, Math.max(2, h));
    ctx.fillStyle = "#20252b";
    ctx.font = "700 15px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x + barW / 2, canvas.height - 26);
    ctx.fillStyle = "#626b74";
    ctx.font = "700 13px Inter, sans-serif";
    ctx.fillText(values[index].toFixed(1), x + barW / 2, values[index] >= 0 ? y - 8 : zeroY + h + 18);
  });
  ctx.textAlign = "left";
}

function drawDonutChart(ctx, canvas, labels, values) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!values.some((value) => value > 0)) {
    drawEmptyChart(ctx, canvas, "Enter new spending");
    return;
  }
  const colors = ["#2f6b55", "#3c6696", "#b88737", "#6b5b95", "#4f8f78", "#a84f43"];
  const total = values.reduce((sum, value) => sum + value, 0);
  const cx = 158;
  const cy = 172;
  const radius = 104;
  let start = -Math.PI / 2;

  values.forEach((value, index) => {
    const angle = (value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = colors[index];
    ctx.fill();
    start += angle;
  });
  ctx.beginPath();
  ctx.arc(cx, cy, 55, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.fillStyle = "#20252b";
  ctx.font = "800 20px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("$B", cx, cy + 7);

  ctx.textAlign = "left";
  labels.forEach((label, index) => {
    const x = 310;
    const y = 84 + index * 34;
    ctx.fillStyle = colors[index];
    ctx.fillRect(x, y - 12, 16, 16);
    ctx.fillStyle = "#20252b";
    ctx.font = "700 14px Inter, sans-serif";
    ctx.fillText(`${label}: ${money(values[index])}`, x + 26, y + 1);
  });
}

function handleInput(event) {
  if (event.target.id === "regionSelect") {
    activeRegion = event.target.value;
    syncFormFromState();
  } else {
    syncStateFromForm();
  }
  updateSliderOutputs();
  render();
}

function wireEvents() {
  document.body.addEventListener("input", handleInput);
  document.body.addEventListener("change", handleInput);
  $("regionTabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-region]");
    if (!button) return;
    activeRegion = button.dataset.region;
    syncFormFromState();
    render();
  });
  $("resetRegion").addEventListener("click", () => {
    if (!activeRegion) return;
    state[activeRegion] = blankRegion(activeRegion);
    syncFormFromState();
    render();
  });
  $("clearRegion").addEventListener("click", () => {
    if (!activeRegion) return;
    state[activeRegion] = blankRegion(activeRegion);
    syncFormFromState();
    render();
  });
  $("comparisonMetric").addEventListener("change", render);
  $("copySnapshot").addEventListener("click", async () => {
    await navigator.clipboard.writeText($("snapshotOutput").textContent);
    $("copySnapshot").textContent = "Copied";
    setTimeout(() => {
      $("copySnapshot").textContent = "Copy";
    }, 1100);
  });
  $("exportSnapshot").addEventListener("click", () => {
    if (!activeRegion) return;
    const blob = new Blob([$("snapshotOutput").textContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeRegion.toLowerCase()}-${state[activeRegion].year}-economic-snapshot.txt`;
    link.click();
    URL.revokeObjectURL(url);
  });
}

renderInputs();
syncFormFromState();
wireEvents();
render();
