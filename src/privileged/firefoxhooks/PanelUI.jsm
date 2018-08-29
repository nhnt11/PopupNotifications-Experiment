/* globals XUL_NS */

function PanelUI(doc) {
  this.doc = doc;

  let box = doc.createElementNS(XUL_NS, "vbox");

  let elt;

  elt = doc.createElementNS(XUL_NS, "description");
  elt.textContent = this.getString("pnexperiment.popupHeader");
  elt.classList.add("headerText");
  box.appendChild(elt);

  elt = doc.createElementNS(XUL_NS, "description");
  elt.classList.add("popupText");
  box.appendChild(elt);

  this.box = box;
}

PanelUI.prototype = {
  get PNUtils() {
    // Set on every window by Experiment.jsm for PanelUI to use.
    // Because sharing is caring.
    return this.doc.defaultView.PNUtils;
  },

  getString(aKey) {
    return this.PNUtils.getString(aKey);
  },

  getFormattedString(aKey, args) {
    return this.PNUtils.getFormattedString(aKey, args);
  },

  get primaryAction() {
    if (this._primaryAction) {
      return this._primaryAction;
    }
    return this._primaryAction = {
      label: this.getString("pnexperiment.primaryButton.label"),
      accessKey: this.getString("pnexperiment.primaryButton.accessKey"),
      callback: () => {
      },
    };
  },

  get secondaryActions() {
    if (this._secondaryActions) {
      return this._secondaryActions;
    }
    return this._secondaryActions = [
      {
        label: this.getString("pnexperiment.dismissButton.label"),
        accessKey: this.getString("pnexperiment.dismissButton.accessKey"),
        callback: () => {
        },
      }, {
        label: this.getString("pnexperiment.permanentDismiss.label"),
        accessKey: this.getString("pnexperiment.permanentDismiss.accessKey"),
        callback: () => {
          this.PNUtils.disable();
        },
      },
    ];
  },

  refresh() {
    let elt = this.box.querySelector(".popupText");
    elt.textContent = this.getString("pnexperiment.popupText");
  },
};
