<script>
  import { onMount } from "svelte";
  import {
    Embed,
    Notice,
    Section,
    Cards,
    Card,
    Twisty,
    Divider,
    AnalyticsBanner,
    analyticsEvent,
  } from "@onsvisual/svelte-components";
  import BarChartAlt from "$lib/BarChartAlt.svelte";
  import LineChart from "$lib/LineChart.svelte";
  import insertHeader from "$lib/insert-header.js";
  export let data;

  const dateCurrent = new Date(data.dates.current);
  const dateNext = new Date(data.dates.next);

  const analyticsProps = {
    contentTitle: "Weekly deaths dashboard",
    releaseDate: data.dates.current.replaceAll("-", ""),
    nextReleaseDate: data.dates.next.replaceAll("-", ""),
    outputSeries: "weeklyprovisionalfiguresondeathsregisteredinenglandandwales",
    contentType: "dashboard",
  };

  const { current_bank_holiday } = data;
  const { previous_bank_holiday } = data;

  const dateOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  const dateOptions2 = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const currentWeek = data.current.date.toLocaleDateString(
    "en-GB",
    dateOptions
  );

  const currentWeek2 = data.current.date.toLocaleDateString(
    "en-GB",
    dateOptions2
  );

  const earliestWeek = data.earliest.date.toLocaleDateString(
    "en-GB",
    dateOptions2
  );

  //get header dates from
  onMount(() =>
    insertHeader(
      dateCurrent.toLocaleDateString("en-GB", dateOptions2),
      dateNext.toLocaleDateString("en-GB", dateOptions2),
      currentWeek
    )
  );

  function toggleEvent(e, label, sectionTitle, sectionNumber) {
    analyticsEvent({
      event: "interaction",
      interactionType: "accordion",
      interactionValue: e?.detail?.open ? "open" : "close",
      label,
      sectionTitle,
      sectionNumber,
    });
  }
</script>

<Embed>
  <AnalyticsBanner {analyticsProps} hideBanner />
  <Section width="wide">
    <Notice mode="warning" important>
      <p>
        These figures are provisional. This means they are the earliest
        estimates available and will be revised in the future. The figures are
        based on the date a death was registered, which is usually later than
        the date it occurred. Read more in our <a
          href="https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/deaths/methodologies/userguidetomortalitystatisticsjuly2017"
          target="_top">User guide to mortality statistics</a
        >.
      </p>
    </Notice>
  </Section>

  <Section title="Deaths registered and expected deaths" width="medium">
    <p>
      England and Wales, week ending {data.current.date.toLocaleDateString(
        "en-GB",
        dateOptions
      )}
    </p>
  </Section>
  {#if current_bank_holiday || previous_bank_holiday}
    <Section width="wide">
      <Notice>
        {#if current_bank_holiday && previous_bank_holiday}
          Both the latest week and previous week included a bank holiday, which
          can mean fewer death registrations. This can lead to larger
          differences when comparing with other weeks and with expected deaths
        {:else if current_bank_holiday}
          The latest week included a bank holiday, which can mean fewer death
          registrations. This can lead to larger differences when comparing with
          the previous weeks and with expected deaths
        {:else}
          The previous week included a bank holiday, which can mean fewer death
          registrations. This can lead to larger differences when comparing with
          the latest week and with expected deaths
        {/if}
      </Notice>
    </Section>
  {/if}

  <Cards>
    <Card title="Deaths registered">
      <p class="ons-u-fs-xxxl">
        {data.deaths_registered.value.toLocaleString("en-GB")}
      </p>
      {#if data.deaths_registered.change === 0}
        <p class="ons-u-fs-r">No change from previous week</p>
      {:else}
        <p class="ons-u-fs-r" style="margin-bottom: 0">
          Change from previous week
        </p>

        {#if data.deaths_registered.change > 0}
          <div
            style="background: #FAD9CB; margin-top:5px;padding:5px; padding-left: 10px;padding-right:13px;display:inline-block"
            width="100px"
          >
            <!-- <p class="ons-u-fs-r"> -->

            <svg width="14" height="16" viewBox="0 0 12 14">
              <path
                d="M5.5 1.5L5.5 12.5M5.5 1.5L9.5 5.5M5.5 1.5L1.5 5.5"
                fill="none"
                stroke="#AD001F"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>

            <span style="font-weight:700">
              {Math.abs(data.deaths_registered.change).toLocaleString("en-GB")}
            </span>
            ({Math.abs(data.deaths_registered.percent_change).toFixed(1)}%)
            higher
          </div>
        {:else}
          <div
            style="background: #D2E2CB; margin-top:5px;padding:5px; padding-left: 10px; padding-right:13px;display:inline-block"
            width="100px"
          >
            <!-- <p class="ons-u-fs-r"> -->

            <svg width="14" height="16" viewBox="0 0 12 14">
              <path
                d="M5.5 12.5L5.5 1.5M5.5 12.5L1.5 8.5M5.5 12.5L9.5 8.5"
                fill="none"
                stroke="#195000"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span style="font-weight:600">
              {Math.abs(data.deaths_registered.change).toLocaleString("en-GB")}
            </span>
            ({Math.abs(data.deaths_registered.percent_change).toFixed(1)}%)
            lower
          </div>
        {/if}
        <!-- </p> -->
      {/if}
    </Card>
    <Card title="Comparison with expected deaths">
      <p class="ons-u-fs-xxxl">
        {Math.abs(
          data.expected_comparison.percent_difference.toLocaleString("en-GB")
        ).toFixed(1)}%
        {#if data.expected_comparison.percent_difference === 0}
          difference
        {:else if data.expected_comparison.percent_difference > 0}
          higher
        {:else}
          lower
        {/if}
      </p>
      <p class="ons-u-fs-r">
        {#if data.expected_comparison.value === 0}
          As many as expected
        {:else if data.expected_comparison.value > 0}
          {Math.round(Math.abs(data.expected_comparison.value)).toLocaleString(
            "en-GB"
          )} more than expected
        {:else}
          {Math.round(Math.abs(data.expected_comparison.value)).toLocaleString(
            "en-GB"
          )} fewer than expected
        {/if}
      </p>
    </Card>
  </Cards>

  <Section width="medium">
    <Twisty
      title="What are death registrations?"
      on:toggle={(e) =>
        toggleEvent(
          e,
          "What are death registrations?",
          "Deaths registered and expected deaths",
          "1"
        )}
    >
      <p>
        There is usually a delay between the date when a death occurs and the
        date it is registered. The number of days between death occurrence and
        registration vary, and can be longer in certain cases, such as when a
        death is referred to a coroner.
      </p>
      <p>
        <a
          href="https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/deaths/methodologies/userguidetomortalitystatisticsjuly2017#death-registration-process"
          target="_top">Learn more about the death registration system</a
        >
      </p>
    </Twisty>
    <Twisty
      title="What are expected deaths?"
      on:toggle={(e) =>
        toggleEvent(
          e,
          "What are expected deaths?",
          "Deaths registered and expected deaths",
          "1"
        )}
    >
      <p>
        We use statistical modelling to estimate the number of deaths that we
        would expect to happen based on current population and mortality trends.
      </p>
      <p>
        <a
          href="https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/causesofdeath/articles/estimatingexcessdeathsintheukmethodologychanges/february2024"
          target="_top">Learn more about expected deaths</a
        >
      </p>
    </Twisty>
  </Section>

  <Section width="wide">
    <h3>Trend in the past two years</h3>
    <p>Week ending {earliestWeek} to {currentWeek2}</p>
    <BarChartAlt data={data.array} />
  </Section>
  <Divider hr="full" />
  <Section title="Deaths by selected causes" width="medium">
    <p>
      Percentage of deaths due to or involving selected causes, England and
      Wales, week ending {data.current.date.toLocaleDateString(
        "en-GB",
        dateOptions
      )}
    </p>
  </Section>

  <Cards>
    <Card title="Influenza or pneumonia">
      <div class="causes-container">
        <div class="causes-child">
          <span style="color:#8D2865; font-weight:700"> Due to ⬥</span>
          <p class="ons-u-fs-xxxl" style="margin-bottom:0; color:#8D2865">
            {Math.abs(data.flu.percent_due_to).toFixed(1)}%
          </p>
          {Math.abs(data.flu.value_due_to).toLocaleString("en-GB")} deaths
        </div>

        <div class="causes-child">
          <span style="color:#27A0CC; font-weight:700"> Involving ● </span>
          <p class="ons-u-fs-xxxl" style="margin-bottom:0; color:#27A0CC">
            {Math.abs(data.flu.percent_involving).toFixed(1)}%
          </p>
          {Math.abs(data.flu.value_involving).toLocaleString("en-GB")} deaths
        </div>
      </div>
      <p />
      <h4 style="padding-top:10px; margin-bottom:10px">
        Trend in the past two years
      </h4>

      <LineChart
        line_chart_max={data.flu_covid_max}
        yKey1={"flu_with_percent"}
        yKey2={"flu_due_to_percent"}
        yKey3={"flu_with"}
        yKey4={"flu_due_to"}
        dataTitle="influenza or pneumonia"
        data={data.array}
        filename="deaths-flu"
        chartTitle="Influenza or pneumonia"
      />
    </Card>
    <Card title="Coronavirus">
      <div class="causes-container">
        <div class="causes-child">
          <span style="color:#8D2865; font-weight:700"> Due to ⬥</span>
          <p class="ons-u-fs-xxxl" style="margin-bottom:0; color:#8D2865">
            {Math.abs(data.covid.percent_due_to).toFixed(1)}%
          </p>
          {Math.abs(data.covid.value_due_to).toLocaleString("en-GB")} deaths
        </div>

        <div class="causes-child">
          <span style="color:#27A0CC; font-weight:700"> Involving ● </span>
          <p class="ons-u-fs-xxxl" style="margin-bottom:0; color:#27A0CC">
            {Math.abs(data.covid.percent_involving).toFixed(1)}%
          </p>
          {Math.abs(data.covid.value_involving).toLocaleString("en-GB")} deaths
        </div>
      </div>
      <p />
      <h4 style="padding-top:10px; margin-bottom:10px">
        Trend in the past two years
      </h4>

      <LineChart
        line_chart_max={data.flu_covid_max}
        yKey1={"covid_with_percent"}
        yKey2={"covid_due_to_percent"}
        yKey3={"covid_with"}
        yKey4={"covid_due_to"}
        dataTitle="coronavirus"
        data={data.array}
        filename="deaths-covid"
        chartTitle="Coronavirus"
      />
    </Card>
  </Cards>

  <Section width="medium">
    <Twisty
      title='What is the difference between deaths "due to" and deaths "involving"?'
      on:toggle={(e) =>
        toggleEvent(
          e,
          'What is the difference between deaths "due to" and deaths "involving"?',
          "Deaths by selected causes",
          "2"
        )}
    >
      <p>
        <strong>Deaths due to a disease:</strong> those where the disease was the
        underlying cause of death (in other words, the person died from the disease).
      </p>
      <p>
        <strong>Deaths involving a disease:</strong> those where the disease was
        mentioned anywhere on the death certificate (in other words, they died with
        the disease).
      </p>
    </Twisty>
  </Section>
  <Divider hr="full" />
  <Section title="Deaths by country" width="medium">
    <p>
      Week ending {data.current.date.toLocaleDateString("en-GB", dateOptions)}
    </p>
  </Section>

  <Cards>
    <Card title="England">
      Deaths registered
      <p class="ons-u-fs-xxxl">
        {Math.abs(data.current.num_england).toLocaleString("en-GB")}
      </p>

      Comparison with expected
      <p class="ons-u-fs-xl" style="margin-bottom:0">
        {Math.abs(
          data.expected_comparison_england.percent_difference.toLocaleString(
            "en-GB"
          )
        ).toFixed(1)}%
        {#if data.expected_comparison_england.percent_difference === 0}
          difference
        {:else if data.expected_comparison_england.percent_difference > 0}
          higher
        {:else}
          lower
        {/if}
      </p>
      {#if data.expected_comparison_england.percent_difference === 0}
        from expected
      {:else}
        than expected
      {/if}
    </Card>

    <Card title="Wales">
      Deaths registered
      <p class="ons-u-fs-xxxl">
        {Math.abs(data.current.num_wales).toLocaleString("en-GB")}
      </p>

      Comparison with expected
      <p class="ons-u-fs-xl" style="margin-bottom:0">
        {Math.abs(
          data.expected_comparison_wales.percent_difference.toLocaleString(
            "en-GB"
          )
        ).toFixed(1)}%
        {#if data.expected_comparison_wales.percent_difference === 0}
          difference
        {:else if data.expected_comparison_wales.percent_difference > 0}
          higher
        {:else}
          lower
        {/if}
      </p>
      {#if data.expected_comparison_wales.percent_difference === 0}
        from expected
      {:else}
        than expected
      {/if}
    </Card>

    <Card title="UK">
      Deaths registered
      <p class="ons-u-fs-xxxl">
        {Math.abs(data.current.num_uk).toLocaleString("en-GB")}
        <!-- {Math.abs(data.current.num_wales).toLocaleString("en-GB")} -->
      </p>

      <p>Includes figures from Scotland and Northern Ireland.</p>
    </Card>
  </Cards>

  <Section width="medium">
    The figures for England and Wales exclude non-residents.
  </Section>
  <Divider hr="full" />
</Embed>

<style>
  .causes-child {
    flex: 50%;
  }
  .causes-container {
    display: flex;
    margin-top: 16.8px;
  }
</style>
