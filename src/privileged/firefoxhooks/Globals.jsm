/*
 * This file is loaded first into the shared scope.
 * Everything is designed to be imported into the same
 * scope, so imports can clash and consts (like namespaces)
 * can't be redeclared, so stick it all in this file.
 *
 * This allows working around ChromeUtils.import not working
 * for packgaged (zip) files.
 */

/* globals Services, XPCOMUtils, gExtension, FirefoxHooks */
/* eslint-disable no-unused-vars */

const GLOBAL = this;

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

Cu.importGlobalProperties(["fetch", "FileReader"]);

ChromeUtils.defineModuleGetter(this, "AddonManager",
  "resource://gre/modules/AddonManager.jsm");
ChromeUtils.defineModuleGetter(this, "AppConstants",
  "resource://gre/modules/AppConstants.jsm");

Services.scriptloader.loadSubScript(
  gExtension.getURL("privileged/firefoxhooks/EveryWindow.jsm"), GLOBAL);
Services.scriptloader.loadSubScript(
  gExtension.getURL("privileged/firefoxhooks/PanelUI.jsm"), GLOBAL);
Services.scriptloader.loadSubScript(
  gExtension.getURL("privileged/firefoxhooks/FirefoxHooks.jsm"), GLOBAL);
Services.scriptloader.loadSubScript(
  gExtension.getURL("privileged/firefoxhooks/Experiment.jsm"), GLOBAL);

FirefoxHooks.init();
