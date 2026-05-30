export function getSubdomain() {
  const host = window.location.hostname;
  const parts = host.split('.');
  // counselor.verirec.app → ['counselor', 'verirec', 'app'] → return 'counselor'
  // www.verirec.app → ['www', 'verirec', 'app'] → return 'www'
  // localhost → ['localhost'] → return null
  if (parts.length >= 3 && parts[0] !== 'www') return parts[0];
  return null;
}

export const isCounselorSubdomain = () => getSubdomain() === 'counselor';
