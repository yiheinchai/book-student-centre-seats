// ==UserScript==
// @name         Student Centre Room Confirmation
// @namespace    http://tampermonkey.net/
// @version      2024-01-29
// @description  Automated booking confirmation for student centre seats
// @author       Yi Hein Chai
// @match        https://outlook.office.com/mail/*
// @match        https://library-calendars.ucl.ac.uk/r/checkin*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const EMAIL_LINK = "https://outlook.office.com/mail/";
  const CHECKIN_LINK = "https://library-calendars.ucl.ac.uk/r/checkin";
  const TIMES_TO_CHECKIN = ["11:00", "12:00", "13:00"];

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

  async function getCheckInCode(time) {
    console.log("Getting code for time: ", time, getFormattedDate())
    let checkInCode = false;
    document.querySelector("#MailList .customScrollBar").scrollTo(0,0)
    for (let i = 0; i < 100; i++) {
      try {
        Array.from(
          document
            .querySelector("#MailList .customScrollBar div")
            .querySelectorAll("div"),
        )
          .filter(
            (e) =>
              e.ariaLabel != null &&
              e.ariaLabel.includes("Library Calendars Student Centre") &&
              e.ariaLabel.includes(time) &&
              e.ariaLabel.includes(getFormattedDate()),
          )[0]
          .click();
        checkInCode = document
          .querySelector(".x_content")
          .textContent.split(" ")[26];
        console.log("the check in code is", checkInCode)
        return checkInCode;
      } catch (error) {
        document.querySelector("#MailList .customScrollBar").scrollBy(0, 100);
        await sleep(500);
        console.log(error);
      }
    }
  }

  function redirectWithCode(code) {
    window.location.replace(`${CHECKIN_LINK}?code=${code}`);
  }

  async function emailHandler(time) {
    const code = await getCheckInCode(time);
    setTimeInTodayAsCheckedIn(time);
    redirectWithCode(code);
  }

  async function checkInHandler(time) {
    const code = new URLSearchParams(window.location.search).get("code");
    document.querySelector("#s-lc-code").value = code;
    document.querySelector("#s-lc-checkin-button").click();
    await sleep(500);
    setTimeInTodayAsCheckedIn(time);
    window.location.replace(EMAIL_LINK);
  }

  function sleep(ms) {
    // Return a promise that resolves after the given delay
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function setTimeInTodayAsCheckedIn(time) {
    let today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`check_in ${today} ${time}`, true);
  }

  function checkIfTimeInTodayAlreadyCheckedIn(time) {
    let today = new Date().toISOString().slice(0, 10);
    return Boolean(localStorage.getItem(`check_in ${today} ${time}`));
  }

  function isTimeToCheckIn(targetTime) {
    const targetDateTime = new Date();
    const [targetHours, targetMinutes] = targetTime.split(":");
    targetDateTime.setHours(parseInt(targetHours, 10));
    targetDateTime.setMinutes(parseInt(targetMinutes, 10));
    const currentTime = new Date();
    const fifteenMinutesBeforeTarget = new Date(targetDateTime);
    fifteenMinutesBeforeTarget.setMinutes(targetDateTime.getMinutes() - 15);
    const thirtyMinutesAfterTarget = new Date(targetDateTime);
    thirtyMinutesAfterTarget.setMinutes(targetDateTime.getMinutes() + 30);
    return (
      currentTime >= fifteenMinutesBeforeTarget &&
      currentTime < thirtyMinutesAfterTarget
    );
  }

  async function start() {
    for (const time of TIMES_TO_CHECKIN) {
       console.log('Checking in at', time)
        if (window.location.href.includes(CHECKIN_LINK)) {
          await checkInHandler(time);
        }
      console.log(new Date(), time, "today already checked in?" ,checkIfTimeInTodayAlreadyCheckedIn(time), "is it time to checkin?" , isTimeToCheckIn(time))
      if (!checkIfTimeInTodayAlreadyCheckedIn(time) && isTimeToCheckIn(time)) {
        console.log('Getting email link at', time)
        if (window.location.href.includes(EMAIL_LINK)) {
          await emailHandler(time);
        }
      }
    }
  }

  setInterval(start, 20000);
})();
