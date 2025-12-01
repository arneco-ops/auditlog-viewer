namespace auditlog.viewer;

using { cuid, managed } from '@sap/cds/common';

/**
 * Entity to store Audit Log Service credentials (in-memory only)
 */
@cds.persistence.skip
entity Credentials : cuid, managed {
  name          : String(100) @title: 'Configuration Name';
  url           : String(500) @title: 'Audit Log Service URL';
  clientId      : String(200) @title: 'OAuth Client ID';
  clientSecret  : String(500) @title: 'OAuth Client Secret';
  authUrl       : String(500) @title: 'OAuth Token URL';
  isActive      : Boolean default false @title: 'Active';
}

/**
 * View entity for Audit Logs (not persisted, fetched from API)
 */
@cds.persistence.skip
entity AuditLogs {
  key id        : String;
  time          : DateTime @title: 'Timestamp';
  user          : String @title: 'User';
  tenant        : String @title: 'Tenant';
  category      : String @title: 'Category';
  object        : String @title: 'Object';
  action        : String @title: 'Action';
  status        : String @title: 'Status';
  message       : String @title: 'Message';
  attributes    : String @title: 'Additional Attributes';
}
