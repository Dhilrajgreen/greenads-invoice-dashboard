import { ZohoInvoice } from '@/types/invoice';

interface ZohoTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Gets a new access token from Zoho using the refresh token
 */
export async function getZohoAccessToken(): Promise<string> {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Zoho credentials');
  }

  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
  });

  const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get Zoho access token: ${response.status} ${errorText}`);
  }

  const data: ZohoTokenResponse = await response.json();
  
  if (!data.access_token) {
    throw new Error(`Invalid token response: ${JSON.stringify(data)}`);
  }
  
  return data.access_token;
}

/**
 * Fetches ALL unpaid invoices from Zoho with pagination support
 * Fetches all unpaid invoices regardless of date
 */
export async function fetchZohoInvoices(
  accessToken: string,
  onProgress?: (message: string, progress?: number) => void
): Promise<ZohoInvoice[]> {
  const orgId = process.env.ZOHO_ORG_ID;
  if (!orgId) {
    throw new Error('Missing ZOHO_ORG_ID');
  }

  const allInvoices: ZohoInvoice[] = [];
  let currentPage = 1;
  const perPage = 200;
  let hasMorePages = true;
  let consecutiveEmptyPages = 0;

  onProgress?.('Starting to fetch invoices from Zoho...', 0);

  while (hasMorePages) {
    onProgress?.(`Fetching page ${currentPage}...`, (currentPage - 1) * 10);
    const url = new URL('https://www.zohoapis.com/books/v3/invoices');
    url.searchParams.set('organization_id', orgId);
    url.searchParams.set('status', 'unpaid');
    url.searchParams.set('per_page', perPage.toString());
    url.searchParams.set('page', currentPage.toString());
    // Removed date_start to fetch ALL unpaid invoices
    url.searchParams.set('sort_column', 'date');
    url.searchParams.set('sort_order', 'D');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to fetch Zoho invoices: ${response.status} ${errorText}`;
      
      // If 401, provide more specific guidance
      if (response.status === 401) {
        errorMessage += '\n\nPossible causes:\n';
        errorMessage += '1. Access token expired or invalid\n';
        errorMessage += '2. Refresh token may need to be regenerated\n';
        errorMessage += '3. Organization ID may be incorrect\n';
        errorMessage += '4. API scopes may not include Books API access';
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    if (data.code !== 0) {
      throw new Error(`Zoho API error (code ${data.code}): ${data.message || 'Unknown error'}`);
    }

    const invoices = data.invoices || [];
    
    // Process invoices
    const processedInvoices: ZohoInvoice[] = invoices
      .filter((inv: any) => {
        // Only unpaid invoices where balance equals total (fully unpaid)
        const balance = parseFloat(inv.balance || 0);
        const total = parseFloat(inv.total || 0);
        return balance > 0 && Math.abs(balance - total) < 0.01; // Allow small floating point differences
      })
      .map((inv: any) => {
        // Extract customer contact info - check multiple possible locations
        const customer = inv.customer || {};
        const contactPersons = inv.contact_persons || [];
        const primaryContact = contactPersons[0] || {};
        const billingAddress = inv.billing_address || {};

        // Customer email: check invoice level, customer object, contact persons, billing address
        const customerEmail = 
          inv.email || 
          customer.email || 
          primaryContact.email || 
          billingAddress.email || 
          null;

        // Customer phone: check invoice level, customer object, contact persons, billing address
        const customerPhone = 
          inv.phone || 
          customer.phone || 
          primaryContact.phone || 
          billingAddress.phone || 
          null;

        // Customer name: check invoice level first, then customer object, then company_name
        const customerName = 
          inv.customer_name ||           // Direct on invoice (most common)
          customer.customer_name ||      // In customer object
          customer.name ||               // Alternative customer name field
          inv.company_name ||            // Company name fallback
          billingAddress.attention ||    // Billing address attention field
          '';

        // Extract salesperson
        const salesperson = inv.salesperson || {};

        return {
          invoice_id: inv.invoice_id?.toString() || '',
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          salesperson_name: salesperson.name || salesperson.salesperson_name || null,
          status: inv.status || 'Sent',
          invoice_number: inv.invoice_number || '',
          invoice_date: inv.date || inv.invoice_date || '',
          total: parseFloat(inv.total || 0),
          balance: parseFloat(inv.balance || 0),
        };
      });

    allInvoices.push(...processedInvoices);

    // Check if there are more pages
    const pageContext = data.page_context || {};
    const hasMorePage = pageContext.has_more_page === true;
    
    onProgress?.(`Page ${currentPage}: Fetched ${invoices.length} invoices (Total: ${allInvoices.length})`, Math.min((currentPage / 50) * 50, 50));
    
    console.log(`Page ${currentPage}: Fetched ${invoices.length} invoices (${processedInvoices.length} after filtering), has_more_page: ${hasMorePage}, total so far: ${allInvoices.length}`);

    // If we got 0 invoices, increment empty page counter
    if (invoices.length === 0) {
      consecutiveEmptyPages++;
      if (consecutiveEmptyPages >= 2) {
        console.log('Got 2 consecutive empty pages. Stopping pagination.');
        hasMorePages = false;
      } else {
        currentPage++;
      }
    } else {
      consecutiveEmptyPages = 0; // Reset counter if we got invoices
      
      // Continue pagination if:
      // 1. has_more_page is explicitly true, OR
      // 2. We got a full page of results (200 invoices), which likely means there are more
      if (hasMorePage) {
        currentPage++;
      } else if (invoices.length === perPage) {
        // Got full page but has_more_page is false - try next page to be sure
        currentPage++;
        console.log(`Got full page (${perPage}) but has_more_page=false, trying page ${currentPage} to verify`);
      } else {
        // Got partial page and has_more_page is false - we're done
        hasMorePages = false;
        console.log(`Got partial page (${invoices.length} < ${perPage}) and has_more_page=false. Pagination complete.`);
      }
    }

    // Safety check to prevent infinite loops (increased limit for large datasets)
    if (currentPage > 500) {
      console.warn(`Reached maximum page limit (500 = ${500 * perPage} invoices). Stopping pagination.`);
      hasMorePages = false;
    }
  }

  onProgress?.(`Completed fetching ${allInvoices.length} invoices from Zoho`, 50);
  return allInvoices;
}

