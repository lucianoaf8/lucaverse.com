// Enhanced Honeypot Utilities
// Implements dynamic, randomized honeypot fields for advanced bot detection

/**
 * Generate a randomized honeypot field name
 * @returns {string} Random field name that looks legitimate
 */
export const generateHoneypotFieldName = () => {
  const prefixes = ['user', 'contact', 'form', 'customer', 'client', 'account'];
  const suffixes = ['url', 'site', 'page', 'link', 'address', 'info', 'data'];
  const separators = ['_', '-', ''];
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  const separator = separators[Math.floor(Math.random() * separators.length)];
  
  return `${prefix}${separator}${suffix}`;
};

/**
 * Generate multiple honeypot fields for enhanced detection
 * @param {number} count - Number of honeypot fields to generate
 * @returns {Array} Array of honeypot field configurations
 */
export const generateHoneypotFields = (count = 2) => {
  const fields = [];
  const usedNames = new Set();
  
  for (let i = 0; i < count; i++) {
    let fieldName;
    do {
      fieldName = generateHoneypotFieldName();
    } while (usedNames.has(fieldName));
    
    usedNames.add(fieldName);
    
    fields.push({
      name: fieldName,
      type: Math.random() > 0.5 ? 'text' : 'email',
      placeholder: generateHoneypotPlaceholder(fieldName),
      style: generateHoneypotStyle()
    });
  }
  
  return fields;
};

/**
 * Generate a realistic placeholder for honeypot field
 * @param {string} fieldName - The field name
 * @returns {string} Realistic placeholder text
 */
const generateHoneypotPlaceholder = (fieldName) => {
  const placeholders = {
    url: 'https://example.com',
    site: 'Your website URL',
    page: 'Homepage URL',
    link: 'Profile link',
    address: 'Web address',
    info: 'Additional info',
    data: 'Extra data'
  };
  
  // Find matching placeholder based on field name
  for (const [key, placeholder] of Object.entries(placeholders)) {
    if (fieldName.includes(key)) {
      return placeholder;
    }
  }
  
  return 'Optional field';
};

/**
 * Generate randomized honeypot field styling
 * @returns {object} CSS style object for hiding the field
 */
const generateHoneypotStyle = () => {
  const hidingMethods = [
    // Invisible positioning
    {
      position: 'absolute',
      left: '-9999px',
      top: '-9999px',
      width: '1px',
      height: '1px'
    },
    // Opacity hiding
    {
      opacity: 0,
      position: 'absolute',
      pointerEvents: 'none',
      tabIndex: -1
    },
    // Display none (most basic)
    {
      display: 'none'
    },
    // Clip hiding
    {
      position: 'absolute',
      clip: 'rect(0, 0, 0, 0)',
      clipPath: 'inset(50%)',
      height: '1px',
      overflow: 'hidden',
      width: '1px'
    }
  ];
  
  return hidingMethods[Math.floor(Math.random() * hidingMethods.length)];
};

/**
 * Enhanced honeypot validation with multiple checks
 * @param {FormData} formData - Form data to validate
 * @param {Array} honeypotFields - Array of honeypot field configurations
 * @returns {object} Validation result with detailed analysis
 */
export const validateHoneypotFields = (formData, honeypotFields) => {
  const botIndicators = [];
  let suspicionScore = 0;
  
  // Check each honeypot field
  for (const field of honeypotFields) {
    const value = formData.get(field.name);
    
    if (value && value.trim()) {
      botIndicators.push(`Honeypot field '${field.name}' filled`);
      suspicionScore += 10;
    }
  }
  
  // Additional bot detection heuristics
  
  // Check for suspiciously fast submission
  const timestamp = formData.get('timestamp');
  const formStartTime = formData.get('formStartTime');
  
  if (timestamp && formStartTime) {
    const submissionTime = parseInt(timestamp);
    const startTime = parseInt(formStartTime);
    const timeTaken = submissionTime - startTime;
    
    if (timeTaken < 3000) { // Less than 3 seconds
      botIndicators.push('Suspiciously fast submission');
      suspicionScore += 8;
    }
  }
  
  // Check for duplicate submissions
  const userAgent = formData.get('userAgent');
  const submissionCount = formData.get('submissionCount');
  
  if (submissionCount && parseInt(submissionCount) > 3) {
    botIndicators.push('Multiple rapid submissions');
    suspicionScore += 5;
  }
  
  // Check for missing expected fields that humans typically fill
  const requiredHumanFields = ['name', 'email', 'message'];
  const missingFields = requiredHumanFields.filter(field => 
    !formData.get(field) || !formData.get(field).trim()
  );
  
  if (missingFields.length > 0) {
    botIndicators.push(`Missing human-expected fields: ${missingFields.join(', ')}`);
    suspicionScore += missingFields.length * 3;
  }
  
  // Determine if this is likely a bot
  const isBot = suspicionScore >= 10 || botIndicators.length >= 2;
  
  return {
    isBot,
    suspicionScore,
    indicators: botIndicators,
    confidence: Math.min(suspicionScore / 20, 1) // Confidence score 0-1
  };
};

/**
 * Store honeypot configuration in session for validation
 * @param {Array} honeypotFields - Honeypot field configurations
 */
export const storeHoneypotConfig = (honeypotFields) => {
  const config = {
    fields: honeypotFields.map(field => ({ name: field.name, type: field.type })),
    timestamp: Date.now()
  };
  
  sessionStorage.setItem('honeypot_config', JSON.stringify(config));
};

/**
 * Retrieve stored honeypot configuration
 * @returns {object|null} Honeypot configuration or null
 */
export const getHoneypotConfig = () => {
  try {
    const stored = sessionStorage.getItem('honeypot_config');
    if (!stored) return null;
    
    const config = JSON.parse(stored);
    
    // Check if configuration is expired (1 hour)
    if (Date.now() - config.timestamp > 60 * 60 * 1000) {
      sessionStorage.removeItem('honeypot_config');
      return null;
    }
    
    return config;
  } catch {
    return null;
  }
};

/**
 * Add tracking fields to detect automated submissions
 * @param {FormData} formData - Form data to enhance
 * @param {number} formStartTime - When the form was first rendered
 */
export const addBotDetectionFields = (formData, formStartTime) => {
  // Add timing information
  formData.append('timestamp', Date.now().toString());
  formData.append('formStartTime', formStartTime.toString());
  
  // Add basic user agent (for consistency checking)
  formData.append('userAgent', navigator.userAgent.substring(0, 100)); // Truncated for privacy
  
  // Add interaction tracking
  const interactionCount = sessionStorage.getItem('form_interactions') || '0';
  formData.append('interactionCount', interactionCount);
  
  // Track submission count
  const submissionCount = sessionStorage.getItem('submission_count') || '0';
  const newCount = parseInt(submissionCount) + 1;
  sessionStorage.setItem('submission_count', newCount.toString());
  formData.append('submissionCount', newCount.toString());
  
  return formData;
};

/**
 * Track form interactions for bot detection
 */
export const trackFormInteraction = () => {
  const current = parseInt(sessionStorage.getItem('form_interactions') || '0');
  sessionStorage.setItem('form_interactions', (current + 1).toString());
};

/**
 * Initialize honeypot system for a form
 * @returns {object} Complete honeypot configuration
 */
export const initializeHoneypot = () => {
  const fields = generateHoneypotFields(2); // Generate 2 random honeypot fields
  storeHoneypotConfig(fields);
  
  return {
    fields,
    trackInteraction: trackFormInteraction,
    addDetectionFields: addBotDetectionFields,
    validate: (formData) => validateHoneypotFields(formData, fields)
  };
};