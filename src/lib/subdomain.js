export function getSubdomain() {
  const host = window.location.hostname;
  const parts = host.split('.');
  if (parts.length >= 3 && parts[0] !== 'www') return parts[0];
  return null;
}

export const isCounselorSubdomain = () => getSubdomain() === 'counselor';

// doctor.verirec.app dan jkm.verirec.app dah dibuang — redirect ke www.verirec.app
export const isRetiredSubdomain = () => ['doctor', 'jkm'].includes(getSubdomain());
