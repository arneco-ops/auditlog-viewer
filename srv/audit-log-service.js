const cds = require('@sap/cds');
const axios = require('axios');

module.exports = async function() {
  const { Credentials, AuditLogs } = this.entities;

  /**
   * Get OAuth2 access token
   */
  async function getAccessToken(credential) {
    try {
      const tokenResponse = await axios.post(
        credential.authUrl,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: credential.clientId,
          client_secret: credential.clientSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      return tokenResponse.data.access_token;
    } catch (error) {
      console.error('Error getting access token:', error.message);
      throw new Error(`OAuth2 authentication failed: ${error.message}`);
    }
  }

  /**
   * Function to test credentials
   */
  this.on('testCredentials', async (req) => {
    const { credentialId } = req.data;
    
    try {
      // Get credential from database
      const credential = await SELECT.one.from(Credentials).where({ ID: credentialId });
      
      if (!credential) {
        return {
          success: false,
          message: 'Credential configuration not found'
        };
      }

      // Try to get access token
      const accessToken = await getAccessToken(credential);
      
      // Test API call with a simple request
      const testResponse = await axios.get(
        `${credential.url}/auditlog/v2/auditlogrecords`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          params: {
            time_from: new Date(Date.now() - 3600000).toISOString(), // Last hour
            time_to: new Date().toISOString(),
            $top: 1
          }
        }
      );

      return {
        success: true,
        message: `Successfully connected. API returned status ${testResponse.status}`
      };
    } catch (error) {
      console.error('Test credentials error:', error.message);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Connection test failed'
      };
    }
  });

  /**
   * Action to fetch audit logs
   */
  this.on('fetchAuditLogs', async (req) => {
    const { credentialId, fromDate, toDate, maxResults } = req.data;
    
    try {
      // Get credential from database
      const credential = await SELECT.one.from(Credentials).where({ ID: credentialId });
      
      if (!credential) {
        req.error(404, 'Credential configuration not found');
        return;
      }

      // Get access token
      const accessToken = await getAccessToken(credential);
      
      // Fetch audit logs from API
      const response = await axios.get(
        `${credential.url}/auditlog/v2/auditlogrecords`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          params: {
            time_from: fromDate || new Date(Date.now() - 86400000).toISOString(), // Default: last 24 hours
            time_to: toDate || new Date().toISOString(),
            $top: maxResults || 100
          }
        }
      );

      // Transform API response to match our entity structure
      const auditLogs = response.data.value?.map((log, index) => ({
        id: log.uuid || `${Date.now()}-${index}`,
        time: log.time,
        user: log.user,
        tenant: log.tenant,
        category: log.category,
        object: log.object?.type || '',
        action: log.attributes?.find(a => a.name === 'action')?.old || log.data_subject?.type || '',
        status: log.attributes?.find(a => a.name === 'status')?.old || 'unknown',
        message: log.message || '',
        attributes: JSON.stringify(log.attributes || [])
      })) || [];

      return auditLogs;
    } catch (error) {
      console.error('Error fetching audit logs:', error.message);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch audit logs';
      req.error(500, errorMessage);
    }
  });

  /**
   * Before creating/updating credentials, validate required fields
   */
  this.before(['CREATE', 'UPDATE'], 'Credentials', (req) => {
    const { url, clientId, clientSecret, authUrl } = req.data;
    
    if (!url || !clientId || !clientSecret || !authUrl) {
      req.error(400, 'All credential fields are required: URL, Client ID, Client Secret, and Auth URL');
    }
  });

  /**
   * After creating credentials, set as active if it's the first one
   */
  this.after('CREATE', 'Credentials', async (data, req) => {
    const count = await SELECT.from(Credentials).where({ isActive: true });
    if (count.length === 0) {
      await UPDATE(Credentials).set({ isActive: true }).where({ ID: data.ID });
    }
  });
}
