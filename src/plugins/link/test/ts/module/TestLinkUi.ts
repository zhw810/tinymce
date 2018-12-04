import { Chain, FocusTools, GeneralSteps, Guard, Logger, Mouse, Step, UiFinder, Waiter, Assertions } from '@ephox/agar';
import { document, Event, localStorage } from '@ephox/dom-globals';
import { Type, Obj } from '@ephox/katamari';
import { TinyDom } from '@ephox/mcagar';
import { Element, Value, Body } from '@ephox/sugar';

const doc = TinyDom.fromDom(document);

const selectors = {
  href: 'label.tox-label:contains(URL) + div>div>input.tox-textfield',
  text: 'label.tox-label:contains(Text to display) + input.tox-textfield',
  title: 'label.tox-label:contains(Title) + input.tox-textfield',
  target: 'label.tox-label:contains(Open link in...) + div.tox-selectfield>select',
  linklist: 'label.tox-label:contains(Link list) + div.tox-selectfield>select',
};

const sOpenLinkDialog = Logger.t('Open link dialog', GeneralSteps.sequence([
  Mouse.sClickOn(TinyDom.fromDom(document.body), '.tox-toolbar button'),
  UiFinder.sWaitForVisible('wait for link dialog', TinyDom.fromDom(document.body), '[role="dialog"]'),
]));

const sClickOnDialog = (label: string, selector: string) => Logger.t('Click on dialog', GeneralSteps.sequence([
  UiFinder.sWaitForVisible('Waiting for item to appear', TinyDom.fromDom(document.body), '[role="dialog"]:not(.tox-confirm-dialog) ' + selector),
  Mouse.sClickOn(TinyDom.fromDom(document.body), '[role="dialog"]:not(.tox-confirm-dialog) ' + selector)
]));

const sClickOnConfirmDialog = (label: string, state: boolean) => Logger.t('Click on confirm dialog', GeneralSteps.sequence([
  Mouse.sClickOn(TinyDom.fromDom(document.body), '[role="dialog"].tox-confirm-dialog button:contains("' + (state ? 'Yes' : 'No') + '")'),
  Waiter.sTryUntil(
    'Waiting for confirm dialog to go away',
    UiFinder.sNotExists(TinyDom.fromDom(document.body), '.tox-confirm-dialog'),
    100,
    1000
  )
]));

const fireEvent = (elem: Element, event: string) => {
  let evt;
  if (Type.isFunction(Event)) {
    evt = new Event(event, {
      bubbles: true,
      cancelable: true
    });
  } else { // support IE
    evt = document.createEvent('Event');
    evt.initEvent(event, true, true);
  }
  elem.dom().dispatchEvent(evt);
};

const cFireEvent = (event: string) => Chain.control(
  Chain.op((elem: Element) => {
    fireEvent(elem, event);
  }),
  Guard.addLogging('Fire event')
);

const cGetInput = (selector: string) => Chain.control(
  Chain.fromChains([
    Chain.inject(Body.body()),
    UiFinder.cFindIn(selector)
  ]),
  Guard.addLogging('Get input')
);

const sAssertInputValue = (label, selector, expected) => {
  return Logger.t(label,
    Chain.asStep({}, [
      cGetInput(selector),
      Chain.op((element) => {
        if (element.dom().type === 'checkbox') {
          Assertions.assertEq(`The input value for ${label} should be: `, expected, element.dom().checked);
          return;
        }
        Assertions.assertEq(`The input value for ${label} should be: `, expected, Value.get(element));
      })
    ]),
  );
};

const sAssertDialogContents = (expected: Record<string, any>) => {
  const steps = [sWaitForUi('Wait for dialog to appear', 'div[role="dialog"]')];
  Obj.mapToArray(selectors, (value, key) => {
    if (Obj.has(expected, key)) {
      steps.push(sAssertInputValue(key, value, expected[key]));
    }
  });
  return GeneralSteps.sequence(steps);
};

const sWaitForUi = (label: string, selector: string) => {
  return Logger.t('Wait for UI', Waiter.sTryUntil(
    label,
    UiFinder.sWaitForVisible('Waiting', TinyDom.fromDom(document.body), selector),
    100,
    1000
  ));
};

const sInsertLink = function (url: string) {
  return Logger.t('Insert link', GeneralSteps.sequence([
    sOpenLinkDialog,
    FocusTools.sSetActiveValue(doc, url),
    sClickSave
  ]));
};

const sAssertContentPresence = (api, presence) => {
  return Logger.t('Assert content presence', Waiter.sTryUntil(
    'Waiting for content to have expected presence',
    api.sAssertContentPresence(presence),
    100,
    1000
  ));
};

const sWaitForDialogClose = Logger.t('Wait for dialog to close', Waiter.sTryUntil(
  'Waiting for dialog to go away',
  UiFinder.sNotExists(TinyDom.fromDom(document.body), '[role="dialog"]:not(.tox-confirm-dialog)'),
  100,
  1000
));

const sWaitForConfirmClose = Logger.t('Wait to confirm close', Waiter.sTryUntil(
  'Waiting for confirm dialog to go away',
  UiFinder.sNotExists(TinyDom.fromDom(document.body), '[role="dialog"].tox-confirm-dialog'),
  100,
  1000
));

const sClickSave = Logger.t('Click Save', GeneralSteps.sequence([
  sClickOnDialog('click save button', 'button:contains("Save")'),
  sWaitForDialogClose
]));

const sClickCancel = Logger.t('Click Cancel', GeneralSteps.sequence([
  sClickOnDialog('click cancel button', 'button:contains("Cancel")'),
  sWaitForDialogClose
]));

const sClickConfirmYes = Logger.t('Click confirm yes', GeneralSteps.sequence([
  sClickOnConfirmDialog('click "Yes"', true),
  sWaitForConfirmClose
]));

const sClickConfirmNo = Logger.t('Click confirm no', GeneralSteps.sequence([
  sClickOnConfirmDialog('click "No"', false),
  sWaitForConfirmClose
]));

const cGetDialog = Chain.control(
  Chain.fromChains([
    Chain.inject(TinyDom.fromDom(document.body)),
    Chain.control(
      UiFinder.cFindIn('[role="dialog"]'),
      Guard.tryUntil('Waiting for dialog', 100, 1000)
    )
  ]),
  Guard.addLogging('Get dialog')
);

const cFindInDialog = (selector) => Chain.control(
  Chain.fromChains([
    Chain.inject(TinyDom.fromDom(document.body)),
    Chain.control(
      UiFinder.cFindIn('[role="dialog"]'),
      Guard.tryUntil('Waiting for dialog', 100, 1000)
    ),
    UiFinder.cFindIn(selector)
  ]),
  Guard.addLogging('Find in dialog')
);

const sClearHistory = Step.sync(() => {
  localStorage.removeItem('tinymce-url-history');
});

export const TestLinkUi = {
  sAssertContentPresence,
  sOpenLinkDialog,
  sClickOnDialog,
  sClickOnConfirmDialog,
  cGetDialog,
  cFireEvent,
  cFindInDialog,
  sAssertDialogContents,
  sWaitForUi,
  sClickSave,
  sClickCancel,
  sClickConfirmYes,
  sClickConfirmNo,
  sInsertLink,
  fireEvent,
  sClearHistory
};