// Shared profession configuration for counselor, doctor, and jkm portals.
// Pages in src/pages/professional/ read this via useProf() to customize labels/behavior.

export const PROF_CONFIG = {
  counselor: {
    profession:         'counselor',
    label:              'Kaunselor',
    clientLabel:        'Klien',
    clientsLabel:       'Klien',
    clientNewLabel:     '+ Klien Baru',
    sessionLabel:       'Sesi Kaunseling',
    appointmentLabel:   'Temujanji',
    appointmentsLabel:  'Temujanji',
    setupLabel:         'Profil Kaunselor',
    unitLabel:          'Unit Kaunseling',
    routePrefix:        '/kaunselor',
    dashboardRoute:     '/analytics',
    color:              'emerald',
    colorHex:           '#10b981',
    hasAssessments:     true,
    registrationLabel:  'No. Pendaftaran BKR',
    specializationLabel:'Pengkhususan',
    credentialsLabel:   'Kelayakan',
  },
  doctor: {
    profession:         'doctor',
    label:              'Doktor',
    clientLabel:        'Pesakit',
    clientsLabel:       'Pesakit',
    clientNewLabel:     '+ Pesakit Baru',
    sessionLabel:       'Sesi Perundingan',
    appointmentLabel:   'Temujanji',
    appointmentsLabel:  'Temujanji',
    setupLabel:         'Profil Doktor',
    unitLabel:          'Klinik / Hospital',
    routePrefix:        '/doktor',
    dashboardRoute:     '/doktor/dashboard',
    color:              'blue',
    colorHex:           '#2563eb',
    hasAssessments:     false,
    registrationLabel:  'No. Pendaftaran MMC',
    specializationLabel:'Kepakaran',
    credentialsLabel:   'Kelayakan Perubatan',
  },
  jkm: {
    profession:         'jkm',
    label:              'Pegawai JKM',
    clientLabel:        'Kes',
    clientsLabel:       'Kes Kebajikan',
    clientNewLabel:     '+ Kes Baru',
    sessionLabel:       'Lawatan / Sesi Kes',
    appointmentLabel:   'Lawatan',
    appointmentsLabel:  'Lawatan & Temujanji',
    setupLabel:         'Profil Pegawai JKM',
    unitLabel:          'Pejabat JKM',
    routePrefix:        '/jkm',
    dashboardRoute:     '/jkm/dashboard',
    color:              'teal',
    colorHex:           '#0d9488',
    hasAssessments:     false,
    registrationLabel:  'No. Staf JKM',
    specializationLabel:'Bidang Kebajikan',
    credentialsLabel:   'Kelayakan',
  },
};

// Hook-like helper — detect profession from URL path
export function getProfFromPath(pathname) {
  if (pathname.startsWith('/doktor')) return PROF_CONFIG.doctor;
  if (pathname.startsWith('/jkm'))    return PROF_CONFIG.jkm;
  return PROF_CONFIG.counselor;
}
