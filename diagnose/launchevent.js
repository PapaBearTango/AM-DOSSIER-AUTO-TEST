
(function () {
  "use strict";

  var TEST_NUMBER = "AM260158";
  var TEST_MARKER = "AMTEST:";
  var EVENT_TIMEOUT_MS = 4500;

  function log(stage, detail) {
    if (typeof console !== "undefined" && console.log) {
      console.log(
        "AM Auto Test [" + stage + "]",
        detail || ""
      );
    }
  }

  function handleCompose(event) {
    var finished = false;
    var timeoutId;

    function finish() {
      if (finished) return;

      finished = true;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (
        event &&
        typeof event.completed === "function"
      ) {
        event.completed();
      }
    }

    try {
      log("EVENT_STARTED");

      timeoutId = setTimeout(function () {
        log(
          "TIMEOUT",
          "Geen antwoord van de Office.js onderwerp-API"
        );
        finish();
      }, EVENT_TIMEOUT_MS);

      var item =
        Office.context &&
        Office.context.mailbox &&
        Office.context.mailbox.item;

      if (!item || !item.subject) {
        log("NO_SUBJECT_API");
        finish();
        return;
      }

      item.subject.getAsync(function (result) {
        if (finished) return;

        if (
          result.status !==
          Office.AsyncResultStatus.Succeeded
        ) {
          log("READ_FAILED", result.error);
          finish();
          return;
        }

        var original = result.value || "";

        log(
          "READ_OK",
          "Onderwerp gelezen; lengte=" + original.length
        );

        // Alleen testmails mogen gewijzigd worden.
        if (
          original.toUpperCase().indexOf(TEST_MARKER) === -1
        ) {
          log("SKIPPED", "Geen AMTEST-markering");
          finish();
          return;
        }

        // Voorkom dubbele dossiernummers.
        if (/\[AM\d{6}\]/i.test(original)) {
          log("SKIPPED", "Al genummerd");
          finish();
          return;
        }

        // Behoud Re:, AW:, FW:, enzovoort.
        var match = original.match(
          /^((?:(?:RE|FW|FWD|AW|WG)\s*:\s*)+)/i
        );

        var prefix = match ? match[0] : "";

        var updated =
          prefix +
          "[" + TEST_NUMBER + "] " +
          original.slice(prefix.length);

        item.subject.setAsync(
          updated,
          function (writeResult) {
            if (finished) return;

            if (
              writeResult.status ===
              Office.AsyncResultStatus.Succeeded
            ) {
              log("WRITE_OK");
            } else {
              log("WRITE_FAILED", writeResult.error);
            }

            finish();
          }
        );
      });
    } catch (error) {
      log(
        "EXCEPTION",
        error && error.message
      );
      finish();
    }
  }

  // Handlers onmiddellijk registreren.
  Office.actions.associate(
    "onNewMessageComposeHandler",
    handleCompose
  );

  Office.actions.associate(
    "onMessageComposeHandler",
    handleCompose
  );

  log("HANDLERS_REGISTERED");
})();
