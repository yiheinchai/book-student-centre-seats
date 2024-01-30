// This is the background script of your extension
// It can communicate with the web pages or other components of your extension

// Define the constants for the booking times and link
const TIMES_TO_BOOK = ["11:00", "15:00"];
const BOOKING_LINK =
  "https://library-calendars.ucl.ac.uk/r/new/availability?lid=872&zone=427&gid=2529&capacity=-1";

// Define a function that returns a promise that resolves after the given delay
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Define a function that selects a slot with the given time on the web page
function selectSlot(time) {
  // Get the table element by its class name
  let tables = document.querySelectorAll(".fc-timeline-lane");
  for (let table of tables) {
    // Get all the event elements by their class name
    let events = table.querySelectorAll(".fc-timeline-event");
    let selected = false;

    // Loop through the events and find the first one that has the title "Available"
    for (let event of events) {
      let title = event.getAttribute("title");
      if (title.includes("Available") && title.includes(time)) {
        // Select the event by adding a class name "selected"
        console.log(title);
        event.click();
        // Break the loop
        selected = true;
        break;
      }
    }

    if (selected) {
      // Break the loop
      break;
    }
  }
}

// Define a function that refreshes the web page
function refresh() {
  window.location.href = BOOKING_LINK;
}

// Define a function that submits the form on the web page
function submitForm() {
  // Get the form element by its id
  let form = document.querySelector("#s-lc-eq-bform-inner");
  // Get the button element by its tag name
  let button = form.querySelector("button");
  // Click the button
  button.click();
}

// Define an async function that makes a booking with the given time
async function makeBooking(time) {
  await sleep(1000);
  document.querySelector(".fc-next-button").click();
  await sleep(500);
  document.querySelector(".fc-next-button").click();
  await sleep(500);
  document.querySelector(".fc-next-button").click();
  await sleep(500);
  selectSlot(time);
  await sleep(500);
  submitForm();
  await sleep(500);
}

// Define an async function that confirms the booking on the web page
async function confirmBooking() {
  console.log("confirming booking");
  document.querySelector("#s-lc-eq-tc-buts button").click();
  await sleep(500);
  document.querySelector("#btn-form-submit").click();
}

// Define a function that sets the time in today as booked in the local storage
function setTimeInTodayAsBooked(time) {
  let today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(`${today} ${time}`, true);
}

// Define a function that checks if the time in today is already booked in the local storage
function checkIfTimeInTodayAlreadyBooked(time) {
  let today = new Date().toISOString().slice(0, 10);
  return Boolean(localStorage.getItem(`${today} ${time}`));
}

// Define an async function that books a seat with the given time
async function book(time) {
  // Create a new tab with the booking link
  let tab = await chrome.tabs.create({ url: BOOKING_LINK, active: false });
  // Wait for the tab to be loaded
  await chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tabId === tab.id) {
      // Execute the makeBooking function on the tab
      chrome.tabs.executeScript(tab.id, {
        code: `(${makeBooking})("${time}")`,
      });
    }
  });
  // Wait for the tab to be updated
  await chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (
      changeInfo.url &&
      changeInfo.url.includes("https://library-calendars.ucl.ac.uk/spaces/")
    ) {
      // Execute the confirmBooking function on the tab
      chrome.tabs.executeScript(tab.id, {
        code: `(${confirmBooking})()`,
      });
      // Set the time in today as booked in the local storage
      setTimeInTodayAsBooked(time);
      // Close the tab
      chrome.tabs.remove(tab.id);
    }
  });
}

// Define a function that checks if it is afternoon now
function isAfternoonNow() {
  let now = new Date();
  let hour = now.getHours();
  return hour >= 12;
}

// Define a function that gets the formatted date
function getFormattedDate() {
  let date = new Date();
  let options = { year: "numeric", month: "long", day: "numeric" };
  return date.toLocaleDateString("en-US", options);
}

// Define a function that checks if the page needs to be refreshed
function checkPageRefresh() {
  if (
    window.location.href === BOOKING_LINK &&
    !document
      .querySelector(".fc-toolbar-title")
      .textContent.includes(getFormattedDate())
  ) {
    refresh();
    return false;
  }
  return true;
}

// Define an async function that starts the booking process
async function start() {
  for (const time of TIMES_TO_BOOK) {
    console.log(new Date(), checkIfTimeInTodayAlreadyBooked(time));
    if (
      !checkIfTimeInTodayAlreadyBooked(time) &&
      isAfternoonNow() &&
      checkPageRefresh()
    ) {
      await book(time);
    }
  }
}

// Set an alarm that triggers the start function every 10 minutes
chrome.alarms.create("booking", { periodInMinutes: 10 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "booking") {
    start();
  }
});
