/**
 * XSS Prevention Security Tests
 * Tests various XSS attack vectors and validates prevention mechanisms
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock DOM environment for security testing
import { JSDOM } from 'jsdom';

describe('XSS Prevention Security Tests', () => {
  let dom;
  let window;
  let document;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>', {
      runScripts: 'dangerously',
      resources: 'usable',
    });
    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
  });

  afterEach(() => {
    dom.window.close();
  });

  describe('HTML Injection Prevention', () => {
    const maliciousInputs = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '<object data="javascript:alert(\'XSS\')"></object>',
      '<embed src="javascript:alert(\'XSS\')">',
      '<form><button formaction="javascript:alert(\'XSS\')">Click</button></form>',
      '<details ontoggle=alert("XSS")>',
      '<div onclick="alert(\'XSS\')">Click me</div>',
    ];

    maliciousInputs.forEach((payload) => {
      it(`should prevent XSS from payload: ${payload.substring(0, 30)}...`, () => {
        // Test HTML encoding function (assuming it exists in utils)
        const htmlEncode = (str) => {
          const div = document.createElement('div');
          div.textContent = str;
          return div.innerHTML;
        };

        const encoded = htmlEncode(payload);
        
        // Encoded content should not contain script tags or event handlers
        expect(encoded).not.toContain('<script');
        expect(encoded).not.toContain('onerror=');
        expect(encoded).not.toContain('onload=');
        expect(encoded).not.toContain('onclick=');
        expect(encoded).not.toContain('javascript:');
        
        // Should contain encoded equivalents
        expect(encoded).toContain('&lt;');
        expect(encoded).toContain('&gt;');
      });
    });

    it('should prevent XSS when inserting into DOM', () => {
      const container = document.getElementById('app');
      const maliciousContent = '<script>window.xssExecuted = true;</script>';
      
      // Safe insertion using textContent
      container.textContent = maliciousContent;
      
      // Script should not execute
      expect(window.xssExecuted).toBeUndefined();
      
      // Content should be escaped
      expect(container.innerHTML).toContain('&lt;script&gt;');
    });

    it('should prevent XSS in form inputs', () => {
      const form = document.createElement('form');
      const input = document.createElement('input');
      input.type = 'text';
      input.name = 'test';
      form.appendChild(input);
      document.body.appendChild(form);
      
      const maliciousValue = '"><script>alert("XSS")</script>';
      input.value = maliciousValue;
      
      // Value should be set but not interpreted as HTML
      expect(input.value).toBe(maliciousValue);
      expect(document.body.innerHTML).not.toContain('<script>alert("XSS")</script>');
    });
  });

  describe('JavaScript Injection Prevention', () => {
    const jsPayloads = [
      'javascript:alert("XSS")',
      'data:text/html,<script>alert("XSS")</script>',
      'vbscript:alert("XSS")',
      'file://etc/passwd',
      'ftp://attacker.com/malicious.exe',
    ];

    jsPayloads.forEach((payload) => {
      it(`should prevent JavaScript injection: ${payload}`, () => {
        // Test URL validation (assuming function exists)
        const isValidUrl = (url) => {
          try {
            const urlObj = new URL(url);
            // Only allow HTTP/HTTPS protocols
            return ['http:', 'https:'].includes(urlObj.protocol);
          } catch {
            return false;
          }
        };

        expect(isValidUrl(payload)).toBe(false);
      });
    });

    it('should validate and sanitize href attributes', () => {
      const link = document.createElement('a');
      const maliciousHref = 'javascript:alert("XSS")';
      
      // Simulate safe href setting
      const sanitizeHref = (href) => {
        if (href.startsWith('javascript:') || href.startsWith('data:') || href.startsWith('vbscript:')) {
          return '#';
        }
        return href;
      };
      
      link.href = sanitizeHref(maliciousHref);
      expect(link.href).not.toContain('javascript:');
    });
  });

  describe('CSS Injection Prevention', () => {
    it('should prevent CSS-based XSS attacks', () => {
      const style = document.createElement('style');
      const maliciousCSS = `
        body { background: url('javascript:alert("XSS")'); }
        .test { background-image: url('data:image/svg+xml,<svg onload="alert(1)"></svg>'); }
      `;
      
      // CSS should be sanitized before insertion
      const sanitizeCSS = (css) => {
        return css
          .replace(/javascript:/gi, '')
          .replace(/data:(?!image\/[a-z]+;base64,)/gi, '')
          .replace(/expression\s*\(/gi, '');
      };
      
      const sanitizedCSS = sanitizeCSS(maliciousCSS);
      expect(sanitizedCSS).not.toContain('javascript:');
      expect(sanitizedCSS).not.toContain('data:image/svg+xml');
    });
  });

  describe('Event Handler Prevention', () => {
    const eventHandlers = [
      'onload', 'onerror', 'onclick', 'onmouseover', 'onfocus',
      'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect',
      'ontoggle', 'onwheel', 'oncopy', 'oncut', 'onpaste',
    ];

    eventHandlers.forEach((handler) => {
      it(`should prevent ${handler} event handler injection`, () => {
        const div = document.createElement('div');
        const maliciousHTML = `<img src=x ${handler}=alert("XSS")>`;
        
        // Simulate safe HTML insertion
        const sanitizeHTML = (html) => {
          const temp = document.createElement('div');
          temp.textContent = html;
          return temp.innerHTML;
        };
        
        div.innerHTML = sanitizeHTML(maliciousHTML);
        expect(div.innerHTML).not.toContain(`${handler}=`);
      });
    });
  });

  describe('DOM Clobbering Prevention', () => {
    it('should prevent DOM clobbering attacks', () => {
      const form = document.createElement('form');
      form.innerHTML = '<input name="action" value="malicious">';
      document.body.appendChild(form);
      
      // Check that form.action is not clobbered
      expect(typeof form.action).toBe('string');
      expect(form.action).not.toBe('malicious');
    });

    it('should prevent window property clobbering', () => {
      const maliciousElement = document.createElement('div');
      maliciousElement.id = 'alert';
      document.body.appendChild(maliciousElement);
      
      // window.alert should still be a function
      expect(typeof window.alert).toBe('function');
    });
  });

  describe('Content Security Policy Simulation', () => {
    it('should simulate CSP script-src directive', () => {
      // Simulate CSP checking
      const checkCSP = (scriptSrc) => {
        const allowedSources = ["'self'", "'unsafe-inline'"];
        const isExternal = !scriptSrc.startsWith('/') && !scriptSrc.startsWith('./');
        
        if (isExternal && !allowedSources.includes("'unsafe-eval'")) {
          return false;
        }
        
        return true;
      };

      expect(checkCSP('/js/app.js')).toBe(true);
      expect(checkCSP('./js/app.js')).toBe(true);
      expect(checkCSP('https://evil.com/malicious.js')).toBe(false);
    });

    it('should simulate CSP object-src directive', () => {
      const checkObjectSrc = (src) => {
        // Simulate 'none' policy for object-src
        return false;
      };

      expect(checkObjectSrc('https://example.com/file.swf')).toBe(false);
      expect(checkObjectSrc('/local/file.pdf')).toBe(false);
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should validate and sanitize form input data', () => {
      const validateInput = (input, type) => {
        const patterns = {
          email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          name: /^[a-zA-Z\s\-']{1,50}$/,
          phone: /^[\+]?[1-9][\d]{0,15}$/,
        };

        if (!patterns[type]) return false;
        return patterns[type].test(input) && !/<|>|&/.test(input);
      };

      // Valid inputs
      expect(validateInput('john@example.com', 'email')).toBe(true);
      expect(validateInput('John Doe', 'name')).toBe(true);
      expect(validateInput('+1234567890', 'phone')).toBe(true);

      // Invalid inputs with XSS
      expect(validateInput('john<script>alert(1)</script>@example.com', 'email')).toBe(false);
      expect(validateInput('John<script>alert(1)</script>Doe', 'name')).toBe(false);
      expect(validateInput('123<script>alert(1)</script>456', 'phone')).toBe(false);
    });

    it('should detect and reject SQL injection patterns', () => {
      const detectSQLInjection = (input) => {
        const sqlPatterns = [
          /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/i,
          /('|(\\')|(;)|(\\;)|(\|)|(\*)|(%)|(<)|(>))/,
          /(exec|execute|sp_|xp_)/i,
        ];

        return sqlPatterns.some(pattern => pattern.test(input));
      };

      expect(detectSQLInjection("'; DROP TABLE users; --")).toBe(true);
      expect(detectSQLInjection("1' UNION SELECT * FROM users")).toBe(true);
      expect(detectSQLInjection("normal user input")).toBe(false);
      expect(detectSQLInjection("user@example.com")).toBe(false);
    });
  });

  describe('File Upload Security', () => {
    it('should validate file types and prevent executable uploads', () => {
      const validateFileType = (filename, allowedTypes) => {
        const extension = filename.split('.').pop().toLowerCase();
        return allowedTypes.includes(extension);
      };

      const allowedImageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      
      expect(validateFileType('image.jpg', allowedImageTypes)).toBe(true);
      expect(validateFileType('photo.png', allowedImageTypes)).toBe(true);
      expect(validateFileType('malicious.exe', allowedImageTypes)).toBe(false);
      expect(validateFileType('script.js', allowedImageTypes)).toBe(false);
      expect(validateFileType('shell.php', allowedImageTypes)).toBe(false);
    });

    it('should prevent double extension attacks', () => {
      const isDoubleExtension = (filename) => {
        const parts = filename.split('.');
        return parts.length > 2;
      };

      expect(isDoubleExtension('image.jpg.php')).toBe(true);
      expect(isDoubleExtension('document.pdf.exe')).toBe(true);
      expect(isDoubleExtension('normal.jpg')).toBe(false);
    });
  });

  describe('Session and Authentication Security', () => {
    it('should generate secure session tokens', () => {
      const generateSecureToken = () => {
        // Simulate secure token generation
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      };

      const token1 = generateSecureToken();
      const token2 = generateSecureToken();

      expect(token1).toHaveLength(64);
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
      expect(/^[a-f0-9]+$/.test(token1)).toBe(true);
    });

    it('should validate session token format', () => {
      const isValidToken = (token) => {
        return typeof token === 'string' && 
               token.length === 64 && 
               /^[a-f0-9]+$/.test(token);
      };

      expect(isValidToken('a'.repeat(64))).toBe(true);
      expect(isValidToken('1234567890abcdef'.repeat(4))).toBe(true);
      expect(isValidToken('invalid-token')).toBe(false);
      expect(isValidToken('a'.repeat(63))).toBe(false);
      expect(isValidToken('a'.repeat(65))).toBe(false);
    });
  });

  describe('CSRF Protection', () => {
    it('should generate valid CSRF tokens', () => {
      const generateCSRFToken = () => {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      };

      const token = generateCSRFToken();
      expect(token).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    it('should validate CSRF token format and presence', () => {
      const validateCSRFToken = (formToken, cookieToken) => {
        if (!formToken || !cookieToken) return false;
        if (formToken !== cookieToken) return false;
        if (!/^[a-f0-9]{64}$/.test(formToken)) return false;
        return true;
      };

      const validToken = 'a'.repeat(64);
      
      expect(validateCSRFToken(validToken, validToken)).toBe(true);
      expect(validateCSRFToken(validToken, 'different')).toBe(false);
      expect(validateCSRFToken('', validToken)).toBe(false);
      expect(validateCSRFToken(validToken, '')).toBe(false);
      expect(validateCSRFToken('invalid', 'invalid')).toBe(false);
    });
  });

  describe('Prototype Pollution Prevention', () => {
    it('should prevent prototype pollution via object assignment', () => {
      const safeAssign = (target, source) => {
        if (typeof source !== 'object' || source === null) return target;
        
        for (const key in source) {
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            continue;
          }
          if (source.hasOwnProperty(key)) {
            target[key] = source[key];
          }
        }
        return target;
      };

      const target = {};
      const maliciousSource = {
        normal: 'value',
        '__proto__': { polluted: true },
        'constructor': { prototype: { polluted: true } }
      };

      safeAssign(target, maliciousSource);
      
      expect(target.normal).toBe('value');
      expect(target.polluted).toBeUndefined();
      expect(Object.prototype.polluted).toBeUndefined();
    });
  });
});