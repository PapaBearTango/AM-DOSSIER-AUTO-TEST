(function () {
  "use strict";

  function testEvent(event) {
    try {
      var item = Office.context.mailbox.item;

      if (!item || !item.subject) {
        event.completed();
        return;
      }

      item.subject.setAsync(
        "[AM-EVENT-RUNTIME-OK] TEST",
        function (result) {
          if (
            result.status !==
            Office.AsyncResultStatus.Succeeded
          ) {
            console.error(
              "AM runtime test mislukt:",
              result.error
            );
          }

          event.completed();
        }
      );
    } catch (error) {
      console.error("AM runtime fout:", error);
      event.completed();
    }
  }

  Office.actions.associate(
    "onNewMessageComposeHandler",
    testEvent
  );

  Office.actions.associate(
    "onMessageComposeHandler",
    testEvent
  );
})();
