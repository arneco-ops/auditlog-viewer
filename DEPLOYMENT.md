# SAP BTP Deployment Guide - Audit Log Viewer

## Voraussetzungen

### Erforderliche Tools
- Node.js (v18 oder v20)
- Cloud Foundry CLI (`cf`)
- MTA Build Tool (`mbt`)

### Installation der Tools

```bash
# MTA Build Tool installieren
npm install -g mbt

# Cloud Foundry CLI installieren (macOS)
brew install cloudfoundry/tap/cf-cli
```

## Deployment-Prozess

### 1. Vorbereitung

```bash
# In das Projektverzeichnis wechseln
cd /Users/Arson/Projects/audit-log-viewer

# Dependencies installieren
npm install
cd app/audit-viewer && npm install && cd ../..
```

### 2. MTA Build

```bash
# MTA Build ausführen
npm run build:mta

# Alternative: Direkter Befehl
mbt build
```

Dies erstellt die `.mtar` Datei in `mta_archives/auditlog-viewer_1.0.0.mtar`

### 3. Cloud Foundry Login

```bash
# Bei SAP BTP anmelden
cf login -a <API-Endpoint>

# Beispiel für EU10:
# cf login -a https://api.cf.eu10.hana.ondemand.com

# Organisation und Space auswählen
cf target -o <your-org> -s <your-space>

# Status prüfen
cf target
```

### 4. Deployment

```bash
# Deployment ausführen
npm run deploy

# Alternative: Direkter Befehl
cf deploy mta_archives/auditlog-viewer_1.0.0.mtar
```

### 5. Nach dem Deployment

#### Services überprüfen
```bash
# Alle Services anzeigen
cf services

# Erwartete Services:
# - auditlog-viewer-db (hana, hdi-shared)
# - auditlog-viewer-auth (xsuaa, application)
# - auditlog-viewer-destination (destination, lite)
```

#### Apps überprüfen
```bash
# Alle Apps anzeigen
cf apps

# Erwartete Apps:
# - auditlog-viewer-srv (Server)
# - auditlog-viewer-app (App Router)
# - auditlog-viewer-db-deployer (DB Deployer, stopped)
```

#### App-URL abrufen
```bash
# URL der App anzeigen
cf app auditlog-viewer-app
```

## Konfiguration nach dem Deployment

### 1. Role Collections zuweisen

1. BTP Cockpit öffnen
2. Zu Security → Role Collections navigieren
3. Role Collections zuweisen:
   - `AuditLogViewer_Admin` - Für Administratoren
   - `AuditLogViewer_Viewer` - Für Viewer

4. Benutzern zuweisen:
   - Role Collection auswählen
   - "Edit" klicken
   - Benutzer hinzufügen

### 2. Audit Log Service Credentials konfigurieren

Nach dem ersten Login in die App:

1. Credentials-Dialog öffnen
2. Audit Log Service Informationen eintragen:
   - **Name**: Beschreibender Name
   - **URL**: Audit Log Service URL
   - **Client ID**: OAuth Client ID
   - **Client Secret**: OAuth Client Secret
   - **Auth URL**: OAuth Token URL
3. "Test Connection" klicken
4. Bei Erfolg als aktiv markieren

## Troubleshooting

### Build-Fehler

```bash
# Cache löschen und neu bauen
rm -rf node_modules package-lock.json
rm -rf app/audit-viewer/node_modules
npm install
cd app/audit-viewer && npm install && cd ../..
npm run build:mta
```

### Deployment-Fehler

```bash
# Logs anzeigen
cf logs auditlog-viewer-srv --recent
cf logs auditlog-viewer-app --recent

# App-Status prüfen
cf app auditlog-viewer-srv
cf app auditlog-viewer-app

# Services-Status prüfen
cf service auditlog-viewer-db
cf service auditlog-viewer-auth
```

### Re-Deployment

```bash
# Für komplettes Neudeployment (inklusive Service-Instanzen)
cf undeploy auditlog-viewer --delete-services

# Anschließend neu deployen
npm run deploy
```

### Health Check Issues

```bash
# Server-Health prüfen
cf app auditlog-viewer-srv

# Events prüfen
cf events auditlog-viewer-srv

# Falls Health Check fehlschlägt, Logs prüfen
cf logs auditlog-viewer-srv --recent
```

## Deployment-Konfiguration

### Module

1. **auditlog-viewer-srv** (Node.js Server)
   - CAP Service Backend
   - Memory: 256M
   - Health Check: HTTP auf /
   - Bindet: HANA DB, XSUAA, Destination

2. **auditlog-viewer-db-deployer** (HANA Deployer)
   - Deployed DB Artifacts
   - Memory: 256M
   - Stoppt nach erfolgreichem Deployment

3. **auditlog-viewer-app** (App Router)
   - UI5 Frontend
   - Memory: 256M
   - Bindet: XSUAA, Destination, Backend-API

### Services

1. **auditlog-viewer-db** (HANA HDI Container)
   - Plan: hdi-shared
   - Persistiert Credentials

2. **auditlog-viewer-auth** (XSUAA)
   - Plan: application
   - Authentifizierung und Autorisierung

3. **auditlog-viewer-destination** (Destination Service)
   - Plan: lite
   - Für externe API-Verbindungen

## Update-Deployment

Bei Code-Änderungen:

```bash
# 1. Build
npm run build:mta

# 2. Deploy (überschreibt nur Code, behält Services)
npm run deploy
```

## Monitoring

```bash
# Echtzeit-Logs verfolgen
cf logs auditlog-viewer-srv

# App-Metriken anzeigen (im BTP Cockpit)
# → Applications → auditlog-viewer-srv → Metrics
```

## Umgebungsvariablen

Umgebungsvariablen können über das BTP Cockpit gesetzt werden:
1. Application → auditlog-viewer-srv
2. User-Provided Variables
3. Variable hinzufügen und App neu starten

```bash
# Oder via CLI
cf set-env auditlog-viewer-srv MY_VAR "value"
cf restage auditlog-viewer-srv
