/* globals XUL_NS, PanelUI, Services, EveryWindow, XPCOMUtils, Preferences, gExtension, FirefoxHooks */

this.Experiment = {
  // This is here for documentation, will be redefined to a pref getter
  // using XPCOMUtils.defineLazyPreferenceGetter in init().
  enabled: null,
  kEnabledPref: "extensions.pnexperiment.enabled",

  kNotificationID: "pnexperiment",
  get kNotificationAnchorID() {
    return `${this.kNotificationID}-notification-anchor`;
  },

  async setup() {
    // Called the first time the study is setup - so only once.
  },

  async init(studyInfo) {
    // Called every time the add-on is loaded.
    if (studyInfo.isFirstRun) {
      this.setup();
    }

    XPCOMUtils.defineLazyPreferenceGetter(
      this, "enabled", this.kEnabledPref, false,
      async (pref, oldVal, newVal) => {
        if (newVal) {
          this.startObserving();
        } else {
          this.stopObserving();
        }
      }
    );

    if (this.enabled) {
      this.startObserving();
    }
  },

  async cleanup() {
    // Called when the add-on is being removed for any reason.
  },

  getString(aKey) {
    return FirefoxHooks.getString(aKey);
  },

  getFormattedString(aKey, args) {
    return FirefoxHooks.getFormattedString(aKey, args, args.length);
  },

  async sendTelemetry(payload) {
    await FirefoxHooks.notifyEventListeners(payload);
  },

  disable() {
    Preferences.set(this.kEnabledPref, false);
  },

  async startObserving() {
    if (this.observerAdded) {
      return;
    }

    EveryWindow.registerCallback(
      this.kNotificationID,
      (win) => {
        // Inject our stylesheet.
        let DOMWindowUtils = win.windowUtils;
        if (!DOMWindowUtils) {
          // win.windowUtils was added in 63, fallback if it's not available.
          DOMWindowUtils = win.QueryInterface(Ci.nsIInterfaceRequestor)
            .getInterface(Ci.nsIDOMWindowUtils);
        }
        DOMWindowUtils.loadSheetUsingURIString(
          gExtension.getURL("privileged/firefoxhooks/styles.css"),
          DOMWindowUtils.AUTHOR_SHEET);

        // Set up some helper functions on the window object
        // for the popup notification to use.
        win.PNUtils = {
          // Keeps track of all notifications currently shown,
          // so that we can clear them out properly if we get
          // disabled.
          notifications: new Set(),
          disable: () => {
            this.disable();
          },
          getString: (aKey) => {
            return this.getString(aKey);
          },
          getFormattedString: (aKey, args) => {
            return this.getFormattedString(aKey, args);
          },
          getDefaultTargetLanguage: () => {
            return this.defaultTargetLanguage;
          },
        };

        // Setup the popup notification stuff. First, the URL bar icon:
        const doc = win.document;
        const pageActionBox = doc.getElementById("page-action-buttons");
        const pageActionButton = doc.getElementById("pageActionButton");
        const img = doc.createElementNS(XUL_NS, "image");
        img.setAttribute("role", "button");
        img.setAttribute("id", `${this.kNotificationAnchorID}`);
        img.classList.add(`${this.kNotificationID}-icon`, "urlbar-icon");
        pageActionBox.insertBefore(img, pageActionButton.nextSibling);

        // Now, the popupnotificationcontent:
        const parentElt = doc.defaultView.PopupNotifications.panel.parentNode;
        const pn = doc.createElementNS(XUL_NS, "popupnotification");
        const pnContent = doc.createElementNS(XUL_NS, "popupnotificationcontent");
        const panelUI = new PanelUI(doc, this.defaultTargetLanguage);
        pnContent.appendChild(panelUI.box);
        pn.appendChild(pnContent);
        pn.setAttribute("id", `${this.kNotificationID}-notification`);
        pn.setAttribute("hidden", "true");
        parentElt.appendChild(pn);
        win.PNPanelUI = panelUI;

        // Start listening across all tabs!
        win.addEventListener("TabSelect", this);
        win.messageManager.addMessageListener("Translation:DocumentState", this);
      },
      (win) => {
        // If the window is being destroyed and gBrowser no longer exists,
        // don't bother doing anything.
        if (!win.gBrowser) {
          return;
        }

        let DOMWindowUtils = win.windowUtils;
        if (!DOMWindowUtils) {
          // win.windowUtils was added in 63, fallback if it's not available.
          DOMWindowUtils = win.QueryInterface(Ci.nsIInterfaceRequestor)
            .getInterface(Ci.nsIDOMWindowUtils);
        }
        DOMWindowUtils.removeSheetUsingURIString(
          gExtension.getURL("privileged/firefoxhooks/styles.css"),
          DOMWindowUtils.AUTHOR_SHEET);

        win.PNUtils.notifications.forEach(n => {
          n.remove();
        });
        delete win.PNUtils;

        const doc = win.document;
        doc.getElementById(`${this.kNotificationAnchorID}`).remove();
        doc.getElementById(`${this.kNotificationID}-notification`).remove();
        delete win.PNPanelUI;

        win.removeEventListener("TabSelect", this);
        win.gBrowser.removeTabsProgressListener(this);
      },
    );

    this.observerAdded = true;
  },

  stopObserving() {
    if (!this.observerAdded) {
      return;
    }

    EveryWindow.unregisterCallback(this.kNotificationID);

    this.observerAdded = false;
  },

  handleEvent(event) {
    if (event.type != "TabSelect" ||
        event.target.linkedBrowser[`${this.kNotificationAnchorID}popupnotificationanchor`]) {
      return;
    }

    event.target.ownerDocument.getElementById(`${this.kNotificationAnchorID}`).removeAttribute("showing");
  },

  receiveMessage(aMessage) {
    this.popupIfNeeded(aMessage.target, aMessage.data.detectedLanguage);
  },

  get defaultTargetLanguage() {
    if (this._defaultTargetLanguage) {
      return this._defaultTargetLanguage;
    }

    return this._defaultTargetLanguage =
      Services.locale.getAppLocaleAsLangTag().split("-")[0];
  },

  popupIfNeeded(browser, language) {
    if (!this.enabled || language == this.defaultTargetLanguage) {
      return;
    }

    const doc = browser.ownerDocument;
    const win = doc.defaultView;
    const panelUI = doc.defaultView.PNPanelUI;

    const populatePanel = (event) => {
      switch (event) {
        case "showing":
          break;
        case "shown":
          panelUI.refresh(language, this.defaultTargetLanguage);
          break;
        case "removed":
          //delete browser[`${this.kNotificationAnchorID}popupnotificationanchor`];
          if (win.gBrowser.selectedBrowser == browser) {
            doc.getElementById(this.kNotificationAnchorID).removeAttribute("showing");
          }
          win.PNUtils.notifications.delete(
            win.PopupNotifications.getNotification(this.kNotificationID, browser));
          break;
      }
    };

    // An annoying line of code that is necessary to get
    // PopupNotifications to detect our anchor element correctly
    //browser[`${this.kNotificationAnchorID}popupnotificationanchor`] =
    //  doc.getElementById(this.kNotificationAnchorID);

    const n = win.PopupNotifications.show(
      browser, this.kNotificationID, "",
      this.kNotificationAnchorID,
      panelUI.primaryAction, panelUI.secondaryActions, {
        persistent: true,
        hideClose: true,
        eventCallback: populatePanel,
        popupIconURL: "chrome://browser/skin/info.svg",
      }
    );

    win.PNUtils.notifications.add(n);
  },
};
