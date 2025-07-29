export default {
    async fetch(request, env, ctx) {
      if (request.method === 'OPTIONS') {
        return handleOptions(request);
      }
  
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders(request) });
      }
  
      try {
        const formData = await request.formData();
  
        // Honeypot field for bot protection
        if (formData.get('website')) {
          return new Response('Bot Detected', { status: 400, headers: corsHeaders(request) });
        }
  
        // Extract all form fields including new ones
        const name = formData.get('name') || 'Anonymous';
        const email = formData.get('email') || 'No Email Provided';
        const message = formData.get('message') || 'No Message Provided';
        const subject = formData.get('subject') || '';
        const formType = formData.get('formType') || 'contact';
        const formTitle = formData.get('formTitle') || '';
        
        // Phase 1: Extract enhanced data
        const enhancedData = {
          // Language detection
          siteLanguage: formData.get('siteLanguage') || 'unknown',
          browserLanguage: formData.get('browserLanguage') || 'unknown',
          
          // Timezone information
          timezone: formData.get('timezone') || 'unknown',
          timezoneOffset: formData.get('timezoneOffset') || 'unknown',
          
          // Device information
          deviceType: formData.get('deviceType') || 'unknown',
          screenSize: formData.get('screenSize') || 'unknown',
          viewportSize: formData.get('viewportSize') || 'unknown',
          
          // Page context
          referrer: formData.get('referrer') || 'direct',
          currentUrl: formData.get('currentUrl') || 'unknown',
          pageTitle: formData.get('pageTitle') || 'unknown',
          
          // Server-side location data from Cloudflare
          country: request.cf?.country || 'Unknown',
          city: request.cf?.city || 'Unknown',
          region: request.cf?.region || 'Unknown',
          userIP: request.headers.get('CF-Connecting-IP') || 'Unknown',
          asn: request.cf?.asn || 'Unknown',
          colo: request.cf?.colo || 'Unknown',
          
          // Phase 2: Form interaction analytics
          timeToComplete: formData.get('timeToComplete') || 'unknown',
          fieldFocusOrder: formData.get('fieldFocusOrder') || 'unknown',
          fieldsModified: formData.get('fieldsModified') || 'unknown',
          
          // Phase 2: Technical environment
          connectionType: formData.get('connectionType') || 'unknown',
          touchSupport: formData.get('touchSupport') || 'unknown',
          cookieEnabled: formData.get('cookieEnabled') || 'unknown',
          colorDepth: formData.get('colorDepth') || 'unknown',
          pixelRatio: formData.get('pixelRatio') || 'unknown',
          
          // Phase 2: Session context
          sessionDuration: formData.get('sessionDuration') || 'unknown',
          scrollDepth: formData.get('scrollDepth') || 'unknown'
        };
  
        // Create enhanced email content based on form type
        const emailContent = createEmailContent(formType, {
          name,
          email,
          message,
          subject,
          formTitle,
          timestamp: new Date().toISOString(),
          enhancedData
        });
  
        const payload = {
          to: ['contact@lucaverse.com'],
          from: 'contact@lucaverse.com',
          subject: emailContent.emailSubject,
          html: emailContent.html,           // ✨ NEW: Rich HTML formatting
          text: emailContent.text,           // ✨ IMPROVED: Better text formatting
          reply_to: email,
        };
  
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
  
        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error('Email send failed:', errorText);
          return new Response('Failed to send email.', { status: 500, headers: corsHeaders(request) });
        }
  
        // ✨ NEW: Send confirmation email to user
        await sendUserConfirmation(env.RESEND_API_KEY, email, name, formType);
  
        return new Response(JSON.stringify({
          success: true,
          message: getSuccessMessage(formType)  // ✨ NEW: Dynamic success messages
        }), {
          status: 200,
          headers: {
            ...corsHeaders(request),
            'Content-Type': 'application/json'
          }
        });
  
      } catch (error) {
        console.error('Form handler error:', error);
        return new Response(error.stack || error.toString(), {
          status: 500,
          headers: corsHeaders(request),
        });
      }
    }
  };
  
  // ✨ NEW: Create formatted email content based on form type
  function createEmailContent(formType, data) {
    const { name, email, message, subject, formTitle, timestamp, enhancedData } = data;
    const isAccessRequest = formType === 'access_request';
    
    // Dynamic subject line
    const emailSubject = isAccessRequest 
      ? `🔐 Lucaverse Access Request from ${name}`
      : `📧 ${subject || 'Portfolio Contact'} from ${name}`;
  
    // Enhanced HTML content
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background: #0a0a0a; color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
        <div style="background: linear-gradient(135deg, ${isAccessRequest ? '#001a2e, #003366' : '#1a2e00, #336600'}); padding: 25px; text-align: center;">
          <h1 style="color: ${isAccessRequest ? '#00ccff' : '#66ff00'}; margin: 0; font-size: 24px; text-shadow: 0 0 15px ${isAccessRequest ? '#00ccff' : '#66ff00'};">
            ${isAccessRequest ? '🌌 Lucaverse Access Request' : '💼 Portfolio Contact'}
          </h1>
          <p style="color: ${isAccessRequest ? '#80dfff' : '#b3ff80'}; margin: 8px 0 0 0; font-size: 16px;">
            ${formTitle || 'New submission received'}
          </p>
        </div>
        
        <div style="padding: 30px;">
          <div style="background: #1a1a1a; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 5px solid ${isAccessRequest ? '#00ccff' : '#66ff00'};">
            <h2 style="color: ${isAccessRequest ? '#00ccff' : '#66ff00'}; margin: 0 0 15px 0; font-size: 18px;">
              ${isAccessRequest ? 'Applicant Details' : 'Contact Information'}
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 5px 0; color: #cccccc; font-weight: bold; width: 80px;">Name:</td><td style="padding: 5px 0; color: #ffffff;">${name}</td></tr>
              <tr><td style="padding: 5px 0; color: #cccccc; font-weight: bold;">Email:</td><td style="padding: 5px 0;"><a href="mailto:${email}" style="color: ${isAccessRequest ? '#00ccff' : '#66ff00'}; text-decoration: none;">${email}</a></td></tr>
              ${!isAccessRequest && subject ? `<tr><td style="padding: 5px 0; color: #cccccc; font-weight: bold;">Subject:</td><td style="padding: 5px 0; color: #ffffff;">${subject}</td></tr>` : ''}
              <tr><td style="padding: 5px 0; color: #cccccc; font-weight: bold;">Time:</td><td style="padding: 5px 0; color: #ffffff;">${new Date(timestamp).toLocaleString()}</td></tr>
            </table>
          </div>
          
          <div style="background: #1a1a1a; padding: 20px; border-radius: 8px; border-left: 5px solid #ff9900;">
            <h3 style="color: #ff9900; margin: 0 0 15px 0; font-size: 16px;">
              ${isAccessRequest ? 'Access Request Reason:' : 'Message:'}
            </h3>
            <div style="background: #000000; padding: 15px; border-radius: 6px; font-family: 'Consolas', 'Monaco', monospace; white-space: pre-wrap; color: #ffffff; border: 1px solid #333333; line-height: 1.4;">${message}</div>
          </div>
          
          ${enhancedData ? `
          <div style="background: #1a1a1a; padding: 20px; border-radius: 8px; border-left: 5px solid #9900ff; margin-top: 20px;">
            <h3 style="color: #9900ff; margin: 0 0 15px 0; font-size: 16px;">📊 User Context & Analytics</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <h4 style="color: #cc99ff; margin: 0 0 8px 0; font-size: 14px;">🌍 Location & Language</h4>
                <table style="width: 100%; font-size: 13px;">
                  <tr><td style="color: #cccccc; padding: 2px 0;">Country:</td><td style="color: #ffffff;">${enhancedData.country}</td></tr>
                  <tr><td style="color: #cccccc; padding: 2px 0;">City:</td><td style="color: #ffffff;">${enhancedData.city}</td></tr>
                  <tr><td style="color: #cccccc; padding: 2px 0;">Region:</td><td style="color: #ffffff;">${enhancedData.region}</td></tr>
                  <tr><td style="color: #cccccc; padding: 2px 0;">Timezone:</td><td style="color: #ffffff;">${enhancedData.timezone}</td></tr>
                  <tr><td style="color: #cccccc; padding: 2px 0;">Site Lang:</td><td style="color: #ffffff;">${enhancedData.siteLanguage}</td></tr>
                  <tr><td style="color: #cccccc; padding: 2px 0;">Browser Lang:</td><td style="color: #ffffff;">${enhancedData.browserLanguage}</td></tr>
                </table>
              </div>
              <div>
                <h4 style="color: #cc99ff; margin: 0 0 8px 0; font-size: 14px;">📱 Device & Context</h4>
                <table style="width: 100%; font-size: 13px;">
                  <tr><td style="color: #cccccc; padding: 2px 0;">Device:</td><td style="color: #ffffff;">${enhancedData.deviceType}</td></tr>
                  <tr><td style="color: #cccccc; padding: 2px 0;">Screen:</td><td style="color: #ffffff;">${enhancedData.screenSize}</td></tr>
                  <tr><td style="color: #cccccc; padding: 2px 0;">Viewport:</td><td style="color: #ffffff;">${enhancedData.viewportSize}</td></tr>
                  <tr><td style="color: #cccccc; padding: 2px 0;">Referrer:</td><td style="color: #ffffff; word-break: break-all;">${enhancedData.referrer}</td></tr>
                  <tr><td style="color: #cccccc; padding: 2px 0;">IP:</td><td style="color: #ffffff;">${enhancedData.userIP}</td></tr>
                  <tr><td style="color: #cccccc; padding: 2px 0;">ISP:</td><td style="color: #ffffff;">AS${enhancedData.asn}</td></tr>
                </table>
              </div>
            </div>
            
            <div style="margin-top: 15px; padding: 15px; background: #0a0a0a; border-radius: 6px; border-left: 3px solid #ff6600;">
              <h4 style="color: #ff9966; margin: 0 0 8px 0; font-size: 14px;">⚡ Form Analytics & Performance</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
                <div>
                  <span style="color: #cccccc;">Form Time:</span> 
                  <span style="color: #ffffff;">${enhancedData.timeToComplete !== 'unknown' ? Math.round(enhancedData.timeToComplete / 1000) + 's' : 'unknown'}</span>
                </div>
                <div>
                  <span style="color: #cccccc;">Session:</span> 
                  <span style="color: #ffffff;">${enhancedData.sessionDuration !== 'unknown' ? Math.round(enhancedData.sessionDuration / 1000) + 's' : 'unknown'}</span>
                </div>
                <div>
                  <span style="color: #cccccc;">Scroll:</span> 
                  <span style="color: #ffffff;">${enhancedData.scrollDepth !== 'unknown' ? enhancedData.scrollDepth + '%' : 'unknown'}</span>
                </div>
                <div>
                  <span style="color: #cccccc;">Connection:</span> 
                  <span style="color: #ffffff;">${enhancedData.connectionType}</span>
                </div>
                <div>
                  <span style="color: #cccccc;">Touch:</span> 
                  <span style="color: #ffffff;">${enhancedData.touchSupport === 'true' ? 'Yes' : 'No'}</span>
                </div>
                <div>
                  <span style="color: #cccccc;">Pixel Ratio:</span> 
                  <span style="color: #ffffff;">${enhancedData.pixelRatio}</span>
                </div>
              </div>
              ${enhancedData.fieldFocusOrder !== 'unknown' ? `
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #333;">
                <span style="color: #cccccc; font-size: 11px;">Focus Order:</span> 
                <span style="color: #ffffff; font-size: 11px;">${enhancedData.fieldFocusOrder}</span>
              </div>
              ` : ''}
            </div>
          </div>
          ` : ''}
          
          <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #333333; text-align: center;">
            <p style="color: #666666; font-size: 13px; margin: 0;">
              Sent via Lucaverse Portfolio • ${new Date(timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    `;
  
    // Enhanced text content
    const text = `
  ${isAccessRequest ? 'LUCAVERSE ACCESS REQUEST' : 'PORTFOLIO CONTACT MESSAGE'}
  ${'='.repeat(50)}
  
  ${isAccessRequest ? 'APPLICANT' : 'CONTACT'}: ${name}
  EMAIL: ${email}
  ${!isAccessRequest && subject ? `SUBJECT: ${subject}\n` : ''}TIME: ${new Date(timestamp).toLocaleString()}
  
  ${isAccessRequest ? 'REASON FOR ACCESS:' : 'MESSAGE:'}
  ${'-'.repeat(20)}
  ${message}
  
  ${enhancedData ? `USER CONTEXT & ANALYTICS:
  ${'-'.repeat(30)}
  Location: ${enhancedData.city}, ${enhancedData.region}, ${enhancedData.country}
  Timezone: ${enhancedData.timezone} (${enhancedData.timezoneOffset})
  Languages: Site=${enhancedData.siteLanguage}, Browser=${enhancedData.browserLanguage}
  Device: ${enhancedData.deviceType} (${enhancedData.screenSize})
  Referrer: ${enhancedData.referrer}
  IP: ${enhancedData.userIP} (AS${enhancedData.asn})
  
  FORM ANALYTICS:
  Form Time: ${enhancedData.timeToComplete !== 'unknown' ? Math.round(enhancedData.timeToComplete / 1000) + 's' : 'unknown'}
  Session Duration: ${enhancedData.sessionDuration !== 'unknown' ? Math.round(enhancedData.sessionDuration / 1000) + 's' : 'unknown'}
  Scroll Depth: ${enhancedData.scrollDepth !== 'unknown' ? enhancedData.scrollDepth + '%' : 'unknown'}
  Connection: ${enhancedData.connectionType}
  Touch Support: ${enhancedData.touchSupport === 'true' ? 'Yes' : 'No'}
  Field Focus Order: ${enhancedData.fieldFocusOrder !== 'unknown' ? enhancedData.fieldFocusOrder : 'unknown'}
  
  ` : ''}${'='.repeat(50)}
  Sent via Lucaverse Portfolio Contact System
    `;
  
    return { emailSubject, html, text };
  }
  
  // ✨ NEW: Send confirmation email to user
  async function sendUserConfirmation(apiKey, userEmail, name, formType) {
    const isAccessRequest = formType === 'access_request';
    
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: [userEmail],
          from: 'contact@lucaverse.com',
          subject: isAccessRequest 
            ? '🔐 Access Request Received - Lucaverse' 
            : '✅ Message Received - Lucaverse Portfolio',
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; border-radius: 12px; overflow: hidden;">
              <div style="background: linear-gradient(135deg, ${isAccessRequest ? '#001a2e, #003366' : '#1a2e00, #336600'}); padding: 25px; text-align: center;">
                <h1 style="color: ${isAccessRequest ? '#00ccff' : '#66ff00'}; margin: 0; font-size: 22px;">
                  ${isAccessRequest ? '🌌 Request Confirmed' : '📧 Message Confirmed'}
                </h1>
              </div>
              
              <div style="padding: 30px;">
                <p style="font-size: 16px; line-height: 1.6;">Hi ${name},</p>
                
                <p style="font-size: 16px; line-height: 1.6;">
                  Thanks for ${isAccessRequest ? 'requesting access to the Lucaverse' : 'reaching out'}! 
                  Your ${isAccessRequest ? 'request' : 'message'} has been received and I'll get back to you within 24-48 hours.
                </p>
                
                ${isAccessRequest ? `
                <div style="background: #1a1a1a; padding: 20px; border-radius: 8px; border-left: 5px solid #00ccff; margin: 20px 0;">
                  <p style="margin: 0; color: #00ccff; font-weight: bold;">What's next?</p>
                  <p style="margin: 10px 0 0 0; line-height: 1.5;">I'll review your access request and send you entry details if approved. This usually takes 24-48 hours.</p>
                </div>
                ` : ''}
                
                <p style="font-size: 16px; margin-top: 25px;">
                  Best regards,<br>
                  <strong style="color: ${isAccessRequest ? '#00ccff' : '#66ff00'};">Luciano</strong>
                </p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333333; text-align: center;">
                  <p style="color: #666666; font-size: 12px; margin: 0;">
                    This is an automated confirmation from lucaverse.com
                  </p>
                </div>
              </div>
            </div>
          `,
          text: `
  Hi ${name},
  
  Thanks for ${isAccessRequest ? 'requesting access to the Lucaverse' : 'reaching out'}! 
  Your ${isAccessRequest ? 'request' : 'message'} has been received and I'll get back to you within 24-48 hours.
  
  ${isAccessRequest ? 'I\'ll review your access request and send you entry details if approved.' : ''}
  
  Best regards,
  Luciano
  
  ---
  This is an automated confirmation from lucaverse.com
          `
        }),
      });
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
      // Don't throw - confirmation emails are non-critical
    }
  }
  
  // ✨ NEW: Dynamic success messages
  function getSuccessMessage(formType) {
    return formType === 'access_request'
      ? 'Access request submitted successfully! Check your email for confirmation.'
      : 'Message sent successfully! Check your email for confirmation.';
  }
  
  // --- CORS helper (unchanged - keeping your existing setup)
  function corsHeaders(request) {
    const origin = request.headers.get('Origin');
    const allowedOrigins = [
      'https://lucaverse.com',
      'https://www.lucaverse.com',
      'http://localhost:3000',
      'http://localhost:5155'
    ];
  
    return {
      'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : 'https://lucaverse.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
  }
  
  // --- OPTIONS handler for CORS preflight (unchanged)
  function handleOptions(request) {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request),
    });
  }