// ==UserScript==
// @name         Student Centre Booking
// @namespace    http://tampermonkey.net/
// @version      2024-01-29
// @description  Automated booking for student centre seats
// @author       You
// @match        https://library-calendars.ucl.ac.uk/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        none
// ==/UserScript==

(function() {
    "use strict";

    const TIMES_TO_BOOK = ["12:00", "15:30"];
    const BOOKING_LINK =
        "https://library-calendars.ucl.ac.uk/r/new/availability?lid=872&zone=427&gid=2529&capacity=-1";
    const PREFERRED_SEAT = 491

    function sleep(ms) {
        // Return a promise that resolves after the given delay
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function findSlot(time, preferred_seat = null) {
        let tables = document.querySelectorAll(".fc-timeline-lane");
        for (let table of tables) {
            // Get all the event elements by their class name
            let events = table.querySelectorAll(".fc-timeline-event");
            // Loop through the events and find the first one that has the title "Available"
            for (let event of events) {
                let title = event.getAttribute("title");
                let seat_found = false
                if (preferred_seat != null) {
                    seat_found = title.includes("Available") && title.includes(time) && title.includes(`Desk ${preferred_seat}`)
                } else {
                    seat_found = title.includes("Available") && title.includes(time)
                }
                if (seat_found) {
                    // Select the event by adding a class name "selected"
                    console.log(title);
                    return event
                }
            }


        }
        return null
    }

    function selectSlot(time, preferred_seat = null) {
        let seat = findSlot(time, preferred_seat)
        if (seat == null) {
            seat = findSlot(time, null)
        }

        seat.click()

    }

    function refresh() {
        window.location.href = BOOKING_LINK;
    }

    // Define a callback function that submits the form
    function submitForm() {
        // Get the form element by its id
        let form = document.querySelector("#s-lc-eq-bform-inner");
        // Get the button element by its tag name
        let button = form.querySelector("button");
        // Click the button
        button.click();
    }

    async function makeBooking(time, preferred_seat = null) {
        await sleep(1000);
        document.querySelector(".fc-next-button").click();
        await sleep(1500);
        document.querySelector(".fc-next-button").click();
        await sleep(1500);
        document.querySelector(".fc-next-button").click();
        await sleep(1500);
        selectSlot(time, preferred_seat);
        await sleep(1500);
        submitForm();
        await sleep(1500);
    }

    async function confirmBooking() {
        console.log("confirming booking");
        document.querySelector("#s-lc-eq-tc-buts button").click();
        await sleep(500);
        document.querySelector("#btn-form-submit").click();
    }

    function setTimeInTodayAsBooked(time) {
        let today = new Date().toISOString().slice(0, 10);
        localStorage.setItem(`${today} ${time}`, true);
    }

    function checkIfTimeInTodayAlreadyBooked(time) {
        let today = new Date().toISOString().slice(0, 10);
        return Boolean(localStorage.getItem(`${today} ${time}`));
    }

    async function book(time, preferred_seat = null) {
        if (window.location.href === BOOKING_LINK) {
            await makeBooking(time, preferred_seat);
        }
        await sleep(1000);

        if (
            window.location.href.includes(
                "https://library-calendars.ucl.ac.uk/spaces/",
            )
        ) {
            await confirmBooking();
            setTimeInTodayAsBooked(time);
            refresh();
        }
    }

    function isAfternoonNow() {
        let now = new Date();
        let hour = now.getHours();
        return hour >= 12;
    }

    function getFormattedDate() {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        const today = new Date();
        const dayName = days[today.getDay()];
        const day = today.getDate();
        const monthName = months[today.getMonth()];
        const year = today.getFullYear();

        return `${dayName} ${day} ${monthName} ${year}`;
    }

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

    async function start() {
        for (const time of TIMES_TO_BOOK) {
            console.log(new Date(), checkIfTimeInTodayAlreadyBooked(time));
            if (
                !checkIfTimeInTodayAlreadyBooked(time) &&
                isAfternoonNow() &&
                checkPageRefresh()
            ) {
                await book(time, PREFERRED_SEAT);
            }
        }
    }

    setInterval(start, 10000);
})();
