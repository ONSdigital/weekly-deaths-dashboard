import { base } from "$app/paths";
import { csvParse, autoType } from "d3-dsv";

const dataUrl = `${base}/data/data.csv`;
const datesUrl = `${base}/data/header-details.json`;
const holidaysUrl = "https://www.gov.uk/bank-holidays.json";

function nextFriday(date) {
    const offset = (7 + 5 - date.getDay()) % 7;
    return +date + (offset * 1000 * 60 * 60 * 24);
}


// Manually added bank holiday dates (ISO format)
const manualHolidayDates = [
    "2023-08-28", // Summer BH
    "2023-12-25", // Boxing Day
    "2023-12-26"  // New Year's Day
  ];
  
  // Convert manual dates to timestamps using nextFriday logic
  const manualHolidays = manualHolidayDates.map(dateStr =>
    nextFriday(new Date(dateStr))
  );
  

export async function load({ fetch }) {
    let dates = await (await fetch(datesUrl)).json();

    const str = await (await fetch(dataUrl)).text();
    const array = csvParse(str, autoType);

    // Handle "auto" dates - extract from data
    if (dates.current === "auto" && array.length > 0) {
        const lastRow = array[array.length - 1];
        // publication_date is already a Date object after autoType parsing
        const pubDate = new Date(lastRow.publication_date);
        dates.current = pubDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    }

    if (dates.next === "auto" && dates.current !== "auto") {
        // Calculate next update (7 days after current)
        const currentDate = new Date(dates.current);
        const nextDate = new Date(currentDate);
        nextDate.setDate(nextDate.getDate() + 7);
        dates.next = nextDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    }

    const json = await (await fetch(holidaysUrl)).json();
   


        
// Combine API holidays with manual ones
const holidays = [
    ...json["england-and-wales"].events.map(d => nextFriday(new Date(d.date))),
    ...manualHolidays
  ].filter(d => d >= +array[0].date && d <= +array[array.length - 1].date);
  
        
    for (const d of array) {
        d.bank_holiday = holidays.includes(+d.date);
        d.flu_due_to_percent = d.flu_due_to / d.num_england_wales;
        d.flu_with_percent = d.flu_with / d.num_england_wales;
        d.covid_due_to_percent = d.covid_due_to / d.num_england_wales;
        d.covid_with_percent = d.covid_with / d.num_england_wales;
    }

    const earliest = array[0];
    const current = array[array.length - 1];
    const previous = array[array.length - 2];

    const deaths_registered = {
        value: current.num_england_wales,
        change: current.num_england_wales - previous.num_england_wales,
        percent_change: 100 * ((current.num_england_wales - previous.num_england_wales) / previous.num_england_wales)
    };

    const deaths_registered_england = {
        value: current.num_england,
        change: current.num_england - previous.num_england,
        percent_change: 100 * ((current.num_england - previous.num_england) / previous.num_england)
    };

    const covid = {
        value_due_to: current.covid_due_to,
        value_involving: current.covid_with,
        percent_due_to: 100 * (current.covid_due_to / current.num_england_wales),
        percent_involving: 100 * (current.covid_with / current.num_england_wales)

    }
    const flu = {
        value_due_to: current.flu_due_to,
        value_involving: current.flu_with,
        percent_due_to: 100 * (current.flu_due_to / current.num_england_wales),
        percent_involving: 100 * (current.flu_with / current.num_england_wales)

    }

    // const flu_covid_max = Math.max(...[
    //     ...array.map(d => d.flu_due_to),
    //     ...array.map(d => d.flu_with),
    //     ...array.map(d => d.covid_due_to),
    //     ...array.map(d => d.covid_with)
    // ]);

    const flu_covid_max = Math.max(...[
        ...array.map(d => d.flu_due_to_percent),
        ...array.map(d => d.flu_with_percent),
        ...array.map(d => d.covid_due_to_percent),
        ...array.map(d => d.covid_with_percent)
    ])   // Convert to decimal if your chart expects 0.2 for 20%


    const deaths_registered_wales = {
        value: current.num_wales,
        change: current.num_wales - previous.num_wales,
        percent_change: 100 * ((current.num_wales - previous.num_wales) / previous.num_wales)
    };

    const expected_comparison = {
        value: current.num_england_wales - current.exp_england_wales,
        percent_difference: 100 * ((current.num_england_wales - current.exp_england_wales) / current.exp_england_wales)
    };

    const expected_comparison_england = {
        value: current.num_england - current.exp_england,
        percent_difference: 100 * ((current.num_england - current.exp_england) / current.exp_england)
    };

    const expected_comparison_wales = {
        value: current.num_wales - current.exp_wales,
        percent_difference: 100 * ((current.num_wales - current.exp_wales) / current.exp_wales)
    };

    // Add this right before the return statement


    const current_bank_holiday = current.bank_holiday;
    const previous_bank_holiday = previous.bank_holiday;

    return { array, earliest, current, deaths_registered, expected_comparison, expected_comparison_england, deaths_registered_england, expected_comparison_wales, deaths_registered_wales, flu, covid, flu_covid_max, current_bank_holiday, previous_bank_holiday, dates };
}