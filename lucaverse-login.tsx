import React, { useState, useEffect } from 'react';

const LucaverseLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredButton, setHoveredButton] = useState(null);
  const [fontTheme, setFontTheme] = useState(0);

  const fontThemes = [
    {
      name: "Current (Space Grotesk + Outfit)",
      header: "Space Grotesk, sans-serif",
      body: "Outfit, sans-serif"
    },
    {
      name: "Orbitron + Inter",
      header: "Orbitron, monospace",
      body: "Inter, sans-serif"
    },
    {
      name: "JetBrains Mono + IBM Plex",
      header: "JetBrains Mono, monospace", 
      body: "IBM Plex Sans, sans-serif"
    },
    {
      name: "Rajdhani + Source Sans",
      header: "Rajdhani, sans-serif",
      body: "Source Sans Pro, sans-serif"
    },
    {
      name: "Exo 2 + Nunito",
      header: "Exo 2, sans-serif",
      body: "Nunito Sans, sans-serif"
    }
  ];

  // Current font theme
  const currentFont = fontThemes[fontTheme];

  const handleLogin = (provider) => {
    setIsLoading(true);
    // Simulate login process
    setTimeout(() => {
      console.log(`Logging in with ${provider}`);
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-950 relative overflow-hidden flex items-center justify-center">
      {/* Font Theme Selector */}
      <div className="absolute top-6 right-6 z-20">
        <div className="bg-gray-900 bg-opacity-80 backdrop-blur-sm border border-cyan-400 border-opacity-30 rounded-lg p-3">
          <label className="block text-cyan-400 text-xs mb-2 font-medium" style={{ fontFamily: currentFont.body }}>
            Font Theme
          </label>
          <select 
            value={fontTheme} 
            onChange={(e) => setFontTheme(parseInt(e.target.value))}
            className="bg-gray-800 text-white text-xs border border-gray-600 rounded px-2 py-1 focus:border-cyan-400 focus:outline-none"
            style={{ fontFamily: currentFont.body }}
          >
            {fontThemes.map((theme, index) => (
              <option key={index} value={index}>{theme.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 229, 255, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 229, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-400 rounded-full opacity-[0.007] blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-400 rounded-full opacity-[0.007] blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Main Login Container */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Header */}
        <div className="text-center mb-12">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-teal-400 rounded-lg blur-sm opacity-60" />
              <div className="relative w-full h-full bg-gray-900 rounded-lg border border-cyan-400 flex items-center justify-center">
                <span className="text-2xl font-bold text-cyan-400" style={{ fontFamily: currentFont.header }}>L</span>
              </div>
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-4 text-white" style={{ fontFamily: currentFont.header }}>
            Enter the{' '}
            <span 
              className="text-transparent bg-clip-text"
              style={{
                backgroundImage: 'linear-gradient(90deg, #00FFCC 20%, #23aaff 48%, #2af598 85%, #009efd 100%)',
                filter: 'drop-shadow(0 0 8px rgba(0, 229, 255, 0.5))'
              }}
            >
              Lucaverse
            </span>
          </h1>
          
          <p className="text-gray-400 text-lg" style={{ fontFamily: currentFont.body }}>
            Access your AI-powered workspace
          </p>
        </div>

        {/* Login Card */}
        <div 
          className="relative bg-gray-900 bg-opacity-60 backdrop-blur-lg border border-cyan-400 border-opacity-30 rounded-xl p-8 pb-12 shadow-2xl"
          style={{
            boxShadow: '0 0 40px rgba(0, 229, 255, 0.1), inset 0 0 40px rgba(0, 255, 204, 0.05)',
            minHeight: '420px'
          }}
        >
          {/* Holographic border effect */}
          <div 
            className="absolute inset-0 rounded-xl opacity-20 blur-sm -z-10"
            style={{
              background: 'conic-gradient(from 180deg, #00FFCC, #00E5FF, #2AF598, #009EFD, #00FFCC)',
              padding: '2px'
            }}
          />

          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: currentFont.header }}>
                Choose Your Gateway
              </h2>
              <p className="text-gray-400 text-sm" style={{ fontFamily: currentFont.body }}>
                Connect with your preferred authentication method
              </p>
            </div>

            {/* Google Login Button */}
            <button
              onClick={() => handleLogin('Google')}
              onMouseEnter={() => setHoveredButton('google')}
              onMouseLeave={() => setHoveredButton(null)}
              disabled={isLoading}
              className="w-full relative group"
            >
              <div 
                className={`
                  w-full bg-gray-800 border-2 border-cyan-400 border-opacity-40 rounded-lg p-4 
                  transition-all duration-300 ease-out
                  ${hoveredButton === 'google' ? 'border-opacity-80 bg-opacity-80 transform scale-105' : ''}
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}
                `}
                style={{
                  boxShadow: hoveredButton === 'google' ? '0 0 20px rgba(0, 229, 255, 0.3)' : '0 0 10px rgba(0, 229, 255, 0.1)'
                }}
              >
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                  <span className="text-white font-medium" style={{ fontFamily: currentFont.body }}>
                    Continue with Google
                  </span>
                </div>
              </div>
            </button>

            {/* Microsoft Login Button */}
            <button
              onClick={() => handleLogin('Microsoft')}
              onMouseEnter={() => setHoveredButton('microsoft')}
              onMouseLeave={() => setHoveredButton(null)}
              disabled={isLoading}
              className="w-full relative group"
            >
              <div 
                className={`
                  w-full bg-gray-800 border-2 border-teal-400 border-opacity-40 rounded-lg p-4 
                  transition-all duration-300 ease-out
                  ${hoveredButton === 'microsoft' ? 'border-opacity-80 bg-opacity-80 transform scale-105' : ''}
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}
                `}
                style={{
                  boxShadow: hoveredButton === 'microsoft' ? '0 0 20px rgba(0, 255, 204, 0.3)' : '0 0 10px rgba(0, 255, 204, 0.1)'
                }}
              >
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg viewBox="0 0 23 23" width="20" height="20">
                      <path fill="#f25022" d="M0 0h11v11H0z"/>
                      <path fill="#00a4ef" d="M12 0h11v11H12z"/>
                      <path fill="#7fba00" d="M0 12h11v11H0z"/>
                      <path fill="#ffb900" d="M12 12h11v11H12z"/>
                    </svg>
                  </div>
                  <span className="text-white font-medium" style={{ fontFamily: currentFont.body }}>
                    Continue with Microsoft
                  </span>
                </div>
              </div>
            </button>

            {/* Loading State */}
            <div className="text-center py-4 min-h-[60px] flex items-center justify-center">
              {isLoading && (
                <div className="inline-flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-cyan-400 text-sm" style={{ fontFamily: currentFont.body }}>
                    Initializing connection...
                  </span>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-900 text-gray-400" style={{ fontFamily: currentFont.body }}>
                  Secure Authentication
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-500" style={{ fontFamily: currentFont.body }}>
              <p className="mb-2">By continuing, you agree to our Terms of Service</p>
              <p>Protected by enterprise-grade encryption</p>
            </div>
          </div>
        </div>

        {/* Bottom HUD Element */}
        <div className="text-center mt-8">
          <div className="inline-flex items-center space-x-2 text-gray-500 text-sm" style={{ fontFamily: currentFont.header }}>
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            <span>SECURE CONNECTION ESTABLISHED</span>
            <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
        </div>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500;700&family=IBM+Plex+Sans:wght@300;400;500;600&family=Rajdhani:wght@300;400;500;600;700&family=Source+Sans+Pro:wght@300;400;600;700&family=Exo+2:wght@300;400;500;600;700&family=Nunito+Sans:wght@300;400;500;600;700&display=swap');
        
        @keyframes pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default LucaverseLogin;