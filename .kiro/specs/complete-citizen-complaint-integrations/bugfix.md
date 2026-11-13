# Bugfix Requirements Document

## Introduction

The citizen complaint interface advertises photo evidence, Lumen-assisted writing, OCR, and a community map, but these capabilities currently stop at placeholders or disconnected standalone services. Complaint records and coordinates exist, and repository schemas already define media URLs, metadata, OCR text, and AI-writing records, but the active paths do not complete the citizen workflows. This bugfix completes those existing capabilities while keeping image binaries in configured object storage, keeping complaint and media records in Aiven MySQL, using the configured Lumen service only through authenticated server-side integrations, and preserving current complaint validation, duplicate prevention, authorization, privacy, support, filtering, and status behavior.

## Bug Analysis

The bug condition `C(X)` is true when an authenticated citizen attempts a complaint workflow that includes photo evidence, Lumen writing assistance, OCR, or citizen-map viewing and the workflow reaches a placeholder, a disconnected service, a storage-model mismatch, or a staff-only endpoint that prevents completion.

```text
FUNCTION isBugCondition(X)
  INPUT: X of type CitizenComplaintInteraction
  OUTPUT: boolean

  RETURN X.actorRole = "citizen"
    AND X.capability IN {photo_upload, writing_assistance, image_ocr, complaint_map}
    AND endToEndCapabilityIsUnavailableOrInconsistent(X)
END FUNCTION

// Property: Fix Checking
FOR ALL X WHERE isBugCondition(X) DO
  result <- CompleteCitizenComplaintIntegration'(X)
  ASSERT result satisfies the corresponding Expected Behavior clause
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT CompleteCitizenComplaintIntegration(X) = CompleteCitizenComplaintIntegration'(X)
END FOR
```

### Current Behavior (Defect)

The following clauses describe observable defects and integration gaps found in the supplied repository.

1.1 WHEN an authenticated citizen starts a report and selects one or more complaint photos THEN the system presents placeholder behavior and does not complete complaint creation with the selected photos linked to the saved complaint.

1.2 WHEN the existing media upload path accepts an image THEN the system stores the image binary in an Aiven MySQL `image_data` field, while the intended complaint-media schema requires object-storage URLs and metadata, producing an incompatible persistence path.

1.3 WHEN complaint creation, object upload, or media-metadata persistence fails partway through a photo submission THEN the system has no completed end-to-end consistency behavior for preventing orphaned objects, orphaned metadata, or a complaint response that falsely reports unattached media as saved.

1.4 WHEN an unauthenticated user, a citizen targeting another citizen's complaint, or a client with an invalid or expired token attempts a citizen photo operation through the primary application path THEN the system has no integrated path that consistently applies the existing authentication and ownership rules.

1.5 WHEN a citizen submits an empty, oversized, mislabeled, corrupt, or unsupported photo through the primary complaint flow THEN the system has no integrated end-to-end validation response and cannot guarantee that rejected content leaves no stored object or metadata row.

1.6 WHEN an authenticated citizen asks Lumen to improve complaint notes THEN the citizen interface reports that the assistant is coming soon, while the standalone adapter returns service response/history data rather than a normalized editable complaint draft.

1.7 WHEN Lumen returns suggested complaint wording THEN the system does not place a reviewable suggestion into the complaint flow and does not require the citizen to accept or edit it before the final description is submitted.

1.8 WHEN the configured Lumen writing service is unavailable, times out, rejects a request, or returns an unusable response THEN the citizen complaint flow has no integrated fallback that retains the citizen's notes and permits manual completion without exposing service internals.

1.9 WHEN an authenticated citizen requests OCR for a photo they uploaded THEN the available OCR path is staff-only, reads image bytes from Aiven MySQL, and is disconnected from object-stored citizen media.

1.10 WHEN OCR succeeds for a citizen's uploaded image THEN the system does not connect the extracted text to that media record and the citizen's complaint-writing flow in a reviewable form.

1.11 WHEN a citizen opens the Community Issues Map THEN the system displays placeholder notification behavior and no complaint markers derived from saved complaint coordinates.

1.12 WHEN the citizen map needs complaint data THEN the current complaint collection endpoint is staff-only and no integrated citizen-safe collection response supplies marker fields while excluding reporter identity and contact data.

1.13 WHEN the citizen client calls the primary Lumen API application for complaints, media, writing assistance, OCR, or map data THEN the primary application exposes only its health route and the repository's complaint and integration services remain disconnected standalone paths.

1.14 WHEN citizen photo, writing-assistance, or OCR requests cross the browser-to-server trust boundary THEN the incomplete integration does not provide one testable contract ensuring that object-storage and Lumen credentials remain server-side, authorization is enforced before external calls, and secret values are absent from client payloads, API errors, and logs.

### Expected Behavior (Correct)

Each clause below is the fix-checking acceptance criterion for the same trigger in the correspondingly numbered Current Behavior clause.

2.1 WHEN an authenticated citizen starts a report and selects one or more valid complaint photos THEN the system SHALL create the complaint, upload every successfully accepted image, associate each resulting media record with that complaint and citizen, and return enough non-secret media information for the citizen interface to show the saved attachments.

2.2 WHEN the media upload path accepts an image THEN the system SHALL store the image binary in the configured object-storage bucket and store only its retrievable storage reference or URL, complaint association, uploader association, media type, verified MIME type, byte size, sanitized original filename, analysis fields, and timestamps in Aiven MySQL; it SHALL NOT store the image binary in Aiven MySQL.

2.3 WHEN complaint creation, object upload, or media-metadata persistence fails partway through a photo submission THEN the system SHALL preserve a consistent result by removing newly orphaned objects or metadata where safe, marking the affected item as unsaved, and returning a clear retryable failure without claiming that an unattached photo was saved.

2.4 WHEN an unauthenticated user, a citizen targeting another citizen's complaint, or a client with an invalid or expired token attempts a citizen photo operation THEN the system SHALL reject the operation before uploading or disclosing media; an authenticated active citizen SHALL be permitted to add initial evidence only to their own complaint.

2.5 WHEN a citizen submits an empty, oversized, mislabeled, corrupt, or unsupported photo THEN the system SHALL reject it with a safe, actionable validation response, SHALL verify content independently of the client-provided filename and MIME type, and SHALL create neither an object-storage object nor an Aiven MySQL media row for the rejected file.

2.6 WHEN an authenticated citizen submits valid complaint notes for writing assistance THEN the system SHALL call the configured Lumen service from the server, normalize a successful response into a concise editable complaint-description suggestion, return a review-required indicator, and avoid inventing facts or assigning severity.

2.7 WHEN Lumen returns suggested complaint wording THEN the system SHALL show the suggestion separately for citizen review and SHALL submit it as the complaint description only after the citizen explicitly accepts or edits it; the citizen's final reviewed text SHALL remain the authoritative saved description.

2.8 WHEN the configured Lumen writing service is unavailable, times out, rejects a request, or returns an unusable response THEN the system SHALL provide a safe and actionable error, retain the citizen's entered notes, allow manual editing and complaint submission to continue, and omit credentials, upstream response bodies, and unnecessary service internals from the response.

2.9 WHEN an authenticated citizen requests OCR for a valid photo attached to their own complaint THEN the system SHALL authorize ownership, retrieve the image from object storage on the server, submit only the required image and metadata to the configured Lumen OCR service, and save normalized extracted text to the associated Aiven MySQL media record without storing another image binary in MySQL.

2.10 WHEN OCR succeeds for a citizen's uploaded image THEN the system SHALL display the extracted text as a reviewable suggestion that the citizen can copy, accept, edit, or ignore, and SHALL NOT overwrite the complaint description or submit a complaint without explicit citizen action.

2.11 WHEN a citizen opens the Community Issues Map and complaint data is available THEN the system SHALL render one marker for each complaint eligible for citizen-map display using its saved latitude and longitude and SHALL let the citizen identify the corresponding complaint through non-sensitive marker details.

2.12 WHEN the citizen map requests complaint data THEN the system SHALL return only fields needed for map display and navigation, support the advertised category and status filtering, reject invalid geographic or filter inputs safely, and exclude reporter names, contact details, authentication data, private notes, storage credentials, and other staff-only fields.

2.13 WHEN the citizen client calls the configured primary PKonek API for complaints, media, writing assistance, OCR, or map data THEN the system SHALL expose connected, reachable routes for those capabilities under a consistent client configuration and SHALL return explicit service errors rather than placeholder success notifications when a dependency is unavailable.

2.14 WHEN citizen photo, writing-assistance, or OCR requests cross the browser-to-server trust boundary THEN the system SHALL keep object-storage service credentials, Lumen credentials, database credentials, and signing secrets on the server; SHALL authenticate and authorize before reading private objects or calling paid/external services; SHALL use configured secure endpoints and timeouts; and SHALL redact secret values and sensitive upstream content from browser payloads, API errors, and logs.

### Unchanged Behavior (Regression Prevention)

The following clauses are preservation-checking acceptance criteria for inputs outside the bug condition.

3.1 WHEN an authenticated citizen submits a valid complaint without photos and without Lumen assistance THEN the system SHALL CONTINUE TO create the complaint from the citizen's manually entered title, description, category, and required location pin.

3.2 WHEN complaint input omits a required pin, contains non-finite or out-of-range coordinates, falls outside the configured Pasig bounds, references an unknown or inactive category, or violates existing title and description limits THEN the system SHALL CONTINUE TO reject the complaint using the existing validation behavior.

3.3 WHEN a citizen submits or previews a complaint matching an active nearby complaint within the configured category, distance, and time window THEN the system SHALL CONTINUE TO apply duplicate prevention and direct the citizen to support the existing complaint.

3.4 WHEN a citizen supports an eligible nearby complaint THEN the system SHALL CONTINUE TO enforce proximity, active-status, and repeat-support rules and increment the report count atomically.

3.5 WHEN staff list, filter, inspect, or change the status of complaints THEN the system SHALL CONTINUE TO enforce staff roles, existing filter validation, allowed status transitions, audit recording, and reporter-detail visibility rules.

3.6 WHEN a public or citizen-facing response includes complaint or map information THEN the system SHALL CONTINUE TO hide reporter contact details and SHALL NOT broaden access to staff-only complaint fields.

3.7 WHEN a valid complaint is created or displayed after this fix THEN the system SHALL CONTINUE TO use the saved complaint record and its existing coordinates as the source of truth for reference number, category, description, status, report count, timestamps, duplicate checks, and map position.

3.8 WHEN staff use valid existing progress-media or OCR capabilities within their authorized scope THEN the system SHALL CONTINUE TO permit those operations after the storage integration is corrected, subject to the same file validation and server-side credential protections as citizen media.

3.9 WHEN Lumen assists with complaint writing THEN the system SHALL CONTINUE TO preserve only citizen-provided facts, avoid automated severity assessment in the writing suggestion, and require citizen review rather than treating generated text as an authoritative statement.

3.10 WHEN Lumen writing assistance or OCR is not requested THEN the system SHALL CONTINUE TO submit and process complaints without sending complaint text or media to Lumen.

3.11 WHEN the citizen map reads complaint data or applies map filters THEN the system SHALL CONTINUE TO leave complaint records, coordinates, statuses, report counts, and media unchanged.

3.12 WHEN configuration is loaded for the database, object storage, JWT handling, or Lumen services THEN the system SHALL CONTINUE TO read sensitive values from server-side configuration and SHALL NOT expose, hard-code, commit, or echo their actual values.
