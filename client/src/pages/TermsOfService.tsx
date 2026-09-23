import React from 'react';

export interface TermsOfServiceProps {
  onClose?: () => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ onClose }) => {

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

      <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Terms of Service</h1>
      <p style={{ color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '32px' }}>
        Last updated: September 2026
      </p>

      <div style={sectionStyle}>
        <h2 style={headingStyle}>1. Acceptance of Terms</h2>
        <p>
          By accessing and using LobsterMaps, you accept and agree to be bound by the terms and provision of this
          agreement. If you do not agree to abide by the above, please do not use this service.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={headingStyle}>2. Use License</h2>
        <p>
          Permission is granted to temporarily download one copy of the materials (information or software) on
          LobsterMaps for personal, non-commercial transitory viewing only. This is the grant of a license, not a
          transfer of title, and under this license you may not:
        </p>
        <ul style={{ marginLeft: '20px' }}>
          <li>Modifying or copying the materials</li>
          <li>Using the materials for any commercial purpose or for any public display</li>
          <li>Attempting to decompile or reverse engineer any software contained on LobsterMaps</li>
          <li>Removing any copyright or other proprietary notations from the materials</li>
          <li>Transferring the materials to another person or "mirroring" the materials on any other server</li>
        </ul>
      </div>

      <div style={sectionStyle}>
        <h2 style={headingStyle}>3. Disclaimer</h2>
        <p>
          The materials on LobsterMaps are provided "as is". LobsterMaps makes no warranties, expressed or implied,
          and hereby disclaims and negates all other warranties including, without limitation, implied warranties or
          conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual
          property or other violation of rights.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={headingStyle}>4. Limitations</h2>
        <p>
          In no event shall LobsterMaps or its suppliers be liable for any damages (including, without limitation,
          damages for loss of data or profit, or due to business interruption) arising out of the use or inability to
          use the materials on LobsterMaps.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={headingStyle}>5. Accuracy of Materials</h2>
        <p>
          The materials appearing on LobsterMaps could include technical, typographical, or photographic errors.
          LobsterMaps does not warrant that any of the materials on LobsterMaps are accurate, complete, or current.
          LobsterMaps may make changes to the materials contained on its website at any time without notice.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={headingStyle}>6. Links</h2>
        <p>
          LobsterMaps has not reviewed all of the sites linked to its website and is not responsible for the contents
          of any such linked site. The inclusion of any link does not imply endorsement by LobsterMaps of the site. Use
          of any such linked website is at the user's own risk.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={headingStyle}>7. Modifications</h2>
        <p>
          LobsterMaps may revise these terms of service for its website at any time without notice. By using this
          website, you are agreeing to be bound by the then current version of these terms of service.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={headingStyle}>8. Governing Law</h2>
        <p>
          These terms and conditions are governed by and construed in accordance with the laws of Norway, and you
          irrevocably submit to the exclusive jurisdiction of the courts in that location.
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

export default TermsOfService;
