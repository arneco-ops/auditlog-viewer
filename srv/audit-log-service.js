const cds = require('@sap/cds');
const axios = require('axios');

// In-memory storage for credentials
const credentialsStore = new Map();

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
   * READ handler for Credentials (from memory)
   */
  this.on('READ', 'Credentials', async (req) => {
    return Array.from(credentialsStore.values());
  });

  /**
   * CREATE handler for Credentials (to memory)
   */
  this.on('CREATE', 'Credentials', async (req) => {
    const { name, url, clientId, clientSecret, authUrl, isActive } = req.data;
    
    // Validate required fields
    if (!url || !clientId || !clientSecret || !authUrl) {
      req.error(400, 'All credential fields are required: URL, Client ID, Client Secret, and Auth URL');
      return;
    }
    
    const id = `credential-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const credential = {
      ID: id,
      name: name || 'Default Configuration',
      url,
      clientId,
      clientSecret,
      authUrl,
      isActive: credentialsStore.size === 0 ? true : (isActive || false),
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    };
    
    credentialsStore.set(id, credential);
    return credential;
  });

  /**
   * UPDATE handler for Credentials (in memory)
   */
  this.on('UPDATE', 'Credentials', async (req) => {
    const id = req.data.ID;
    const existing = credentialsStore.get(id);
    
    if (!existing) {
      req.error(404, 'Credential configuration not found');
      return;
    }
    
    const updated = {
      ...existing,
      ...req.data,
      ID: id, // Keep original ID
      modifiedAt: new Date().toISOString()
    };
    
    credentialsStore.set(id, updated);
    return updated;
  });

  /**
   * DELETE handler for Credentials (from memory)
   */
  this.on('DELETE', 'Credentials', async (req) => {
    const id = req.params[0];
    if (credentialsStore.has(id)) {
      credentialsStore.delete(id);
    }
  });

  /**
   * Function to test credentials
   */
  this.on('testCredentials', async (req) => {
    const { credentialId } = req.data;
    
    try {
      // Get credential from memory
      const credential = credentialsStore.get(credentialId);
      
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
      // Get credential from memory
      const credential = credentialsStore.get(credentialId);
      
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

}
