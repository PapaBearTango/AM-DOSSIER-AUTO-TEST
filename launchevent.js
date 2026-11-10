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
    try {
      var item = Office.context.mailbox.item;

      if (!item || !item.subject) {
        finish(event);
        return;
      }

      item.subject.getAsync(function (result) {
        if (result.status !== Office.AsyncResultStatus.Succeeded) {
          console.error(
            "AM Auto Test: onderwerp lezen mislukt",
            result.error
          );
          finish(event);
          return;
        }

        var original = result.value || "";

        // Alleen testmails met AMTEST: aanpassen.
        if (original.toUpperCase().indexOf(TEST_MARKER) === -1) {
          finish(event);
          return;
        }

        // Bestaande AM-nummers niet opnieuw toevoegen.
        if (/\[AM\d{6}\]/i.test(original)) {
          finish(event);
          return;
        }

        // Antwoordprefix behouden, bijvoorbeeld Re: of AW:
        var match = original.match(
          /^((?:(?:RE|FW|FWD|AW|WG)\s*:\s*)+)/i
        );

        var prefix = match ? match[0] : "";
        var remainder = original.slice(prefix.length);

        var newSubject =
          prefix + "[" + TEST_NUMBER + "] " + remainder;

        item.subject.setAsync(
          newSubject,
          function (writeResult) {
            if (
              writeResult.status !==
              Office.AsyncResultStatus.Succeeded
            ) {
              console.error(
                "AM Auto Test: onderwerp wijzigen mislukt",
                writeResult.error
              );
            }

            finish(event);
          }
        );
      });
    } catch (error) {
      console.error("AM Auto Test: onverwachte fout", error);
      finish(event);
    }
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
