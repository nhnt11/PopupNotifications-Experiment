/* globals XUL_NS */

function PanelUI(doc) {
  this.doc = doc;

  const box = doc.createElementNS(XUL_NS, "vbox");

  const headerElt = doc.createElementNS(XUL_NS, "description");
  headerElt.textContent = this.getString("pnexperiment.popupHeader");
  headerElt.classList.add("headerText");
  box.appendChild(headerElt);

  function makeLanguageList(aId, aLangList, aLabelText, aSelectLang) {
    const menulist = doc.createElementNS(XUL_NS, "menulist");
    menulist.setAttribute("id", `pnexperiment-${aId}-menulist`);
    const menupopup = doc.createElementNS(XUL_NS, "menupopup");
    menupopup.setAttribute("id", `pnexperiment-${aId}-menupopup`);
    menulist.appendChild(menupopup);

    for (const lang of aLangList) {
      const menuitem = doc.createElementNS(XUL_NS, "menuitem");
      menuitem.setAttribute("value", lang);
      menuitem.setAttribute("label", Services.intl.getLanguageDisplayNames(undefined, [lang])[0]);
      menupopup.appendChild(menuitem);
    }

    const menulistLabel = doc.createElementNS(XUL_NS, "label");
    menulistLabel.setAttribute("value", aLabelText);
    menulistLabel.setAttribute("control", menulist.id);
    box.appendChild(menulistLabel);
    box.appendChild(menulist);

    return menulist;
  }

  makeLanguageList("sourceLang", this.kSupportedSourceLanguages,
    this.getString("pnexperiment.popupText.detectedLanguage"));

  makeLanguageList("targetLang", this.kSupportedTargetLanguages,
    this.getString("pnexperiment.popupText.targetLanguage"));

  this.box = box;
}

PanelUI.prototype = {
  kSupportedSourceLanguages: ["bg", "cs", "de", "en", "es", "fr", "ja", "ko", "nl", "no", "pl", "pt", "ru", "tr", "vi", "zh"],
  kSupportedTargetLanguages: ["bg", "cs", "de", "en", "es", "fr", "ja", "ko", "nl", "no", "pl", "pt", "ru", "tr", "vi", "zh"],

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

  refresh(aSourceLang, aTargetLang) {
    this.doc.getElementById("pnexperiment-sourceLang-menulist")
      .selectedIndex = this.kSupportedSourceLanguages.indexOf(aSourceLang);
    this.doc.getElementById("pnexperiment-targetLang-menulist")
      .selectedIndex = this.kSupportedTargetLanguages.indexOf(aTargetLang);
  },
};
