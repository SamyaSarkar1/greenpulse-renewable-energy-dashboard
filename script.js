
// ==========================================================
// GREENPULSE v2.5
// RENEWABLE ENERGY INTELLIGENCE DASHBOARD
// Full-Day Wind + Solar 06:00-19:00
// Actual vs Forecast + DSM Calculator
// ==========================================================


// 1. HOURLY DATA

const hours = Array.from(
  { length: 24 },
  (_, i) => `${String(i).padStart(2, "0")}:00`
);

const plants = [
  {
    name: "Wind Farm A",
    source: "Wind",
    forecast: [
      48,45,42,40,38,40,45,52,
      58,65,72,78,82,85,88,90,
      87,82,76,70,65,60,55,51
    ],
    actual: [
      46,43,41,38,37,39,43,50,
      56,62,69,75,80,82,85,87,
      84,79,73,68,62,58,53,49
    ]
  },
  {
    name: "Wind Farm B",
    source: "Wind",
    forecast: [
      35,33,31,30,32,35,39,43,
      47,52,56,60,64,67,69,70,
      68,65,61,57,53,48,43,39
    ],
    actual: [
      33,31,29,29,30,33,37,41,
      45,49,54,58,61,64,66,67,
      65,62,59,54,50,46,41,37
    ]
  },
  {
    name: "Solar Park A",
    source: "Solar",
    forecast: [
      0,0,0,0,0,2,8,20,
      38,55,72,85,95,100,98,90,
      75,55,30,10,2,0,0,0
    ],
    actual: [
      0,0,0,0,0,1,7,18,
      35,52,68,82,91,96,94,86,
      72,52,28,9,1,0,0,0
    ]
  },
  {
    name: "Solar Park B",
    source: "Solar",
    forecast: [
      0,0,0,0,0,1,5,14,
      28,42,58,70,78,82,80,73,
      60,42,22,7,1,0,0,0
    ],
    actual: [
      0,0,0,0,0,1,4,13,
      26,40,55,67,74,78,76,69,
      57,39,20,6,1,0,0,0
    ]
  }
];


// 2. HELPERS AND VARIABLES

const $ = id => document.getElementById(id);

const sum = values =>
  values.reduce((total, value) => total + value, 0);

const mean = values =>
  values.length ? sum(values) / values.length : 0;

const mw = value => `${value.toFixed(1)} MW`;

let generationChart = null;
let mixChart = null;
let errorChart = null;


// 3. SELECTED PLANTS

function selectedPlants() {
  const source = $("sourceFilter").value;
  const plant = $("plantFilter").value;

  return plants.filter(p =>
    (source === "All" || p.source === source) &&
    (plant === "All" || p.name === plant)
  );
}


// 4. DETERMINE SELECTED SOURCE

function getSelectedSource() {
  const source = $("sourceFilter").value;
  const plantName = $("plantFilter").value;

  if (plantName !== "All") {
    const selectedPlant = plants.find(
      p => p.name === plantName
    );

    if (selectedPlant) {
      return selectedPlant.source;
    }
  }

  return source;
}


// 5. DETERMINE OPERATING HOURS

function selectedIndices() {
  const timeWindow = $("timeFilter").value;
  const source = getSelectedSource();

  // Custom interval: 08:00 to 16:00
  // Eight hourly readings: 08:00 through 15:00.
  if (timeWindow === "daylight") {
    return Array.from(
      { length: 8 },
      (_, i) => i + 8
    );
  }

  // Solar: 06:00 through 19:00 inclusive.
  // Fourteen hourly readings.
  if (source === "Solar") {
    return Array.from(
      { length: 14 },
      (_, i) => i + 6
    );
  }

  // Wind and combined portfolio: 00:00 through 23:00.
  return Array.from(
    { length: 24 },
    (_, i) => i
  );
}


// 6. CHART CONFIGURATION

function getChartLabels(m) {
  const source = getSelectedSource();
  const timeWindow = $("timeFilter").value;

  const labels = m.points.map(p => p.hour);

  // Solar ends at the actual 19:00 reading.
  // No extra empty 20:00 point.
  if (source === "Solar" && timeWindow === "all") {
    return labels;
  }

  // Wind and custom window show their end boundary.
  labels.push(
    timeWindow === "daylight"
      ? "16:00"
      : "24:00"
  );

  return labels;
}


function getChartData(values) {
  const source = getSelectedSource();
  const timeWindow = $("timeFilter").value;

  // Solar data ends at its final actual reading.
  if (source === "Solar" && timeWindow === "all") {
    return values;
  }

  // Add null only for a boundary label.
  return [...values, null];
}


// 7. CALCULATE METRICS

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
      hour: hours[index],
      actual,
      forecast,
      deviation: actual - forecast,
      error: Math.abs(actual - forecast)
    };
  });

  const actualTotal = sum(
    points.map(p => p.actual)
  );

  const forecastTotal = sum(
    points.map(p => p.forecast)
  );

  const absoluteError = sum(
    points.map(p => p.error)
  );

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


// 8. KPI CARDS

function updateKpis(m) {
  $("actualKpi").textContent = mw(m.avgActual);
  $("forecastKpi").textContent = mw(m.avgForecast);

  $("accuracyKpi").textContent =
    `${m.indicator.toFixed(2)}%`;

  $("deviationKpi").textContent =
    `${m.deviation > 0 ? "+" : ""}${mw(m.deviation)}`;

  $("deviationKpi").style.color =
    m.deviation >= 0 ? "#37d6a0" : "#f2b76d";

  $("maeValue").textContent = mw(m.mae);
  $("wapeValue").textContent =
    `${m.wape.toFixed(2)}%`;
}


// 9. COMMON CHART OPTIONS

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
          padding: 16
        }
      },

      tooltip: {
        backgroundColor: "#091725",
        borderColor: "#31465d",
        borderWidth: 1,
        padding: 11
      }
    },

    scales: {
      x: {
        type: "category",
        offset: false,
        bounds: "ticks",
        grid: {
          display: false
        },
        ticks: {
          color: "#8da2b5"
        }
      },

      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(130,155,180,.13)"
        },
        ticks: {
          color: "#8da2b5"
        },
        title: {
          display: true,
          text: yTitle,
          color: "#8da2b5"
        }
      }
    }
  };
}


// 10. ACTUAL VS FORECAST GENERATION CHART

function renderGeneration(m) {
  if (generationChart) {
    generationChart.destroy();
  }

  const labels = getChartLabels(m);

  const actualData = getChartData(
    m.points.map(p => p.actual)
  );

  const forecastData = getChartData(
    m.points.map(p => p.forecast)
  );

  const options = chartOptions();

  options.scales.x.ticks = {
    color: "#8da2b5",
    autoSkip: false,
    maxRotation: 0,

    callback: function(value, index) {
      return index % 2 === 0 ||
        index === labels.length - 1
        ? this.getLabelForValue(value)
        : "";
    }
  };

  generationChart = new Chart(
    $("generationChart"),
    {
      type: "line",

      data: {
        labels,

        datasets: [
          {
            label: "Actual",
            data: actualData,

            borderColor: "#37d6a0",
            backgroundColor: "rgba(55,214,160,.12)",

            fill: true,
            tension: .35,
            borderWidth: 3,

            pointRadius: 3,
            pointHoverRadius: 7,
            pointBackgroundColor: "#37d6a0",
            pointBorderColor: "#37d6a0",
            spanGaps: false
          },

          {
            label: "Forecast",
            data: forecastData,

            borderColor: "#66aaff",
            backgroundColor: "transparent",

            borderDash: [6, 5],
            borderWidth: 2,

            tension: .35,
            pointRadius: 3,
            pointHoverRadius: 7,
            pointBackgroundColor: "#101e30",
            pointBorderColor: "#66aaff",
            spanGaps: false
          }
        ]
      },

      options
    }
  );
}


// 11. WIND AND SOLAR MIX CHART

function renderMix(selected) {
  const indices = selectedIndices();

  function sourceAverage(source) {
    const sourcePlants = selected.filter(
      p => p.source === source
    );

    return mean(
      indices.map(index =>
        sum(
          sourcePlants.map(p => p.actual[index])
        )
      )
    );
  }

  const wind = sourceAverage("Wind");
  const solar = sourceAverage("Solar");
  const total = wind + solar;

  $("mixTotal").textContent = total.toFixed(1);

  $("windMix").textContent = mw(wind);
  $("solarMix").textContent = mw(solar);

  $("windPct").textContent =
    `${total ? (wind / total * 100).toFixed(1) : 0}%`;

  $("solarPct").textContent =
    `${total ? (solar / total * 100).toFixed(1) : 0}%`;

  if (mixChart) {
    mixChart.destroy();
  }

  mixChart = new Chart(
    $("mixChart"),
    {
      type: "doughnut",

      data: {
        labels: ["Wind", "Solar"],

        datasets: [{
          data: [wind, solar],
          backgroundColor: ["#37d6a0", "#66aaff"],
          borderColor: "#101e30",
          borderWidth: 5
        }]
      },

      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "77%",

        plugins: {
          legend: {
            display: false
          }
        }
      }
    }
  );
}


// 12. DEVIATION CHART

function renderError(m) {
  if (errorChart) {
    errorChart.destroy();
  }

  const labels = getChartLabels(m);

  const errors = getChartData(
    m.points.map(p => p.error)
  );

  const options = chartOptions("Absolute Error (MW)");

  options.plugins.legend.display = false;

  options.scales.x.ticks = {
    color: "#8da2b5",
    autoSkip: false,
    maxRotation: 0,

    callback: function(value, index) {
      return index % 2 === 0 ||
        index === labels.length - 1
        ? this.getLabelForValue(value)
        : "";
    }
  };

  errorChart = new Chart(
    $("errorChart"),
    {
      type: "bar",

      data: {
        labels,

        datasets: [{
          label: "Absolute Error",
          data: errors,
          backgroundColor: "#f2b76d",
          borderRadius: 5,
          maxBarThickness: 35
        }]
      },

      options
    }
  );
}


// 13. PLANT PERFORMANCE TABLE

function renderTable(selected) {
  const indices = selectedIndices();

  $("plantTable").innerHTML = selected.map(p => {
    const actual = mean(
      indices.map(i => p.actual[i])
    );

    const forecast = mean(
      indices.map(i => p.forecast[i])
    );

    const deviation = actual - forecast;

    const error = sum(
      indices.map(i =>
        Math.abs(p.actual[i] - p.forecast[i])
      )
    );

    const actualTotal = sum(
      indices.map(i => p.actual[i])
    );

    const wape = actualTotal > 0
      ? error / actualTotal * 100
      : 0;

    const indicator = Math.max(0, 100 - wape);

    return `
      <tr>
        <td><strong>${p.name}</strong></td>

        <td>
          <span class="source-pill ${p.source.toLowerCase()}">
            ${p.source}
          </span>
        </td>

        <td>${forecast.toFixed(1)}</td>
        <td>${actual.toFixed(1)}</td>

        <td class="${deviation >= 0 ? "positive" : "negative"}">
          ${deviation > 0 ? "+" : ""}${deviation.toFixed(1)}
        </td>

        <td class="positive">
          ${indicator.toFixed(2)}%
        </td>
      </tr>
    `;
  }).join("");
}


// 14. PERFORMANCE INSIGHTS

function renderInsight(m, selected) {
  const direction =
    m.deviation > 0 ? "above" :
    m.deviation < 0 ? "below" :
    "equal to";

  $("insightTitle").textContent =
    m.deviation === 0
      ? "Actual output matches forecast"
      : `Actual generation is ${direction} forecast`;

  $("insightText").textContent =
    `Across ${selected.length} selected assets, ` +
    `average actual generation is ` +
    `${Math.abs(m.deviation).toFixed(1)} MW ` +
    `${direction} forecast per displayed interval. ` +
    `Portfolio WAPE is ${m.wape.toFixed(2)}%. ` +
    `These are observations from simulated data, not ML predictions.`;
}


// 15. REFRESH DASHBOARD

function refreshDashboard() {
  const selected = selectedPlants();

  if (!selected.length) return;

  const metrics = getMetrics(selected);

  updateKpis(metrics);
  renderGeneration(metrics);
  renderMix(selected);
  renderError(metrics);
  renderTable(selected);
  renderInsight(metrics, selected);
}


// 16. DSM CALCULATOR

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
    ![schedule, actual, interval, rate, frequency]
      .every(Number.isFinite) ||
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
    deviationMW >= 0
  );

  $("dsmAmount").textContent =
    amount.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

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


// 17. CSV EXPORT

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


// 18. TOAST NOTIFICATION

function showToast(message) {
  const toast = $("toast");

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}


// 19. SOURCE FILTER

$("sourceFilter").addEventListener("change", () => {
  const source = $("sourceFilter").value;
  const plantSelect = $("plantFilter");

  for (const option of plantSelect.options) {
    if (option.value === "All") continue;

    const plant = plants.find(
      p => p.name === option.value
    );

    option.hidden =
      source !== "All" && plant.source !== source;
  }

  if (plantSelect.value !== "All") {
    const selectedPlant = plants.find(
      p => p.name === plantSelect.value
    );

    if (
      source !== "All" &&
      selectedPlant.source !== source
    ) {
      plantSelect.value = "All";
    }
  }

  // IMPORTANT: Source selection resets the time window.
  // Solar automatically switches to its 06:00-19:00 profile.
  $("timeFilter").value = "all";

  refreshDashboard();
});


// 20. PLANT FILTER

$("plantFilter").addEventListener("change", () => {
  // Selecting a specific solar or wind plant
  // automatically selects its default operating hours.
  $("timeFilter").value = "all";

  refreshDashboard();
});


// 21. CUSTOM TIME FILTER

$("timeFilter").addEventListener(
  "change",
  refreshDashboard
);


// 22. RESET FILTERS

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


// 23. CSV BUTTON

$("exportBtn").addEventListener(
  "click",
  exportCSV
);


// 24. DSM EVENTS

$("calculateDsm").addEventListener(
  "click",
  calculateDSM
);

[
  "dsmSchedule",
  "dsmActual",
  "dsmInterval",
  "dsmRate",
  "dsmFrequency"
].forEach(id => {
  $(id).addEventListener("change", calculateDSM);
});


// 25. MOBILE SIDEBAR

$("menuBtn").addEventListener("click", () => {
  $("sidebar").classList.toggle("open");
});

document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach(item => {
      item.classList.remove("active");
    });

    link.classList.add("active");
    $("sidebar").classList.remove("open");
  });
});


// 26. REPORTING DATE

$("reportDate").textContent =
  new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });


// 27. INITIALIZE DASHBOARD

// Start with All Sources and All Demo Intervals.
$("sourceFilter").value = "All";
$("plantFilter").value = "All";
$("timeFilter").value = "all";

refreshDashboard();
calculateDSM();

console.log("GreenPulse v2.5 initialized.");
console.log("Wind: 00:00 - 24:00");
console.log("Solar: 06:00 - 19:00");
console.log("Combined: 00:00 - 24:00");
