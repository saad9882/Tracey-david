/**
 * Google Apps Script backend for wedding RSVP submissions.
 *
 * Setup:
 * 1) Create a Google Sheet and copy its ID from the URL.
 * 2) In Apps Script, paste this file and set SHEET_ID + SHEET_NAME.
 * 3) Deploy as Web App (Execute as: Me, Access: Anyone).
 * 4) Copy deployment URL into RSVP_ENDPOINT in index.html.
 */

const SHEET_ID = "1gSIwrHLHIghHDfVJXMWIU73roeSBJQP6Q50fPISDAxg";
const SHEET_NAME = "Sheet1";

function doPost(e) {
  try {
    if (!e) {
      return jsonResponse({ ok: false, error: "Missing request payload." });
    }

    const data = parsePayload_(e);
    const sheet = getOrCreateSheet_();
    ensureHeader_(sheet);

    const row = [
      new Date(),
      data.firstName || "",
      data.lastName || "",
      data.email || "",
      data.address || "",
      data.attending || "",
      data.plusOne || "",
      data.asoEbi || "n/a",
      data.transportNeeded || "no",
      data.hotel || "",
      data.song || "",
      data.dietary || "",
      data.message || "",
      data.guestTier || "",
      data.timestamp || ""
    ];

    sheet.appendRow(row);
    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) });
  }
}

function doGet() {
  return jsonResponse({ ok: true, message: "RSVP endpoint is live.", sheet: SHEET_NAME });
}

function getOrCreateSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  return sheet;
}

function ensureHeader_(sheet) {
  const headers = [
    "receivedAt",
    "firstName",
    "lastName",
    "email",
    "address",
    "attending",
    "plusOne",
    "asoEbi",
    "transportNeeded",
    "hotel",
    "song",
    "dietary",
    "message",
    "guestTier",
    "clientTimestamp"
  ];

  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const hasHeader = String(firstRow[0] || "").trim() === "receivedAt";
  if (!hasHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function parsePayload_(e) {
  const hasRawBody = e.postData && e.postData.contents;
  if (hasRawBody) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (err) {
      // Fall back to URL-encoded parameters.
    }
  }
  return e.parameter || {};
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
