sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function(UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("auditviewer.Component", {
    metadata: {
      manifest: "json"
    },

    init: function() {
      // Call the init function of the parent
      UIComponent.prototype.init.apply(this, arguments);

      // Create a view model for UI state
      var oViewModel = new JSONModel({
        busy: false,
        selectedCredential: null,
        auditLogs: [],
        fromDate: new Date(Date.now() - 86400000), // 24 hours ago
        toDate: new Date(),
        maxResults: 100
      });
      this.setModel(oViewModel, "view");

      // Initialize the router
      this.getRouter().initialize();
    }
  });
});
