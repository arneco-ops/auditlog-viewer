sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/ui/core/Fragment",
  "sap/ui/export/Spreadsheet"
], function(Controller, JSONModel, MessageBox, MessageToast, Fragment, Spreadsheet) {
  "use strict";

  return Controller.extend("auditviewer.controller.Main", {
    
    onInit: function() {
      this._oModel = this.getOwnerComponent().getModel();
      this._oViewModel = this.getOwnerComponent().getModel("view");
      
      // Load credentials
      this._loadCredentials();
    },

    _loadCredentials: function() {
      var oBinding = this._oModel.bindList("/Credentials");
      oBinding.requestContexts().then(function(aContexts) {
        if (aContexts.length > 0) {
          // Auto-select the first active credential
          var oActiveContext = aContexts.find(function(oContext) {
            return oContext.getProperty("isActive");
          });
          if (oActiveContext) {
            this._oViewModel.setProperty("/selectedCredential", oActiveContext.getProperty("ID"));
          }
        }
      }.bind(this));
    },

    onRefreshCredentials: function() {
      this._oModel.refresh();
      MessageToast.show("Credentials refreshed");
    },

    onCredentialSelect: function(oEvent) {
      var oSelectedItem = oEvent.getParameter("listItem");
      if (oSelectedItem) {
        var oContext = oSelectedItem.getBindingContext();
        var sId = oContext.getProperty("ID");
        this._oViewModel.setProperty("/selectedCredential", sId);
      }
    },

    onAddCredentials: function() {
      var oView = this.getView();
      
      if (!this._oCredentialDialog) {
        Fragment.load({
          id: oView.getId(),
          name: "auditviewer.view.CredentialDialog",
          controller: this
        }).then(function(oDialog) {
          this._oCredentialDialog = oDialog;
          oView.addDependent(oDialog);
          
          // Create dialog model
          var oDialogModel = new JSONModel({
            name: "",
            url: "",
            clientId: "",
            clientSecret: "",
            authUrl: "",
            isActive: false,
            editMode: false,
            credentialId: null
          });
          oDialog.setModel(oDialogModel, "dialog");
          oDialog.open();
        }.bind(this));
      } else {
        // Reset dialog model
        var oDialogModel = this._oCredentialDialog.getModel("dialog");
        oDialogModel.setData({
          name: "",
          url: "",
          clientId: "",
          clientSecret: "",
          authUrl: "",
          isActive: false,
          editMode: false,
          credentialId: null
        });
        this._oCredentialDialog.open();
      }
    },

    onEditCredentials: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext();
      var oData = oContext.getObject();
      
      var oView = this.getView();
      
      if (!this._oCredentialDialog) {
        Fragment.load({
          id: oView.getId(),
          name: "auditviewer.view.CredentialDialog",
          controller: this
        }).then(function(oDialog) {
          this._oCredentialDialog = oDialog;
          oView.addDependent(oDialog);
          
          var oDialogModel = new JSONModel({
            name: oData.name,
            url: oData.url,
            clientId: oData.clientId,
            clientSecret: oData.clientSecret,
            authUrl: oData.authUrl,
            isActive: oData.isActive,
            editMode: true,
            credentialId: oData.ID
          });
          oDialog.setModel(oDialogModel, "dialog");
          oDialog.open();
        }.bind(this));
      } else {
        var oDialogModel = this._oCredentialDialog.getModel("dialog");
        oDialogModel.setData({
          name: oData.name,
          url: oData.url,
          clientId: oData.clientId,
          clientSecret: oData.clientSecret,
          authUrl: oData.authUrl,
          isActive: oData.isActive,
          editMode: true,
          credentialId: oData.ID
        });
        this._oCredentialDialog.open();
      }
    },

    onSaveCredential: function() {
      var oDialogModel = this._oCredentialDialog.getModel("dialog");
      var oData = oDialogModel.getData();
      
      if (!oData.name || !oData.url || !oData.clientId || !oData.clientSecret || !oData.authUrl) {
        MessageBox.error("Please fill in all required fields");
        return;
      }
      
      if (oData.editMode) {
        // Update existing credential
        var oContext = this._oModel.bindContext("/Credentials(" + oData.credentialId + ")");
        oContext.requestObject().then(function() {
          oContext.setProperty("name", oData.name);
          oContext.setProperty("url", oData.url);
          oContext.setProperty("clientId", oData.clientId);
          oContext.setProperty("clientSecret", oData.clientSecret);
          oContext.setProperty("authUrl", oData.authUrl);
          oContext.setProperty("isActive", oData.isActive);
          
          this._oModel.submitBatch("updateGroup").then(function() {
            MessageToast.show("Credential updated successfully");
            this._oCredentialDialog.close();
            this._oModel.refresh();
          }.bind(this));
        }.bind(this));
      } else {
        // Create new credential
        var oListBinding = this._oModel.bindList("/Credentials");
        oListBinding.create({
          name: oData.name,
          url: oData.url,
          clientId: oData.clientId,
          clientSecret: oData.clientSecret,
          authUrl: oData.authUrl,
          isActive: oData.isActive
        });
        
        this._oModel.submitBatch("createGroup").then(function() {
          MessageToast.show("Credential created successfully");
          this._oCredentialDialog.close();
          this._oModel.refresh();
        }.bind(this));
      }
    },

    onCancelCredential: function() {
      this._oCredentialDialog.close();
    },

    onDeleteCredentials: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext();
      var sName = oContext.getProperty("name");
      
      MessageBox.confirm("Are you sure you want to delete credential '" + sName + "'?", {
        onClose: function(sAction) {
          if (sAction === MessageBox.Action.OK) {
            oContext.delete().then(function() {
              MessageToast.show("Credential deleted successfully");
              this._oModel.refresh();
            }.bind(this));
          }
        }.bind(this)
      });
    },

    onTestCredentials: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext();
      var sCredentialId = oContext.getProperty("ID");
      
      this._oViewModel.setProperty("/busy", true);
      
      var oFunction = this._oModel.bindContext("/testCredentials(...)");
      oFunction.setParameter("credentialId", sCredentialId);
      
      oFunction.execute().then(function() {
        var oResult = oFunction.getBoundContext().getObject();
        this._oViewModel.setProperty("/busy", false);
        
        if (oResult.success) {
          MessageBox.success(oResult.message);
        } else {
          MessageBox.error(oResult.message);
        }
      }.bind(this)).catch(function(oError) {
        this._oViewModel.setProperty("/busy", false);
        MessageBox.error("Connection test failed: " + oError.message);
      }.bind(this));
    },

    onFetchAuditLogs: function() {
      var sCredentialId = this._oViewModel.getProperty("/selectedCredential");
      
      if (!sCredentialId) {
        MessageBox.error("Please select a credential");
        return;
      }
      
      var oFromDate = this.byId("fromDate").getDateValue();
      var oToDate = this.byId("toDate").getDateValue();
      var iMaxResults = this.byId("maxResults").getValue();
      
      this._oViewModel.setProperty("/busy", true);
      
      var oAction = this._oModel.bindContext("/fetchAuditLogs(...)");
      oAction.setParameter("credentialId", sCredentialId);
      oAction.setParameter("fromDate", oFromDate ? oFromDate.toISOString() : null);
      oAction.setParameter("toDate", oToDate ? oToDate.toISOString() : null);
      oAction.setParameter("maxResults", iMaxResults);
      
      oAction.execute().then(function() {
        var aLogs = oAction.getBoundContext().getObject().value;
        this._oViewModel.setProperty("/auditLogs", aLogs);
        this._oViewModel.setProperty("/busy", false);
        MessageToast.show("Fetched " + aLogs.length + " audit log records");
      }.bind(this)).catch(function(oError) {
        this._oViewModel.setProperty("/busy", false);
        MessageBox.error("Failed to fetch audit logs: " + (oError.message || "Unknown error"));
      }.bind(this));
    },

    onClearResults: function() {
      this._oViewModel.setProperty("/auditLogs", []);
      MessageToast.show("Results cleared");
    },

    onExportToExcel: function() {
      var aLogs = this._oViewModel.getProperty("/auditLogs");
      
      if (!aLogs || aLogs.length === 0) {
        MessageBox.warning("No data to export");
        return;
      }
      
      var aCols = [
        { label: "Timestamp", property: "time" },
        { label: "User", property: "user" },
        { label: "Tenant", property: "tenant" },
        { label: "Category", property: "category" },
        { label: "Object", property: "object" },
        { label: "Action", property: "action" },
        { label: "Status", property: "status" },
        { label: "Message", property: "message" }
      ];
      
      var oSettings = {
        workbook: {
          columns: aCols
        },
        dataSource: aLogs,
        fileName: "AuditLogs_" + new Date().toISOString().split('T')[0] + ".xlsx"
      };
      
      var oSpreadsheet = new Spreadsheet(oSettings);
      oSpreadsheet.build().finally(function() {
        oSpreadsheet.destroy();
      });
    }
  });
});
