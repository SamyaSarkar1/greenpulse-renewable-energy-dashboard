
/* =========================================================
   GREENPULSE - ENERGY MANAGEMENT SYSTEM (EMS)
   Renewable Energy Dashboard
   Wind + Solar + Forecast + BESS + DSM
   ========================================================= */


/* 1. HOURLY DEMO DATA */

const hours = Array.from(
  { length: 24 },
  (_, i) => `${String(i).padStart(2, "0")}:00`
);

const plants = [
  {
    name: "Wind Farm A",
    source: "Wind",
    forecast: [
      48,45,42,40,38,40,45,52,58,65,72,78,
      82,85,88,90,87,82,76,70,65,60,55,51
    ],
    actual: [
      46,43,41,38,37,39,43,50,56,62,69,75,
      80,82,85,87,84,79,73,68,62,58,53,49
    ]
  },
  {
    name: "Wind Farm B",
    source: "Wind",
    forecast: [
      35,33,31,30,32,35,39,43,47,52,56,60,
      64,67,69,70,68,65,61,57,53,48,43,39
    ],
    actual: [
      33,31,29,29,30,33,37,41,45,49,54,58,
      61,64,66,67,65,62,59,54,50,46,41,37
    ]
  },
  {
    name: "Solar Park A",
    source: "Solar",
    forecast: [
      0,0,0,0,0,2,8,20,38,55,72,85,
      95,100,98,90,75,55,30,10,2,0,0,0
    ],
    actual: [
      0,0,0,0,0,1,7,18,35,52,68,82,
      91,96,94,86,72,52,28,9,1,0,0,0
    ]
  },
  {
    name: "Solar Park B",
    source: "Solar",
    forecast: [
      0,0,0,0,0,1,5,14,28,42,58,70,
      78,82,80,73,60,42,22,7,1,0,0,0
    ],
    actual: [
      0,0,0,0,0,1,4,13,26,40,55,67,
      74,78,76,69,57,39,20,6,1,0,0,0
    ]
  },
    {
    name: "Hybrid Farm A",
    source: "Hybrid",
    forecast: [
      48,46,44,42,43,48,58,75,95,115,130,145,
      155,160,158,150,135,115,95,78,65,58,52,49
    ],
    actual: [
      46,44,42,41,41,46,55,72,91,111,126,140,
      151,156,154,146,131,112,92,75,63,56,50,47
    ]
  },
  {
    name: "Hybrid Farm B",
    source: "Hybrid",
    forecast: [
      38,37,36,35,36,40,48,62,80,98,112,125,
      135,140,138,130,118,100,83,68,57,50,44,40
    ],
    actual: [
      36,35,34,33,34,38,46,59,77,95,109,121,
      132,136,134,127,115,97,80,65,55,48,42,38
    ]
  },
  
];


/* 2. HELPERS */

const $ = id => document.getElementById(id);

const sum = values =>
  values.reduce((total, value) => total + value, 0);

const mean = values =>
  values.length ? sum(values) / values.length : 0;

const mw = value => `${value.toFixed(2)} MW`;

const rupees = value =>
  value.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

let overviewGenerationChart = null;
let detailGenerationChart = null;
let forecastChart = null;
let overviewMixChart = null;
let detailMixChart = null;
let errorChart = null;
let bessChart = null;
let bessPowerTrendChart = null;


/* 3. FILTERED PLANTS */

function selectedPlants() {
  const source = $("sourceFilter").value;
  const plant = $("plantFilter").value;

  return plants.filter(p =>
    (source === "All" || p.source === source) &&
    (plant === "All" || p.name === plant)
  );
}


function getSelectedSource() {
  const source = $("sourceFilter").value;
  const plantName = $("plantFilter").value;

  if (plantName !== "All") {
    const selectedPlant = plants.find(
      p => p.name === plantName
    );

    if (selectedPlant) return selectedPlant.source;
  }

  return source;
}


/* 4. SELECTED TIME INTERVALS */

function selectedIndices() {
  const timeWindow = $("timeFilter").value;
  const source = getSelectedSource();

  if (timeWindow === "daylight") {
    return Array.from({ length: 8 }, (_, i) => i + 8);
  }

  // Solar-only view uses 06:00 through 19:00.
  if (source === "Solar") {
    return Array.from({ length: 14 }, (_, i) => i + 6);
  }

  return Array.from({ length: 24 }, (_, i) => i);
}


/* 5. METRICS */

function getMetrics(selected) {
  const indices = selectedIndices();

  const points = indices.map(index => {
    const actual = sum(
      selected.map(p => p.actual[index])
    );

    const forecast = sum(
      selected.map(p => p.forecast[index])
    );

    return {
      index,
      hour: hours[index],
      actual,
      forecast,
      deviation: actual - forecast,
      error: Math.abs(actual - forecast)
    };
  });

  const actualTotal = sum(points.map(p => p.actual));
  const forecastTotal = sum(points.map(p => p.forecast));
  const absoluteError = sum(points.map(p => p.error));

  const wape = actualTotal > 0
    ? absoluteError / actualTotal * 100
    : 0;

  return {
    points,
    actualTotal,
    forecastTotal,
    avgActual: mean(points.map(p => p.actual)),
    avgForecast: mean(points.map(p => p.forecast)),
    deviation: mean(points.map(p => p.deviation)),
    mae: mean(points.map(p => p.error)),
    wape,
    indicator: Math.max(0, 100 - wape)
  };
}


/* 6. CHART DEFAULTS */

function chartOptions(yTitle = "Power (MW)") {
  return {
    responsive: true,
    maintainAspectRatio: false,

    interaction: {
      intersect: false,
      mode: "index"
    },

    plugins: {
      legend: {
        labels: {
          color: "#a8bac8",
          usePointStyle: true,
          padding: 15,
          font: { size: 10 }
        }
      },

      tooltip: {
        backgroundColor: "#071a2d",
        borderColor: "#294d6b",
        borderWidth: 1,
        titleColor: "#ffffff",
        bodyColor: "#d8eaff"
      }
    },

    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: "#8da2b5",
          maxTicksLimit: 12,
          font: { size: 9 }
        }
      },

      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: yTitle,
          color: "#8da2b5",
          font: { size: 9 }
        },
        grid: {
          color: "rgba(130,155,180,.13)"
        },
        ticks: {
          color: "#8da2b5",
          font: { size: 9 }
        }
      }
    }
  };
}


function destroyChart(chart) {
  if (chart) chart.destroy();
}


/* 7. KPI CARDS */

function updateKpis(m) {
  $("actualKpi").textContent = mw(m.avgActual);
  $("forecastKpi").textContent = mw(m.avgForecast);

  $("accuracyKpi").textContent =
    `${m.indicator.toFixed(2)}%`;

  $("deviationKpi").textContent =
    `${m.deviation > 0 ? "+" : ""}${mw(m.deviation)}`;

  $("deviationKpi").style.color =
    m.deviation >= 0 ? "#20e6a0" : "#f2b76d";

  $("maeValue").textContent = mw(m.mae);

  $("wapeValue").textContent =
    `${m.wape.toFixed(2)}%`;
}


/* 8. ACTUAL VS FORECAST CHART */

function createGenerationChart(canvasId, oldChart, m) {
  destroyChart(oldChart);

  const labels = m.points.map(p => p.hour);

  return new Chart($(canvasId), {
    type: "line",

    data: {
      labels,

      datasets: [
        {
          label: "Actual Generation",
          data: m.points.map(p => p.actual),
          borderColor: "#20e6a0",
          backgroundColor: "rgba(32,230,160,.08)",
          borderWidth: 2,
          pointRadius: 1,
          pointHoverRadius: 5,
          tension: .35,
          fill: false
        },
        {
          label: "Forecast Generation",
          data: m.points.map(p => p.forecast),
          borderColor: "#159cff",
          backgroundColor: "rgba(21,156,255,.08)",
          borderWidth: 2,
          pointRadius: 1,
          pointHoverRadius: 5,
          tension: .35,
          fill: false
        }
      ]
    },

    options: chartOptions("Generation (MW)")
  });
}


function renderGeneration(m) {
  overviewGenerationChart = createGenerationChart(
    "generationChart",
    overviewGenerationChart,
    m
  );

  detailGenerationChart = createGenerationChart(
    "generationDetailChart",
    detailGenerationChart,
    m
  );
}


/* 9. GENERATION MIX */

function getSourceAverages(selected) {
  const indices = selectedIndices();

  const sourceAverage = source => {
    const sourcePlants = selected.filter(
      p => p.source === source
    );

    if (!sourcePlants.length) return 0;

    return mean(
      indices.map(index =>
        sum(sourcePlants.map(p => p.actual[index]))
      )
    );
  };

  const wind = sourceAverage("Wind");
  const solar = sourceAverage("Solar");

  return {
    wind,
    solar,
    total: wind + solar
  };
}


function createMixChart(canvasId, oldChart, mix) {
  destroyChart(oldChart);

  return new Chart($(canvasId), {
    type: "doughnut",

    data: {
      labels: ["Wind", "Solar"],

      datasets: [{
        data: [mix.wind, mix.solar],
        backgroundColor: ["#20e6a0", "#159cff"],
        borderColor: "#0b1e31",
        borderWidth: 4,
        hoverOffset: 7
      }]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "75%",

      plugins: {
        legend: { display: false }
      }
    }
  });
}


function renderMix(selected) {
  const mix = getSourceAverages(selected);

  const windPct = mix.total
    ? mix.wind / mix.total * 100
    : 0;

  const solarPct = mix.total
    ? mix.solar / mix.total * 100
    : 0;

  $("mixTotal").textContent = mix.total.toFixed(1);
  $("windMix").textContent = mw(mix.wind);
  $("solarMix").textContent = mw(mix.solar);

  $("windPct").textContent = `${windPct.toFixed(1)}%`;
  $("solarPct").textContent = `${solarPct.toFixed(1)}%`;

  $("mixDetailTotal").textContent = mix.total.toFixed(1);
  $("windDetailMix").textContent = mw(mix.wind);
  $("solarDetailMix").textContent = mw(mix.solar);

  $("windDetailPct").textContent = `${windPct.toFixed(1)}%`;
  $("solarDetailPct").textContent = `${solarPct.toFixed(1)}%`;

  overviewMixChart = createMixChart(
    "mixChart",
    overviewMixChart,
    mix
  );

  detailMixChart = createMixChart(
    "mixDetailChart",
    detailMixChart,
    mix
  );
}


/* 10. FORECAST CHART */

function renderForecast(m) {
  destroyChart(forecastChart);

  forecastChart = new Chart($("forecastChart"), {
    type: "bar",

    data: {
      labels: m.points.map(p => p.hour),

      datasets: [
        {
          type: "bar",
          label: "Actual Generation",
          data: m.points.map(p => p.actual),
          backgroundColor: "rgba(32,230,160,.65)",
          borderRadius: 3,
          maxBarThickness: 15
        },
        {
          type: "line",
          label: "Forecast Generation",
          data: m.points.map(p => p.forecast),
          borderColor: "#159cff",
          backgroundColor: "rgba(21,156,255,.1)",
          borderWidth: 2,
          tension: .35,
          pointRadius: 1
        }
      ]
    },

    options: chartOptions("Generation (MW)")
  });
}


/* 11. DEVIATION CHART */

function renderError(m) {
  destroyChart(errorChart);

  errorChart = new Chart($("errorChart"), {
    type: "bar",

    data: {
      labels: m.points.map(p => p.hour),

      datasets: [{
        label: "Absolute Forecast Error",
        data: m.points.map(p => p.error),
        backgroundColor: "rgba(242,183,109,.8)",
        borderRadius: 4,
        maxBarThickness: 25
      }]
    },

    options: chartOptions("Absolute Error (MW)")
  });

  $("insightsWape").textContent =
    `${m.wape.toFixed(2)}%`;

  $("insightsAccuracy").textContent =
    `${m.indicator.toFixed(2)}%`;
}


/* 12. PLANT PERFORMANCE TABLE */

function renderTable(selected) {
  const indices = selectedIndices();

  $("plantTable").innerHTML = selected.map(p => {
    const actual = mean(indices.map(i => p.actual[i]));
    const forecast = mean(indices.map(i => p.forecast[i]));
    const deviation = actual - forecast;

    const absoluteError = sum(
      indices.map(i => Math.abs(p.actual[i] - p.forecast[i]))
    );

    const actualTotal = sum(
      indices.map(i => p.actual[i])
    );

    const wape = actualTotal > 0
      ? absoluteError / actualTotal * 100
      : 0;

    const indicator = Math.max(0, 100 - wape);

    return `
      <tr>
        <td><strong>${p.name}</strong></td>
        <td><span class="source-pill ${p.source.toLowerCase()}">${p.source}</span></td>
        <td>${forecast.toFixed(2)}</td>
        <td>${actual.toFixed(2)}</td>
        <td class="${deviation >= 0 ? "positive" : "negative"}">
          ${deviation > 0 ? "+" : ""}${deviation.toFixed(2)}
        </td>
        <td class="positive">${indicator.toFixed(2)}%</td>
      </tr>
    `;
  }).join("");
}


/* 13. PERFORMANCE INSIGHTS */

function renderInsight(m, selected) {
  const direction =
    m.deviation > 0 ? "above" :
    m.deviation < 0 ? "below" :
    "equal to";

  const title = m.deviation === 0
    ? "Actual output matches forecast"
    : `Actual generation is ${direction} forecast`;

  const message =
    `Across ${selected.length} selected assets, average actual generation is ` +
    `${Math.abs(m.deviation).toFixed(2)} MW ${direction} forecast per displayed interval. ` +
    `Portfolio WAPE is ${m.wape.toFixed(2)}%. ` +
    `These observations are based on simulated data, not ML predictions.`;

  $("insightTitle").textContent = title;
  $("insightText").textContent = message;

  $("insightTitleDetail").textContent = title;
  $("insightTextDetail").textContent = message;
}


/* 14. BESS SIMULATION */

const BESS = {
  powerMW: 20,
  capacityMWh: 40,
  initialSoc: 60,
  minSoc: 10,
  maxSoc: 90,
  efficiency: 0.90,
  demoDispatchMW: 5
};

let bessSummary = {
  soc: 60,
  energy: 24,
  mode: "IDLE",
  power: 0
};



function updateBess(m) {
  let storedEnergy =
    BESS.capacityMWh * BESS.initialSoc / 100;

  const minEnergy =
    BESS.capacityMWh * BESS.minSoc / 100;

  const maxEnergy =
    BESS.capacityMWh * BESS.maxSoc / 100;

  const socHistory = [];

  let lastMode = "IDLE";
  let lastPower = 0;
  let recommendation = "Maintain current battery state";
  let explanation = "Renewable generation is within the demo balancing range.";

  m.points.forEach(point => {
    let mode = "IDLE";
    let power = 0;

    if (point.forecast > 170) {
      const availableHeadroom = maxEnergy - storedEnergy;

      const possibleCharge = Math.min(
        BESS.demoDispatchMW,
        BESS.powerMW,
        availableHeadroom / BESS.efficiency
      );

      if (possibleCharge > 0.01) {
        power = possibleCharge;
        storedEnergy += power * BESS.efficiency;
        mode = "CHARGING";
      }

    } else if (point.forecast < 130) {
      const availableEnergy = storedEnergy - minEnergy;

      const possibleDischarge = Math.min(
        BESS.demoDispatchMW,
        BESS.powerMW,
        availableEnergy * BESS.efficiency
      );

      if (possibleDischarge > 0.01) {
        power = possibleDischarge;
        storedEnergy -= power / BESS.efficiency;
        mode = "DISCHARGING";
      }
    }

    storedEnergy = Math.max(
      minEnergy,
      Math.min(maxEnergy, storedEnergy)
    );

    const soc = storedEnergy / BESS.capacityMWh * 100;

    socHistory.push(Number(soc.toFixed(2)));

    lastMode = mode;
    lastPower = power;

    if (mode === "CHARGING") {
      recommendation = "Charge the battery";
      explanation =
        "The selected portfolio forecast is above the demo charging threshold. Charging is recommended subject to battery limits.";

    } else if (mode === "DISCHARGING") {
      recommendation = "Discharge the battery";
      explanation =
        "The selected portfolio forecast is below the demo discharging threshold. Discharging is recommended subject to available stored energy.";

    } else {
      recommendation = "Maintain battery state";
      explanation =
        "No charging or discharging is triggered by the demo dispatch rule.";
    }
  });

  const finalSoc =
    storedEnergy / BESS.capacityMWh * 100;
// Update circular SOC gauge
const gauge = $("bessSocGauge");
const gaugePercent = $("bessGaugePercent");

if (gauge) {
    gauge.style.setProperty(
        "--soc",
        `${Math.max(0, Math.min(100, finalSoc))}%`
    );
}

if (gaugePercent) {
    gaugePercent.textContent = `${finalSoc.toFixed(1)}%`;
}
  bessSummary = {
    soc: finalSoc,
    energy: storedEnergy,
    mode: lastMode,
    power: lastPower
  };

  // Existing BESS indicators
  $("bessSoc").textContent = `${finalSoc.toFixed(1)}%`;
  $("bessSocBar").style.width = `${finalSoc}%`;
  $("bessSocEnergy").textContent = `${storedEnergy.toFixed(2)} MWh stored`;
  $("bessMode").textContent = lastMode;
  $("bessPower").textContent = `${lastPower.toFixed(2)} MW`;

  $("bessRecommendation").textContent = recommendation;
  $("bessRecommendationText").textContent = explanation;

  // Existing overview indicators
  $("overviewSoc").textContent = `${finalSoc.toFixed(1)}%`;
  $("overviewSocBar").style.width = `${finalSoc}%`;
  $("overviewBessMode").textContent = lastMode;
  $("overviewBessEnergy").textContent = `${storedEnergy.toFixed(2)} MWh`;

  $("flowSoc").textContent = `${finalSoc.toFixed(1)}%`;

  // NEW BESS DASHBOARD INDICATORS
  const setBessValue = (id, value) => {
    const element = $(id);
    if (element) element.textContent = value;
  };

  const availableEnergy = storedEnergy - minEnergy;
  const chargeHeadroom = maxEnergy - storedEnergy;

  setBessValue(
    "bessAvailableEnergy",
    `${Math.max(0, availableEnergy).toFixed(2)} MWh`
  );

  setBessValue(
    "bessHeadroom",
    `${Math.max(0, chargeHeadroom).toFixed(2)} MWh`
  );

  setBessValue("bessBatteryPercent", `${finalSoc.toFixed(1)}%`);
  setBessValue("bessBatteryEnergy", `${storedEnergy.toFixed(2)} MWh`);
  setBessValue("bessModeLabel", `${lastMode} MODE`);

  setBessValue("bessTableSoc", finalSoc.toFixed(1));
  setBessValue("bessTableEnergy", storedEnergy.toFixed(2));
  setBessValue("bessTablePower", lastPower.toFixed(2));
  setBessValue("bessTableMode", lastMode);

  const batteryFill = $("bessBatteryFill");

  if (batteryFill) {
    batteryFill.style.height =
      `${Math.max(0, Math.min(100, finalSoc))}%`;
  }

  // Render both BESS charts
  renderBessChart(m, socHistory);
  renderBessPowerChart(m);
}

function renderBessChart(m, socHistory) {
  destroyChart(bessChart);

  bessChart = new Chart($("bessChart"), {
    type: "line",

    data: {
      labels: m.points.map(p => p.hour),

      datasets: [{
        label: "Battery SOC",
        data: socHistory,
        borderColor: "#b49aff",
        backgroundColor: "rgba(180,154,255,.12)",
        fill: true,
        tension: .3,
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 5
      }]
    },

    options: {
      ...chartOptions("Battery SOC (%)"),
      scales: {
        ...chartOptions().scales,
        y: {
          min: 0,
          max: 100,
          grid: { color: "rgba(130,155,180,.13)" },
          ticks: {
            color: "#8da2b5",
            callback: value => `${value}%`
          }
        }
      }
    }
  });
}

/* BESS PORTFOLIO POWER TREND */

function renderBessPowerChart(m) {
  const canvas = $("bessPowerChart");

  if (!canvas) return;

  destroyChart(bessPowerTrendChart);

  bessPowerTrendChart = new Chart(canvas, {
    type: "line",

    data: {
      labels: m.points.map(p => p.hour),

      datasets: [
        {
          label: "Actual Generation",
          data: m.points.map(p => p.actual),
          borderColor: "#36dca1",
          backgroundColor: "rgba(54,220,161,.08)",
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 1,
          pointHoverRadius: 5
        },
        {
          label: "Forecast Generation",
          data: m.points.map(p => p.forecast),
          borderColor: "#55aaff",
          backgroundColor: "rgba(85,170,255,.08)",
          borderWidth: 2,
          borderDash: [5, 4],
          tension: 0.35,
          pointRadius: 1,
          pointHoverRadius: 5
        }
      ]
    },

    options: chartOptions("Portfolio Power (MW)")
  });
}


/* 15. OVERVIEW FLOW AND METRICS */

function updateOverview(m, selected) {
  const mix = getSourceAverages(selected);

  $("flowWind").textContent = mw(mix.wind);
  $("flowSolar").textContent = mw(mix.solar);

  $("overviewAccuracy").textContent =
    `${m.indicator.toFixed(2)}%`;

  $("overviewMae").textContent = mw(m.mae);

  $("overviewDeviation").textContent =
    `${m.deviation > 0 ? "+" : ""}${mw(m.deviation)}`;
}


/* 16. REFRESH DASHBOARD */

function refreshDashboard() {
  const selected = selectedPlants();

  if (!selected.length) return;

  const metrics = getMetrics(selected);

  updateKpis(metrics);
  renderGeneration(metrics);
  renderMix(selected);
  renderForecast(metrics);
  renderError(metrics);
  renderTable(selected);
  renderInsight(metrics, selected);
  updateBess(metrics);
  updateOverview(metrics, selected);
}


/* 17. DSM CALCULATOR */

function calculateDSM() {
  const ids = [
    "dsmSchedule",
    "dsmActual",
    "dsmRate",
    "dsmFrequency"
  ];

  if (ids.some(id => $(id).value.trim() === "")) {
    showToast("Please complete all DSM input fields.");
    return;
  }

  const schedule = Number($("dsmSchedule").value);
  const actual = Number($("dsmActual").value);
  const interval = Number($("dsmInterval").value);
  const rate = Number($("dsmRate").value);
  const frequency = Number($("dsmFrequency").value);

  if (
    ![schedule, actual, interval, rate, frequency].every(Number.isFinite) ||
    schedule < 0 ||
    actual < 0 ||
    rate < 0 ||
    interval <= 0 ||
    frequency < 45 ||
    frequency > 55
  ) {
    showToast("Please enter valid DSM inputs.");
    return;
  }

  const deviationMW = actual - schedule;
  const deviationMWh = deviationMW * interval / 60;

  const deviationPercent = schedule > 0
    ? deviationMW / schedule * 100
    : null;

  const amount = Math.abs(deviationMWh) * rate;

  const status =
    deviationMW > 0 ? "OVER-INJECTION" :
    deviationMW < 0 ? "UNDER-INJECTION" :
    "ON SCHEDULE";

  $("dsmStatus").textContent = status;

  $("dsmStatus").classList.toggle(
    "over",
    deviationMW > 0
  );

  $("dsmAmount").textContent = rupees(amount);

  const signed = value =>
    `${value > 0 ? "+" : ""}${value.toFixed(2)}`;

  $("dsmDeviation").textContent =
    `${signed(deviationMW)} MW`;

  $("dsmEnergy").textContent =
    `${signed(deviationMWh)} MWh`;

  $("dsmPercent").textContent =
    deviationPercent === null
      ? "N/A (zero schedule)"
      : `${signed(deviationPercent)}%`;

  $("dsmFreq").textContent =
    `${frequency.toFixed(2)} Hz`;
}


/* 18. CSV EXPORT */

function exportCSV() {
  const rows = [[
    "Plant",
    "Source",
    "Time",
    "Forecast MW",
    "Actual MW",
    "Deviation MW"
  ]];

  selectedPlants().forEach(p => {
    selectedIndices().forEach(i => {
      rows.push([
        p.name,
        p.source,
        hours[i],
        p.forecast[i],
        p.actual[i],
        p.actual[i] - p.forecast[i]
      ]);
    });
  });

  const csv = rows.map(row =>
    row.map(value =>
      `"${String(value).replace(/"/g, '""')}"`
    ).join(",")
  ).join("\r\n");

  const blob = new Blob(
    ["\uFEFF" + csv],
    { type: "text/csv;charset=utf-8" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "greenpulse-generation-demo.csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);

  showToast("CSV exported successfully");
}


/* 19. TOAST */

function showToast(message) {
  const toast = $("toast");

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}


/* 20. LIVE DATE AND TIME - INDIA */

function updateLiveClock() {
  const now = new Date();

  $("liveDate").textContent =
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(now);

  $("liveTime").textContent =
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    }).format(now);

  $("reportDate").textContent =
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(now);
}


/* 21. PAGE NAVIGATION */

const pageConfig = {
  overview: {
    label: "Overview",
    title: "Energy Performance <em>Overview</em>",
    subtitle: "Renewable energy forecasting, generation monitoring and operational intelligence."
  },

  generation: {
    label: "Generation & Forecast",
    title: "Generation &amp; <em>Forecast</em>",
    subtitle: "Monitor actual generation, forecast profiles and renewable generation mix."
  },

  insights: {
    label: "Insights",
    title: "Energy <em>Insights & Analytics</em>",
    subtitle: "Analyze forecast deviation, accuracy and operational performance."
  },

  plants: {
    label: "Plant Performance",
    title: "Plant <em>Performance</em>",
    subtitle: "Monitor individual renewable assets and export plant-wise reports."
  },

  bess: {
    label: "BESS Management",
    title: "BESS <em>Management</em>",
    subtitle: "Explore illustrative battery state of charge and storage dispatch."
  },

  dsm: {
    label: "DSM Calculator",
    title: "DSM <em>Calculator</em>",
    subtitle: "Estimate deviation energy and indicative financial exposure."
  }
};


function showPage(page, updateUrl = true) {
  if (!pageConfig[page]) page = "overview";

  // Show only the selected page.
  document.querySelectorAll(".page-view").forEach(section => {
    section.classList.toggle(
      "page-hidden",
      section.id !== `${page}Page` && section.id !== page
    );
  });

  // Overview has a different element ID.
  $("overviewPage").classList.toggle(
    "page-hidden",
    page !== "overview"
  );

  // Show filters only on pages where they are relevant.
  $("filterPanel").classList.toggle(
    "page-hidden",
    !["overview", "generation", "insights", "plants"].includes(page)
  );

  $("pageTitle").innerHTML = pageConfig[page].title;
  $("pageSubtitle").textContent = pageConfig[page].subtitle;

  $("breadcrumb").innerHTML =
    `Energy Management System <span>/</span> ${pageConfig[page].label}`;

  document.querySelectorAll(".nav-link").forEach(link => {
    link.classList.toggle(
      "active",
      link.getAttribute("href") === `#${page}`
    );
  });

  if (updateUrl) {
    history.pushState({ page }, "", `#${page}`);
  }

  $("navigation").classList.remove("open");

  // Recalculate chart dimensions after revealing a page.
  requestAnimationFrame(() => {
    [
      overviewGenerationChart,
      detailGenerationChart,
      forecastChart,
      overviewMixChart,
      detailMixChart,
      errorChart,
      bessChart
    ].forEach(chart => {
      if (chart) chart.resize();
    });
  });

  [
  overviewGenerationChart,
  detailGenerationChart,
  forecastChart,
  overviewMixChart,
  detailMixChart,
  errorChart,
  bessChart,
  bessPowerTrendChart
].forEach(chart => {
  if (chart) chart.resize();
});

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* 22. NAVIGATION EVENTS */

document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();

    const page = link.getAttribute("href").slice(1);
    showPage(page);
  });
});


document.querySelectorAll(".feature-card").forEach(card => {
  card.addEventListener("click", () => {
    showPage(card.dataset.page);
  });
});


window.addEventListener("popstate", () => {
  showPage(location.hash.slice(1) || "overview", false);
});


/* 23. MOBILE NAVIGATION */

$("menuBtn").addEventListener("click", () => {
  $("navigation").classList.toggle("open");
});


/* 24. SOURCE FILTER */

$("sourceFilter").addEventListener("change", () => {
  const source = $("sourceFilter").value;
  const plantSelect = $("plantFilter");

  for (const option of plantSelect.options) {
    if (option.value === "All") continue;

    const plant = plants.find(p => p.name === option.value);

    option.hidden =
      source !== "All" && plant.source !== source;
  }

  if (plantSelect.value !== "All") {
    const selectedPlant = plants.find(
      p => p.name === plantSelect.value
    );

    if (source !== "All" && selectedPlant.source !== source) {
      plantSelect.value = "All";
    }
  }

  $("timeFilter").value = "all";
  refreshDashboard();
});


/* 25. PLANT FILTER */

$("plantFilter").addEventListener("change", () => {
  $("timeFilter").value = "all";
  refreshDashboard();
});


/* 26. TIME FILTER */

$("timeFilter").addEventListener("change", refreshDashboard);


/* 27. RESET FILTERS */

$("resetBtn").addEventListener("click", () => {
  $("sourceFilter").value = "All";
  $("plantFilter").value = "All";
  $("timeFilter").value = "all";

  for (const option of $("plantFilter").options) {
    option.hidden = false;
  }

  refreshDashboard();
  showToast("Filters reset");
});


/* 28. CSV EVENT */

$("exportBtn").addEventListener("click", exportCSV);


/* 29. DSM EVENTS */

$("calculateDsm").addEventListener("click", calculateDSM);

[
  "dsmSchedule",
  "dsmActual",
  "dsmInterval",
  "dsmRate",
  "dsmFrequency"
].forEach(id => {
  $(id).addEventListener("change", calculateDSM);
});


/* 30. INITIALIZE APPLICATION */

function initializeDashboard() {
  $("sourceFilter").value = "All";
  $("plantFilter").value = "All";
  $("timeFilter").value = "all";

  updateLiveClock();
  setInterval(updateLiveClock, 1000);

  refreshDashboard();
  calculateDSM();

  const initialPage = location.hash.slice(1) || "overview";
  showPage(initialPage, false);

  console.log("GREENPULSE EMS initialized successfully.");
  console.log("Renewable generation: Demo data");
  console.log("BESS: Simulated");
  console.log("DSM: Educational estimate");
}

initializeDashboard();


/* =====================================================
   31. GREENPULSE EMS - HEADER CONTROLS
   Add this block at the END of your existing script.js
===================================================== */

// Header action feedback
function headerToast(message) {
  if (typeof showToast === "function") {
    showToast(message);
  } else {
    alert(message);
  }
}

// Notification action
document.querySelectorAll('[data-header-action="notifications"]')
  .forEach(button => {
    button.addEventListener("click", () => {
      const dot = document.querySelector(".notification-dot");

      if (dot) {
        dot.style.display = "none";
      }

      headerToast("Notifications checked");
    });
  });

// Settings action
document.querySelectorAll('[data-header-action="settings"]')
  .forEach(button => {
    button.addEventListener("click", () => {
      headerToast("Settings panel is ready for future configuration.");
    });
  });

// Administrator / account actions
document.querySelectorAll('[data-header-action="profile"]')
  .forEach(button => {
    button.addEventListener("click", () => {
      headerToast("Administrator account");
    });
  });

document.querySelectorAll('[data-header-action="logout"]')
  .forEach(button => {
    button.addEventListener("click", () => {
      headerToast("Authentication is not connected yet.");
    });
  });

// Close header dropdowns when clicking outside
document.addEventListener("click", event => {
  document.querySelectorAll(".nav-tools details[open]")
    .forEach(menu => {
      if (!menu.contains(event.target)) {
        menu.removeAttribute("open");
      }
    });
});

// Close dropdowns with Escape key
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    document.querySelectorAll(".nav-tools details[open]")
      .forEach(menu => menu.removeAttribute("open"));
  }
});

console.log("GREENPULSE EMS header controls initialized.");

