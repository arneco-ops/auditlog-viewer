# Audit Log Viewer

A CAP-based application for viewing and managing SAP BTP Audit Logs with a UI5 frontend.

## Features

- **Credentials Management**: Store and manage multiple audit log service credentials
- **Secure Storage**: Credentials are stored securely in a local database
- **OAuth2 Authentication**: Automatic OAuth2 token retrieval and management
- **Audit Log Retrieval**: Fetch audit logs from SAP BTP Audit Log Service
- **Filtering**: Filter logs by date range and maximum results
- **Export**: Export audit logs to Excel
- **Test Connection**: Test credentials before using them

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- SAP BTP Audit Log Service credentials

## Installation

1. Navigate to the project directory:
```bash
cd audit-log-viewer
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

Start the application in development mode:

```bash
npm run watch-audit-viewer
```

This will:
- Start the CAP backend server on port 4004
- Automatically open the UI5 frontend in your default browser

Alternatively, you can run just the backend:

```bash
npm run watch
```

Then open your browser and navigate to:
- Backend: http://localhost:4004
- Frontend: http://localhost:4004/audit-viewer/webapp/index.html

## Configuration

### Getting SAP BTP Audit Log Service Credentials

1. In SAP BTP Cockpit, navigate to your subaccount
2. Go to Security → Audit Log Service
3. Create a service instance of the Audit Log Service
4. Create a service key for the instance
5. Copy the credentials from the service key:
   - `url`: The auditlog management URL
   - `uaa.clientid`: OAuth Client ID
   - `uaa.clientsecret`: OAuth Client Secret
   - `uaa.url`: OAuth token URL (add `/oauth/token` to the end)

### Adding Credentials in the Application

1. Open the application in your browser
2. Expand the "Credentials Management" panel
3. Click "Add Credentials"
4. Fill in the form with your credentials:
   - **Name**: A friendly name for this configuration (e.g., "Production Audit Log")
   - **URL**: The Audit Log Management URL
   - **Client ID**: The OAuth client ID
   - **Client Secret**: The OAuth client secret
   - **Auth URL**: The OAuth token URL (e.g., `https://<subdomain>.authentication.<region>.hana.ondemand.com/oauth/token`)
   - **Active**: Toggle to mark this as the active configuration
5. Click "Save"
6. Optionally, click the "Test Connection" button to verify the credentials

## Usage

### Fetching Audit Logs

1. Select a credential from the "Credentials Management" panel or use the dropdown in the "Fetch Audit Logs" section
2. Set the date range (defaults to last 24 hours)
3. Set the maximum number of results (defaults to 100)
4. Click "Fetch Audit Logs"
5. View the results in the table below

### Managing Credentials

- **Edit**: Click the edit icon to modify existing credentials
- **Delete**: Click the delete icon to remove credentials
- **Test**: Click the connection icon to test the credentials

### Exporting Data

Click the "Export" button above the audit logs table to download the current results as an Excel file.

## Project Structure

```
audit-log-viewer/
├── app/
│   └── audit-viewer/          # UI5 Frontend Application
│       ├── webapp/
│       │   ├── controller/    # UI5 Controllers
│       │   ├── view/          # UI5 Views and Fragments
│       │   ├── i18n/          # Internationalization
│       │   ├── Component.js   # UI5 Component
│       │   ├── index.html     # Entry Point
│       │   └── manifest.json  # App Descriptor
│       └── ui5.yaml           # UI5 Tooling Configuration
├── db/
│   └── schema.cds             # Data Model
├── srv/
│   ├── audit-log-service.cds  # Service Definition
│   └── audit-log-service.js   # Service Implementation
├── package.json               # Project Dependencies
└── README.md                  # This File
```

## API Endpoints

The CAP backend exposes the following endpoints:

- `GET /api/audit-log/Credentials` - List all credentials
- `POST /api/audit-log/Credentials` - Create new credentials
- `PATCH /api/audit-log/Credentials(ID)` - Update credentials
- `DELETE /api/audit-log/Credentials(ID)` - Delete credentials
- `POST /api/audit-log/testCredentials` - Test credentials
- `POST /api/audit-log/fetchAuditLogs` - Fetch audit logs

## Troubleshooting

### Connection Errors

If you encounter connection errors when testing credentials or fetching logs:
1. Verify that the URLs are correct and include the proper protocol (https://)
2. Check that the OAuth credentials are valid
3. Ensure your network allows outbound HTTPS connections
4. Verify that the Audit Log Service instance is active in SAP BTP

### Authentication Errors

If you get OAuth2 authentication errors:
1. Double-check the Client ID and Client Secret
2. Verify that the Auth URL is correct and ends with `/oauth/token`
3. Ensure the service key is still valid

## Security Notes

- Credentials are stored in a local SQLite database
- Client secrets are stored as plain text in the database (consider encrypting them for production use)
- The application is intended for development and testing purposes
- For production deployment, consider implementing proper secret management and encryption

## License

UNLICENSED - Private use only

## Support

For issues or questions, please refer to the SAP BTP Audit Log Service documentation.
