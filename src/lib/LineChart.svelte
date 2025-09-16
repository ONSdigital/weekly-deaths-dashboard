<script>
	import { analyticsEvent } from "@onsvisual/svelte-components";
	import { csvFormatRows } from "d3-dsv";
	import { scaleLinear, scaleBand } from "d3-scale";
	import { line, curveStepAfter, curveLinear } from "d3-shape";
	import { format } from "d3-format"; // Import d3-format for number formatting

	export let data;
	export let line_chart_max;
	// export let height = 300;
	export let margin = { left: 25, top: 20, bottom: 35 };
	export let xKey = "date";
	export let yKey0 = "num_england_wales";
	export let yKey1;
	export let yKey2;
	export let yKey3;
	export let yKey4;
	export let yKey5 = "bank_holiday";
	export let dataTitle;
	export let chartTitle = "";
	export let filename = "deaths-flu";

	$: margin =
		+width < 400
			? { left: 27, top: 20, bottom: 45 }
			: { left: 27, top: 20, bottom: 45 };

	// Create a percentage format
	const formatPercent = format(".0%"); // Format as percentage with 0 decimal places

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
			const quarterStart = new Date(
				firstDate.getFullYear(),
				(q - 1) * 3,
				1
			);
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
		const formatPercentDownload = (val) => (val * 100).toFixed(1); // Format as percentage with 0 decimal places

		let csv = `"Deaths due to and involving ${dataTitle}, week ending ${data[0][
			xKey
		].toLocaleDateString("en-GB", dateOptions)} to ${data[data.length - 1][
			xKey
		].toLocaleDateString("en-GB", dateOptions)}"
Source: Office for National Statistics

Data downloaded on ${new Date().toLocaleDateString("en-GB", dateOptions)}

Notes
1. Figures include deaths of non-residents. 
2. Registration data for 2023 and 2024 are based on finalised mortality data. This has been published in our annual death registrations publication. All other figures are provisional. 
3. The number of deaths registered in a week is affected when bank holidays occur. 
"4. A statistical model is used to estimate the expected number of deaths. The model accounts for changes in population size, age structure, and trends in mortality over time." 
"5. Changes to the process by which causes of deaths are scrutinised and certified (Death certification reform), including a statutory medical examiner system, came into force in England and Wales on 9 September 2024."

Week ending,Number involving,Number due to,Percentage involving,Percentage due to,Bank holiday week
`;
		csv +=
			// csvFormatBody(data, [xKey, yKey1, yKey2, yKey3, yKey4,yKey5]);
			csvFormatRows(
				data.map((d, i) => {
					return [
						d[xKey],
						d[yKey3],
						d[yKey4],
						formatPercentDownload(d[yKey1]),
						formatPercentDownload(d[yKey2]),
						d[yKey5] ? "Yes" : "",
					];
				})
			);
		return {
			blob: new Blob([csv], { type: "text/csv" }),
			href: `data:text/csv;charset=UTF-8,${encodeURIComponent(csv)}`,
		};
	}

	let width;
	$: height = +width < 500 ? width * 0.8 : width * 0.8;

	$: xDomain = data.map((d) => d[xKey]);
	$: yDomain = [0, line_chart_max];

	$: x = scaleBand()
		.padding(0.1)
		.domain(xDomain)
		.range([margin.left || 0, width - (margin.right || 0)]);
	$: y = scaleLinear()
		.domain(yDomain)
		.range([height - (margin.bottom || 0), margin.top || 0]);
	$: yTicks = y.ticks(5); // 5 ticks for 0%, 25%, 50%, 75%, 100%
	$: lineFn = line()
		.curve(curveLinear)
		.x((d) => x(d[xKey]))
		.y((d) => y(d[yKey2]));

	$: lineFn2 = line()
		.curve(curveLinear)
		.x((d) => x(d[xKey]))
		.y((d) => y(d[yKey1]));

	$: dataFile = makeDataFile(data);
</script>

<div style="padding:10px; margin-top:0px; margin-bottom:10px">
	<div
		class="chart-container"
		bind:clientWidth={width}
		style:height="{height}px"
	>
		{#if width}
			<svg {width} {height} class="chart">
				<g class="y-ticks">
					{#each yTicks as tick (tick)}
						<g class="y-tick" transform="translate(0 {y(tick)})">
							<line
								class="tick-line"
								class:tick-line-0={tick === 0}
								x1={margin.left}
								x2={width}
							/>
							<text
								style="text-anchor:end;"
								x={margin.left - 5}
								y="6"
								class="small">{formatPercent(tick)}</text
							>
						</g>
					{/each}
				</g>

				<g class="date-dividers">
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
							y2={height - (margin.bottom || 0) + 18}
						/>
					{/each}

					<!-- Year labels at Q3 -->
					{#each dateChanges.yearLabels as { date, year }}
						{@const xPos = x(date)}
						{#if !isTooCloseToEdge(xPos, width)}
							<text
								class="year-label"
								x={xPos}
								y={height - margin.bottom + 23}
								text-anchor="middle"
							>
								{year}
							</text>
						{/if}
					{/each}
				</g>

				<g class="plot">
					<path
						class="line2"
						d="{lineFn2(data)}L{width - (margin.right || 0)},{y(
							data[data.length - 1][yKey1]
						)}"
						transform="translate(-{x.bandwidth() * 0.05},0)"
					/>

					<!-- Circle for the last point of lineFn2 (yKey1) -->
					<circle
						class="line-point2"
						cx={x(data[data.length - 1][xKey])}
						cy={y(data[data.length - 1][yKey1])}
						r="5"
						fill="#27a0cc"
					/>
					<path
						class="line"
						d="{lineFn(data)}L{width - (margin.right || 0)},{y(
							data[data.length - 1][yKey2]
						)}"
						transform="translate(-{x.bandwidth() * 0.05},0)"
					/>

					<rect
						class="line-point"
						x={x(data[data.length - 1][xKey]) - 4.5}
						y={y(data[data.length - 1][yKey2]) - 4.5}
						width="9"
						height="9"
						transform="rotate(45, {x(
							data[data.length - 1][xKey]
						)}, {y(data[data.length - 1][yKey2])})"
						fill="#8D2865"
					/>
				</g>
			</svg>
		{/if}
	</div>
</div>
<strong>Download chart data</strong><br />
<a
	href={dataFile?.href}
	on:click={() => {
		const fileName = `${filename}-${data[data.length - 1][xKey]
			.toISOString()
			.slice(0, 10)}.csv`;
		analyticsEvent({
			event: "fileDownload",
			fileExtension: "csv",
			fileName,
			chartTitle,
			chartType: "line",
			sectionTitle: "Death by selected causes",
			sectionNumber: "2",
		});
	}}
	download="{filename}-{data[data.length - 1][xKey]
		.toISOString()
		.slice(0, 10)}.csv"
	small>CSV format ({((dataFile?.blob?.size || 0) / 1000).toFixed(1)}KB)</a
>

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
		mix-blend-mode: multiply;
	}
	.bar-holiday {
		fill: #ccc;
	}
	.line {
		fill: none;
		stroke: #8d2865;
		stroke-width: 3px;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
	.line2 {
		fill: none;
		stroke: #27a0cc;
		stroke-width: 3px;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
	.tick-line {
		stroke: #ccc;
		stroke-weight: 1;
	}
	.tick-line-0 {
		stroke: #555;
	}

	.year-divider {
		stroke: #a0a0a0;
		stroke-width: 2px;
	}

	text {
		font-size: 16px;
	}

	.quarter-divider {
		stroke: #d9d9d9;
		stroke-width: 1px;
	}
</style>
