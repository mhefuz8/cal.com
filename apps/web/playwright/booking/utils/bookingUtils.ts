import { expect, type Page } from "@playwright/test";

import type { Fixtures } from "@calcom/web/playwright/lib/fixtures";

const EMAIL = "test@test.com";
const EMAIL2 = "test2@test.com";
const PHONE = "+55 (32) 983289947";
const scheduleSuccessfullyText = "This meeting is scheduled";
const reschedulePlaceholderText = "Let others know why you need to reschedule";

type BookingOptions = {
  hasPlaceholder?: boolean;
  isReschedule?: boolean;
  isRequired?: boolean;
  isCheckbox?: boolean;
  isBoolean?: boolean;
  isMultiEmails?: boolean;
  isSelect?: boolean;
  isMultiSelect?: boolean;
};

// Logs in a test user and navigates to the event types page.
export const loginUser = async (page: Page, users: Fixtures["users"]) => {
  const pro = await users.create({ name: "testuser" });
  await pro.apiLogin();
  await page.goto("/event-types");
};

// Fills in booking details and confirms the booking, expecting a success message.
export const fillAndConfirmBooking = async (
  eventTypePage: Page,
  placeholderText: string,
  question: string,
  fillText: string,
  secondQuestion: string,
  hasPlaceholder = false,
  isReschedule = false,
  isRequired = true,
  isCheckbox = false,
  isBoolean = false,
  isMultiEmails = false,
  isSelect = false,
  isMultiSelect = false
) => {
  const confirmButton = isReschedule ? "confirm-reschedule-button" : "confirm-book-button";

  await expect(eventTypePage.getByText(`${secondQuestion} test`).first()).toBeVisible();
  await eventTypePage.getByPlaceholder(placeholderText).fill(fillText);

  if (isMultiEmails) {
    await eventTypePage.getByRole("button", { name: "Add guests" }).click();
  } else {
    await eventTypePage.getByTestId("add-guests").click();
  }
  await eventTypePage.getByPlaceholder("Email").click();
  await eventTypePage.getByPlaceholder("Email").fill(EMAIL);
  await eventTypePage.getByPlaceholder(`${question} test`).click();
  if (question === "phone") {
    await eventTypePage.getByPlaceholder(`${question} test`).fill(PHONE);
  } else {
    await eventTypePage.getByPlaceholder(`${question} test`).fill(`${question} test`);
  }

  if (secondQuestion === "phone" && isRequired) {
    await eventTypePage.getByPlaceholder(`${secondQuestion} test`).clear();
    await eventTypePage.getByPlaceholder(`${secondQuestion} test`).fill(PHONE);
  } else {
    // if is checkbox question and required check
    if (isCheckbox && isRequired) {
      await eventTypePage.getByLabel("Option 1").check();
      await eventTypePage.getByLabel("Option 2").check();
    }

    // if is boolean question and required check
    if (isBoolean && isRequired) {
      await eventTypePage.getByLabel(`${secondQuestion} test`).check();
    }

    // if is multiemails question and required add two emails
    if (isMultiEmails && isRequired) {
      await eventTypePage.getByRole("button", { name: "multiemail test" }).click();
      await eventTypePage.getByPlaceholder("multiemail test").fill(EMAIL);
      await eventTypePage.getByTestId("add-another-guest").nth(1).click();
      await eventTypePage.getByPlaceholder("multiemail test").nth(1).fill(EMAIL2);
    }

    if (isMultiSelect && isRequired) {
      await eventTypePage.locator("form svg").last().click();
      await eventTypePage.getByTestId("select-option-Option 1").click();
    }

    // if is select or multiselect question and required click in all options, for select just the last option will be checked
    if (isSelect && isRequired) {
      await eventTypePage.locator("form svg").last().click();
      await eventTypePage.getByTestId("select-option-Option 1").click();
    }

    // if the question has placeholder fill, if is number fill as number
    if (isRequired && hasPlaceholder && !isMultiEmails) {
      if (secondQuestion === "number") {
        await eventTypePage.getByPlaceholder(`${secondQuestion} test`).click();
        await eventTypePage.getByPlaceholder(`${secondQuestion} test`).fill("123");
      } else {
        await eventTypePage.getByPlaceholder(`${secondQuestion} test`).click();
        await eventTypePage.getByPlaceholder(`${secondQuestion} test`).fill(secondQuestion);
      }
    }
  }

  await eventTypePage.getByTestId(confirmButton).click();
  const scheduleSuccessfullyPage = eventTypePage.getByText(scheduleSuccessfullyText);
  await scheduleSuccessfullyPage.waitFor({ state: "visible" });
  await expect(scheduleSuccessfullyPage).toBeVisible();
};

export const initialCommonSteps = async (
  bookingPage: Page,
  question: string,
  users: Fixtures["users"],
  secondQuestion: string,
  message: string,
  options: BookingOptions
) => {
  //Logs in a test user and navigates to the event types page.
  loginUser(bookingPage, users);

  // Go to event type settings
  await bookingPage.getByRole("link", { name: "30 min" }).click();
  // Go to advanced tab
  await bookingPage.getByTestId("vertical-tab-event_advanced_tab_title").click();

  // Add first and second question and fill both
  await bookingPage.getByTestId("add-field").click();
  await bookingPage.locator("#test-field-type > .bg-default > div > div:nth-child(2)").first().click();
  await bookingPage.getByTestId(`select-option-${question}`).click();
  await bookingPage.getByLabel("Identifier").dblclick();
  await bookingPage.getByLabel("Identifier").fill(`${question}-test`);
  await bookingPage.getByLabel("Label").click();
  await bookingPage.getByLabel("Label").fill(`${question} test`);
  await bookingPage.getByLabel("Placeholder").click();
  await bookingPage.getByLabel("Placeholder").fill(`${question} test`);
  await bookingPage.getByTestId("field-add-save").click();
  await bookingPage.getByTestId("add-field").click();
  await bookingPage.locator("#test-field-type > .bg-default > div > div:nth-child(2)").first().click();
  await bookingPage.getByTestId(`select-option-${secondQuestion}`).click();
  await bookingPage.getByLabel("Identifier").dblclick();
  await bookingPage.getByLabel("Identifier").fill(`${secondQuestion}-test`);
  await bookingPage.getByLabel("Label").click();
  await bookingPage.getByLabel("Label").fill(`${secondQuestion} test`);
  if (options.hasPlaceholder) {
    await bookingPage.getByLabel("Placeholder").dblclick();
    await bookingPage.getByLabel("Placeholder").fill(`${secondQuestion} test`);
  }
  if (!options.isRequired) {
    await bookingPage.getByRole("radio", { name: "No" }).click();
  }
  await bookingPage.getByTestId("field-add-save").click();
  await expect(bookingPage.getByTestId(`field-${question}-test`)).toBeVisible();
  await expect(bookingPage.getByTestId(`field-${secondQuestion}-test`)).toBeVisible();

  await bookingPage.getByTestId("update-eventtype").click();

  // Go to booking page
  const eventtypePromise = bookingPage.waitForEvent("popup");
  await bookingPage.getByTestId("preview-button").click();
  const eventTypePage = await eventtypePromise;

  // Select the first available time
  await eventTypePage.getByTestId("time").first().click();

  fillAndConfirmBooking(
    eventTypePage,
    "Please share anything that will help prepare for our meeting.",
    question,
    message,
    secondQuestion,
    options.hasPlaceholder,
    options.isReschedule,
    options.isRequired,
    options.isCheckbox,
    options.isBoolean,
    options.isMultiEmails,
    options.isSelect,
    options.isMultiSelect
  );

  // Go to final steps
  await rescheduleAndCancel(eventTypePage);
};

const rescheduleAndCancel = async (eventTypePage: Page) => {
  await eventTypePage.getByText("Reschedule").click();
  await eventTypePage.getByTestId("time").first().click();
  await eventTypePage.getByPlaceholder(reschedulePlaceholderText).click();
  await eventTypePage.getByPlaceholder(reschedulePlaceholderText).fill("Test reschedule");
  await eventTypePage.getByTestId("confirm-reschedule-button").click();

  // Check if the rescheduled page is visible
  await expect(eventTypePage.getByText(scheduleSuccessfullyText)).toBeVisible();
  await eventTypePage.getByTestId("cancel").click();
  await eventTypePage.getByTestId("cancel_reason").fill("Test cancel");
  await eventTypePage.getByTestId("confirm_cancel").click();

  // Check if the cancelled page is visible
  await expect(eventTypePage.getByTestId("cancelled-headline")).toBeVisible();
};
