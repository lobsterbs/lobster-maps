import React from 'react';

export interface PrivacyPolicyProps {
  onClose?: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onClose }) => {

  const containerStyle: React.CSSProperties = {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '40px 20px',
    backgroundColor: 'var(--md-sys-color-surface)',
    color: 'var(--md-sys-color-on-surface)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    lineHeight: 1.6,
  };

  const headingStyle: React.CSSProperties = {
    color: 'var(--md-sys-color-primary)',
    borderBottom: '2px solid var(--md-sys-color-primary)',
    paddingBottom: '12px',
    marginBottom: '24px',
    marginTop: '32px',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '24px',
  };

  const buttonStyle: React.CSSProperties = {
    marginTop: '40px',
    padding: '12px 24px',
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 500,
    transition: 'all 200ms',
  };

  return (
    <div style={containerStyle}>
      <button
        onClick={onClose}
        style={{
          padding: '8px 16px',
          backgroundColor: 'var(--md-sys-color-surface-container)',
          color: 'var(--md-sys-color-primary)',
          border: '1px solid var(--md-sys-color-outline)',
          borderRadius: 'var(--md-sys-shape-corner-medium)',
          cursor: 'pointer',
          marginBottom: '24px',
        }}
      >
        ← Back
      </button>

      <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Privacy Policy</h1>
      <p style={{ color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '32px' }}>
        Last updated: September 2026
      </p>

      <div style={sectionStyle}>
        <h2 style={headingStyle}>Introduction</h2>
        <p>
          LobsterMaps ("we", "us", "our", or "Company") operates as a privacy-first maps and business directory
          service. This Privacy Policy explains our practices regarding data collection, use, and protection.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={headingStyle}>1. Data We Collect</h2>
        <p>LobsterMaps collects minimal data needed to provide service:</p>
        <ul style={{ marginLeft: '20px' }}>
          <li>
            <strong>Location Data:</strong> Your current location (with permission only) for map centering and nearby
            business search
          </li>
          <li>
            <strong>Search Queries:</strong> Business names, categories, and addresses you search for
          </li>
          <li>
            <strong>User Preferences:</strong> Map basemap selection, theme preference, saved places (stored locally)
          </li>
          <li>
            <strong>Analytics:</strong> Anonymized usage metrics (page views, feature usage) — no IP tracking
          </li>
        </ul>
      </div>

      <div style={sectionStyle}>
        <h2 style={headingStyle}>2. How We Use Your Data</h2>
        <p>We use collected data exclusively for:</p>
        <ul style={{ marginLeft: '20px' }}>
          <li>Displaying maps and business information</li>
          <li>Processing searches and route calculations</li>
          <li>Improving service performance and stability</li>
          <li>Complying with legal obligations</li>
        </ul>
        <p style={{ marginTop: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>
          <strong>We do NOT:</strong> Sell user data, track individual users, build user profiles, or share data with
          third parties except where required by law.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={headingStyle}>3. Data Storage & Security</h2>
        <p>
          Personal preferences and saved locations are stored locally on your device. Searches and map usage are
          processed on our encrypted servers with:
        </p>
        <ul style={{ marginLeft: '20px' }}>
          <li>TLS/SSL encryption for all data in transit</li>
          <li>Database encryption at rest</li>
          <li>Regular security audits and updates</li>
          <li>Access controls limiting internal data access</li>
        </ul>
      </div>

      <div style={sectionStyle}>
        <h2 style={headingStyle}>4. Third-Party Services</h2>
        <p>LobsterMaps uses:</p>
        <ul style={{ marginLeft: '20px' }}>
          <li>
            <strong>MapTiler:</strong> Provides map tiles and geocoding (subject to their privacy policy)
          </li>
          <li>
            <strong>OpenStreetMap:</strong> Community-maintained map data (open-source, ODBL license)
          </li>
          <li>
            <strong>Render:</strong> Hosting provider (subject to their privacy terms)
          </li>
        </ul>
        <p style={{ marginTop: '12px' }}>
          We only share with third parties the minimum data needed to operate (e.g., search coordinates to MapTiler).
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={headingStyle}>5. Data Retention</h2>
        <p>
          Search logs are retained for 30 days for debugging and analytics purposes, then automatically deleted. User
          preferences stored locally are never deleted unless you clear your browser data.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={headingStyle}>6. Your Rights</h2>
        <p>You have the right to:</p>
        <ul style={{ marginLeft: '20px' }}>
          <li>Know what data we hold about you (upon request)</li>
          <li>Delete your search history and preferences</li>
          <li>Opt out of analytics (browser settings or contact us)</li>
          <li>Export or transfer your data</li>
          <li>Lodge a complaint with your data protection authority</li>
        </ul>
        <p style={{ marginTop: '12px' }}>
          To exercise these rights, contact us at <code>privacy@lobster.local</code>
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={headingStyle}>7. Children's Privacy</h2>
        <p>
          LobsterMaps does not knowingly collect data from children under 13. If we learn that we have collected
          personal information from a child under 13, we will promptly delete such information.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={headingStyle}>8. Policy Changes</h2>
        <p>
          We may update this Privacy Policy at any time. Material changes will be communicated via email (if
          applicable) or prominent notice on the app. Continued use after changes constitutes acceptance.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={headingStyle}>9. Contact Us</h2>
        <p>
          Questions about this Privacy Policy or our data practices? Contact us at:
          <br />
          <strong>LobsterMaps Privacy Team</strong>
          <br />
          Email: <code>privacy@lobster.local</code>
          <br />
          Location: Bergen, Norway
        </p>
      </div>

      <button
        onClick={onClose}
        style={buttonStyle}
      >
        Return to Map
      </button>
    </div>
  );
};

export default PrivacyPolicy;
