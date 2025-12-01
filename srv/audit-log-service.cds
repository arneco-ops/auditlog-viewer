using { auditlog.viewer as db } from '../db/schema';

@path: '/api/audit-log'
@requires: 'authenticated-user'
service AuditLogService {
  
  /**
   * Credentials management
   */
  entity Credentials as projection on db.Credentials;
  
  /**
   * Audit Logs (fetched from API)
   */
  @readonly
  entity AuditLogs as projection on db.AuditLogs;
  
  /**
   * Action to fetch audit logs from the configured API
   */
  action fetchAuditLogs(
    credentialId: String,
    fromDate: DateTime,
    toDate: DateTime,
    maxResults: Integer
  ) returns array of AuditLogs;
  
  /**
   * Function to test credentials
   */
  function testCredentials(credentialId: String) returns {
    success: Boolean;
    message: String;
  };
}
