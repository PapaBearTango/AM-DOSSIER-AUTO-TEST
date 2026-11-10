(function () {
  "use strict";

  function handleCompose(event) {
    var item = Office.context.mailbox.item;

    function finish() {
      event.completed();
    }

    if (!item || !item.subject) {
      finish();
      return;
    }

    item.subject.getAsync(function (result) {
      if (result.status !== Office.AsyncResultStatus.Succeeded) {
        finish();
        return;
      }

      var original = result.value || "";

      // Alleen testmails aanpassen.
      if (!/AMTEST:/i.test(original)) {
        finish();
        return;
      }

      // Voorkom dubbele markeringen.
      if (original.indexOf("[AM-EVENT-OK]") !== -1) {
        finish();
        return;
      }

      var updated = "[AM-EVENT-OK] " + original;

      item.subject.setAsync(updated, function (writeResult) {
        if (writeResult.status !== Office.AsyncResultStatus.Succeeded) {
          console.error(
            "Onderwerp aanpassen mislukt:",
            writeResult.error
          );
        }

        finish();
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
