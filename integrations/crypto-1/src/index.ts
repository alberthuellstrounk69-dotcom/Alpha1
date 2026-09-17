/**
 * Crypto-1: Comprehensive cryptocurrency and cryptography library
 *
 * ⚠️ SECURITY DISCLAIMER:
 * This library is in active development and has NOT undergone professional security audit.
 * Do NOT use in production without thorough security review.
 * Do NOT use with real cryptocurrency without extensive testing.
 */

export const VERSION = '0.1.0';

/**
 * Initialize the crypto library
 * @returns Library version info
 */
export function initialize(): { version: string } {
  console.warn(
    '[Crypto-1] WARNING: This library is in pre-release and has not undergone security audit.'
  );
  console.warn(
    '[Crypto-1] Do not use in production or with real cryptocurrency without review.'
  );

  return {
    version: VERSION
  };
}

// Export main functionality
export { initialize as default };
