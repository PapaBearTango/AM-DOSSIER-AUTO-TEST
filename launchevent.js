
/*
 * AM Dossier Auto Test v2
 * Alleen voor fictieve testonderwerpen.
 * Geen verzending en geen externe API-calls.
 */

function onNewMessageComposeHandler(event) {
  let finished = false;

  function finish() {
    if (finished) return;
    finished = true;
    event.completed();
  }

  try {
    const item = Office.context.mailbox.item;

    if (!item || !item.subject) {
      finish();
      return;
    }

    item.subject.getAsync(function (readResult) {
      if (
        readResult.status !==
        Office.AsyncResultStatus.Succeeded
      ) {
        finish();
        return;
      }

      const original = readResult.value || "";

      // Test uitsluitend met expliciete AMTEST-onderwerpen.
      // RE: AMTEST: ... wordt wel herkend.
      const match = original.match(
        /^((?:(?:RE|AW|FW|FWD|WG)\s*:\s*)*)(AMTEST:\s*)(.*)$/i
      );

      if (!match) {
        finish();
        return;
      }

      // Voorkom dubbele dossiernummers.
      if (/\[AM[0-9]{6}\]/i.test(original)) {
        finish();
        return;
      }

      const prefix = match[1] || "";
      const testMarker = match[2];
      const subjectText = match[3];

      const updated =
        prefix +
        "[AM260158] " +
        testMarker +
        subjectText;

      item.subject.setAsync(
        updated,
        function (writeResult) {
          if (
            writeResult.status !==
            Office.AsyncResultStatus.Succeeded
          ) {
            console.error(
              "AM Auto Test: subject.setAsync mislukt",
              writeResult.error
            );
          }

          finish();
        }
      );
    });

  } catch (error) {
    console.error("AM Auto Test:", error);
    finish();
  }
}

Office.actions.associate(
  "onNewMessageComposeHandler",
  onNewMessageComposeHandler
);
