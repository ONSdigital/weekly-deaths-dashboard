<script>
  import { analyticsEvent } from "@onsvisual/svelte-components";
  import { csvFormatRows } from "d3-dsv";
  import { scaleLinear, scaleBand } from "d3-scale";
  import { line, curveStepAfter } from "d3-shape";

  export let data;
  // export let height = 300;
  export let margin = { left: 55, top: 20, bottom: 45 };
  export let xKey = "date";
  export let yKey1 = "num_england_wales";
  export let yKey2 = "exp_england_wales";
  export let yKey3 = "bank_holiday";

  $: margin =
    +width < 400
      ? { left: 50, top: 20, bottom: 45 }
      : { left: 60, top: 20, bottom: 45 };

  //works out the x date ranges
  function getQuarterFromDate(date) {
    return Math.floor(date.getMonth() / 3) + 1;
  }

  function isQ3Start(date) {
    return date.getMonth() === 6; // July is month 6 (0-based)
  }

  function getDateChanges(data, xKey) {
    const changes = {
      years: [],
      quarters: [],
      yearLabels: [], // New array for year labels at Q3
    };

    // Check first date
    const firstDate = data[0][xKey];
    const firstYearStart = new Date(firstDate.getFullYear(), 0, 1);
    const daysSinceYearStart =
      (firstDate - firstYearStart) / (1000 * 60 * 60 * 24);
    if (daysSinceYearStart < 7) {
      changes.years.push(firstDate);
    }

    // Check first date for quarter
    for (let q = 1; q <= 4; q++) {
      const quarterStart = new Date(firstDate.getFullYear(), (q - 1) * 3, 1);
      const daysSinceQuarterStart =
        (firstDate - quarterStart) / (1000 * 60 * 60 * 24);
      if (daysSinceQuarterStart >= 0 && daysSinceQuarterStart < 7) {
        changes.quarters.push(firstDate);
        break;
      }
    }

    // Check changes between dates
    for (let i = 1; i < data.length; i++) {
      const prevDate = data[i - 1][xKey];
      const currentDate = data[i][xKey];

      // Check year changes
      if (prevDate.getFullYear() !== currentDate.getFullYear()) {
        changes.years.push(currentDate);
      }
      // Check quarter changes within the same year
      else if (
        getQuarterFromDate(prevDate) !== getQuarterFromDate(currentDate)
      ) {
        changes.quarters.push(currentDate);
        // If this is Q3 start, add to yearLabels
        if (isQ3Start(currentDate)) {
          changes.yearLabels.push({
            date: currentDate,
            year: currentDate.getFullYear(),
          });
        }
      }
    }

    // Check last date
    const lastDate = data[data.length - 1][xKey];
    const nextYearStart = new Date(lastDate.getFullYear() + 1, 0, 1);
    const daysUntilNextYear =
      (nextYearStart - lastDate) / (1000 * 60 * 60 * 24);
    if (daysUntilNextYear <= 7) {
      changes.years.push(nextYearStart);
    }

    // Check last date for next quarter
    const lastQuarter = getQuarterFromDate(lastDate);
    if (lastQuarter < 4) {
      const nextQuarterStart = new Date(
        lastDate.getFullYear(),
        lastQuarter * 3,
        1
      );
      const daysUntilNextQuarter =
        (nextQuarterStart - lastDate) / (1000 * 60 * 60 * 24);
      if (daysUntilNextQuarter <= 7) {
        changes.quarters.push(nextQuarterStart);
      }
    }

    return changes;
  }

  // Calculate date changes
  $: dateChanges = getDateChanges(data, xKey);

  // Function to check if position is too close to edges
  function isTooCloseToEdge(xPos, width) {
    return xPos < 10 || width - xPos < 10;
  }

  const dateOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  function makeDataFile() {
    let csv = `"Deaths registered and expected deaths, week ending ${data[0][
      xKey
    ].toLocaleDateString("en-GB", dateOptions)} to ${data[data.length - 1][
      xKey
    ].toLocaleDateString("en-GB", dateOptions)}"
Source: Office for National Statistics

Data downloaded on ${new Date().toLocaleDateString("en-GB", dateOptions)}

Notes
1. Figures include deaths of non-residents. 
2. Registration data for 2024 are based on finalised mortality data. This has been published in our annual death registrations publication. All other figures are provisional.
3. The number of deaths registered in a week is affected when bank holidays occur. 
"4. A statistical model is used to estimate the expected number of deaths. The model accounts for changes in population size, age structure, and trends in mortality over time." 
"5. Changes to the process by which causes of deaths are scrutinised and certified (Death certification reform), including a statutory medical examiner system, came into force in England and Wales on 9 September 2024."

Week ending,Deaths registered,Expected deaths,Bank holiday week
`;
    csv +=
      // csvFormatBody(data, [xKey, yKey1, yKey2, yKey3]);
      csvFormatRows(
        data.map((d, i) => {
          return [
            d[xKey],
            d[yKey1],
            Math.round(d[yKey2]),
            d[yKey3] ? "Yes" : "",
          ];
        })
      );
    return {
      blob: new Blob([csv], { type: "text/csv" }),
      href: `data:text/csv;charset=UTF-8,${encodeURIComponent(csv)}`,
    };
  }

  let width;
  $: height = +width < 450 ? width * 0.75 : width * 0.5;

  $: xDomain = data.map((d) => d[xKey]);
  $: yDomain = [
    0,
    Math.max(...data.map((d) => d[yKey1]), ...data.map((d) => d[yKey2])),
  ];

  $: x = scaleBand()
    .padding(0.1)
    .domain(xDomain)
    .range([margin.left || 0, width - (margin.right || 0)]);
  $: y = scaleLinear()
    .domain(yDomain)
    .range([height - (margin.bottom || 0), margin.top || 0]);
  $: yTicks = y.ticks(4);
  $: lineFn = line()
    .curve(curveStepAfter)
    .x((d) => x(d[xKey]))
    .y((d) => y(d[yKey2]));
  // $: lineFn = (data, yKey) => (line()
  // 	.curve(curveStepAfter)
  //     .x(d => x(d[xKey]))
  //     .y(d => y(d[yKey])))(data);

  $: dataFile = makeDataFile(data);

  // Calculate highest and lowest deaths registered
  $: highestDeaths = data.reduce(
    (max, d) =>
      d[yKey1] > max.value ? { value: d[yKey1], date: d[xKey] } : max,
    { value: -Infinity, date: null }
  );
  $: lowestDeaths = data.reduce(
    (min, d) =>
      d[yKey1] < min.value ? { value: d[yKey1], date: d[xKey] } : min,
    { value: Infinity, date: null }
  );

  // Generate aria-label for screen readers
  $: ariaLabel = `Bar chart showing deaths registered compared with expected deaths in England and Wales from ${data[0][
    xKey
  ].toLocaleDateString("en-GB", dateOptions)} to ${data[data.length - 1][
    xKey
  ].toLocaleDateString(
    "en-GB",
    dateOptions
  )}. Deaths registered are shown as bars, with grey bars indicating weeks containing bank holidays. Expected deaths are shown as a stepped line. The most recent week ending ${data[
    data.length - 1
  ][xKey].toLocaleDateString("en-GB", dateOptions)} had ${data[data.length - 1][
    yKey1
  ].toLocaleString("en-GB")} deaths registered, compared with ${Math.round(
    data[data.length - 1][yKey2]
  ).toLocaleString(
    "en-GB"
  )} expected deaths. The highest number of deaths registered was ${highestDeaths.value.toLocaleString(
    "en-GB"
  )} in the week ending ${highestDeaths.date.toLocaleDateString(
    "en-GB",
    dateOptions
  )}. The lowest was ${lowestDeaths.value.toLocaleString(
    "en-GB"
  )} in the week ending ${lowestDeaths.date.toLocaleDateString(
    "en-GB",
    dateOptions
  )}. A CSV download of the chart data is available below the chart.`;
</script>

<ul class="legend-container">
  <!-- <li><span class="legend-circle" />Deaths registered</li> -->
  <li><span class="legend-square" aria-hidden="true" />Deaths registered</li>
  <li>
    <span class="legend-square-2" aria-hidden="true" />Deaths registered, week
    containing bank holiday
  </li>
  <li><span class="legend-line" aria-hidden="true" />Expected deaths</li>
</ul>
<div class="chart-container" bind:clientWidth={width} style:height="{height}px">
  {#if width}
    <svg {width} {height} class="chart" role="img" aria-label={ariaLabel}>
      <g class="y-ticks">
        {#each yTicks as tick (tick)}
          <g class="y-tick" transform="translate(0 {y(tick)})">
            <line
              class="tick-line"
              class:tick-line-0={tick === 0}
              x1={margin.left - 5}
              x2={width}
            />
            <text
              x={margin.left - 10}
              y="6"
              style="text-anchor: end"
              class="small">{tick.toLocaleString("en-GB")}</text
            >
          </g>
        {/each}
      </g>

      <g class="date-dividers">
        <!-- Quarter dividers -->
        {#each dateChanges.quarters as date}
          <line
            class="quarter-divider"
            x1={date === data[0][xKey]
              ? x(date)
              : date > data[data.length - 1][xKey]
              ? x.range()[1]
              : x(date)}
            y1={height - (margin.bottom || 0)}
            x2={date === data[0][xKey]
              ? x(date)
              : date > data[data.length - 1][xKey]
              ? x.range()[1]
              : x(date)}
            y2={height - (margin.bottom || 0) + (width < 450 ? 0 : 10)}
          />
        {/each}

        <!-- Year dividers -->
        {#each dateChanges.years as date}
          <line
            class="year-divider"
            x1={date === data[0][xKey]
              ? x(date)
              : date > data[data.length - 1][xKey]
              ? x.range()[1]
              : x(date)}
            y1={height - (margin.bottom || 0)}
            x2={date === data[0][xKey]
              ? x(date)
              : date > data[data.length - 1][xKey]
              ? x.range()[1]
              : x(date)}
            y2={height - (margin.bottom || 0) + (width < 450 ? 18 : 25)}
          />
        {/each}

        <!-- Year labels at Q3 -->
        {#each dateChanges.yearLabels as { date, year }}
          {@const xPos = x(date)}
          {#if !isTooCloseToEdge(xPos, width)}
            <text
              class="year-label"
              x={xPos}
              y={height - margin.bottom + (width < 450 ? 23 : 34)}
              text-anchor="middle"
            >
              {year}
            </text>
          {/if}
        {/each}
      </g>

      <g class="plot">
        {#each data as d (d[xKey])}
          <rect
            class="bar"
            width={x.bandwidth()}
            height={y(0) - y(d[yKey1])}
            x={x(d[xKey])}
            y={y(d[yKey1])}
          />
          {#if d[yKey3]}
            <rect
              class="bar-holiday"
              width={x.bandwidth()}
              height={y(0) - y(d[yKey1])}
              x={x(d[xKey])}
              y={y(d[yKey1])}
            />
            <rect
              class="bar-holiday2"
              width={x.bandwidth()}
              height="3px"
              x={x(d[xKey])}
              y={y(d[yKey1])}
            />
          {/if}
        {/each}
        <path
          class="line"
          d="{lineFn(data)}L{width - (margin.right || 0)},{y(
            data[data.length - 1][yKey2]
          )}"
          transform="translate(-{x.bandwidth() * 0.05},0)"
        />
      </g>
    </svg>
  {/if}
</div>
<strong>Download chart data</strong><br />
<a
  href={dataFile?.href}
  on:click={() => {
    const fileName = `weekly-deaths-${data[data.length - 1][xKey]
      .toISOString()
      .slice(0, 10)}.csv`;
    analyticsEvent({
      event: "fileDownload",
      fileExtension: "csv",
      fileName,
      chartTitle: "Trend in the past two years",
      chartType: "bar",
      sectionTitle: "Deaths registered and expected deaths",
      sectionNumber: "1",
    });
  }}
  download="weekly-deaths-{data[data.length - 1][xKey]
    .toISOString()
    .slice(0, 10)}.csv"
  >CSV format ({((dataFile?.blob?.size || 0) / 1000).toFixed(1)}KB)</a
>

<!-- 
England and Wales, week ending {data.current.date.toLocaleDateString(
	"en-GB",
	dateOptions
  )} -->

<style>
  .chart-container {
    display: block;
    /* background: #f5f5f5; */
  }
  .chart {
    display: block;
    overflow: visible;
    width: 100%;
    height: 100%;
  }
  .bar {
    fill: #27a0cc;
    /* mix-blend-mode: multiply; */
  }

  .bar-holiday {
    fill: #b1cdd7;
  }
  .bar-holiday2 {
    fill: #27a0cc;
  }
  .line {
    fill: none;
    stroke: #414042;
    stroke-width: 2.5px;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .tick-line {
    stroke: #ccc;
    stroke-width: 1px;
  }
  .tick-line-0 {
    stroke: #555;
  }

  text {
    font-size: 16px;
  }

  @media (max-width: 450px) {
    text {
      font-size: 14px;
    }
    .line {
      stroke-width: 1.5px;
    }
  }

  .year-divider {
    stroke: #b3b3b3;
    stroke-width: 2px;
    /* stroke-dasharray: 4 4; */
  }

  .quarter-divider {
    stroke: #c6c6c6;
    stroke-width: 1.5px;
  }

  .legend-container {
    padding: 0;
    font-size: 16px;
    margin: 0;
  }
  .legend-container > li {
    display: inline-block;
    margin: 0 16px 0 0;
    /* white-space: nowrap; */
  }
  .legend-container > li > span {
    margin-right: 8px;
  }
  .legend-circle {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #27a0cc;
  }
  .legend-line {
    display: inline-block;
    width: 20px;
    height: 3px;
    border-radius: 1.5px;
    background: var(--ons-color-text, #222);
    transform: translateY(-4px);
  }
  .legend-square-2 {
    display: inline-block;
    width: 12px;
    height: 12px;
    background: #b1cdd7;
    border-top: 3px solid #27a0cc;
  }
  .legend-square {
    display: inline-block;
    width: 12px;
    height: 12px;
    background: #27a0cc;
    border-top: 3px solid #27a0cc;
  }
</style>
