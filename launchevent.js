/*
 * AM Dossier Auto Test
 * Alleen testonderwerpen met AMTEST: worden aangepast.
 * Geen verbinding met Attio of SharePoint.
 */

(function () {
  "use strict";

  var TEST_NUMBER = "AM260158";
  var TEST_MARKER = "AMTEST:";

  function finish(event) {
    if (event && typeof event.completed === "function") {
      event.completed();
    }
  }

  function handleCompose(event) {
    var item = Office.context.mailbox.item;

    if (!item || !item.subject) {
      finish(event);
      return;
    }

    item.subject.getAsync(function (result) {
      if (result.status !== Office.AsyncResultStatus.Succeeded) {
        console.error("AM Auto Test: onderwerp lezen mislukt");
        finish(event);
        return;
      }

      var original = result.value || "";

      // Raak gewone klantmails niet aan.
      if (original.toUpperCase().indexOf(TEST_MARKER) === -1) {
        finish(event);
        return;
      }

      // Voorkom dubbele dossiernummers.
      if (/\[AM\d{6}\]/i.test(original)) {
        finish(event);
        return;
      }

      // Bewaar Re:, RE:, Fwd: enzovoort.
      var match = original.match(
        /^((?:(?:RE|FW|FWD|AW|WG)\s*:\s*)+)/i
      );

      var prefix = match ? match[0] : "";
      var remainder = original.slice(prefix.length);

      var newSubject =
        prefix + "[" + TEST_NUMBER + "] " + remainder;

      item.subject.setAsync(newSubject, function (writeResult) {
        if (writeResult.status !== Office.AsyncResultStatus.Succeeded) {
          console.error(
            "AM Auto Test: onderwerp wijzigen mislukt",
            writeResult.error
          );
        }

        finish(event);
      });
    });
  }

  Office.actions.associate(
    "onNewMessageComposeHandler",
    handleCompose
  );

  Office.actions.associate(
    "onMessageComposeHandler",
    handleCompose
  );
})();
