/**
 * LobsterMaps Version Naming System
 * Exotic animals and chemical substances for major releases
 *
 * Format: {codename} {semantic-version}
 * Example: "Argon 1.0.0", "Chinchilla 1.1.0"
 *
 * Semantic versioning:
 * - MAJOR: Breaking changes, full redesigns
 * - MINOR: New features, new components
 * - PATCH: Bug fixes, security patches
 */

export const VERSION_CODENAMES = [
  // Tier 1: Noble Gases (1.x.x)
  { name: 'Argon', semanticVersion: '1.0.0', releaseDate: '2026-09-23', description: 'Initial public release' },
  { name: 'Helium', semanticVersion: '1.1.0', releaseDate: 'TBD', description: 'Light mode / dark mode support' },
  { name: 'Neon', semanticVersion: '1.2.0', releaseDate: 'TBD', description: 'Enhanced search and autocomplete' },

  // Tier 2: Exotic Animals (2.x.x)
  { name: 'Chinchilla', semanticVersion: '2.0.0', releaseDate: 'TBD', description: 'Major UI overhaul' },
  { name: 'Quokka', semanticVersion: '2.1.0', releaseDate: 'TBD', description: 'Mobile app optimization' },
  { name: 'Axolotl', semanticVersion: '2.2.0', releaseDate: 'TBD', description: 'Real-time collaboration' },
  { name: 'Pangolin', semanticVersion: '2.3.0', releaseDate: 'TBD', description: 'Advanced routing algorithms' },

  // Tier 3: Rare Elements (3.x.x)
  { name: 'Uranium', semanticVersion: '3.0.0', releaseDate: 'TBD', description: 'AI-powered recommendations' },
  { name: 'Thorium', semanticVersion: '3.1.0', releaseDate: 'TBD', description: 'Offline mode support' },

  // Tier 4: Gemstones (4.x.x)
  { name: 'Tanzanite', semanticVersion: '4.0.0', releaseDate: 'TBD', description: 'Global expansion' },
  { name: 'Tourmaline', semanticVersion: '4.1.0', releaseDate: 'TBD', description: 'Multi-language support' },
];

export function getCurrentVersion(): string {
  return VERSION_CODENAMES[0].name;
}

export function getCurrentSemanticVersion(): string {
  return VERSION_CODENAMES[0].semanticVersion;
}

export function getVersionInfo(codename: string) {
  return VERSION_CODENAMES.find((v) => v.name === codename);
}

export function getFullVersionString(): string {
  const current = VERSION_CODENAMES[0];
  return `${current.name} ${current.semanticVersion}`;
}

/**
 * User-friendly version string for UI display
 * Example: "Argon (1.0.0)" or "Chinchilla · Maj or UI overhaul"
 */
export function getVersionDisplay(): string {
  const current = VERSION_CODENAMES[0];
  return `${current.name} v${current.semanticVersion}`;
}

/**
 * Version with description for about/settings pages
 */
export function getVersionWithDescription(): string {
  const current = VERSION_CODENAMES[0];
  return `${current.name} (${current.semanticVersion})\n${current.description}`;
}

/**
 * Check if version is alpha/beta/stable
 */
export function getVersionStability(): 'alpha' | 'beta' | 'stable' {
  const current = VERSION_CODENAMES[0];
  const version = current.semanticVersion;

  if (version.includes('0.')) return 'alpha';
  if (version.includes('-beta') || version.includes('-rc')) return 'beta';
  return 'stable';
}

export const AppVersion = {
  codename: getCurrentVersion(),
  semantic: getCurrentSemanticVersion(),
  full: getFullVersionString(),
  display: getVersionDisplay(),
  stability: getVersionStability(),
};
