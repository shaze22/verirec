export function getSubdomain() {
  const host = window.location.hostname;
  const parts = host.split('.');
  if (parts.length >= 3 && parts[0] !== 'www') return parts[0];
  return null;
}

export const isCounselorSubdomain = () => getSubdomain() === 'counselor';
export const isDoctorSubdomain    = () => getSubdomain() === 'doctor';
export const isJKMSubdomain       = () => getSubdomain() === 'jkm';
