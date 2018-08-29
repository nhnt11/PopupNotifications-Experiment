this.Experiment = {
  // This is here for documentation, will be redefined to a pref getter
  // using XPCOMUtils.defineLazyPreferenceGetter in init().
  enabled: null,
  kEnabledPref: "extensions.pnexperiment.enabled",

  kNotificationID: "pnexperiment",

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

  // nsIWebProgressListener implementation.
  onStateChange(aBrowser, aWebProgress, aRequest, aStateFlags, aStatus) {
    if (!aWebProgress.isTopLevel || aWebProgress.isLoadingDocument ||
        !Components.isSuccessCode(aStatus)) {
      return;
    }

    let host;
    try {
      host = Services.eTLD.getBaseDomain(aRequest.URI);
    } catch (e) {
      // If we can't get the host for the URL, it's not one we
      // care about for breach alerts anyway.
      return;
    }

    this.popupIfNeeded(aBrowser, host);
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
        DOMWindowUtils.loadSheetUsingURIString(gExtension.getURL("privileged/firefoxhooks/styles.css"),
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
        };

        // Setup the popup notification stuff. First, the URL bar icon:
        let doc = win.document;
        let box = doc.getElementById("page-action-buttons");
        // We create a box to use as the anchor, and put an icon image
        // inside it. This way, when we animate the icon, its scale change
        // does not cause the popup notification to bounce due to the anchor
        // point moving.
        let box2 = doc.createElementNS(XUL_NS, "box");
        box2.setAttribute("id", `${this.kNotificationID}-notification-anchor`);
        box2.classList.add("notification-anchor-icon");
        let img = doc.createElementNS(XUL_NS, "image");
        img.setAttribute("role", "button");
        img.classList.add(`${this.kNotificationID}-icon`);
        box2.appendChild(img);
        box.appendChild(box2);

        // Now, the popupnotificationcontent:
        let parentElt = doc.defaultView.PopupNotifications.panel.parentNode;
        let pn = doc.createElementNS(XUL_NS, "popupnotification");
        let pnContent = doc.createElementNS(XUL_NS, "popupnotificationcontent");
        let panelUI = new PanelUI(doc);
        pnContent.appendChild(panelUI.box);
        pn.appendChild(pnContent);
        pn.setAttribute("id", `${this.kNotificationID}-notification`);
        pn.setAttribute("hidden", "true");
        parentElt.appendChild(pn);
        win.PNPanelUI = panelUI;

        // Start listening across all tabs!
        win.gBrowser.addTabsProgressListener(this);
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
        DOMWindowUtils.removeSheetUsingURIString(gExtension.getURL("privileged/firefoxhooks/styles.css"),
                                                 DOMWindowUtils.AUTHOR_SHEET);

      win.PNUtils.notifications.forEach(n => {
          n.remove();
        });
        delete win.PNUtils;

        let doc = win.document;
        doc.getElementById(`${this.kNotificationID}-notification-anchor`).remove();
        doc.getElementById(`${this.kNotificationID}-notification`).remove();
        delete win.PNPanelUI;

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

  popupIfNeeded(browser, host) {
    if (!this.enabled) {
      return;
    }

    let doc = browser.ownerDocument;
    let win = doc.defaultView;
    let panelUI = doc.defaultView.PNPanelUI;

    let populatePanel = (event) => {
      switch (event) {
        case "showing":
          panelUI.refresh();
          break;
        case "shown":
          break;
        case "removed":
          win.PNUtils.notifications.delete(
            win.PopupNotifications.getNotification(this.kNotificationID, browser));
          break;
      }
    };

    browser[`${this.kNotificationID}-notification-anchorpopupnotificationanchor`] = doc.getElementById(`${this.kNotificationID}-notification-anchor`);

    let n = win.PopupNotifications.show(
      browser, this.kNotificationID, "",
      `${this.kNotificationID}-notification-anchor`,
      panelUI.primaryAction, panelUI.secondaryActions, {
        persistent: true,
        hideClose: true,
        eventCallback: populatePanel,
      }
    );

    win.PNUtils.notifications.add(n);
  },
};
